import { VitalReading, MedicineLog, HealthPrediction, HealthRiskScore } from '../types';

/**
 * Minimum days of data required before showing health alerts
 * Set to 15 days to ensure reliable predictions (not based on 1-2 days of data)
 */
const MINIMUM_DATA_DAYS = 15;

/**
 * Check if we have enough historical data to generate predictions
 */
function hasEnoughDataForPredictions(vitals: VitalReading[]): boolean {
  if (vitals.length === 0) return false;

  // Get oldest vital reading timestamp
  const oldestVital = vitals.reduce((oldest, current) => {
    const currentDate = current.timestamp instanceof Date ? current.timestamp : new Date(current.timestamp);
    const oldestDate = oldest.timestamp instanceof Date ? oldest.timestamp : new Date(oldest.timestamp);
    return currentDate < oldestDate ? current : oldest;
  });

  const oldestDate = oldestVital.timestamp instanceof Date ? oldestVital.timestamp : new Date(oldestVital.timestamp);
  const daysDifference = Math.floor((Date.now() - oldestDate.getTime()) / (24 * 60 * 60 * 1000));

  return daysDifference >= MINIMUM_DATA_DAYS;
}

/**
 * Analyze health data and generate predictions
 */
export function analyzeHealthData(
  vitals: VitalReading[],
  medicineLogs: MedicineLog[]
): {
  predictions: HealthPrediction[];
  riskScore: HealthRiskScore;
} {
  const predictions: HealthPrediction[] = [];

  // Get vitals by type
  const bpReadings = vitals.filter((v) => v.type === 'bloodPressure');
  const tempReadings = vitals.filter((v) => v.type === 'temperature');
  const weightReadings = vitals.filter((v) => v.type === 'weight');
  const hrReadings = vitals.filter((v) => v.type === 'heartRate');
  const bgReadings = vitals.filter((v) => v.type === 'bloodSugar');

  // Only generate predictions if we have 15+ days of data
  if (hasEnoughDataForPredictions(vitals)) {
    // Detect various health risks
    const hypertensionPred = detectHypertensionRisk(bpReadings);
    if (hypertensionPred) predictions.push(hypertensionPred);

    const diabetesPred = detectDiabetesRisk(bgReadings);
    if (diabetesPred) predictions.push(diabetesPred);

    const cardiacPred = detectCardiacRisk(hrReadings);
    if (cardiacPred) predictions.push(cardiacPred);

    const weightPred = detectWeightIssues(weightReadings);
    if (weightPred) predictions.push(weightPred);

    const infectionPred = detectInfectionRisk(tempReadings);
    if (infectionPred) predictions.push(infectionPred);

    const compliancePred = analyzeComplianceImpact(vitals, medicineLogs);
    if (compliancePred) predictions.push(compliancePred);
  }

  // Calculate overall risk score
  const riskScore = calculateRiskScore(vitals, medicineLogs, predictions);

  // Sort predictions by severity (high -> low)
  predictions.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return { predictions, riskScore };
}

/**
 * Calculate overall health risk score
 */
function calculateRiskScore(
  vitals: VitalReading[],
  medicineLogs: MedicineLog[],
  predictions: HealthPrediction[]
): HealthRiskScore {
  // Cardiovascular risk (BP, heart rate)
  const bpReadings = vitals.filter((v) => v.type === 'bloodPressure').slice(-7);
  const hrReadings = vitals.filter((v) => v.type === 'heartRate').slice(-7);
  
  let cardiovascular = 0;
  if (bpReadings.length > 0) {
    const avgBP = bpReadings.reduce((sum, v) => {
      const bp = v.value as { systolic: number; diastolic: number };
      return sum + bp.systolic;
    }, 0) / bpReadings.length;
    cardiovascular = Math.min(100, Math.max(0, (avgBP - 120) * 2)); // 120 = normal, increases risk
  }

  // Metabolic risk (blood sugar, weight)
  const bgReadings = vitals.filter((v) => v.type === 'bloodSugar').slice(-7);
  let metabolic = 0;
  if (bgReadings.length > 0) {
    const avgBG = bgReadings.reduce((sum, v) => sum + (v.value as number), 0) / bgReadings.length;
    metabolic = Math.min(100, Math.max(0, (avgBG - 100) * 0.5)); // 100 = normal fasting
  }

  // Compliance risk
  const recentLogs = medicineLogs.filter((log) => {
    const logDate = log.date instanceof Date ? log.date : new Date(log.date);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= sevenDaysAgo;
  });
  
  const complianceRate = recentLogs.length > 0
    ? (recentLogs.filter((l) => l.status === 'TAKEN').length / recentLogs.length) * 100
    : 100;
  const compliance = 100 - complianceRate; // Inverse (higher = worse)

  // Overall score (weighted average)
  const overall = Math.round((cardiovascular * 0.4 + metabolic * 0.3 + compliance * 0.3));

  // Determine trend (compare last 3 days vs previous 4 days)
  const last3Days = vitals.filter((v) => {
    const vDate = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
    return vDate >= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  });
  
  const prev4Days = vitals.filter((v) => {
    const vDate = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return vDate >= sevenDaysAgo && vDate < threeDaysAgo;
  });

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (last3Days.length > 0 && prev4Days.length > 0) {
    const highRiskPredictions = predictions.filter(p => p.severity === 'high').length;
    if (highRiskPredictions >= 2) {
      trend = 'declining';
    } else if (complianceRate > 90 && cardiovascular < 30) {
      trend = 'improving';
    }
  }

  return {
    overall,
    cardiovascular,
    metabolic,
    compliance,
    trend,
  };
}

