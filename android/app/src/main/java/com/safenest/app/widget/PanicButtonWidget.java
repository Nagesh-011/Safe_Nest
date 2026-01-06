package com.safenest.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.widget.RemoteViews;

import com.safenest.app.MainActivity;
import com.safenest.app.R;

/**
 * Panic Button Widget for Home Screen
 * 
 * A large red SOS button that seniors can tap from the home screen
 * to immediately trigger emergency mode without opening the app.
 */
public class PanicButtonWidget extends AppWidgetProvider {
    private static final String TAG = "PanicButtonWidget";
    public static final String ACTION_PANIC_SOS = "com.safenest.app.PANIC_SOS";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_panic_button);

        // Create intent to trigger SOS
        Intent sosIntent = new Intent(context, MainActivity.class);
        sosIntent.setAction(ACTION_PANIC_SOS);
        sosIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, sosIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_sos_button, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
        Log.d(TAG, "Widget updated for ID: " + appWidgetId);
    }

    @Override
    public void onEnabled(Context context) {
        Log.d(TAG, "First widget added");
    }

    @Override
    public void onDisabled(Context context) {
        Log.d(TAG, "Last widget removed");
    }
}
