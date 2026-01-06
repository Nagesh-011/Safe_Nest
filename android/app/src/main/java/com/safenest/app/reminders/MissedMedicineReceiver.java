package com.safenest.app.reminders;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.safenest.app.MainActivity;
import com.safenest.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Handles missed medicine follow-up notifications and escalating reminders.
 * 
 * Flow:
 * 1. Initial reminder fires at scheduled time (MedicineReminderReceiver)
 * 2. MedicineReminderReceiver schedules a follow-up check after 30 minutes
 * 3. This receiver checks if medicine was taken (via SharedPreferences)
 * 4. If not taken:
 *    - Shows "MISSED" notification to senior
 *    - Schedules escalating reminder (every 15 min)
 *    - After grace period (60 min), marks as MISSED and alerts caregiver
 */
public class MissedMedicineReceiver extends BroadcastReceiver {
    private static final String TAG = "MissedMedicine";
    
    public static final String CHANNEL_MISSED = "missed_medicine";
    public static final String CHANNEL_CAREGIVER_ALERT = "caregiver_alerts";
    
    public static final String ACTION_CHECK_MISSED = "com.safenest.CHECK_MISSED";
    public static final String ACTION_ESCALATE = "com.safenest.ESCALATE_REMINDER";
    public static final String ACTION_MARK_MISSED = "com.safenest.MARK_MISSED";
    
    public static final String EXTRA_MEDICINE_ID = "medicine_id";
    public static final String EXTRA_MEDICINE_NAME = "medicine_name";
    public static final String EXTRA_DOSAGE = "dosage";
    public static final String EXTRA_SCHEDULED_TIME = "scheduled_time";
    public static final String EXTRA_IS_CRITICAL = "is_critical";
    public static final String EXTRA_ESCALATION_COUNT = "escalation_count";
    public static final String EXTRA_VOICE_ENABLED = "voice_enabled";
    
    private static final String PREFS_NAME = "SafeNestMedicineTaken";
    private static final int ESCALATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    private static final int MAX_ESCALATIONS = 4; // Max 1 hour of escalations (4 x 15 min)
    private static final int GRACE_PERIOD_MINUTES = 60; // After this, mark as MISSED
    
    private TextToSpeech tts;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        String medicineId = intent.getStringExtra(EXTRA_MEDICINE_ID);
        String medicineName = intent.getStringExtra(EXTRA_MEDICINE_NAME);
        String dosage = intent.getStringExtra(EXTRA_DOSAGE);
        String scheduledTime = intent.getStringExtra(EXTRA_SCHEDULED_TIME);
        boolean isCritical = intent.getBooleanExtra(EXTRA_IS_CRITICAL, false);
        boolean voiceEnabled = intent.getBooleanExtra(EXTRA_VOICE_ENABLED, true);
        int escalationCount = intent.getIntExtra(EXTRA_ESCALATION_COUNT, 0);
        
        if (medicineId == null || medicineName == null) {
            Log.e(TAG, "Missing required extras");
            return;
        }
        
        createNotificationChannels(context);
        
        // Check if medicine was already taken
        if (wasMedicineTaken(context, medicineId, scheduledTime)) {
            Log.d(TAG, "Medicine " + medicineName + " was already taken, canceling follow-up");
            cancelEscalation(context, medicineId, scheduledTime);
            return;
        }
        
