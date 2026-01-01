# Health Data & Predictive Analytics System

## Overview
SafeNest health monitoring system with dual-source vitals tracking (smartwatch + manual entry) and AI-powered health predictions for caregivers.

---

## Problem Statement

### Current Limitations
1. **Read-Only Smartwatch Data**: Vitals only from Google Fit - no manual entry
2. **Missing Critical Vitals**: No blood pressure, temperature, weight, blood sugar tracking
3. **No Offline Capability**: If smartwatch fails, no health data available
4. **No Caregiver Input**: Caregivers cannot add vitals on behalf of seniors
5. **No Predictive Analytics**: No early warning system for health deterioration

### Impact
- Critical vitals missed (e.g., hypertension, fever, diabetic emergencies)
- Incomplete health picture for doctors and caregivers
- No early intervention for preventable complications

---

## Solution Architecture

### Dual-Source Data System

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SMARTWATCH (Automatic)          MANUAL ENTRY               │
│  ├── Heart Rate                  ├── Blood Pressure         │
│  ├── SpO2                         ├── Temperature           │
│  ├── Stress Level                 ├── Weight                │
│  ├── Steps/Activity               └── Blood Sugar           │
│  └── Sleep                                                  │
│           │                              │                  │
│           └──────────┬───────────────────┘                  │
│                      ▼                                      │
│              FIREBASE DATABASE                              │
│           households/{id}/vitals/                           │
│                      │                                      │
│                      ▼                                      │
│         ┌────────────────────────┐                         │
│         │  PREDICTION ENGINE     │                         │
│         │  - Trend Analysis      │                         │
│         │  - Risk Scoring        │                         │
│         │  - Alert Generation    │                         │
│         └────────────────────────┘                         │
│                      │                                      │
│          ┌───────────┴───────────┐                         │
│          ▼                       ▼                         │
│   SENIOR VIEW              CAREGIVER VIEW                   │
│   - Current vitals         - Vitals graphs                  │
│   - Add vitals             - Health predictions             │
│   - Simple display         - Risk scores                    │
│                            - Alerts & recommendations       │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Manual Vitals Entry
**Who Can Enter:**
- Seniors (for themselves)
- Caregivers (on behalf of seniors)

**Supported Vitals:**
- **Blood Pressure**: Systolic/Diastolic (mmHg)
- **Temperature**: Fahrenheit or Celsius
- **Weight**: Kilograms or Pounds
- **Blood Sugar**: mg/dL (glucose)

**Entry Points:**
- VitalsView (Senior interface)
- CaregiverDashboard Compliance tab

### 2. Smartwatch Integration (Existing)
**Auto-Synced from Google Fit:**
- Heart Rate (BPM)
- Blood Oxygen (SpO2 %)
- Stress Level (0-100)
- Steps/Activity (daily count)
- Sleep Duration (hours)
- Calories Burned

### 3. Health Predictions (Caregiver-Only)
**Predictive Analytics:**

| **Prediction Type** | **Triggers** | **Alert Level** |
|---------------------|-------------|-----------------|
| Hypertension Risk | BP >140/90 for 7+ days | 🔴 High |
| Stroke Risk | BP trending upward rapidly | 🟡 Medium |
| Diabetes Complication | Blood sugar >180 after meals (5+ times) | 🔴 High |
| Cardiac Arrhythmia | Heart rate <50 or >120 regularly | 🔴 High |
| Fluid Retention | Weight gain >2kg in 3 days | 🟡 Medium |
| Malnutrition | Weight loss >5kg in 2 weeks | 🟡 Medium |
| Infection/Fever | Temperature >100.4°F multiple days | 🔴 High |
| Medication Non-Adherence | Compliance <70% for 7 days | 🟡 Medium |

**Risk Score:**
- Overall health score: 0-100
- Category scores: Cardiovascular, Metabolic, Compliance
- Trend: Improving / Stable / Declining

### 4. Vitals Trend Graphs (Caregiver-Only)
**5 Charts in Compliance Tab:**
1. Blood Pressure (30-day line chart)
2. Heart Rate (30-day line chart)
3. Temperature (30-day line chart)
4. Weight (30-day line chart)
5. Blood Sugar (30-day line chart)

