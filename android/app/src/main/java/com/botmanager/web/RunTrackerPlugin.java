package com.botmanager.web;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between lib/runTracker.ts and RunTrackerService. Also reports which screen a
 * tapped notification should open ("openRoute" event, or getLaunchRoute() on cold start).
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