        if (ACTION_CHECK_MISSED.equals(action)) {
            // First follow-up check (30 min after scheduled time)
            Log.d(TAG, "First follow-up check for: " + medicineName);
            handleFirstFollowUp(context, medicineId, medicineName, dosage, scheduledTime, isCritical, voiceEnabled);
            
        } else if (ACTION_ESCALATE.equals(action)) {
            // Escalating reminder (every 15 min)
            Log.d(TAG, "Escalation #" + escalationCount + " for: " + medicineName);
            handleEscalation(context, medicineId, medicineName, dosage, scheduledTime, isCritical, voiceEnabled, escalationCount);
            
        } else if (ACTION_MARK_MISSED.equals(action)) {
            // Final: Mark as MISSED and alert caregiver
            Log.d(TAG, "Marking as MISSED and alerting caregiver: " + medicineName);
            handleMarkMissed(context, medicineId, medicineName, dosage, scheduledTime, isCritical);
        }
    }
    
    /**
     * First follow-up (30 min after scheduled time)
     * Shows urgent notification and schedules escalation
     */
    private void handleFirstFollowUp(Context context, String medicineId, String medicineName,
                                      String dosage, String scheduledTime, boolean isCritical,
                                      boolean voiceEnabled) {
        // Show "You haven't taken your medicine" notification
        showMissedNotification(context, medicineId, medicineName, dosage, scheduledTime, isCritical, 0);
        
        // Speak reminder if enabled
        if (voiceEnabled) {
            speakMissedReminder(context, medicineName, dosage, false);
        }
        
        // Vibrate urgently
        vibrateDevice(context, true);
        
        // Schedule first escalation in 15 minutes
        scheduleEscalation(context, medicineId, medicineName, dosage, scheduledTime, isCritical, voiceEnabled, 1);
        
        // Schedule final MISSED marking after grace period
        scheduleFinalMissed(context, medicineId, medicineName, dosage, scheduledTime, isCritical,
                           GRACE_PERIOD_MINUTES - 30); // 30 more minutes (since we're already 30 min in)
    }
    
    /**
     * Escalating reminder (every 15 min)
     */
    private void handleEscalation(Context context, String medicineId, String medicineName,
                                   String dosage, String scheduledTime, boolean isCritical,
                                   boolean voiceEnabled, int escalationCount) {
        // Show escalating notification
        showMissedNotification(context, medicineId, medicineName, dosage, scheduledTime, isCritical, escalationCount);
        
        // Speak reminder with urgency
        if (voiceEnabled) {
            speakMissedReminder(context, medicineName, dosage, escalationCount >= 2);
        }
        
        // Vibrate
        vibrateDevice(context, true);
        
        // Schedule next escalation if not at max
        if (escalationCount < MAX_ESCALATIONS) {
            scheduleEscalation(context, medicineId, medicineName, dosage, scheduledTime, 
                              isCritical, voiceEnabled, escalationCount + 1);
        }
    }
    
    /**
     * Final: Mark as MISSED, alert caregiver, and store for sync
     */
    private void handleMarkMissed(Context context, String medicineId, String medicineName,
                                   String dosage, String scheduledTime, boolean isCritical) {
        // Store MISSED status for app to sync
        storeMissedMedicine(context, medicineId, scheduledTime);
        
        // Cancel any remaining escalations
        cancelEscalation(context, medicineId, scheduledTime);
        
        // Show final MISSED notification to senior
        showFinalMissedNotification(context, medicineId, medicineName, dosage, scheduledTime, isCritical);
        
        // Alert caregiver - FOR ALL MEDICINES (not just critical)
        sendCaregiverAlert(context, medicineId, medicineName, dosage, scheduledTime, isCritical);
        
        // Speak final warning
        speakMissedReminder(context, medicineName, dosage, true);
    }
    
    /**
     * Show notification that medicine was missed
     */
    private void showMissedNotification(Context context, String medicineId, String medicineName,
                                         String dosage, String scheduledTime, boolean isCritical,
                                         int escalationCount) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        // Intent to open app
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("navigate_to", "medicine");
        
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            context, 
            ("missed_" + medicineId).hashCode(), 
            openIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Action: Mark as Taken
        Intent takenIntent = new Intent(context, MedicineActionReceiver.class);
        takenIntent.setAction("ACTION_TAKEN");
        takenIntent.putExtra(EXTRA_MEDICINE_ID, medicineId);
        takenIntent.putExtra(EXTRA_SCHEDULED_TIME, scheduledTime);
        PendingIntent takenPendingIntent = PendingIntent.getBroadcast(
            context,
            ("missed_taken_" + medicineId + scheduledTime).hashCode(),
            takenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String channel = isCritical ? MedicineReminderReceiver.CHANNEL_CRITICAL : CHANNEL_MISSED;
        
        String title;
        String body;
        int minutesOverdue = 30 + (escalationCount * 15);
        
        if (escalationCount == 0) {
            title = "⚠️ Medicine Overdue: " + medicineName;
            body = "You haven't taken " + dosage + " (scheduled at " + scheduledTime + ")";
        } else {
            title = "🔴 URGENT: " + medicineName + " - " + minutesOverdue + "min overdue!";
            body = "Please take " + dosage + " NOW or tap 'Take Now'";
        }
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(openPendingIntent)
            .addAction(0, "✓ Take Now", takenPendingIntent)
            .setOngoing(escalationCount > 0); // Make persistent after first escalation
        
        if (isCritical || escalationCount >= 2) {
            builder.setFullScreenIntent(openPendingIntent, true);
        }
        
        int notificationId = ("missed_" + medicineId + scheduledTime).hashCode();
        manager.notify(notificationId, builder.build());
    }
    
    /**
     * Show final MISSED notification
     */
    private void showFinalMissedNotification(Context context, String medicineId, String medicineName,
                                              String dosage, String scheduledTime, boolean isCritical) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("navigate_to", "medicine");
        
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            context, 
            ("final_missed_" + medicineId).hashCode(), 
            openIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String title = "❌ MISSED: " + medicineName;
        String body = "You missed " + dosage + " scheduled at " + scheduledTime + ". Your caregiver has been notified.";
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_MISSED)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(openPendingIntent);
        
        int notificationId = ("final_missed_" + medicineId + scheduledTime).hashCode();
        manager.notify(notificationId, builder.build());
    }
    
    /**
     * Send alert to caregiver (stored for app to send via Firebase)
     * Also writes directly to Firebase if possible
     */
    private void sendCaregiverAlert(Context context, String medicineId, String medicineName,
                                     String dosage, String scheduledTime, boolean isCritical) {
        try {
            // Store in SharedPreferences as backup
            SharedPreferences prefs = context.getSharedPreferences("SafeNestCaregiverAlerts", Context.MODE_PRIVATE);
            String existingAlerts = prefs.getString("pending_alerts", "[]");
            JSONArray alerts = new JSONArray(existingAlerts);
            
            JSONObject alert = new JSONObject();
            alert.put("type", "MEDICINE_MISSED");
            alert.put("medicineId", medicineId);
            alert.put("medicineName", medicineName);
            alert.put("dosage", dosage);
            alert.put("scheduledTime", scheduledTime);
            alert.put("isCritical", isCritical);
            alert.put("timestamp", System.currentTimeMillis());
            alert.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
            
            alerts.put(alert);
            prefs.edit().putString("pending_alerts", alerts.toString()).apply();
            
            Log.d(TAG, "Caregiver alert stored: " + medicineName + " MISSED");
            
            // Write directly to Firebase
            writeAlertToFirebase(context, medicineId, medicineName, dosage, scheduledTime, isCritical);
        } catch (Exception e) {
            Log.e(TAG, "Failed to store caregiver alert", e);
        }
    }
    
    /**
     * Write caregiver alert directly to Firebase
     */
    private void writeAlertToFirebase(Context context, String medicineId, String medicineName,
                                       String dosage, String scheduledTime, boolean isCritical) {
        try {
            SharedPreferences configPrefs = context.getSharedPreferences("SafeNestConfig", Context.MODE_PRIVATE);
            String householdId = configPrefs.getString("household_id", null);
            
            if (householdId == null) {
                Log.w(TAG, "No householdId stored, cannot write to Firebase");
                return;
            }
            
            com.google.firebase.database.FirebaseDatabase database = 
                com.google.firebase.database.FirebaseDatabase.getInstance();
            com.google.firebase.database.DatabaseReference alertsRef = 
                database.getReference("households").child(householdId).child("alerts");
            
            String alertId = "missed_" + medicineId + "_" + System.currentTimeMillis();
            
            java.util.Map<String, Object> alertData = new java.util.HashMap<>();
            alertData.put("id", alertId);
            alertData.put("type", "MEDICINE_MISSED");
            alertData.put("medicineId", medicineId);
            alertData.put("medicineName", medicineName);
            alertData.put("dosage", dosage);
            alertData.put("scheduledTime", scheduledTime);
            alertData.put("isCritical", isCritical);
            alertData.put("timestamp", System.currentTimeMillis());
            alertData.put("date", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));
            alertData.put("read", false);
            
            alertsRef.child(alertId).setValue(alertData)
                .addOnSuccessListener(aVoid -> Log.d(TAG, "Alert written to Firebase: " + alertId))
                .addOnFailureListener(e -> Log.e(TAG, "Failed to write alert to Firebase", e));
        } catch (Exception e) {
            Log.e(TAG, "Error writing alert to Firebase", e);
        }
    }
    
    /**
     * Store missed medicine status for app to sync
     * Also writes directly to Firebase if possible
     */
    private void storeMissedMedicine(Context context, String medicineId, String scheduledTime) {
        try {
            // Store in SharedPreferences as backup
            SharedPreferences prefs = context.getSharedPreferences("SafeNestMedicineActions", Context.MODE_PRIVATE);
            String existing = prefs.getString("pending_actions", "[]");
            JSONArray actions = new JSONArray(existing);
            
            JSONObject action = new JSONObject();
            action.put("medicineId", medicineId);
            action.put("scheduledTime", scheduledTime);
            action.put("status", "MISSED");
            action.put("timestamp", System.currentTimeMillis());
            action.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
            
            actions.put(action);
            prefs.edit().putString("pending_actions", actions.toString()).apply();
            
            Log.d(TAG, "MISSED status stored for sync: " + medicineId);
            
            // Write directly to Firebase
            writeMissedLogToFirebase(context, medicineId, scheduledTime);
        } catch (Exception e) {
            Log.e(TAG, "Failed to store missed status", e);
        }
    }
    
    /**
     * Write missed medicine log directly to Firebase
     */
    private void writeMissedLogToFirebase(Context context, String medicineId, String scheduledTime) {
        try {
            SharedPreferences configPrefs = context.getSharedPreferences("SafeNestConfig", Context.MODE_PRIVATE);
            String householdId = configPrefs.getString("household_id", null);
            
            if (householdId == null) {
                Log.w(TAG, "No householdId stored, cannot write to Firebase");
                return;
            }
            
            // Get medicine name from SharedPreferences (stored when scheduling reminder)
            SharedPreferences reminderPrefs = context.getSharedPreferences("SafeNestReminders", Context.MODE_PRIVATE);
            String medicineDataJson = reminderPrefs.getString("medicine_" + medicineId, null);
            String medicineName = "Medicine";
            String dosage = "";
            
            if (medicineDataJson != null) {
                try {
                    JSONObject medicineData = new JSONObject(medicineDataJson);
                    medicineName = medicineData.optString("name", "Medicine");
                    dosage = medicineData.optString("dosage", "");
                } catch (Exception e) {
                    Log.w(TAG, "Could not parse medicine data", e);
                }
            }
            
            com.google.firebase.database.FirebaseDatabase database = 
                com.google.firebase.database.FirebaseDatabase.getInstance();
            com.google.firebase.database.DatabaseReference logsRef = 
                database.getReference("households").child(householdId).child("medicineLogs");
            
            String logId = medicineId + "_native_" + System.currentTimeMillis();
            String isoDate = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date());
            
            java.util.Map<String, Object> logData = new java.util.HashMap<>();
            logData.put("id", logId);
            logData.put("medicineId", medicineId);
            logData.put("medicineName", medicineName);
            logData.put("dosage", dosage);
            logData.put("scheduledTime", scheduledTime);
            logData.put("status", "MISSED");
            logData.put("date", isoDate);
            logData.put("autoMarked", true);
            logData.put("source", "native");
            
            logsRef.child(logId).setValue(logData)
                .addOnSuccessListener(aVoid -> Log.d(TAG, "MISSED log written to Firebase: " + logId))
                .addOnFailureListener(e -> Log.e(TAG, "Failed to write MISSED log to Firebase", e));
        } catch (Exception e) {
            Log.e(TAG, "Error writing MISSED log to Firebase", e);
        }
    }
    
    /**
     * Check if medicine was taken (via SharedPreferences flag set by app/notification action)
     */
    private boolean wasMedicineTaken(Context context, String medicineId, String scheduledTime) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String key = medicineId + "_" + scheduledTime + "_" + getTodayDate();
        return prefs.getBoolean(key, false);
    }
    
    /**
     * Mark medicine as taken (called from MedicineActionReceiver)
     */
    public static void markMedicineTaken(Context context, String medicineId, String scheduledTime) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String key = medicineId + "_" + scheduledTime + "_" + getTodayDate();
        prefs.edit().putBoolean(key, true).apply();
        Log.d(TAG, "Medicine marked as taken: " + key);
    }
    
    private static String getTodayDate() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
    
    /**
     * Schedule first follow-up check (30 min after scheduled time)
     */
    public static void scheduleFollowUp(Context context, String medicineId, String medicineName,
                                         String dosage, String scheduledTime, boolean isCritical,
                                         boolean voiceEnabled) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        Intent intent = new Intent(context, MissedMedicineReceiver.class);
        intent.setAction(ACTION_CHECK_MISSED);
        intent.putExtra(EXTRA_MEDICINE_ID, medicineId);
        intent.putExtra(EXTRA_MEDICINE_NAME, medicineName);
        intent.putExtra(EXTRA_DOSAGE, dosage);
        intent.putExtra(EXTRA_SCHEDULED_TIME, scheduledTime);
        intent.putExtra(EXTRA_IS_CRITICAL, isCritical);
        intent.putExtra(EXTRA_VOICE_ENABLED, voiceEnabled);
        
        int requestCode = ("followup_" + medicineId + scheduledTime).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Schedule 30 minutes from now
        long triggerTime = System.currentTimeMillis() + (30 * 60 * 1000);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }
        
        Log.d(TAG, "Scheduled follow-up check in 30 min for: " + medicineName);
    }
    
    /**
     * Schedule escalating reminder
     */
    private void scheduleEscalation(Context context, String medicineId, String medicineName,
                                     String dosage, String scheduledTime, boolean isCritical,
                                     boolean voiceEnabled, int escalationCount) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        Intent intent = new Intent(context, MissedMedicineReceiver.class);
        intent.setAction(ACTION_ESCALATE);
        intent.putExtra(EXTRA_MEDICINE_ID, medicineId);
        intent.putExtra(EXTRA_MEDICINE_NAME, medicineName);
        intent.putExtra(EXTRA_DOSAGE, dosage);
        intent.putExtra(EXTRA_SCHEDULED_TIME, scheduledTime);
        intent.putExtra(EXTRA_IS_CRITICAL, isCritical);
        intent.putExtra(EXTRA_VOICE_ENABLED, voiceEnabled);
        intent.putExtra(EXTRA_ESCALATION_COUNT, escalationCount);
        
        int requestCode = ("escalate_" + medicineId + scheduledTime + "_" + escalationCount).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        long triggerTime = System.currentTimeMillis() + ESCALATION_INTERVAL_MS;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }
        
        Log.d(TAG, "Scheduled escalation #" + escalationCount + " in 15 min for: " + medicineName);
    }
    
    /**
     * Schedule final MISSED marking
     */
    private void scheduleFinalMissed(Context context, String medicineId, String medicineName,
                                      String dosage, String scheduledTime, boolean isCritical,
                                      int delayMinutes) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        Intent intent = new Intent(context, MissedMedicineReceiver.class);
        intent.setAction(ACTION_MARK_MISSED);
        intent.putExtra(EXTRA_MEDICINE_ID, medicineId);
        intent.putExtra(EXTRA_MEDICINE_NAME, medicineName);
        intent.putExtra(EXTRA_DOSAGE, dosage);
        intent.putExtra(EXTRA_SCHEDULED_TIME, scheduledTime);
        intent.putExtra(EXTRA_IS_CRITICAL, isCritical);
        
        int requestCode = ("final_missed_" + medicineId + scheduledTime).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        long triggerTime = System.currentTimeMillis() + (delayMinutes * 60 * 1000);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }
        
        Log.d(TAG, "Scheduled MISSED marking in " + delayMinutes + " min for: " + medicineName);
    }
    
    /**
     * Cancel all escalation alarms for a medicine
     */
    public static void cancelEscalation(Context context, String medicineId, String scheduledTime) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        // Cancel follow-up
        Intent followUpIntent = new Intent(context, MissedMedicineReceiver.class);
        followUpIntent.setAction(ACTION_CHECK_MISSED);
        PendingIntent followUpPI = PendingIntent.getBroadcast(
            context, ("followup_" + medicineId + scheduledTime).hashCode(),
            followUpIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarmManager.cancel(followUpPI);
        
        // Cancel escalations
        for (int i = 0; i <= MAX_ESCALATIONS; i++) {
            Intent escalateIntent = new Intent(context, MissedMedicineReceiver.class);
            escalateIntent.setAction(ACTION_ESCALATE);
            PendingIntent escalatePI = PendingIntent.getBroadcast(
                context, ("escalate_" + medicineId + scheduledTime + "_" + i).hashCode(),
                escalateIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(escalatePI);
        }
        
        // Cancel final missed
        Intent missedIntent = new Intent(context, MissedMedicineReceiver.class);
        missedIntent.setAction(ACTION_MARK_MISSED);
        PendingIntent missedPI = PendingIntent.getBroadcast(
            context, ("final_missed_" + medicineId + scheduledTime).hashCode(),
            missedIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarmManager.cancel(missedPI);
        
        // Clear notification
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(("missed_" + medicineId + scheduledTime).hashCode());
        
        Log.d(TAG, "Cancelled all escalations for: " + medicineId);
    }
    
    /**
     * Create notification channels
     */
    private void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            
            // Missed medicine channel
            NotificationChannel missedChannel = new NotificationChannel(
                CHANNEL_MISSED,
                "Missed Medicine Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            missedChannel.setDescription("Alerts when you miss taking your medicine");
            missedChannel.enableVibration(true);
            missedChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
            missedChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            missedChannel.setSound(alarmSound, audioAttributes);
            manager.createNotificationChannel(missedChannel);
            
            // Caregiver alerts channel
            NotificationChannel caregiverChannel = new NotificationChannel(
                CHANNEL_CAREGIVER_ALERT,
                "Caregiver Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            caregiverChannel.setDescription("Alerts sent to caregivers about missed medicines");
            caregiverChannel.enableVibration(true);
            manager.createNotificationChannel(caregiverChannel);
        }
    }
    
    /**
     * Speak missed reminder using TTS
     */
    private void speakMissedReminder(Context context, String medicineName, String dosage, boolean urgent) {
        tts = new TextToSpeech(context, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(Locale.US);
                
                StringBuilder speech = new StringBuilder();
                if (urgent) {
                    speech.append("Urgent! You have missed your medicine. ");
                } else {
                    speech.append("Reminder. You haven't taken your medicine. ");
                }
                speech.append("Please take ").append(medicineName);
                if (dosage != null && !dosage.isEmpty()) {
                    speech.append(", ").append(dosage);
                }
                speech.append(" now.");
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    tts.speak(speech.toString(), TextToSpeech.QUEUE_FLUSH, null, "missed_reminder");
                } else {
                    tts.speak(speech.toString(), TextToSpeech.QUEUE_FLUSH, null);
                }
                
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    if (tts != null) {
                        tts.stop();
                        tts.shutdown();
                        tts = null;
                    }
                }, 6000);
            }
        });
    }
    
    /**
     * Vibrate device
     */
    private void vibrateDevice(Context context, boolean urgent) {
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        
        long[] pattern = urgent 
            ? new long[]{0, 500, 200, 500, 200, 500, 200, 500} 
            : new long[]{0, 300, 200, 300};
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
        } else {
            vibrator.vibrate(pattern, -1);
        }
    }
}