**Features:**
- Color-coded thresholds (green=normal, yellow=warning, red=danger)
- Merged smartwatch + manual data points
- No source labels (clean display)
- Hover tooltips with exact values

---

## Technical Implementation

### New Files Created

#### 1. `types.ts` (Additions)
```typescript
export interface VitalReading {
  id: string;
  type: 'bloodPressure' | 'temperature' | 'weight' | 'bloodSugar' | 'heartRate' | 'spo2' | 'stress';
  value: number | { systolic: number; diastolic: number };
  timestamp: Date;
  source: 'smartwatch' | 'manual';
  enteredBy: 'senior' | 'caregiver';
  notes?: string;
}

export interface HealthPrediction {
  id: string;
  type: 'hypertension' | 'diabetes' | 'cardiac' | 'infection' | 'malnutrition' | 'medication';
  severity: 'low' | 'medium' | 'high';
  probability: number; // 0-100%
  description: string;
  recommendation: string;
  basedOn: string[];
  timestamp: Date;
}

export interface HealthRiskScore {
  overall: number; // 0-100
  cardiovascular: number;
  metabolic: number;
  compliance: number;
  trend: 'improving' | 'stable' | 'declining';
}
```

#### 2. `views/ManualVitalsEntry.tsx`
**Purpose**: Form component for manual vitals entry

**Features:**
- Blood pressure input (systolic/diastolic)
- Temperature input with °F/°C toggle
- Weight input with kg/lbs toggle
- Blood sugar input
- Optional notes field
- Real-time validation
- Alert badges for dangerous values

**Validation Ranges:**
- BP Systolic: 80-200 mmHg
- BP Diastolic: 40-120 mmHg
- Temperature: 95-105°F (alert if >100.4°F)
- Weight: 30-200 kg
- Blood Sugar: 40-400 mg/dL (alert if <70 or >180)

#### 3. `services/healthPredictions.ts`
**Purpose**: AI prediction engine

**Functions:**
```typescript
// Analyze vitals and generate predictions
export function analyzeHealthData(
  vitals: VitalReading[],
  medicineLogs: MedicineLog[]
): {
  predictions: HealthPrediction[];
  riskScore: HealthRiskScore;
}

// Calculate risk score
function calculateRiskScore(vitals: VitalReading[]): HealthRiskScore

// Detect hypertension risk
function detectHypertensionRisk(bpReadings: VitalReading[]): HealthPrediction | null

// Detect diabetes risk
function detectDiabetesRisk(bgReadings: VitalReading[]): HealthPrediction | null

// Detect cardiac anomalies
function detectCardiacRisk(hrReadings: VitalReading[]): HealthPrediction | null

// Detect weight-related issues
function detectWeightIssues(weightReadings: VitalReading[]): HealthPrediction | null

// Detect infection/fever
function detectInfectionRisk(tempReadings: VitalReading[]): HealthPrediction | null

// Analyze medication compliance correlation
function analyzeComplianceImpact(
  vitals: VitalReading[],
  logs: MedicineLog[]
): HealthPrediction | null
```

**Prediction Algorithm:**
```
1. Load last 30 days of vitals data
2. Calculate statistical metrics (mean, median, std dev, trend)
3. Detect anomalies (outliers beyond 2 standard deviations)
4. Apply medical rules (e.g., BP >140/90 = hypertension)
5. Cross-reference medicine compliance
6. Generate risk probability (0-100%)
7. Create actionable recommendations
8. Return predictions sorted by severity
```

#### 4. `components/VitalsChart.tsx`
**Purpose**: Reusable line chart for vitals trends

**Props:**
```typescript
interface VitalsChartProps {
  data: VitalReading[];
  type: 'bloodPressure' | 'heartRate' | 'temperature' | 'weight' | 'bloodSugar';
  days: 7 | 30;
  showThresholds?: boolean;
}
```

**Features:**
- SVG-based line chart
- Color-coded zones (green/yellow/red)
- Responsive design
- Touch-friendly tooltips
- Auto-scaling Y-axis
- Grid lines and labels

---

### Modified Files

#### 5. `App.tsx`
**Changes:**
- Add `vitalReadings` state
- Add Firebase listener for vitals
- Add `handleAddVital()` function
- Pass vitals to VitalsView and CaregiverDashboard