/**
 * Detect hypertension risk from blood pressure readings
 */
function detectHypertensionRisk(bpReadings: VitalReading[]): HealthPrediction | null {
  if (bpReadings.length < 3) return null;

  const recent = bpReadings.slice(-7); // Last 7 readings
  const highBPCount = recent.filter((v) => {
    const bp = v.value as { systolic: number; diastolic: number };
    return bp.systolic > 140 || bp.diastolic > 90;
  }).length;

  if (highBPCount >= 5) {
    const avgSys = recent.reduce((sum, v) => sum + (v.value as { systolic: number }).systolic, 0) / recent.length;
    const avgDia = recent.reduce((sum, v) => sum + (v.value as { systolic: number; diastolic: number }).diastolic, 0) / recent.length;

    return {
      id: `pred_${Date.now()}_hypertension`,
      type: 'hypertension',
      severity: 'high',
      probability: Math.min(95, 70 + highBPCount * 5),
      description: `Blood pressure consistently elevated (avg ${Math.round(avgSys)}/${Math.round(avgDia)})`,
      recommendation: 'Schedule doctor visit within 3 days. Monitor BP twice daily.',
      basedOn: [`${recent.length} BP readings`, `${highBPCount} readings >140/90`],
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Detect diabetes risk from blood sugar readings
 */
function detectDiabetesRisk(bgReadings: VitalReading[]): HealthPrediction | null {
  if (bgReadings.length < 3) return null;

  const recent = bgReadings.slice(-7);
  const highBGCount = recent.filter((v) => (v.value as number) > 180).length;

  if (highBGCount >= 5) {
    const avgBG = recent.reduce((sum, v) => sum + (v.value as number), 0) / recent.length;

    return {
      id: `pred_${Date.now()}_diabetes`,
      type: 'diabetes',
      severity: 'high',
      probability: Math.min(90, 65 + highBGCount * 5),
      description: `Post-meal glucose consistently high (avg ${Math.round(avgBG)} mg/dL)`,
      recommendation: 'Consult endocrinologist. Review insulin dosage and diet.',
      basedOn: [`${recent.length} blood sugar readings`, `${highBGCount} readings >180 mg/dL`],
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Detect cardiac arrhythmia from heart rate readings
 */
function detectCardiacRisk(hrReadings: VitalReading[]): HealthPrediction | null {
  if (hrReadings.length < 5) return null;

  const recent = hrReadings.slice(-10);
  const abnormalCount = recent.filter((v) => {
    const hr = v.value as number;
    return hr < 50 || hr > 120;
  }).length;

  if (abnormalCount >= 3) {
    return {
      id: `pred_${Date.now()}_cardiac`,
      type: 'cardiac',
      severity: 'high',
      probability: Math.min(85, 60 + abnormalCount * 8),
      description: 'Heart rate irregularities detected (bradycardia or tachycardia)',
      recommendation: 'ECG recommended within 48 hours. Monitor for dizziness or chest pain.',
      basedOn: [`${recent.length} heart rate readings`, `${abnormalCount} abnormal readings`],
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Detect weight-related issues (fluid retention or malnutrition)
 */
function detectWeightIssues(weightReadings: VitalReading[]): HealthPrediction | null {
  if (weightReadings.length < 2) return null;

  const sorted = weightReadings
    .slice()
    .sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });

  const latest = sorted[sorted.length - 1];
  const latestWeight = latest.value as number;

  // Check for rapid weight gain (fluid retention)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const recent3Days = sorted.filter((v) => {
    const vDate = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
    return vDate >= threeDaysAgo;
  });

  if (recent3Days.length >= 2) {
    const oldestWeight = recent3Days[0].value as number;
    const weightGain = latestWeight - oldestWeight;

    if (weightGain > 2) {
      return {
        id: `pred_${Date.now()}_weight_gain`,
        type: 'cardiac',
        severity: 'medium',
        probability: 65,
        description: `Rapid weight gain (+${weightGain.toFixed(1)} kg in 3 days) - possible fluid retention`,
        recommendation: 'Check for ankle swelling, shortness of breath. Review medications.',
        basedOn: [`Weight increased from ${oldestWeight.toFixed(1)} to ${latestWeight.toFixed(1)} kg`],
        timestamp: new Date(),
      };
    }
  }

  // Check for significant weight loss (malnutrition)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recent2Weeks = sorted.filter((v) => {
    const vDate = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
    return vDate >= twoWeeksAgo;
  });

  if (recent2Weeks.length >= 2) {
    const oldestWeight = recent2Weeks[0].value as number;
    const weightLoss = oldestWeight - latestWeight;

    if (weightLoss > 5) {
      return {
        id: `pred_${Date.now()}_weight_loss`,
        type: 'malnutrition',
        severity: 'medium',
        probability: 70,
        description: `Significant weight loss (-${weightLoss.toFixed(1)} kg in 2 weeks)`,
        recommendation: 'Dietary assessment needed. Check for appetite loss or depression.',
        basedOn: [`Weight decreased from ${oldestWeight.toFixed(1)} to ${latestWeight.toFixed(1)} kg`],
        timestamp: new Date(),
      };
    }
  }

  return null;
}

/**
 * Detect infection risk from temperature readings
 */
function detectInfectionRisk(tempReadings: VitalReading[]): HealthPrediction | null {
  if (tempReadings.length < 2) return null;

  const recent = tempReadings.slice(-5);
  const feverCount = recent.filter((v) => (v.value as number) > 100.4).length;

  if (feverCount >= 3) {
    const avgTemp = recent.reduce((sum, v) => sum + (v.value as number), 0) / recent.length;

    return {
      id: `pred_${Date.now()}_infection`,
      type: 'infection',
      severity: 'high',
      probability: Math.min(85, 70 + feverCount * 5),
      description: `Persistent fever detected (avg ${avgTemp.toFixed(1)}°F)`,
      recommendation: 'Possible UTI or pneumonia. Visit doctor for blood work and urinalysis.',
      basedOn: [`${recent.length} temperature readings`, `${feverCount} readings >100.4°F`],
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Analyze medication compliance correlation with health deterioration
 */
function analyzeComplianceImpact(
  vitals: VitalReading[],
  logs: MedicineLog[]
): HealthPrediction | null {
  const recentLogs = logs.filter((log) => {
    const logDate = log.date instanceof Date ? log.date : new Date(log.date);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= sevenDaysAgo;
  });

  if (recentLogs.length === 0) return null;

  const complianceRate = (recentLogs.filter((l) => l.status === 'TAKEN').length / recentLogs.length) * 100;

  if (complianceRate < 70) {
    // Check if vitals are worsening
    const bpReadings = vitals.filter((v) => v.type === 'bloodPressure').slice(-7);
    const vitalsTrendingWorse = bpReadings.length > 0 && bpReadings.filter((v) => {
      const bp = v.value as { systolic: number; diastolic: number };
      return bp.systolic > 140;
    }).length >= 4;

    if (vitalsTrendingWorse || complianceRate < 60) {
      return {
        id: `pred_${Date.now()}_compliance`,
        type: 'medication',
        severity: complianceRate < 60 ? 'high' : 'medium',
        probability: Math.round(100 - complianceRate),
        description: `Medication adherence dropped to ${Math.round(complianceRate)}% (target: 90%+)`,
        recommendation: 'Check for medication side effects, confusion, or forgetfulness. Consider pill organizer.',
        basedOn: [`${recentLogs.length} medication logs`, `Only ${Math.round(complianceRate)}% taken`],
        timestamp: new Date(),
      };
    }
  }

  return null;
}
