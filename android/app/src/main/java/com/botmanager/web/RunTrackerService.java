package com.botmanager.web;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.ServiceCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Foreground service that follows launched bots natively, so progress and the final alert
 * keep coming with the app minimized or closed from recents. It mirrors lib/runTracker.ts:
 * polls v3/activity/list by deploymentId every 10 s, shows one ongoing notification with a
 * progress bar per run, and posts the result when the run ends.
 *
 * Failures: no connection never ends tracking (a network callback re-checks as soon as the
 * connection is back); 401/403 renews the token and only gives up after 3 rejected logins;
 * 5xx retries with backoff for up to 30 minutes.
 */
public class RunTrackerService extends Service {
    private static final String TAG = "RunTracker";

    static final String ACTION_TRACK = "com.botmanager.web.TRACK_RUN";
    static final String ACTION_RUN_SCHEDULE = "com.botmanager.web.RUN_SCHEDULE";
    static final String EXTRA_ROUTE = "botmanager.route";

    static final String PROGRESS_CHANNEL = "bot-progress";
    static final String FINISHED_CHANNEL = "bot-finished";
    private static final int SERVICE_NOTIFICATION_ID = 0x7E57;

    private static final long POLL_MS = 10_000;
    private static final long OFFLINE_RETRY_MS = 15_000;
    private static final long MAX_BACKOFF_MS = 5 * 60_000;
    private static final long MAX_SERVER_DOWN_MS = 30 * 60_000;
    private static final long NOT_LISTED_GRACE_MS = 5 * 60_000;
    private static final long MAX_TRACK_MS = 24 * 3600_000L;
    private static final int MAX_AUTH_ERRORS = 3;
    private static final int MAX_ERRORS = 6;
    /** A scheduled launch retries this many times, a minute apart, when there's no connection. */
    private static final int SCHEDULE_NETWORK_RETRIES = 10;

    private static final String PREFS = "run-tracker";
    private static final String PREFS_RUNS = "runs";

    /** One followed deployment. Persisted as JSON so the service can resume after a restart. */
    static class Run {
        String deploymentId, botName, userEmail, password, baseUrl, token;
        long startedAt;
        int errors, authErrors, serverErrors;
        long serverDownSince;
        String lastBody;
        /** Latest progress shown for this run; percent < 0 = indeterminate. */
        String progressText = "Starting…";
        int percent = -1;
        ScheduledFuture<?> next;

        JSONObject toJson() throws Exception {
            return new JSONObject()
                .put("deploymentId", deploymentId)
                .put("botName", botName)
                .put("userEmail", userEmail)
                .put("password", password)
                .put("baseUrl", baseUrl)
                .put("token", token)
                .put("startedAt", startedAt);
        }

        static Run fromJson(JSONObject o) {
            Run r = new Run();
            r.deploymentId = o.optString("deploymentId");
            r.botName = o.optString("botName");
            r.userEmail = o.optString("userEmail");
            r.password = o.optString("password");
            r.baseUrl = o.optString("baseUrl");
            r.token = o.optString("token");
            r.startedAt = o.optLong("startedAt", System.currentTimeMillis());
            return r;
        }
    }

    private final Map<String, Run> runs = new HashMap<>();
    private ScheduledExecutorService executor;
    private PowerManager.WakeLock wakeLock;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean foreground;
    /** Scheduled launches still in progress (keep the service alive until they finish). */
    private int pendingSchedules;

    /** Starts the service (if needed) and adds a run to follow. */
    static void track(Context context, Run run) {
        Intent intent = new Intent(context, RunTrackerService.class).setAction(ACTION_TRACK);
        intent.putExtra("deploymentId", run.deploymentId);
        intent.putExtra("botName", run.botName);
        intent.putExtra("userEmail", run.userEmail);
        intent.putExtra("password", run.password);
        intent.putExtra("baseUrl", run.baseUrl);
        intent.putExtra("token", run.token);
        androidx.core.content.ContextCompat.startForegroundService(context, intent);
    }