**New Functions:**
```typescript
const handleAddVital = (vital: Omit<VitalReading, 'id'>) => {
  const vitalId = Date.now().toString();
  const vitalWithId = { ...vital, id: vitalId };
  set(ref(db, `households/${householdId}/vitals/${vitalId}`), {
    ...vitalWithId,
    timestamp: vital.timestamp.toISOString()
  });
}
```

#### 6. `views/VitalsView.tsx`
**Changes:**
- Add "+ Add Vitals" button (bottom-right, floating)
- Add ManualVitalsEntry modal
- Merge smartwatch + manual vitals in display
- Show most recent reading for each vital type
- No source labels (clean display)

**UI Updates:**
- Blood Pressure card (if manual data exists)
- Temperature card (if manual data exists)
- Weight card (if manual data exists)
- Blood Sugar card (if manual data exists)
- Existing Heart Rate, SpO2 cards (smartwatch)

#### 7. `views/MedicineCompliance.tsx` → **Rename to `views/ComplianceAnalytics.tsx`**
**New Structure:**
```tsx
<div className="compliance-analytics">
  {/* Section 1: Health Risk Score */}
  <HealthRiskScoreCard score={riskScore} />
  
  {/* Section 2: Medicine Compliance (Existing) */}
  <MedicineComplianceSection medicines={medicines} logs={medicineLogs} />
  
  {/* Section 3: Vitals Trend Graphs */}
  <VitalsTrendsSection vitals={vitalReadings} />
  
  {/* Section 4: Health Predictions & Alerts */}
  <HealthPredictionsSection predictions={predictions} />
</div>
```

**New Components:**
- `HealthRiskScoreCard`: Overall health score (0-100) with trend indicator
- `VitalsTrendsSection`: 5 graphs for each vital type
- `HealthPredictionsSection`: Urgent alerts + recommendations

#### 8. `views/CaregiverDashboard.tsx`
**Changes:**
- Import `ComplianceAnalytics` (renamed from MedicineCompliance)
- Pass `vitalReadings` prop to ComplianceAnalytics
- Add "+ Add Vitals" button in Compliance tab
- Show ManualVitalsEntry modal with `enteredBy: 'caregiver'`

---

## Firebase Data Structure

```javascript
households/
  {householdId}/
    vitals/
      {vitalId_001}: {
        id: "1704110400000",
        type: "bloodPressure",
        value: { systolic: 140, diastolic: 90 },
        timestamp: "2026-01-01T08:00:00Z",
        source: "manual",
        enteredBy: "caregiver",
        notes: "After morning medication"
      }
      {vitalId_002}: {
        id: "1704114000000",
        type: "heartRate",
        value: 72,
        timestamp: "2026-01-01T09:00:00Z",
        source: "smartwatch",
        enteredBy: null,
        notes: null
      }
      {vitalId_003}: {
        id: "1704117600000",
        type: "temperature",
        value: 98.6,
        timestamp: "2026-01-01T10:00:00Z",
        source: "manual",
        enteredBy: "senior",
        notes: "Feeling fine"
      }
```

---

## User Flows

### Flow 1: Senior Adds Blood Pressure Manually

1. Senior opens VitalsView
2. Clicks "+ Add Vitals" button
3. Modal opens with ManualVitalsEntry form
4. Enters systolic (140) and diastolic (90)
5. Clicks "Save"
6. **Validation**: If BP >140/90, shows ⚠️ warning "High blood pressure detected"
7. Data saved to Firebase with `source: "manual"`, `enteredBy: "senior"`
8. VitalsView updates immediately showing new BP reading
9. **Caregiver sees**: Graph updates in Compliance tab
10. **Prediction engine**: Analyzes if BP >140 for 7+ days → generates hypertension alert

### Flow 2: Caregiver Adds Temperature for Senior

1. Caregiver opens CaregiverDashboard
2. Goes to "Compliance" tab
3. Clicks "+ Add Vitals" button
4. Modal opens with ManualVitalsEntry form
5. Enters temperature: 101.2°F
6. **Validation**: Shows 🔴 alert "Fever detected - possible infection"
7. Clicks "Save"
8. Data saved with `source: "manual"`, `enteredBy: "caregiver"`
9. **Prediction engine**: Detects fever >100.4°F → generates infection risk alert
10. Caregiver sees urgent alert in Compliance tab: "⚠️ Infection Risk - Monitor for UTI/pneumonia"

