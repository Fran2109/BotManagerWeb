package com.botmanager.web;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.UUID;

/**
 * Bridge between lib/runTracker.ts / lib/schedules.ts and the native side: run tracking
 * (RunTrackerService), phone-side bot schedules (ScheduleManager), and which screen a tapped
 * notification should open ("openRoute" event, or getLaunchRoute() on cold start).
 */
@CapacitorPlugin(name = "RunTracker")
public class RunTrackerPlugin extends Plugin {

    @Override
    public void load() {
        RunTrackerService.createChannels(getContext());
        // Runs left saved by a killed service are picked up as soon as the app opens.
        try {
            RunTrackerService.resumeIfNeeded(getContext());
        } catch (Exception ignored) {
            // Starting from the background isn't allowed; the next launch retries.
        }
        // Alarms are lost on force-stop; opening the app sets them again.
        ScheduleManager.armAll(getContext());
        DeviceWatcher.arm(getContext());
    }

    // ----- Device alerts -----

    /** Watched accounts with their last known state (passwords and tokens stay native). */
    @PluginMethod
    public void getDeviceAlerts(PluginCall call) {
        JSArray arr = new JSArray();
        for (JSONObject a : DeviceWatcher.load(getContext())) {
            JSObject o = new JSObject();
            o.put("email", a.optString("email"));
            o.put("enabled", a.optBoolean("enabled"));
            o.put("lastStatus", a.optString("lastStatus", "UNKNOWN"));
            o.put("lastCheckedAt", a.optLong("lastCheckedAt", 0));
            arr.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("accounts", arr);
        call.resolve(ret);
    }

    /** Turns alerts on/off for an account and records its current state as the baseline. */
    @PluginMethod
    public void setDeviceAlert(PluginCall call) {
        try {
            JSONObject account = new JSONObject()
                .put("email", call.getString("email"))
                .put("label", call.getString("label"))
                .put("password", call.getString("password"))
                .put("baseUrl", call.getString("baseUrl"));
            boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled"));
            DeviceWatcher.setWatched(getContext(), account, enabled);
            if (enabled) {
                // Baseline now (off the main thread), so the first real change can alert.
                new Thread(() -> DeviceWatcher.runCheck(getContext())).start();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not change the alert: " + e.getMessage(), e);
        }
    }

    /** Runs a check right away (used when returning to the Devices screen and in tests). */
    @PluginMethod
    public void checkDevicesNow(PluginCall call) {
        new Thread(() -> {
            DeviceWatcher.runCheck(getContext());
            call.resolve();
        }).start();
    }

    // ----- Schedules -----

    /** Creates or replaces a schedule and sets its alarm. Returns it with id and nextAt. */
    @PluginMethod
    public void saveSchedule(PluginCall call) {
        try {
            JSONObject s = new JSONObject(call.getObject("schedule").toString());
            if (s.optString("id").isEmpty()) s.put("id", UUID.randomUUID().toString());
            if (!s.has("active")) s.put("active", true);
            JSONObject saved = ScheduleManager.arm(getContext(), s);
            call.resolve(publicView(saved));
        } catch (Exception e) {
            call.reject("Could not save the schedule: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void listSchedules(PluginCall call) {
        JSArray arr = new JSArray();
        for (JSONObject s : ScheduleManager.load(getContext())) arr.put(publicView(s));
        JSObject ret = new JSObject();
        ret.put("schedules", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void setScheduleActive(PluginCall call) {
        String id = call.getString("id");
        JSONObject s = id != null ? ScheduleManager.find(getContext(), id) : null;
        if (s == null) {
            call.reject("Schedule not found");
            return;
        }
        try {
            s.put("active", Boolean.TRUE.equals(call.getBoolean("active")));
            call.resolve(publicView(ScheduleManager.arm(getContext(), s)));
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteSchedule(PluginCall call) {
        String id = call.getString("id");
        if (id != null) ScheduleManager.remove(getContext(), id);
        call.resolve();
    }

    /** Whether alarms will fire on time ("Alarms & reminders" permission, Android 12+). */
    @PluginMethod
    public void exactAlarmStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("exact", ScheduleManager.canScheduleExact(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                .setData(Uri.parse("package:" + getContext().getPackageName()))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    /** The schedule as JS sees it: never sends the stored password back to the WebView. */
    private static JSObject publicView(JSONObject s) {
        try {
            JSObject o = JSObject.fromJSONObject(s);
            o.remove("password");
            return o;
        } catch (Exception e) {
            return new JSObject();
        }
    }

    @PluginMethod
    public void track(PluginCall call) {
        RunTrackerService.Run run = new RunTrackerService.Run();
        run.deploymentId = call.getString("deploymentId");
        run.botName = call.getString("botName", "Bot");
        run.userEmail = call.getString("userEmail");
        run.password = call.getString("password");
        run.baseUrl = call.getString("baseUrl");
        run.token = call.getString("token");
        if (run.deploymentId == null || run.userEmail == null || run.baseUrl == null) {
            call.reject("deploymentId, userEmail and baseUrl are required");
            return;
        }
        try {
            RunTrackerService.track(getContext(), run);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start tracking: " + e.getMessage(), e);
        }
    }

    /** Route of the notification that launched the app, if any (consumed once). */
    @PluginMethod
    public void getLaunchRoute(PluginCall call) {
        JSObject ret = new JSObject();
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        String route = intent != null ? intent.getStringExtra(RunTrackerService.EXTRA_ROUTE) : null;
        if (route != null) intent.removeExtra(RunTrackerService.EXTRA_ROUTE);
        ret.put("route", route);
        call.resolve(ret);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String route = intent.getStringExtra(RunTrackerService.EXTRA_ROUTE);
        if (route != null) {
            JSObject data = new JSObject();
            data.put("route", route);
            notifyListeners("openRoute", data);
        }
    }
}