    /** Restarts the service if a previous session left runs saved (e.g. after a kill). */
    static void resumeIfNeeded(Context context) {
        String saved = context.getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREFS_RUNS, "[]");
        if (saved != null && !saved.equals("[]")) {
            androidx.core.content.ContextCompat.startForegroundService(
                context, new Intent(context, RunTrackerService.class));
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        executor = Executors.newSingleThreadScheduledExecutor();
        createChannels(this);
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BotManager:RunTracker");
        wakeLock.setReferenceCounted(false);
        registerNetworkCallback();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Must go foreground right away (within 5 s of startForegroundService).
        if (!goForeground()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        executor.execute(() -> {
            loadSavedRuns();
            if (intent != null && ACTION_TRACK.equals(intent.getAction())) {
                Run run = new Run();
                run.deploymentId = intent.getStringExtra("deploymentId");
                run.botName = intent.getStringExtra("botName");
                run.userEmail = intent.getStringExtra("userEmail");
                run.password = intent.getStringExtra("password");
                run.baseUrl = intent.getStringExtra("baseUrl");
                run.token = intent.getStringExtra("token");
                run.startedAt = System.currentTimeMillis();
                if (run.deploymentId != null && !runs.containsKey(run.deploymentId)) {
                    runs.put(run.deploymentId, run);
                    saveRuns();
                    showProgress(run, "Starting…", -1);
                    schedule(run, 3000);
                }
            }
            if (intent != null && ACTION_RUN_SCHEDULE.equals(intent.getAction())) {
                pendingSchedules++;
                runSchedule(intent.getStringExtra("scheduleId"), intent.getLongExtra("scheduledAt", System.currentTimeMillis()), 0);
            }
            if (runs.isEmpty() && pendingSchedules == 0) stopTracking();
            else wakeLock.acquire(MAX_TRACK_MS);
        });
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (networkCallback != null) {
            try {
                ((ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE)).unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
            }
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        executor.shutdownNow();
        super.onDestroy();
    }

    // ----- Foreground / notifications -----

    static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        // Same ids as the JS tracker, so user settings for them apply to both.
        NotificationChannel progress = new NotificationChannel(
            PROGRESS_CHANNEL, "Bot progress", NotificationManager.IMPORTANCE_LOW);
        progress.setDescription("Progress of bots you launched");
        progress.enableVibration(false);
        NotificationChannel finished = new NotificationChannel(
            FINISHED_CHANNEL, "Bot finished", NotificationManager.IMPORTANCE_HIGH);
        finished.setDescription("When a bot you launched finishes");
        finished.enableVibration(true);
        nm.createNotificationChannel(progress);
        nm.createNotificationChannel(finished);
    }

    private PendingIntent openApp(String route, int requestCode) {
        Intent open = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_ROUTE, route);
        return PendingIntent.getActivity(
            this, requestCode, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private NotificationCompat.Builder base(String channel) {
        return new NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_stat_bot)
            .setColor(Color.parseColor("#C4460F"));
    }

    private boolean goForeground() {
        if (foreground) return true;
        Notification summary = base(PROGRESS_CHANNEL)
            .setContentTitle("Following your bots")
            .setContentText("Checking the Control Room…")
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(openApp("InProgress", 1))
            .build();
        try {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC : 0;
            ServiceCompat.startForeground(this, SERVICE_NOTIFICATION_ID, summary, type);
            foreground = true;
            return true;
        } catch (Exception e) {
            // Android 12+ refuses to start a foreground service from the background (e.g. a
            // system restart). Runs stay saved and resume when the app opens.
            Log.w(TAG, "Could not go foreground", e);
            return false;
        }
    }

    private int notificationId(String deploymentId, String kind) {
        return Math.abs((deploymentId + kind).hashCode()) % 2_000_000_000 + 1;
    }

    /** Records a run's progress; percent < 0 shows an indeterminate bar. */
    private void showProgress(Run run, String body, int percent) {
        String key = body + "|" + percent;
        if (key.equals(run.lastBody)) return;
        run.lastBody = key;
        run.progressText = body;
        run.percent = percent;
        refreshForeground();
    }

    /**
     * The service's own notification is the progress notification (no duplicate per bot):
     * one bot shows its text and progress bar; several are listed one per line.
     */
    private void refreshForeground() {
        if (runs.isEmpty()) return;
        NotificationCompat.Builder b = base(PROGRESS_CHANNEL)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openApp("InProgress", 1));
        if (runs.size() == 1) {
            Run run = runs.values().iterator().next();
            b.setContentTitle(run.botName + " is running")
                .setContentText(run.progressText)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(run.progressText));
            if (run.percent >= 0) b.setProgress(100, run.percent, false);
            else b.setProgress(0, 0, true);
        } else {
            NotificationCompat.InboxStyle inbox = new NotificationCompat.InboxStyle();
            for (Run run : runs.values()) inbox.addLine(run.botName + ": " + run.progressText);
            b.setContentTitle(runs.size() + " bots running")
                .setContentText("Tap to see them in In progress")
                .setStyle(inbox);
        }
        notifySafe(SERVICE_NOTIFICATION_ID, b.build());
    }

    private void notifySafe(int id, Notification n) {
        try {
            NotificationManagerCompat.from(this).notify(id, n);
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing", e);
        }
    }

    private void finish(Run run, String title, String body) {
        if (run.next != null) run.next.cancel(false);
        runs.remove(run.deploymentId);
        saveRuns();
        Notification done = base(FINISHED_CHANNEL)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openApp("Historical", notificationId(run.deploymentId, "d")))
            .build();
        notifySafe(notificationId(run.deploymentId, "done"), done);
        if (runs.isEmpty() && pendingSchedules == 0) stopTracking();
        else refreshForeground();
    }

    private void stopTracking() {
        if (wakeLock.isHeld()) wakeLock.release();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        foreground = false;
        stopSelf();
    }

    // ----- Polling -----

    private void schedule(Run run, long delayMs) {
        if (run.next != null) run.next.cancel(false);
        run.next = executor.schedule(() -> poll(run), delayMs, TimeUnit.MILLISECONDS);
    }

    private void registerNetworkCallback() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                // Back online: check every run now instead of waiting for the next retry.
                executor.execute(() -> {
                    for (Run run : runs.values()) schedule(run, 500);
                });
            }
        };
        try {
            cm.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception e) {
            Log.w(TAG, "No network callback", e);
        }
    }

    private static class HttpError extends IOException {
        final int status;

        HttpError(int status, String body) {
            super("HTTP " + status + ": " + body);
            this.status = status;
        }
    }

    private static String readAll(InputStream in) throws IOException {
        if (in == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toString("UTF-8");
    }

    /** POSTs JSON; throws HttpError for HTTP failures and IOException when there's no connection. */
    private static JSONObject post(String url, JSONObject body, @Nullable String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15_000);
        c.setReadTimeout(20_000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("Accept", "application/json");
        if (token != null) c.setRequestProperty("X-Authorization", token);
        try (OutputStream os = c.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }
        int status = c.getResponseCode();
        if (status >= 400) throw new HttpError(status, readAll(c.getErrorStream()));
        return new JSONObject(readAll(c.getInputStream()));
    }

    private static String login(Run run) throws Exception {
        JSONObject res = post(run.baseUrl + "v2/authentication",
            new JSONObject().put("username", run.userEmail).put("password", run.password), null);
        return res.getString("token");
    }

    private JSONObject fetchStatus(Run run) throws Exception {
        JSONObject query = new JSONObject().put("filter", new JSONObject()
            .put("operator", "eq").put("field", "deploymentId").put("value", run.deploymentId));
        if (run.token == null || run.token.isEmpty()) run.token = login(run);
        JSONObject res;
        try {
            res = post(run.baseUrl + "v3/activity/list", query, run.token);
        } catch (HttpError e) {
            if (e.status != 401 && e.status != 403) throw e;
            // Expired token: log in again and retry once.
            run.token = login(run);
            saveRuns();
            res = post(run.baseUrl + "v3/activity/list", query, run.token);
        }
        JSONArray list = res.optJSONArray("list");
        return list == null || list.length() == 0 ? null : list.getJSONObject(0);
    }

    private static long parseTime(String iso) {
        if (iso == null || iso.isEmpty()) return -1;
        String[] patterns = {"yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX"};
        for (String p : patterns) {
            try {
                SimpleDateFormat f = new SimpleDateFormat(p, Locale.US);
                f.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date d = f.parse(iso);
                if (d != null) return d.getTime();
            } catch (Exception ignored) {
            }
        }
        return -1;
    }

    private static String formatDuration(long ms) {
        long minutes = Math.round(ms / 60_000.0);
        if (minutes < 1) return "less than a minute";
        if (minutes < 60) return minutes + " min";
        return (minutes / 60) + " h " + (minutes % 60) + " min";
    }

    private static String[] finalTitle(String status) {
        switch (status) {
            case "COMPLETED": return new String[] {"Bot completed", "ok"};
            case "RUN_FAILED": case "FAILED": case "ERROR": return new String[] {"Bot failed", ""};
            case "DEPLOY_FAILED": return new String[] {"Bot couldn't start", ""};
            case "RUN_ABORTED": case "ABORTED": return new String[] {"Bot aborted", ""};
            case "STOPPED": return new String[] {"Bot stopped", ""};
            case "CANCELLED": return new String[] {"Bot cancelled", ""};
            default: return null;
        }
    }

    private void poll(Run run) {
        if (!runs.containsKey(run.deploymentId)) return;
        long nextDelay = POLL_MS;
        try {
            JSONObject a = fetchStatus(run);
            if (a == null) {
                // Not listed yet right after the launch.
                if (System.currentTimeMillis() - run.startedAt > NOT_LISTED_GRACE_MS && ++run.errors >= MAX_ERRORS) {
                    finish(run, "Lost track of " + run.botName,
                        "The Control Room doesn't list this run. Check it in Historical.");
                    return;
                }
            } else {
                run.errors = 0;
                run.authErrors = 0;
                run.serverErrors = 0;
                run.serverDownSince = 0;
                String status = a.optString("status").toUpperCase(Locale.ROOT);
                int line = a.optInt("currentLine"), total = a.optInt("totalLines");
                String[] fin = finalTitle(status);
                if (fin != null) {
                    long start = parseTime(a.optString("startDateTime"));
                    long end = parseTime(a.optString("endDateTime"));
                    String elapsed = formatDuration((end > 0 ? end : System.currentTimeMillis()) - (start > 0 ? start : run.startedAt));
                    String detail = "ok".equals(fin[1])
                        ? run.botName + " finished in " + elapsed + "."
                        : run.botName + " stopped at line " + line + " of " + total + " after " + elapsed + ".";
                    finish(run, fin[0] + ": " + run.botName, detail);
                    return;
                }
                int percent = total > 0 ? Math.max(0, Math.min(100, Math.round((line - 1) * 100f / total))) : 0;
                String current = a.optString("currentBotName");
                String step = !current.isEmpty() && !current.equals(run.botName) ? " in " + current : "";
                showProgress(run, percent + "%, line " + line + " of " + total + step, percent);
            }
        } catch (HttpError e) {
            if (e.status == 401 || e.status == 403) {
                // The login itself was rejected (password changed, account locked…).
                if (++run.authErrors >= MAX_AUTH_ERRORS) {
                    finish(run, "Can't check " + run.botName,
                        "The Control Room rejected the credentials of " + run.userEmail
                            + ". The bot may still be running: check the account, then look in Historical.");
                    return;
                }
            } else if (e.status >= 500) {
                if (run.serverDownSince == 0) run.serverDownSince = System.currentTimeMillis();
                run.serverErrors++;
                if (System.currentTimeMillis() - run.serverDownSince > MAX_SERVER_DOWN_MS) {
                    finish(run, "Can't check " + run.botName,
                        "The Control Room has not responded for 30 minutes. The bot may still be running: check it in Historical.");
                    return;
                }
                showProgress(run, "The Control Room is not responding, retrying…", -1);
                nextDelay = Math.min(POLL_MS * (1L << Math.min(run.serverErrors - 1, 10)), MAX_BACKOFF_MS);
            } else if (++run.errors >= MAX_ERRORS) {
                finish(run, "Lost track of " + run.botName,
                    "The Control Room keeps returning unexpected answers. Check the run in Historical.");
                return;
            }
        } catch (IOException e) {
            // No connection (or a timeout): never a reason to stop following the bot.
            showProgress(run, "Waiting for a connection to check its progress…", -1);
            nextDelay = OFFLINE_RETRY_MS;
        } catch (Exception e) {
            Log.w(TAG, "Unexpected answer", e);
            if (++run.errors >= MAX_ERRORS) {
                finish(run, "Lost track of " + run.botName,
                    "The Control Room keeps returning unexpected answers. Check the run in Historical.");
                return;
            }
        }

        if (System.currentTimeMillis() - run.startedAt > MAX_TRACK_MS) {
            finish(run, "Stopped following " + run.botName, "It ran for more than 24 hours. Check it in In progress.");
            return;
        }
        schedule(run, nextDelay);
    }

    // ----- Scheduled launches (see ScheduleManager) -----

    /** Posts a scheduling problem (missed run, offline PC…) that opens the Scheduled screen. */
    static void notifyScheduleProblem(Context context, JSONObject s, String title, String body) {
        createChannels(context);
        Intent open = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_ROUTE, "Scheduled");
        PendingIntent pi = PendingIntent.getActivity(context, (s.optString("id") + "open").hashCode(), open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(context, FINISHED_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_bot)
            .setColor(Color.parseColor("#C4460F"))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pi)
            .build();
        try {
            NotificationManagerCompat.from(context).notify((s.optString("id") + "problem").hashCode(), n);
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing", e);
        }
    }

    private void scheduleDone() {
        pendingSchedules = Math.max(0, pendingSchedules - 1);
        if (runs.isEmpty() && pendingSchedules == 0) stopTracking();
    }

    /** Launches a scheduled bot like the app does: device connected check, then deploy. */
    private void runSchedule(String id, long scheduledAt, int attempt) {
        JSONObject s = id != null ? ScheduleManager.find(this, id) : null;
        if (s == null) {
            scheduleDone();
            return;
        }
        String bot = s.optString("botName");
        String account = s.optString("accountLabel", s.optString("userEmail"));
        if (attempt == 0 && System.currentTimeMillis() - scheduledAt > ScheduleManager.MISSED_AFTER_MS) {
            notifyScheduleProblem(this, s, "Missed: " + bot,
                "It was due at " + s.optString("time") + " but Android woke the app too late, so it wasn't launched.");
            ScheduleManager.recordResult(this, id, "Missed (too late)");
            scheduleDone();
            return;
        }

        Run tmp = new Run();
        tmp.userEmail = s.optString("userEmail");
        tmp.password = s.optString("password");
        tmp.baseUrl = s.optString("baseUrl");
        try {
            String token = login(tmp);
            JSONObject devices = post(tmp.baseUrl + "v2/devices/list", new JSONObject().put("filter", new JSONObject()), token);
            JSONArray list = devices.optJSONArray("list");
            String status = list != null && list.length() > 0 ? list.getJSONObject(0).optString("status") : "NO_DEVICE";
            if (!"CONNECTED".equals(status)) {
                notifyScheduleProblem(this, s, "Couldn't run " + bot,
                    "The PC for " + account + " was offline at " + s.optString("time") + ". Check it in Devices.");
                ScheduleManager.recordResult(this, id, "PC offline");
                scheduleDone();
                return;
            }

            JSONObject botInput = s.optJSONObject("botInput");
            JSONObject deploy = new JSONObject()
                .put("fileId", s.getString("fileId"))
                .put("runAsUserIds", new JSONArray().put(s.getString("userId")))
                .put("poolIds", new JSONArray())
                .put("overrideDefaultDevice", false)
                .put("callbackInfo", new JSONObject()
                    .put("url", s.optString("callbackUrl"))
                    .put("headers", new JSONObject().put("X-Authorization", token)))
                .put("botInput", botInput != null ? botInput : new JSONObject())
                .put("hideBotAgentUi", s.optBoolean("hideBotAgentUi"));
            JSONObject res = post(tmp.baseUrl + "v3/automations/deploy", deploy, token);
            String deploymentId = res.getString("deploymentId");
            ScheduleManager.recordResult(this, id, "Launched");

            if (s.optBoolean("notify")) {
                // Follow it like a manual launch: progress, then the result.
                Run run = new Run();
                run.deploymentId = deploymentId;
                run.botName = bot;
                run.userEmail = tmp.userEmail;
                run.password = tmp.password;
                run.baseUrl = tmp.baseUrl;
                run.token = token;
                run.startedAt = System.currentTimeMillis();
                runs.put(deploymentId, run);
                saveRuns();
                showProgress(run, "Started by its schedule…", -1);
                schedule(run, 3000);
            }
            scheduleDone();
        } catch (HttpError e) {
            String why = e.status == 401 || e.status == 403
                ? "The Control Room rejected the credentials of " + account + "."
                : e.status == 404
                    ? "The bot no longer exists in " + account + "'s Control Room. Create the schedule again."
                    : "The Control Room returned an error (" + e.status + ").";
            notifyScheduleProblem(this, s, "Couldn't run " + bot, why);
            ScheduleManager.recordResult(this, id, "Error " + e.status);
            scheduleDone();
        } catch (IOException e) {
            if (attempt < SCHEDULE_NETWORK_RETRIES) {
                executor.schedule(() -> runSchedule(id, scheduledAt, attempt + 1), 60, TimeUnit.SECONDS);
                return;
            }
            notifyScheduleProblem(this, s, "Couldn't run " + bot,
                "There was no internet connection for 10 minutes after " + s.optString("time") + ".");
            ScheduleManager.recordResult(this, id, "No connection");
            scheduleDone();
        } catch (Exception e) {
            Log.w(TAG, "Scheduled launch failed", e);
            notifyScheduleProblem(this, s, "Couldn't run " + bot, "Unexpected error: " + e.getMessage());
            ScheduleManager.recordResult(this, id, "Error");
            scheduleDone();
        }
    }

    // ----- Persistence -----

    private void saveRuns() {
        try {
            JSONArray arr = new JSONArray();
            for (Run r : runs.values()) arr.put(r.toJson());
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(PREFS_RUNS, arr.toString()).apply();
        } catch (Exception e) {
            Log.w(TAG, "Could not save runs", e);
        }
    }

    private void loadSavedRuns() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        try {
            JSONArray arr = new JSONArray(prefs.getString(PREFS_RUNS, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                Run r = Run.fromJson(arr.getJSONObject(i));
                if (!runs.containsKey(r.deploymentId)) {
                    runs.put(r.deploymentId, r);
                    schedule(r, 1000);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not load runs", e);
        }
    }
}