### Flow 3: Smartwatch Syncs Heart Rate (Automatic)

1. Senior wears smartwatch throughout day
2. Google Fit syncs heart rate every 5 minutes
3. SafeNest fetches latest data via Google Fit API
4. Data saved with `source: "smartwatch"`, `enteredBy: null`
5. VitalsView shows latest reading
6. **Prediction engine**: Monitors for arrhythmia (HR <50 or >120)
7. Caregiver sees heart rate graph in Compliance tab

### Flow 4: Health Prediction Alert Generated

1. **Trigger**: Senior's BP readings: 145/92, 148/94, 142/90 over 8 days
2. **Prediction Engine Runs**:
   - Calculates mean BP: 145/92 (>140/90 threshold)
   - Detects upward trend
   - Checks medicine compliance: 85% (good)
   - Generates prediction:
     ```javascript
     {
       type: 'hypertension',
       severity: 'high',
       probability: 87,
       description: 'Blood pressure consistently elevated above 140/90',
       recommendation: 'Schedule doctor visit within 3 days. Monitor twice daily.',
       basedOn: ['8 BP readings averaging 145/92', 'Upward trend detected']
     }
     ```
3. **Caregiver Dashboard Updates**:
   - Risk score increases from 45 → 68
   - Red alert appears in Compliance tab
   - Notification sent to caregiver (future feature)
4. **Senior**: Sees nothing (predictions hidden from senior)

---

## Prediction Rules & Logic

### Hypertension Detection
```typescript
if (
  averageSystolic > 140 && 
  averageDiastolic > 90 && 
  daysWithHighBP >= 7
) {
  return {
    severity: 'high',
    probability: 85,
    recommendation: 'Schedule doctor visit this week'
  }
}
```

### Diabetes Complication
```typescript
if (
  postMealReadings.filter(bg => bg > 180).length >= 5 &&
  timeWindow === '7days'
) {
  return {
    severity: 'high',
    probability: 78,
    recommendation: 'Consult endocrinologist, adjust insulin dosage'
  }
}
```

### Cardiac Arrhythmia
```typescript
if (
  heartRateReadings.filter(hr => hr < 50 || hr > 120).length >= 3 &&
  timeWindow === '7days'
) {
  return {
    severity: 'high',
    probability: 72,
    recommendation: 'ECG recommended within 48 hours'
  }
}
```

### Fluid Retention (Heart Failure)
```typescript
if (
  weightGain > 2 && // kg
  timeWindow === '3days'
) {
  return {
    severity: 'medium',
    probability: 65,
    recommendation: 'Monitor for ankle swelling, shortness of breath. Check medications.'
  }
}
```

### Infection/Fever
```typescript
if (
  temperatureReadings.filter(t => t > 100.4).length >= 3 &&
  timeWindow === '5days'
) {
  return {
    severity: 'high',
    probability: 80,
    recommendation: 'Possible UTI or pneumonia. Visit doctor for blood work.'
  }
}
```

### Medication Non-Adherence Impact
```typescript
if (
  medicineCompliance < 70 &&
  vitalsTrendingWorse // BP up, blood sugar up, etc.
) {
  return {
    severity: 'medium',
    probability: 70,
    recommendation: 'Medication adherence dropped. Check for side effects or confusion.'
  }
}
```

---

## UI/UX Design Principles

### Consistency
- **Same styling** as existing components (rounded-2xl, shadows, borders)
- **Same colors**: Blue (primary), Red (alerts), Green (success), Gray (neutral)
- **Same fonts**: Tailwind default system fonts
- **Same spacing**: p-4, p-6, mb-4, space-y-4

### Accessibility
- Large touch targets (min 44x44px)
- High contrast text
- Clear labels and placeholders
- Error messages in red with icons
- Success feedback in green

### Senior-Friendly
- **Large fonts** (text-lg, text-xl for important info)
- **Simple language** (no medical jargon in senior view)
- **Clear buttons** ("Save Vitals" not "Submit")
- **Immediate feedback** (success/error messages)

