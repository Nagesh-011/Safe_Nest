package com.safenest.app.reminders;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Re-schedules all medicine reminders after device boot
 */
public class ReminderBootReceiver extends BroadcastReceiver {
    private static final String TAG = "ReminderBoot";
    private static final String PREFS_NAME = "SafeNestReminders";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            
            Log.d(TAG, "Device booted, re-scheduling medicine reminders");
            
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String remindersJson = prefs.getString("scheduled_reminders", "[]");
                JSONArray reminders = new JSONArray(remindersJson);
                
                MedicineReminderScheduler scheduler = new MedicineReminderScheduler(context);
                
                for (int i = 0; i < reminders.length(); i++) {
                    JSONObject reminder = reminders.getJSONObject(i);
                    scheduler.scheduleReminder(
                        reminder.getString("medicineId"),
                        reminder.getString("medicineName"),
                        reminder.getString("dosage"),
                        reminder.getString("time"),
                        reminder.optBoolean("isCritical", false),
                        reminder.optString("instructions", ""),
                        reminder.optBoolean("voiceEnabled", true)
                    );
                }
                
                Log.d(TAG, "Re-scheduled " + reminders.length() + " reminders");
            } catch (Exception e) {
                Log.e(TAG, "Failed to re-schedule reminders", e);
            }
        }
    }
}
