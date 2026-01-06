import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Medicine } from '../types';

/**
 * Native Medicine Reminders Plugin Interface
 * Handles background medicine reminders that work even when app is closed
 */
interface MedicineRemindersPluginInterface {
  scheduleReminder(options: {
    medicineId: string;
    medicineName: string;
    dosage?: string;
    time: string;
    isCritical?: boolean;
    instructions?: string;
    voiceReminderEnabled?: boolean;
  }): Promise<{ success: boolean; medicineId: string; time: string }>;

  scheduleMedicineReminders(options: {
    medicineId: string;
    medicineName: string;
    dosage?: string;
    times: string[];
    isCritical?: boolean;
    instructions?: string;
    voiceReminderEnabled?: boolean;
  }): Promise<{ success: boolean; medicineId: string; scheduledCount: number }>;

  cancelReminder(options: {
    medicineId: string;
    time: string;
  }): Promise<void>;

  cancelMedicineReminders(options: {
    medicineId: string;
  }): Promise<void>;

  getPendingActions(): Promise<{
    actions: Array<{
      medicineId: string;
      action: 'taken' | 'snoozed' | 'skipped';
      timestamp: number;
    }>;
  }>;

  clearPendingActions(): Promise<void>;

  requestBatteryOptimizationExemption(): Promise<void>;

  isBatteryOptimizationExempted(): Promise<{ isExempted: boolean }>;
  
  // Caregiver alert methods
  getPendingCaregiverAlerts(): Promise<{
    alerts: Array<{
      type: 'MEDICINE_MISSED';
      medicineId: string;
      medicineName: string;
      dosage: string;
      scheduledTime: string;
      isCritical: boolean;
      timestamp: number;
      date: string;
    }>;
  }>;
  
  clearPendingCaregiverAlerts(): Promise<void>;
  
  markMedicineTaken(options: {
    medicineId: string;
    scheduledTime: string;
  }): Promise<void>;
  
  // Household ID methods for native Firebase sync
  setHouseholdId(options: { householdId: string }): Promise<void>;
  getHouseholdId(): Promise<{ householdId: string | null }>;
  
  // Exact alarm permission methods (Android 12+)
  canScheduleExactAlarms(): Promise<{ canSchedule: boolean }>;
  requestExactAlarmPermission(): Promise<void>;
  
  // Debug methods
  getScheduledReminders(): Promise<{ 
    reminders: Array<{
      medicineId: string;
      medicineName: string;
      dosage: string;
      time: string;
      isCritical: boolean;
      voiceEnabled: boolean;
    }>;
    canScheduleExact: boolean;
  }>;
}

// Register the native plugin
const MedicineRemindersNative = registerPlugin<MedicineRemindersPluginInterface>('MedicineReminders');

/**
 * Background Medicine Reminder Service
 * 
 * This service handles scheduling medicine reminders that work even when:
 * - App is in background
 * - Screen is off
 * - App is killed/closed
 * - Device is rebooted
 * 
 * Uses Android AlarmManager with SCHEDULE_EXACT_ALARM permission for reliable delivery.
 */
class BackgroundMedicineReminders {
  private isNativeAvailable: boolean;

