import { Contact, OfflineEmergencyData } from '../types';

const STORAGE_KEY = 'safenest_offline_emergency';

/**
 * Offline Emergency Service
 * 
 * Stores critical emergency data locally so it works even without internet:
 * - Emergency contacts with phone numbers
 * - Senior's medical info (blood group, allergies, conditions)
 * - Home address
 * 
 * This data is synced from Firebase but available offline.
 */
class OfflineEmergencyService {
  private data: OfflineEmergencyData | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = {
          ...parsed,
          lastSyncedAt: new Date(parsed.lastSyncedAt)
        };
        console.log('[OfflineEmergency] Loaded from storage, synced at:', this.data.lastSyncedAt);
      }
    } catch (error) {
      console.error('[OfflineEmergency] Failed to load from storage:', error);
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        console.log('[OfflineEmergency] Saved to storage');
      }
    } catch (error) {
      console.error('[OfflineEmergency] Failed to save to storage:', error);
    }
  }

  /**
   * Sync emergency data from Firebase (call this when app is online)
   */
  syncData(data: {
    contacts: Contact[];
    seniorName: string;
    seniorPhone: string;
    bloodGroup?: string;
    allergies?: string[];
    medicalConditions?: string[];
    currentMedicines?: string[];
    homeAddress?: string;
  }): void {
    this.data = {
      contacts: data.contacts.filter(c => c.phone), // Only contacts with phone
      seniorProfile: {
        name: data.seniorName,
        phone: data.seniorPhone,
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        medicalConditions: data.medicalConditions,
        currentMedicines: data.currentMedicines,
      },
      homeAddress: data.homeAddress,
      lastSyncedAt: new Date(),
    };
    this.saveToStorage();
    console.log('[OfflineEmergency] Synced:', this.data.contacts.length, 'contacts');
  }

  /**
   * Get emergency contacts (works offline)
   */
  getEmergencyContacts(): Contact[] {
    return this.data?.contacts || [];
  }

  /**
   * Get primary emergency contact
   */
  getPrimaryContact(): Contact | null {
    const contacts = this.getEmergencyContacts();
    return contacts.find(c => c.isPrimary) || contacts[0] || null;
  }

  /**
   * Get senior's medical profile
   */
  getSeniorProfile(): OfflineEmergencyData['seniorProfile'] | null {
    return this.data?.seniorProfile || null;
  }

  /**
   * Get home address
   */
  getHomeAddress(): string | null {
    return this.data?.homeAddress || null;
  }

  /**
   * Check if we have offline data
   */
  hasData(): boolean {
    return this.data !== null && this.data.contacts.length > 0;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.data?.lastSyncedAt || null;
  }

  /**
   * Trigger emergency call to primary contact
   */
  callPrimaryContact(): boolean {
    const primary = this.getPrimaryContact();
    if (primary && primary.phone) {
      window.location.href = `tel:${primary.phone}`;
      return true;
    }
    return false;
  }

  /**
   * Trigger emergency call to 108 (ambulance)
   */
  callAmbulance(): void {
    window.location.href = 'tel:108';
  }

  /**
   * Trigger emergency call to 112 (emergency)
   */
  callEmergency112(): void {
    window.location.href = 'tel:112';
  }

  /**
   * Send SMS to all emergency contacts (if supported)
   */
  sendEmergencySMS(message: string): void {
    const contacts = this.getEmergencyContacts();
    if (contacts.length > 0) {
      // Open SMS app with message pre-filled
      const phones = contacts.map(c => c.phone).join(',');
      window.location.href = `sms:${phones}?body=${encodeURIComponent(message)}`;
    }
  }

  /**
   * Generate emergency message with location
   */
  generateEmergencyMessage(location?: { lat: number; lng: number }): string {
    const profile = this.getSeniorProfile();
    let message = `🚨 EMERGENCY from SafeNest!\n\n`;
    
    if (profile) {
      message += `${profile.name} needs help!\n`;
      if (profile.phone) message += `Phone: ${profile.phone}\n`;
      if (profile.bloodGroup) message += `Blood Group: ${profile.bloodGroup}\n`;
      if (profile.medicalConditions?.length) {
        message += `Conditions: ${profile.medicalConditions.join(', ')}\n`;
      }
    }
    
    if (location) {
      message += `\n📍 Location: https://maps.google.com/?q=${location.lat},${location.lng}`;
    }
    
    const address = this.getHomeAddress();
    if (address) {
      message += `\n🏠 Home: ${address}`;
    }
    
    return message;
  }
}

// Export singleton
export const offlineEmergency = new OfflineEmergencyService();
