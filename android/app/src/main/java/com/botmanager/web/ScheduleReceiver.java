package com.botmanager.web;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/**
 * Wakes up for bot schedules: hands a due run to RunTrackerService (exact alarms may start a
 * foreground service from the background) and re-arms the next one. Also runs the periodic
 * device check for disconnection alerts (DeviceWatcher). After a reboot or an app
 * update it re-arms everything; runs whose time passed while the phone was off are reported
 * as missed instead of being launched late.
 */
public class ScheduleReceiver extends BroadcastReceiver {
    private static final String TAG = "BotSchedules";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (DeviceWatcher.ACTION_CHECK.equals(action)) {
            // Device alerts: a few quick requests, done off the main thread within the
            // broadcast's time budget (no foreground service or notification needed).
            boolean confirm = intent.getBooleanExtra("confirm", false);
            PendingResult result = goAsync();
            new Thread(() -> {
                try {
                    DeviceWatcher.runCheck(context);
                    if (!confirm) DeviceWatcher.arm(context);
                } finally {
                    result.finish();
                }
            }).start();
            return;
        }
        if (ScheduleManager.ACTION_ALARM.equals(action)) {
            String id = intent.getStringExtra("id");
            long at = intent.getLongExtra("at", System.currentTimeMillis());
            JSONObject s = id != null ? ScheduleManager.find(context, id) : null;
            if (s == null || !s.optBoolean("active", true)) return;

            Intent run = new Intent(context, RunTrackerService.class)
                .setAction(RunTrackerService.ACTION_RUN_SCHEDULE)
                .putExtra("scheduleId", id)
                .putExtra("scheduledAt", at);
            try {
                ContextCompat.startForegroundService(context, run);
            } catch (Exception e) {
                Log.w(TAG, "Could not start the run", e);
                RunTrackerService.notifyScheduleProblem(context, s,
                    "Couldn't run " + s.optString("botName"),
                    "Android didn't let the app start in the background. Open Bot Manager and allow \"Alarms & reminders\".");
                ScheduleManager.recordResult(context, id, "Couldn't start");
            }
            // Next occurrence (or deactivate a one-time schedule).
            ScheduleManager.arm(context, s);
            return;
        }

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action)) {
            long now = System.currentTimeMillis();
            for (JSONObject s : ScheduleManager.load(context)) {
                long nextAt = s.optLong("nextAt", -1);
                if (s.optBoolean("active", true) && nextAt > 0 && nextAt < now - 60_000) {
                    RunTrackerService.notifyScheduleProblem(context, s,
                        "Missed: " + s.optString("botName"),
                        "It was scheduled for " + s.optString("time") + " while the phone was off. It wasn't launched late.");
                    ScheduleManager.recordResult(context, s.optString("id"), "Missed (phone off)");
                }
            }
            ScheduleManager.armAll(context);
            DeviceWatcher.arm(context);
        }
    }
}
