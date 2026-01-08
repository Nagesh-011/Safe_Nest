import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { WaterSettings, WaterLog } from '../types';

const STORAGE_KEY = 'safenest_water_settings';
const LOGS_KEY = 'safenest_water_logs';
const NOTIFICATION_ID_BASE = 50000;

/**
 * Water Reminder Service
 * 
 * Reminds seniors to drink water at regular intervals.
 * Tracks daily water intake and progress toward goal.
 */
class WaterReminderService {
  private settings: WaterSettings;
  private todayLogs: WaterLog[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.loadTodayLogs();
  }

  private loadSettings(): WaterSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[WaterReminder] Failed to load settings:', e);
    }
    // Default settings
    return {
      dailyGoal: 2000, // 2 liters
      reminderInterval: 60, // 1 hour
      startTime: '07:00',
      endTime: '21:00',
      enabled: true,
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('[WaterReminder] Failed to save settings:', e);
    }
  }

  private loadTodayLogs(): void {
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      if (stored) {
        const allLogs: WaterLog[] = JSON.parse(stored);
        const today = new Date().toDateString();
        this.todayLogs = allLogs.filter(log => 
          new Date(log.timestamp).toDateString() === today
        );
      }
    } catch (e) {
      console.error('[WaterReminder] Failed to load logs:', e);
    }
  }

  private saveLogs(): void {
    try {
      // Keep only last 7 days of logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const stored = localStorage.getItem(LOGS_KEY);
      let allLogs: WaterLog[] = stored ? JSON.parse(stored) : [];
      
      // Remove old logs and add today's
      allLogs = allLogs.filter(log => 
        new Date(log.timestamp) >= sevenDaysAgo &&
        new Date(log.timestamp).toDateString() !== new Date().toDateString()
      );
      allLogs.push(...this.todayLogs);
      
      localStorage.setItem(LOGS_KEY, JSON.stringify(allLogs));
    } catch (e) {
      console.error('[WaterReminder] Failed to save logs:', e);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): WaterSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<WaterSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
    
    // Restart reminders with new settings
    if (this.settings.enabled) {
      this.stopReminders();
      this.startReminders();
    }
  }

  /**
   * Log water intake
   */
  logWater(amountMl: number): WaterLog {
    const log: WaterLog = {
      id: Date.now().toString(),
      amount: amountMl,
      timestamp: new Date(),
    };
    this.todayLogs.push(log);
    this.saveLogs();
    return log;
  }

  /**
   * Get today's total intake
   */
  getTodayTotal(): number {
    return this.todayLogs.reduce((sum, log) => sum + log.amount, 0);
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgress(): number {
    const total = this.getTodayTotal();
    return Math.min(100, Math.round((total / this.settings.dailyGoal) * 100));
  }

  /**
   * Get remaining amount to reach goal
   */
  getRemaining(): number {
    return Math.max(0, this.settings.dailyGoal - this.getTodayTotal());
  }

  /**
   * Get today's logs
   */
  getTodayLogs(): WaterLog[] {
    return [...this.todayLogs];
  }

  /**
   * Check if current time is within reminder window
   */
  private isWithinReminderWindow(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = this.settings.startTime.split(':').map(Number);
    const [endH, endM] = this.settings.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return currentTime >= startMinutes && currentTime <= endMinutes;
  }

  /**
   * Start periodic reminders
   */
  startReminders(): void {
    if (!this.settings.enabled) return;
    if (this.intervalId) return; // Already running

    console.log('[WaterReminder] Starting reminders every', this.settings.reminderInterval, 'minutes');

    // Show reminder immediately if within window
    if (this.isWithinReminderWindow()) {
      this.scheduleNextReminder();
    }

    // Check every minute if we should show reminder
    this.intervalId = setInterval(() => {
      this.checkAndRemind();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop reminders
   */
  stopReminders(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[WaterReminder] Stopped reminders');
    }
  }

  private lastReminderTime: number = 0;

  private checkAndRemind(): void {
    if (!this.settings.enabled) return;
    if (!this.isWithinReminderWindow()) return;
    
    const now = Date.now();
    const intervalMs = this.settings.reminderInterval * 60 * 1000;
    
    if (now - this.lastReminderTime >= intervalMs) {
      this.showReminder();
      this.lastReminderTime = now;
    }
  }

  /**
   * Schedule next water reminder notification
   */
  private async scheduleNextReminder(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const remaining = this.getRemaining();
      if (remaining <= 0) {
        // Goal reached, no need to remind
        return;
      }

      const glasses = Math.ceil(remaining / 250);
      
      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIFICATION_ID_BASE,
          title: '💧 Time to Drink Water!',
          body: `Stay hydrated! ${glasses} more glasses to reach your goal.`,
          schedule: {
            at: new Date(Date.now() + 1000), // Show in 1 second
          },
          sound: 'water_drop.wav',
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
        }]
      });
    } catch (error) {
      console.error('[WaterReminder] Failed to schedule notification:', error);
    }
  }

  private async showReminder(): Promise<void> {
    const remaining = this.getRemaining();
    if (remaining <= 0) return;

    if (Capacitor.isNativePlatform()) {
      await this.scheduleNextReminder();
    } else {
      // Web notification fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💧 Time to Drink Water!', {
          body: `Stay hydrated! ${Math.ceil(remaining / 250)} more glasses to reach your goal.`,
          icon: '/icons/water.png',
        });
      }
    }
  }

  /**
   * Quick log preset amounts
   */
  logGlass(): WaterLog {
    return this.logWater(250); // 1 glass = 250ml
  }

  logBottle(): WaterLog {
    return this.logWater(500); // 1 bottle = 500ml
  }

  logSmallSip(): WaterLog {
    return this.logWater(100); // Small sip
  }
}

// Export singleton
export const waterReminder = new WaterReminderService();
