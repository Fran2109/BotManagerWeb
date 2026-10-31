package com.botmanager.web;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Alerts when the PC of a watched account disconnects from the Control Room (and when it's
 * back). Checks v2/devices/list about every 15 minutes with an alarm that also works in
 * battery saver. A disconnection is confirmed by a second check 2 minutes later before
 * alerting, so a brief drop doesn't raise a false alarm. Network or login failures never
 * change the known state (they are not a disconnection).
 *
 * Watched accounts (prefs, JSON): email, label, password, baseUrl, enabled, token,
 * lastStatus (CONNECTED | DISCONNECTED | UNKNOWN), pendingDown, lastCheckedAt.
 */
final class DeviceWatcher {
    private static final String TAG = "DeviceWatcher";
    private static final String PREFS = "device-watch";
    private static final String KEY = "accounts";
    static final String ACTION_CHECK = "com.botmanager.web.DEVICE_CHECK";
    static final String CHANNEL = "device-alerts";

    static final long INTERVAL_MS = 15 * 60_000;
    static final long CONFIRM_MS = 2 * 60_000;

    private DeviceWatcher() {}

    // ----- Storage -----

    static synchronized List<JSONObject> load(Context context) {
        List<JSONObject> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs(context).getString(KEY, "[]"));
            for (int i = 0; i < arr.length(); i++) out.add(arr.getJSONObject(i));
        } catch (Exception e) {
            Log.w(TAG, "Could not read watched accounts", e);
        }
        return out;
    }

    static synchronized void saveAll(Context context, List<JSONObject> accounts) {
        JSONArray arr = new JSONArray();
        for (JSONObject a : accounts) arr.put(a);
        prefs(context).edit().putString(KEY, arr.toString()).apply();
    }

    /** Turns watching on/off for an account; a newly watched account starts as UNKNOWN. */
    static synchronized void setWatched(Context context, JSONObject account, boolean enabled) throws Exception {
        List<JSONObject> all = load(context);
        JSONObject existing = null;
        for (JSONObject a : all) if (account.optString("email").equals(a.optString("email"))) existing = a;
        if (existing == null) {
            existing = new JSONObject().put("email", account.optString("email")).put("lastStatus", "UNKNOWN");
            all.add(existing);
        }
        existing.put("label", account.optString("label"));
        existing.put("password", account.optString("password"));
        existing.put("baseUrl", account.optString("baseUrl"));
        existing.put("enabled", enabled);
        if (!enabled) {
            existing.put("lastStatus", "UNKNOWN");
            existing.put("pendingDown", false);
        }
        saveAll(context, all);
        arm(context);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static boolean anyEnabled(Context context) {
        for (JSONObject a : load(context)) if (a.optBoolean("enabled")) return true;
        return false;
    }

    // ----- Alarms -----

    private static PendingIntent checkIntent(Context context, boolean confirm) {
        Intent intent = new Intent(context, ScheduleReceiver.class).setAction(ACTION_CHECK).putExtra("confirm", confirm);
        return PendingIntent.getBroadcast(context, confirm ? 0xDE7C : 0xDE7A, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Sets the next periodic check, or cancels it when no account is watched. */
    static void arm(Context context) {
        AlarmManager am = context.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = checkIntent(context, false);
        am.cancel(pi);
        if (anyEnabled(context)) {
            // Inexact is fine for a ~15 min check and works in Doze (allowWhileIdle).
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + INTERVAL_MS, pi);
        }
    }

    private static void armConfirm(Context context) {
        AlarmManager am = context.getSystemService(AlarmManager.class);
        if (am != null) {
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + CONFIRM_MS, checkIntent(context, true));
        }
    }

    // ----- Check -----

    private static JSONObject post(String url, JSONObject body, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8_000);
        c.setReadTimeout(10_000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        if (token != null) c.setRequestProperty("X-Authorization", token);
        try (OutputStream os = c.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }
        int status = c.getResponseCode();
        InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (in != null) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        if (status >= 400) throw new IOException("HTTP " + status);
        return new JSONObject(out.toString("UTF-8"));
    }

    /** Device status for one account, logging in again if the saved token expired. */
    private static String fetchStatus(JSONObject a) throws Exception {
        String base = a.optString("baseUrl");
        JSONObject query = new JSONObject().put("filter", new JSONObject());
        String token = a.optString("token", "");
        JSONObject res;
        try {
            if (token.isEmpty()) throw new IOException("HTTP 401");
            res = post(base + "v2/devices/list", query, token);
        } catch (IOException e) {
            if (!String.valueOf(e.getMessage()).matches("HTTP 40[13]")) throw e;
            token = post(base + "v2/authentication",
                new JSONObject().put("username", a.optString("email")).put("password", a.optString("password")), null)
                .getString("token");
            a.put("token", token);
            res = post(base + "v2/devices/list", query, token);
        }
        JSONArray list = res.optJSONArray("list");
        return list != null && list.length() > 0 ? list.getJSONObject(0).optString("status") : "NO_DEVICE";
    }

    /** Checks every watched account and alerts on confirmed changes. Runs off the main thread. */
    static synchronized void runCheck(Context context) {
        List<JSONObject> all = load(context);
        boolean needConfirm = false;
        for (JSONObject a : all) {
            if (!a.optBoolean("enabled")) continue;
            try {
                String status = fetchStatus(a);
                boolean connected = "CONNECTED".equals(status);
                String last = a.optString("lastStatus", "UNKNOWN");
                a.put("lastCheckedAt", System.currentTimeMillis());
                if (connected) {
                    if ("DISCONNECTED".equals(last)) notify(context, a, true);
                    a.put("lastStatus", "CONNECTED");
                    a.put("pendingDown", false);
                } else if ("CONNECTED".equals(last)) {
                    if (a.optBoolean("pendingDown")) {
                        // Still down two minutes later: it's a real disconnection.
                        notify(context, a, false);
                        a.put("lastStatus", "DISCONNECTED");
                        a.put("pendingDown", false);
                    } else {
                        a.put("pendingDown", true);
                        needConfirm = true;
                    }
                } else {
                    // First check, or already known to be down: no alert.
                    a.put("lastStatus", "DISCONNECTED");
                    a.put("pendingDown", false);
                }
            } catch (Exception e) {
                // No connection or Control Room trouble: not a disconnection, keep the state.
                Log.w(TAG, "Check failed for " + a.optString("email"), e);
                if (a.optBoolean("pendingDown")) needConfirm = true;
            }
        }
        saveAll(context, all);
        if (needConfirm) armConfirm(context);
    }

    // ----- Notifications -----

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Device alerts", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("When a PC disconnects from the Control Room or comes back");
        context.getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    private static void notify(Context context, JSONObject a, boolean backOnline) {
        createChannel(context);
        String label = a.optString("label", a.optString("email"));
        String title = backOnline ? label + "'s PC is back online" : label + "'s PC disconnected";
        String body = backOnline
            ? "It's connected to the Control Room again, so bots can run on it."
            : "Bots can't run on it until the Bot Agent reconnects. Check the PC, or reset it from Devices.";
        Intent open = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(RunTrackerService.EXTRA_ROUTE, "Devices");
        PendingIntent pi = PendingIntent.getActivity(context, (a.optString("email") + "dev").hashCode(), open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_bot)
            .setColor(Color.parseColor(backOnline ? "#1A7F37" : "#CF222E"))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pi)
            .build();
        try {
            // One notification per account: "back online" replaces "disconnected".
            NotificationManagerCompat.from(context).notify((a.optString("email") + "device").hashCode(), n);
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing", e);
        }
    }
}
