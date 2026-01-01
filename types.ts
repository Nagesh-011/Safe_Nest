
export enum UserRole {
  SENIOR = 'SENIOR',
  CAREGIVER = 'CAREGIVER',
}

export enum AppStatus {
  IDLE = 'IDLE',
  WARNING_FALL = 'WARNING_FALL', // Countdown after fall detection
  WARNING_SOS = 'WARNING_SOS',   // Countdown after SOS press
  EMERGENCY = 'EMERGENCY',       // Active emergency
  SAFE = 'SAFE',                 // Post-emergency check-in
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  phone: string;
}

export interface ActivityItem {
  id: string;
  type: 'LOCATION' | 'BATTERY' | 'EMERGENCY' | 'INFO';
  title: string;
  timestamp: Date;
  details?: string;
}

export interface Reminder {
  id: string;
  title: string;
  instructions: string; // e.g., "Take with food"
  time: string; // 24hr format "HH:MM"
  type: 'MEDICATION' | 'HYDRATION' | 'APPOINTMENT';
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'SNOOZED';
  image?: string;
  createdBy?: string; // Name of the user who created/managed this reminder
}

export interface SeniorStatus {
  userId: string;
  batteryLevel: number;
  heartRate: number;
  spo2: number;
  steps: number;
  // New Health Metrics
  sleepHours: number;
  sleepScore: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  bodyTemp: number;
  
  isMoving: boolean;
  lastUpdate: Date;
  status: 'Normal' | 'Fall Detected' | 'SOS Active';
  location: LocationData;
  recentActivity: ActivityItem[];
  // Sensor Configuration
  isFallDetectionEnabled: boolean;
  isLocationSharingEnabled: boolean;
}

export interface AlertHistory {
  id: string;
  type: 'FALL' | 'SOS';
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  avatar?: string;
  isPrimary?: boolean;
}

export interface HouseholdMember {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  phone: string;
  joinedAt: string;
}

// ===== MEDICINE MANAGEMENT =====
export interface Medicine {
  id: string;
  name: string; // e.g., "Aspirin", "Metformin"
  dosage: string; // e.g., "2 tablets", "5ml syrup"
  frequency: number; // 1, 2, 3, 4 times daily
  times: string[]; // ["08:00", "13:00", "20:00"] - 24hr format
  timeLabels?: string[]; // ["Breakfast", "Lunch", "Dinner"] - optional friendly names
  startDate: Date;
  endDate?: Date; // Optional - if null, it's ongoing
  durationDays?: number; // e.g., 30, 60 - calculated from start and end
  isOngoing: boolean; // true if no end date
  instructions: string; // e.g., "After food", "With water"
  doctorName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineLog {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // Time it was supposed to be taken
  actualTime?: string; // When it was actually taken
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
  date: Date;
  notes?: string;
}

export interface MedicineHistory {
  medicineId: string;
  medicineName: string;
  logs: MedicineLog[];
  compliancePercentage: number; // 0-100
  mostMissedTime?: string; // Time most often missed
}

// ===== HEALTH DATA & VITALS =====
export interface VitalReading {
  id: string;
  type: 'bloodPressure' | 'temperature' | 'weight' | 'bloodSugar' | 'heartRate' | 'spo2' | 'stress';
  value: number | { systolic: number; diastolic: number }; // BP is object, others are numbers
  timestamp: Date;
  source: 'smartwatch' | 'manual'; // Where data came from
  enteredBy?: 'senior' | 'caregiver'; // Who entered it (for manual entries)
  notes?: string;
}

export interface HealthPrediction {
  id: string;
  type: 'hypertension' | 'diabetes' | 'cardiac' | 'infection' | 'malnutrition' | 'medication';
  severity: 'low' | 'medium' | 'high';
  probability: number; // 0-100%
  description: string;
  recommendation: string;
  basedOn: string[]; // Data points used for prediction
  timestamp: Date;
}

export interface HealthRiskScore {
  overall: number; // 0-100
  cardiovascular: number; // 0-100
  metabolic: number; // 0-100
  compliance: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
}

// ===== HEALTH REPORTS =====
export interface HealthReport {
  id: string;
  householdId: string;
  seniorId: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  
  // Vital averages for the period
  vitalsData: {
    bloodPressure?: { avgSystolic: number; avgDiastolic: number };
    heartRate?: number;
    temperature?: number;
    weight?: number;
    bloodSugar?: number;
    spo2?: number;
  };
  
  // Predictions for the period
  predictions: HealthPrediction[];
  
  // Risk score for the period
  riskScore: HealthRiskScore;
  
  // Medication compliance
  medicationCompliance: number; // 0-100%
  
  // Summary insights
  summary: string;
  recommendations: string[];
}

export interface ReportNotification {
  id: string;
  householdId: string;
  seniorId: string;
  reportId: string;
  period: 'weekly' | 'monthly';
  createdAt: Date;
  read: boolean;
}
