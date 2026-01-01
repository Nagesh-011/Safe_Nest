package com.safenest.app.fit;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;

@CapacitorPlugin(name = "GoogleFit")
public class GoogleFitPlugin extends Plugin {
    private static final String TAG = "GoogleFitPlugin";
    private static final int REQUEST_CODE = 1001; // Internal request code for permissions

    @PluginMethod
    public void hasPermissions(PluginCall call) {
        try {
            Context ctx = getContext();
            FitSignInHandler handler = new FitSignInHandler(ctx);
            boolean ok = handler.hasPermissions();
            JSObject ret = new JSObject();
            ret.put("hasPermissions", ok);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "hasPermissions error", e);
            call.reject("hasPermissions error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            Activity act = getActivity();
            FitSignInHandler handler = new FitSignInHandler(getContext());
            handler.requestPermissions(act, REQUEST_CODE);

            // We resolve immediately; client should call hasPermissions() after user completes flow
            JSObject ret = new JSObject();
            ret.put("started", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "requestPermissions error", e);
            call.reject("requestPermissions error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void ensureSubscriptions(PluginCall call) {
        try {
            // Use blocking wrapper to ensure Kotlin suspend function is executed
            FitRepository repo = new FitRepository(getContext());
            repo.ensureSubscriptionsBlocking();
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "ensureSubscriptions error", e);
            call.reject("ensureSubscriptions error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getVitals(PluginCall call) {
        try {
            FitRepository repo = new FitRepository(getContext());
            int steps = repo.getTodayStepsBlocking();
            Float hr = repo.getLatestHeartRateBlocking(30);
            float calories = repo.getCaloriesTodayBlocking();
            float distance = repo.getDistanceTodayBlocking();

            JSObject ret = new JSObject();
            ret.put("steps", steps);
            if (hr != null) ret.put("heartRate", hr.doubleValue()); else ret.put("heartRate", null);
            ret.put("calories", (double) calories);
            ret.put("distanceMeters", (double) distance);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getVitals error", e);
            call.reject("getVitals error: " + e.getMessage());
        }
    }
}