  constructor() {
    this.isNativeAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Check if native background reminders are available
   */
  isAvailable(): boolean {
    return this.isNativeAvailable;
  }

  /**
   * Schedule all reminders for a medicine
   * Call this when a new medicine is added or existing one is updated
   */
  async scheduleMedicine(medicine: Medicine): Promise<boolean> {
    if (!this.isNativeAvailable) {
      console.log('[BackgroundReminders] Native not available, skipping');
      return false;
    }

    try {
      // First cancel any existing reminders for this medicine
      await this.cancelMedicine(medicine.id);

      // Get times from medicine
      const times = medicine.times || [];
      if (times.length === 0) {
        console.log('[BackgroundReminders] No times scheduled for', medicine.name);
        return true;
      }

      // Schedule new reminders
      const result = await MedicineRemindersNative.scheduleMedicineReminders({
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: medicine.dosage,
        times: times,
        isCritical: medicine.isCritical || false,
        instructions: medicine.instructions || '',
        voiceReminderEnabled: medicine.voiceReminderEnabled !== false // Default true
      });

      console.log(`[BackgroundReminders] Scheduled ${result.scheduledCount} reminders for ${medicine.name}`);
      return result.success;
    } catch (error) {
      console.error('[BackgroundReminders] Failed to schedule:', error);
      return false;
    }
  }

  /**
   * Schedule a single reminder
   */
  async scheduleReminder(
    medicineId: string,
    medicineName: string,
    time: string,
    options?: {
      dosage?: string;
      isCritical?: boolean;
      instructions?: string;
    }
  ): Promise<boolean> {
    if (!this.isNativeAvailable) return false;

    try {
      const result = await MedicineRemindersNative.scheduleReminder({
        medicineId,
        medicineName,
        time,
        dosage: options?.dosage,
        isCritical: options?.isCritical,
        instructions: options?.instructions
      });
      return result.success;
    } catch (error) {
      console.error('[BackgroundReminders] Failed to schedule single reminder:', error);
      return false;
    }
  }

  /**
   * Cancel a specific reminder
   */
  async cancelReminder(medicineId: string, time: string): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.cancelReminder({ medicineId, time });
    } catch (error) {
      console.error('[BackgroundReminders] Failed to cancel reminder:', error);
    }
  }

  /**
   * Cancel all reminders for a medicine
   * Call this when a medicine is deleted
   */
  async cancelMedicine(medicineId: string): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.cancelMedicineReminders({ medicineId });
      console.log('[BackgroundReminders] Cancelled all reminders for medicine:', medicineId);
    } catch (error) {
      console.error('[BackgroundReminders] Failed to cancel medicine reminders:', error);
    }
  }

  /**
   * Get actions taken from notification buttons while app was closed
   * Returns array of {medicineId, action, timestamp}
   */
  async getPendingActions(): Promise<Array<{
    medicineId: string;
    action: 'taken' | 'snoozed' | 'skipped';
    timestamp: number;
  }>> {
    if (!this.isNativeAvailable) return [];

    try {
      const result = await MedicineRemindersNative.getPendingActions();
      return result.actions || [];
    } catch (error) {
      console.error('[BackgroundReminders] Failed to get pending actions:', error);
      return [];
    }
  }

  /**
   * Clear pending actions after they've been synced to Firebase
   */
  async clearPendingActions(): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.clearPendingActions();
    } catch (error) {
      console.error('[BackgroundReminders] Failed to clear pending actions:', error);
    }
  }

  /**
   * Request exemption from battery optimization
   * Important for reliable alarm delivery on devices that aggressively kill background processes
   */
  async requestBatteryExemption(): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.requestBatteryOptimizationExemption();
    } catch (error) {
      console.error('[BackgroundReminders] Failed to request battery exemption:', error);
    }
  }

  /**
   * Check if app is exempted from battery optimization
   */
  async isBatteryExempted(): Promise<boolean> {
    if (!this.isNativeAvailable) return true; // Assume true on non-Android

    try {
      const result = await MedicineRemindersNative.isBatteryOptimizationExempted();
      return result.isExempted;
    } catch (error) {
      console.error('[BackgroundReminders] Failed to check battery exemption:', error);
      return false;
    }
  }

  /**
   * Get pending caregiver alerts (medicine missed alerts from when app was closed)
   */
  async getPendingCaregiverAlerts(): Promise<Array<{
    type: 'MEDICINE_MISSED';
    medicineId: string;
    medicineName: string;
    dosage: string;
    scheduledTime: string;
    isCritical: boolean;
    timestamp: number;
    date: string;
  }>> {
    if (!this.isNativeAvailable) return [];

    try {
      const result = await MedicineRemindersNative.getPendingCaregiverAlerts();
      console.log('[BackgroundReminders] Got pending caregiver alerts:', result.alerts?.length || 0);
      return result.alerts || [];
    } catch (error) {
      console.error('[BackgroundReminders] Failed to get caregiver alerts:', error);
      return [];
    }
  }

  /**
   * Clear pending caregiver alerts after they've been sent to Firebase
   */
  async clearPendingCaregiverAlerts(): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.clearPendingCaregiverAlerts();
      console.log('[BackgroundReminders] Cleared pending caregiver alerts');
    } catch (error) {
      console.error('[BackgroundReminders] Failed to clear caregiver alerts:', error);
    }
  }

  /**
   * Mark a medicine as taken (cancels all missed follow-up notifications)
   * Call this when user marks medicine as taken in-app
   */
  async markMedicineTaken(medicineId: string, scheduledTime: string): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.markMedicineTaken({ medicineId, scheduledTime });
      console.log('[BackgroundReminders] Marked medicine as taken:', medicineId, scheduledTime);
    } catch (error) {
      console.error('[BackgroundReminders] Failed to mark medicine taken:', error);
    }
  }

  /**
   * Store household ID for native Firebase sync
   * Call this when household is set/changed
   */
  async setHouseholdId(householdId: string): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.setHouseholdId({ householdId });
      console.log('[BackgroundReminders] Stored householdId:', householdId);
    } catch (error) {
      console.error('[BackgroundReminders] Failed to store householdId:', error);
    }
  }

  /**
   * Get stored household ID from native
   */
  async getHouseholdId(): Promise<string | null> {
    if (!this.isNativeAvailable) return null;

    try {
      const result = await MedicineRemindersNative.getHouseholdId();
      return result.householdId;
    } catch (error) {
      console.error('[BackgroundReminders] Failed to get householdId:', error);
      return null;
    }
  }

  /**
   * Schedule reminders for all medicines
   * Useful to call on app startup to ensure all reminders are scheduled
   */
  async scheduleAllMedicines(medicines: Medicine[]): Promise<void> {
    if (!this.isNativeAvailable) return;

    console.log(`[BackgroundReminders] Scheduling ${medicines.length} medicines...`);
    
    for (const medicine of medicines) {
      await this.scheduleMedicine(medicine);
    }

    console.log('[BackgroundReminders] All medicines scheduled');
  }

  /**
   * Check if app can schedule exact alarms (required for reliable reminders on Android 12+)
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (!this.isNativeAvailable) return true; // Not applicable on web

    try {
      const result = await MedicineRemindersNative.canScheduleExactAlarms();
      console.log('[BackgroundReminders] canScheduleExactAlarms:', result.canSchedule);
      return result.canSchedule;
    } catch (error) {
      console.error('[BackgroundReminders] Failed to check exact alarm permission:', error);
      return false;
    }
  }

  /**
   * Open system settings to enable exact alarms (Android 12+)
   * User must manually enable this permission
   */
  async requestExactAlarmPermission(): Promise<void> {
    if (!this.isNativeAvailable) return;

    try {
      await MedicineRemindersNative.requestExactAlarmPermission();
      console.log('[BackgroundReminders] Opened exact alarm permission settings');
    } catch (error) {
      console.error('[BackgroundReminders] Failed to request exact alarm permission:', error);
    }
  }

  /**
   * Get list of all scheduled reminders (for debugging)
   */
  async getScheduledReminders(): Promise<{ reminders: any[]; canScheduleExact: boolean } | null> {
    if (!this.isNativeAvailable) return null;

    try {
      const result = await MedicineRemindersNative.getScheduledReminders();
      console.log('[BackgroundReminders] Scheduled reminders:', result);
      return result;
    } catch (error) {
      console.error('[BackgroundReminders] Failed to get scheduled reminders:', error);
      return null;
    }
  }
}

// Export singleton instance
export const backgroundReminders = new BackgroundMedicineReminders();

// Also export class for testing
export { BackgroundMedicineReminders };
