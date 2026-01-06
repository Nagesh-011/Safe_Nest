package com.safenest.app.reminders;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Handles notification action button clicks (Taken, Snooze, Skip)
 */
public class MedicineActionReceiver extends BroadcastReceiver {
    private static final String TAG = "MedicineAction";
    private static final String PREFS_NAME = "SafeNestMedicineActions";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String medicineId = intent.getStringExtra(MedicineReminderReceiver.EXTRA_MEDICINE_ID);
        String scheduledTime = intent.getStringExtra(MedicineReminderReceiver.EXTRA_SCHEDULED_TIME);
        
        Log.d(TAG, "Action received: " + action + " for " + medicineId);
        
        if (action == null || medicineId == null) return;
        
        // Dismiss the notification
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        int notificationId = (medicineId + scheduledTime).hashCode();
        manager.cancel(notificationId);
        
        switch (action) {
            case "ACTION_TAKEN":
                handleTaken(context, medicineId, scheduledTime);
                break;
            case "ACTION_SNOOZE":
                handleSnooze(context, intent);
                break;
            case "ACTION_SKIP":
                handleSkip(context, medicineId, scheduledTime);
                break;
        }
    }
    
    private void handleTaken(Context context, String medicineId, String scheduledTime) {
        Log.d(TAG, "Marking as taken: " + medicineId);
        
        // Store the action to be synced when app opens
        storeActionForSync(context, medicineId, scheduledTime, "TAKEN");
        
        // Mark as taken to prevent missed medicine follow-ups
        MissedMedicineReceiver.markMedicineTaken(context, medicineId, scheduledTime);
        
        // Cancel any pending missed medicine alarms
        MissedMedicineReceiver.cancelEscalation(context, medicineId, scheduledTime);
        
        // Also cancel any missed notification
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(("missed_" + medicineId + scheduledTime).hashCode());
        manager.cancel(("final_missed_" + medicineId + scheduledTime).hashCode());
    }
    
    private void handleSnooze(Context context, Intent originalIntent) {
        String medicineId = originalIntent.getStringExtra(MedicineReminderReceiver.EXTRA_MEDICINE_ID);
        String medicineName = originalIntent.getStringExtra(MedicineReminderReceiver.EXTRA_MEDICINE_NAME);
        String dosage = originalIntent.getStringExtra(MedicineReminderReceiver.EXTRA_DOSAGE);
        String scheduledTime = originalIntent.getStringExtra(MedicineReminderReceiver.EXTRA_SCHEDULED_TIME);
        boolean isCritical = originalIntent.getBooleanExtra(MedicineReminderReceiver.EXTRA_IS_CRITICAL, false);
        String instructions = originalIntent.getStringExtra(MedicineReminderReceiver.EXTRA_INSTRUCTIONS);
        boolean voiceEnabled = originalIntent.getBooleanExtra(MedicineReminderReceiver.EXTRA_VOICE_ENABLED, true);
        
        Log.d(TAG, "Snoozing for 15 minutes: " + medicineId);
        
        // Store snooze action
        storeActionForSync(context, medicineId, scheduledTime, "SNOOZED");
        
        // Schedule new reminder in 15 minutes
        long snoozeTime = System.currentTimeMillis() + (15 * 60 * 1000);
        
        Intent reminderIntent = new Intent(context, MedicineReminderReceiver.class);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_MEDICINE_ID, medicineId);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_MEDICINE_NAME, medicineName);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_DOSAGE, dosage);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_SCHEDULED_TIME, scheduledTime);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_IS_CRITICAL, isCritical);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_INSTRUCTIONS, instructions);
        reminderIntent.putExtra(MedicineReminderReceiver.EXTRA_VOICE_ENABLED, voiceEnabled);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            ("snooze_alarm_" + medicineId + scheduledTime).hashCode(),
            reminderIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, snoozeTime, pendingIntent);
        }
        
        Log.d(TAG, "Snoozed alarm scheduled for 15 minutes later");
    }
    
    private void handleSkip(Context context, String medicineId, String scheduledTime) {
        Log.d(TAG, "Marking as skipped: " + medicineId);
        storeActionForSync(context, medicineId, scheduledTime, "SKIPPED");
    }
    
    /**
     * Store actions to be synced to Firebase when app opens
     */
    private void storeActionForSync(Context context, String medicineId, String scheduledTime, String status) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingActions = prefs.getString("pending_actions", "[]");
            JSONArray actions = new JSONArray(existingActions);
            
            JSONObject action = new JSONObject();
            action.put("medicineId", medicineId);
            action.put("scheduledTime", scheduledTime);
            action.put("status", status);
            action.put("timestamp", System.currentTimeMillis());
            action.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
            
            actions.put(action);
            
            prefs.edit().putString("pending_actions", actions.toString()).apply();
            Log.d(TAG, "Action stored for sync: " + action.toString());
        } catch (Exception e) {
            Log.e(TAG, "Failed to store action", e);
        }
    }
}
