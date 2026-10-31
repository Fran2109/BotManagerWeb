package com.botmanager.web;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Bot schedules kept on the phone. Community Edition doesn't allow Control Room schedules
 * ("You no longer have permission to schedule a bot"), so the phone launches the bot itself
 * at the scheduled time with an exact alarm (see ScheduleReceiver / RunTrackerService).
 *
 * A schedule is a JSON object: id, botName, userEmail, accountLabel, fileId, userId, password,
 * baseUrl, callbackUrl, botInput (object), hideBotAgentUi, notify, kind (once|daily|weekly),
 * time ("HH:mm", phone time), date ("yyyy-MM-dd", once), days ([1..7], Calendar.DAY_OF_WEEK),
 * active, nextAt (ms), lastRunAt, lastResult.
 */
final class ScheduleManager {
    private static final String TAG = "BotSchedules";
    private static final String PREFS = "bot-schedules";
    private static final String KEY = "schedules";

    static final String ACTION_ALARM = "com.botmanager.web.SCHEDULE_ALARM";
    /** A run that fires later than this (phone off, alarm delayed) counts as missed. */
    static final long MISSED_AFTER_MS = 15 * 60_000;

    private ScheduleManager() {}

    // ----- Storage -----

    static synchronized List<JSONObject> load(Context context) {
        List<JSONObject> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs(context).getString(KEY, "[]"));
            for (int i = 0; i < arr.length(); i++) out.add(arr.getJSONObject(i));
        } catch (Exception e) {
            Log.w(TAG, "Could not read schedules", e);
        }
        return out;
    }

    static synchronized void saveAll(Context context, List<JSONObject> schedules) {
        JSONArray arr = new JSONArray();
        for (JSONObject s : schedules) arr.put(s);
        prefs(context).edit().putString(KEY, arr.toString()).apply();
    }

    static synchronized JSONObject find(Context context, String id) {
        for (JSONObject s : load(context)) if (id.equals(s.optString("id"))) return s;
        return null;
    }

    static synchronized void put(Context context, JSONObject schedule) {
        List<JSONObject> all = load(context);
        String id = schedule.optString("id");
        boolean replaced = false;
        for (int i = 0; i < all.size(); i++) {
            if (id.equals(all.get(i).optString("id"))) {
                all.set(i, schedule);
                replaced = true;
            }
        }
        if (!replaced) all.add(schedule);
        saveAll(context, all);
    }

    static synchronized void remove(Context context, String id) {
        cancelAlarm(context, id);
        List<JSONObject> all = load(context);
        all.removeIf(s -> id.equals(s.optString("id")));
        saveAll(context, all);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ----- Next run -----

    /** Next run strictly after `after`, in the phone's time zone; -1 if there is none. */
    static long nextRun(JSONObject s, long after) {
        String[] hm = s.optString("time", "08:00").split(":");
        int hour = Integer.parseInt(hm[0]), minute = Integer.parseInt(hm[1]);
        Calendar c = Calendar.getInstance();
        String kind = s.optString("kind", "once");

        if ("once".equals(kind)) {
            String[] ymd = s.optString("date").split("-");
            if (ymd.length != 3) return -1;
            c.set(Integer.parseInt(ymd[0]), Integer.parseInt(ymd[1]) - 1, Integer.parseInt(ymd[2]), hour, minute, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c.getTimeInMillis() > after ? c.getTimeInMillis() : -1;
        }

        c.setTimeInMillis(after);
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        JSONArray days = s.optJSONArray("days");
        for (int i = 0; i < 8; i++) {
            boolean dayOk = "daily".equals(kind) || containsDay(days, c.get(Calendar.DAY_OF_WEEK));
            if (dayOk && c.getTimeInMillis() > after) return c.getTimeInMillis();
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return -1;
    }

    private static boolean containsDay(JSONArray days, int day) {
        if (days == null) return false;
        for (int i = 0; i < days.length(); i++) if (days.optInt(i) == day) return true;
        return false;
    }

    // ----- Alarms -----

    static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = context.getSystemService(AlarmManager.class);
        return am != null && am.canScheduleExactAlarms();
    }

    private static PendingIntent alarmIntent(Context context, String id, long at) {
        Intent intent = new Intent(context, ScheduleReceiver.class)
            .setAction(ACTION_ALARM)
            .putExtra("id", id)
            .putExtra("at", at);
        return PendingIntent.getBroadcast(
            context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void cancelAlarm(Context context, String id) {
        AlarmManager am = context.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(alarmIntent(context, id, 0));
    }

    /**
     * Computes the schedule's next run, stores it and sets the alarm (or cancels it when the
     * schedule is paused or has no future run). Returns the stored schedule.
     */
    static JSONObject arm(Context context, JSONObject s) {
        try {
            String id = s.getString("id");
            long next = s.optBoolean("active", true) ? nextRun(s, System.currentTimeMillis()) : -1;
            s.put("nextAt", next);
            if ("once".equals(s.optString("kind")) && next < 0 && s.optBoolean("active", true)) {
                // A one-time schedule whose time has passed: nothing more to run.
                s.put("active", false);
            }
            put(context, s);
            cancelAlarm(context, id);
            if (next > 0) {
                AlarmManager am = context.getSystemService(AlarmManager.class);
                PendingIntent pi = alarmIntent(context, id, next);
                if (canScheduleExact(context)) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
                } else {
                    // Without the "Alarms & reminders" permission Android may run it a bit late.
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not arm schedule", e);
        }
        return s;
    }

    /** Re-arms every schedule (after a reboot, an app update or opening the app). */
    static void armAll(Context context) {
        for (JSONObject s : load(context)) arm(context, s);
    }

    static void recordResult(Context context, String id, String result) {
        JSONObject s = find(context, id);
        if (s == null) return;
        try {
            s.put("lastRunAt", System.currentTimeMillis());
            s.put("lastResult", result);
            put(context, s);
        } catch (Exception ignored) {
        }
    }
}
