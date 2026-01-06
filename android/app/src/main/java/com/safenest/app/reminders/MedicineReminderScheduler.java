package com.safenest.app.reminders;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Schedules medicine reminders using AlarmManager
 * Works even when app is in background or killed
 */
public class MedicineReminderScheduler {
    private static final String TAG = "ReminderScheduler";
    private static final String PREFS_NAME = "SafeNestReminders";
    
    private final Context context;
    private final AlarmManager alarmManager;
    private final SharedPreferences prefs;
    
    public MedicineReminderScheduler(Context context) {
        this.context = context;
        this.alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
    
    /**
     * Check if we can schedule exact alarms (Android 12+ requires permission)
     */
    public boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return alarmManager.canScheduleExactAlarms();
        }
        return true; // Pre-Android 12 doesn't need this check
    }
    
    /**
     * Schedule a daily reminder for a medicine
     * @param medicineId Unique medicine ID
     * @param medicineName Name of the medicine
     * @param dosage Dosage string (e.g., "2 tablets")
     * @param time Time in HH:mm format (e.g., "08:00")
     * @param isCritical Whether this is a critical medicine
     * @param instructions Optional instructions
     * @param voiceEnabled Whether to speak the reminder aloud
     */
    public void scheduleReminder(String medicineId, String medicineName, String dosage, 
                                  String time, boolean isCritical, String instructions,
                                  boolean voiceEnabled) {
        try {
            Log.d(TAG, "========== Scheduling Reminder ==========");
            Log.d(TAG, "Medicine: " + medicineName + ", Time: " + time);
            
            // Check Android 12+ exact alarm permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "⚠️ Cannot schedule exact alarms! Permission not granted.");
                // Fall back to inexact alarm (less reliable but better than nothing)
            }
            
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            
            // Calculate next occurrence of this time
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            
            // If time has passed today, schedule for tomorrow
            if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                Log.d(TAG, "Time already passed today, scheduling for tomorrow");
            }
            
            Intent intent = new Intent(context, MedicineReminderReceiver.class);
            intent.setAction("com.safenest.MEDICINE_REMINDER");
            intent.putExtra(MedicineReminderReceiver.EXTRA_MEDICINE_ID, medicineId);
            intent.putExtra(MedicineReminderReceiver.EXTRA_MEDICINE_NAME, medicineName);
            intent.putExtra(MedicineReminderReceiver.EXTRA_DOSAGE, dosage);
            intent.putExtra(MedicineReminderReceiver.EXTRA_SCHEDULED_TIME, time);
            intent.putExtra(MedicineReminderReceiver.EXTRA_IS_CRITICAL, isCritical);
            intent.putExtra(MedicineReminderReceiver.EXTRA_INSTRUCTIONS, instructions);
            intent.putExtra(MedicineReminderReceiver.EXTRA_VOICE_ENABLED, voiceEnabled);
            
            int requestCode = (medicineId + time).hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Schedule exact alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                // Android 12+ with permission
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    pendingIntent
                );
                Log.d(TAG, "✅ Scheduled EXACT alarm (Android 12+)");
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Android 6+ (Doze mode aware)
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    pendingIntent
                );
                Log.d(TAG, "✅ Scheduled EXACT alarm (Doze-aware)");
            } else {
                // Older Android
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    pendingIntent
                );
                Log.d(TAG, "✅ Scheduled EXACT alarm (Legacy)");
            }
            
            // Store for re-scheduling after reboot
            storeReminder(medicineId, medicineName, dosage, time, isCritical, instructions, voiceEnabled);
            
            Log.d(TAG, "✅ Reminder scheduled: " + medicineName + " at " + time + 
                      " (triggers: " + calendar.getTime() + ")" + 
                      (voiceEnabled ? " [Voice ON]" : " [Voice OFF]"));
            Log.d(TAG, "==========================================");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to schedule reminder", e);
        }
    }
    
    /**
     * Cancel a scheduled reminder
     */
    public void cancelReminder(String medicineId, String time) {
        Intent intent = new Intent(context, MedicineReminderReceiver.class);
        intent.setAction("com.safenest.MEDICINE_REMINDER");
        
        int requestCode = (medicineId + time).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        alarmManager.cancel(pendingIntent);
        removeStoredReminder(medicineId, time);
        
        Log.d(TAG, "Cancelled reminder for " + medicineId + " at " + time);
    }
    
    /**
     * Cancel all reminders for a medicine
     */
    public void cancelAllRemindersForMedicine(String medicineId) {
        try {
            String remindersJson = prefs.getString("scheduled_reminders", "[]");
            JSONArray reminders = new JSONArray(remindersJson);
            JSONArray remaining = new JSONArray();
            
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject reminder = reminders.getJSONObject(i);
                if (reminder.getString("medicineId").equals(medicineId)) {
                    cancelReminder(medicineId, reminder.getString("time"));
                } else {
                    remaining.put(reminder);
                }
            }
            
            prefs.edit().putString("scheduled_reminders", remaining.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel reminders for medicine", e);
        }
    }
    
    private void storeReminder(String medicineId, String medicineName, String dosage,
                               String time, boolean isCritical, String instructions,
                               boolean voiceEnabled) {
        try {
            String remindersJson = prefs.getString("scheduled_reminders", "[]");
            JSONArray reminders = new JSONArray(remindersJson);
            
            // Remove existing reminder for same medicine+time
            JSONArray filtered = new JSONArray();
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject r = reminders.getJSONObject(i);
                if (!(r.getString("medicineId").equals(medicineId) && 
                      r.getString("time").equals(time))) {
                    filtered.put(r);
                }
            }
            
            // Add new reminder
            JSONObject reminder = new JSONObject();
            reminder.put("medicineId", medicineId);
            reminder.put("medicineName", medicineName);
            reminder.put("dosage", dosage);
            reminder.put("time", time);
            reminder.put("isCritical", isCritical);
            reminder.put("instructions", instructions);
            reminder.put("voiceEnabled", voiceEnabled);
            filtered.put(reminder);
            
            prefs.edit().putString("scheduled_reminders", filtered.toString()).apply();
            
            // Also store medicine data separately (for MissedMedicineReceiver lookup)
            JSONObject medicineData = new JSONObject();
            medicineData.put("name", medicineName);
            medicineData.put("dosage", dosage);
            medicineData.put("isCritical", isCritical);
            prefs.edit().putString("medicine_" + medicineId, medicineData.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to store reminder", e);
        }
    }
    
    private void removeStoredReminder(String medicineId, String time) {
        try {
            String remindersJson = prefs.getString("scheduled_reminders", "[]");
            JSONArray reminders = new JSONArray(remindersJson);
            JSONArray filtered = new JSONArray();
            
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject r = reminders.getJSONObject(i);
                if (!(r.getString("medicineId").equals(medicineId) && 
                      r.getString("time").equals(time))) {
                    filtered.put(r);
                }
            }
            
            prefs.edit().putString("scheduled_reminders", filtered.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to remove reminder", e);
        }
    }
}