### Caregiver-Focused
- **Detailed analytics** (graphs, trends, predictions)
- **Medical terminology** (appropriate for healthcare context)
- **Actionable recommendations** (specific next steps)
- **Priority-based alerts** (high/medium/low severity)

---

## Privacy & Security

### Data Protection
- ✅ Vitals stored in Firebase with household-level isolation
- ✅ No cross-household data access
- ✅ Predictions visible only to caregivers
- ✅ Source tracking for audit trail

### Compliance
- **HIPAA**: Health data encrypted at rest and in transit
- **GDPR**: User can delete vitals data
- **Audit Trail**: Who entered data + when + source

---

## Testing Scenarios

### Unit Tests
- Prediction engine logic (hypertension, diabetes, cardiac)
- Risk score calculation
- Data validation (BP ranges, temperature limits)
- Chart rendering with edge cases (no data, single point)

### Integration Tests
- Firebase save/load vitals
- Smartwatch + manual data merging
- Real-time updates across senior/caregiver views

### User Acceptance Tests
1. Senior adds BP → Caregiver sees graph update
2. Smartwatch syncs → Data appears in VitalsView
3. High BP for 7 days → Prediction alert appears
4. Caregiver adds temperature → Senior sees latest reading
5. No data available → Empty state shown correctly

---

## Future Enhancements

### Phase 2 (Next Sprint)
- 📊 Export health reports (PDF for doctors)
- 🔔 Push notifications for high-risk predictions
- 📈 Machine learning model (replace rule-based predictions)
- 🩺 Integration with blood pressure cuffs (Bluetooth)
- 🏥 Medication correlation analysis (which meds affect which vitals)

### Phase 3 (Long-term)
- 🤖 Natural language health summaries ("Your BP is trending up because...")
- 📱 Apple Health integration (iOS support)
- 🔗 Direct doctor sharing (HIPAA-compliant portal)
- 📊 Multi-senior comparison (for caregivers with multiple seniors)

---

## Deployment Checklist

Before deploying to production:

- [ ] Test manual vitals entry (senior side)
- [ ] Test manual vitals entry (caregiver side)
- [ ] Verify smartwatch data still syncing
- [ ] Test prediction engine with sample data
- [ ] Verify graphs render correctly
- [ ] Test validation rules (reject invalid inputs)
- [ ] Test Firebase write/read operations
- [ ] Check mobile responsiveness
- [ ] Test with no data (empty states)
- [ ] Verify predictions hidden from senior
- [ ] Test data merging (smartwatch + manual)
- [ ] Load test with 1000+ vitals records
- [ ] Security audit (Firebase rules)
- [ ] Performance test (chart rendering speed)
- [ ] Browser compatibility (Chrome, Safari, Firefox)

---

## Support & Troubleshooting

### Common Issues

**Issue**: Smartwatch data not syncing
- **Solution**: Check Google Fit permissions, re-authenticate

**Issue**: Manual vitals not saving
- **Solution**: Check Firebase connection, verify household ID exists

**Issue**: Graphs not displaying
- **Solution**: Verify vitals data has timestamps, check data format

**Issue**: Predictions not appearing
- **Solution**: Ensure 7+ days of data exists, check prediction logic thresholds

**Issue**: High risk score but no visible problems
- **Solution**: Check multiple vitals (may be cumulative risk from several minor issues)

---

## Contact & Maintenance

**Maintained by**: SafeNest Development Team  
**Last Updated**: January 1, 2026  
**Version**: 2.0 (Health Data System)

For questions or issues, refer to:
- Technical docs: `/docs`
- API reference: `/services/healthPredictions.ts`
- Component library: `/components`
- Type definitions: `/types.ts`

---

## Summary

This health data system transforms SafeNest from a basic vitals viewer into a comprehensive health monitoring platform with:

✅ **Dual-source data** (smartwatch + manual)  
✅ **Predictive analytics** (early warning system)  
✅ **Caregiver insights** (graphs + risk scores)  
✅ **Senior simplicity** (easy data entry, no complexity)  
✅ **Scalable architecture** (ready for ML enhancements)

**Result**: Better health outcomes through early detection and intervention.
