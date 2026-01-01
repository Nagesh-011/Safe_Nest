import { VitalReading, MedicineLog, HealthReport, HealthPrediction, HealthRiskScore } from '../types';
import { analyzeHealthData } from './healthPredictions';

/**
 * Generate a weekly or monthly health report for a senior
 */
export const generateHealthReport = (
  vitals: VitalReading[],
  medicineLogs: MedicineLog[],
  period: 'weekly' | 'monthly',
  householdId: string,
  seniorId: string
): HealthReport => {
  const now = new Date();
  const daysBack = period === 'weekly' ? 7 : 30;
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  
  // Filter data for the period
  const periodVitals = vitals.filter(v => {
    const date = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
    return date >= startDate && date <= now;
  });

  const periodMedicineLogs = medicineLogs.filter(l => {
    const date = l.date instanceof Date ? l.date : new Date(l.date);
    return date >= startDate && date <= now;
  });

  // Get predictions and risk score
  const analysis = analyzeHealthData(periodVitals, periodMedicineLogs);

  // Calculate vital averages
  const vitalsData = calculateVitalAverages(periodVitals);

  // Calculate medication compliance
  const medicationCompliance = calculateMedicationCompliance(periodMedicineLogs);

  // Generate summary and recommendations
  const { summary, recommendations } = generateSummary(vitalsData, analysis, medicationCompliance, period);

  const report: HealthReport = {
    id: `report-${Date.now()}`,
    householdId,
    seniorId,
    period,
    startDate,
    endDate: now,
    generatedAt: now,
    vitalsData,
    predictions: analysis.predictions,
    riskScore: analysis.riskScore,
    medicationCompliance,
    summary,
    recommendations,
  };

  return report;
};

/**
 * Calculate average values for each vital type in the period
 */
const calculateVitalAverages = (vitals: VitalReading[]) => {
  const result: any = {};

  // Blood Pressure
  const bpReadings = vitals.filter(v => v.type === 'bloodPressure');
  if (bpReadings.length > 0) {
    const systolicValues = bpReadings.map(v => (v.value as { systolic: number }).systolic);
    const diastolicValues = bpReadings.map(v => (v.value as { systolic: number; diastolic: number }).diastolic);
    result.bloodPressure = {
      avgSystolic: Math.round(systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length),
      avgDiastolic: Math.round(diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length),
    };
  }

  // Heart Rate
  const hrReadings = vitals.filter(v => v.type === 'heartRate');
  if (hrReadings.length > 0) {
    const values = hrReadings.map(v => v.value as number);
    result.heartRate = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  // Temperature
  const tempReadings = vitals.filter(v => v.type === 'temperature');
  if (tempReadings.length > 0) {
    const values = tempReadings.map(v => v.value as number);
    result.temperature = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  // Weight
  const weightReadings = vitals.filter(v => v.type === 'weight');
  if (weightReadings.length > 0) {
    const values = weightReadings.map(v => v.value as number);
    result.weight = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  // Blood Sugar
  const bgReadings = vitals.filter(v => v.type === 'bloodSugar');
  if (bgReadings.length > 0) {
    const values = bgReadings.map(v => v.value as number);
    result.bloodSugar = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  // SpO2
  const spo2Readings = vitals.filter(v => v.type === 'spo2');
  if (spo2Readings.length > 0) {
    const values = spo2Readings.map(v => v.value as number);
    result.spo2 = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  return result;
};

/**
 * Calculate medication compliance percentage
 */
const calculateMedicationCompliance = (medicineLogs: MedicineLog[]): number => {
  if (medicineLogs.length === 0) return 0;

  const taken = medicineLogs.filter(l => l.status === 'TAKEN').length;
  return Math.round((taken / medicineLogs.length) * 100);
};

/**
 * Generate human-readable summary and recommendations
 */
const generateSummary = (
  vitalsData: any,
  analysis: { predictions: HealthPrediction[]; riskScore: HealthRiskScore },
  compliance: number,
  period: 'weekly' | 'monthly'
): { summary: string; recommendations: string[] } => {
  const periodName = period === 'weekly' ? 'this week' : 'this month';
  const recommendations: string[] = [];
  let summary = '';

  // Health trend
  if (analysis.riskScore.trend === 'improving') {
    summary = `✅ Health Status: Your senior's health is improving ${periodName}. Keep up the current routine!`;
  } else if (analysis.riskScore.trend === 'declining') {
    summary = `⚠️ Health Status: There are some concerning trends ${periodName} that need attention.`;
  } else {
    summary = `📊 Health Status: Your senior's health remains stable ${periodName}.`;
  }

  // Blood Pressure
  if (vitalsData.bloodPressure) {
    const { avgSystolic, avgDiastolic } = vitalsData.bloodPressure;
    if (avgSystolic > 140 || avgDiastolic > 90) {
      recommendations.push('Monitor blood pressure closely - consider consulting a doctor if elevated reading persist.');
    } else {
      recommendations.push('Blood pressure is well controlled.');
    }
  }

  // Blood Sugar
  if (vitalsData.bloodSugar) {
    if (vitalsData.bloodSugar > 180) {
      recommendations.push('Blood sugar levels are elevated - review diet and medication adherence.');
    } else if (vitalsData.bloodSugar < 70) {
      recommendations.push('Blood sugar levels are low - ensure regular meals and monitor for symptoms.');
    }
  }

  // Temperature
  if (vitalsData.temperature && vitalsData.temperature > 100.4) {
    recommendations.push('Elevated temperature detected - watch for signs of infection.');
  }

  // Medication Compliance
  if (compliance < 70) {
    recommendations.push(`Medication compliance is at ${compliance}% - provide reminders and support.`);
  } else if (compliance < 90) {
    recommendations.push(`Good medication compliance (${compliance}%) - aim for higher adherence.`);
  } else {
    recommendations.push(`Excellent medication compliance (${compliance}%) - keep maintaining this.`);
  }

  // Predictions
  if (analysis.predictions.length > 0) {
    const highRiskPredictions = analysis.predictions.filter(p => p.severity === 'high');
    if (highRiskPredictions.length > 0) {
      recommendations.push(`⚠️ ${highRiskPredictions.length} high-risk health condition(s) detected - review recommendations below.`);
    }
  }

  // Default recommendation if none
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring vitals regularly and maintain current health practices.');
  }

  return { summary, recommendations };
};

/**
 * Check if a report should be generated for this period
 * Returns true if last report was generated more than period ago
 */
export const shouldGenerateReport = (
  lastReportDate: Date | null,
  period: 'weekly' | 'monthly'
): boolean => {
  if (!lastReportDate) return true; // No report yet, generate one

  const now = new Date();
  const daysAgo = period === 'weekly' ? 7 : 30;
  const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  return lastReportDate < threshold;
};
