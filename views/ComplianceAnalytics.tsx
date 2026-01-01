import React, { useMemo, useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Activity, AlertTriangle, Heart, Droplet, Thermometer, Gauge, TrendingDown, BarChart3 } from 'lucide-react';
import { Medicine, MedicineLog, VitalReading } from '../types';
import { analyzeHealthData } from '../services/healthPredictions';
import { VitalsChart } from '../components/VitalsChart';

interface ComplianceAnalyticsProps {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
  vitalReadings: VitalReading[];
}

export const ComplianceAnalytics: React.FC<ComplianceAnalyticsProps> = ({
  medicines,
  medicineLogs,
  vitalReadings,
}) => {
  const [chartPeriod, setChartPeriod] = useState<7 | 30>(7);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Medicine compliance stats (original logic)
  const complianceStats = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter logs from last 7 days
    const recentLogs = medicineLogs.filter(
      (log) => {
        const logDate = log.date instanceof Date ? log.date : new Date(log.date);
        return logDate >= sevenDaysAgo && logDate <= today;
      }
    );

    if (recentLogs.length === 0) {
      return {
        totalComplianceRate: 0,
        taken: 0,
        missed: 0,
        skipped: 0,
        total: 0,
        medicineStats: [],
        mostMissedTime: null,
      };
    }

    const taken = recentLogs.filter((l) => l.status === 'TAKEN').length;
    const missed = recentLogs.filter((l) => l.status === 'MISSED').length;
    const skipped = recentLogs.filter((l) => l.status === 'SKIPPED').length;

    // Medicine-specific stats
    const medicineStats = medicines.map((medicine) => {
      const medicineLogs = recentLogs.filter((l) => l.medicineId === medicine.id);
      const taken = medicineLogs.filter((l) => l.status === 'TAKEN').length;
      const missed = medicineLogs.filter((l) => l.status === 'MISSED').length;
      const compliance = medicineLogs.length > 0 ? Math.round((taken / medicineLogs.length) * 100) : 0;

      return {
        medicineId: medicine.id,
        medicineName: medicine.name,
        compliance,
        taken,
        missed,
        total: medicineLogs.length,
      };
    });

    // Find most missed time
    const timeStats: { [key: string]: number } = {};
    recentLogs
      .filter((l) => l.status === 'MISSED')
      .forEach((log) => {
        timeStats[log.scheduledTime] = (timeStats[log.scheduledTime] || 0) + 1;
      });

    const mostMissedTime = Object.entries(timeStats).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      totalComplianceRate: Math.round((taken / recentLogs.length) * 100),
      taken,
      missed,
      skipped,
      total: recentLogs.length,
      medicineStats,
      mostMissedTime,
    };
  }, [medicines, medicineLogs]);

  // Health analysis (NEW)
  const healthAnalysis = useMemo(() => {
    return analyzeHealthData(vitalReadings, medicineLogs);
  }, [vitalReadings, medicineLogs]);

  // Filter vital readings by type
  const getVitalsByType = (type: VitalReading['type']) => {
    return vitalReadings.filter(v => v.type === type);
  };

  const bpReadings = getVitalsByType('bloodPressure');
  const heartRateReadings = getVitalsByType('heartRate');
  const tempReadings = getVitalsByType('temperature');
  const weightReadings = getVitalsByType('weight');
  const bgReadings = getVitalsByType('bloodSugar');

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Moderate Risk';
    return 'Low Risk';
  };

  const getSeverityEmoji = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Health Analytics</h2>
        <p className="text-sm text-gray-600 mt-1">Medication compliance & vitals insights</p>
      </div>

      {/* Health Risk Score Card (NEW) */}
      <div className={`rounded-2xl p-6 shadow-sm border-2 ${getRiskColor(healthAnalysis.riskScore.overall)} mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Overall Health Risk</h3>
          <Activity size={24} />
        </div>
        <div className="text-5xl font-bold mb-2">{healthAnalysis.riskScore.overall}</div>
        <div className="text-sm font-semibold mb-4">{getRiskLabel(healthAnalysis.riskScore.overall)}</div>
        
        {/* Risk Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Heart size={16} />
              Cardiovascular
            </span>
            <span className="font-bold">{healthAnalysis.riskScore.cardiovascular}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Droplet size={16} />
              Metabolic
            </span>
            <span className="font-bold">{healthAnalysis.riskScore.metabolic}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle size={16} />
              Medication Compliance
            </span>
            <span className="font-bold">{healthAnalysis.riskScore.compliance}/100</span>
          </div>
        </div>

        {/* Trend */}
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {healthAnalysis.riskScore.trend === 'improving' && (
              <>
                <TrendingDown size={16} className="text-green-600" />
                <span className="text-green-600">Improving trend</span>
              </>
            )}
            {healthAnalysis.riskScore.trend === 'stable' && (
              <>
                <Activity size={16} />
                <span>Stable condition</span>
              </>
            )}
            {healthAnalysis.riskScore.trend === 'declining' && (
              <>
                <TrendingUp size={16} className="text-red-600" />
                <span className="text-red-600">Needs attention</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Health Predictions (NEW) */}
      {healthAnalysis.predictions.length > 0 && (
        <div className="mb-4 space-y-3">
          <h3 className="font-bold text-gray-900 text-lg">Health Alerts</h3>
          {healthAnalysis.predictions
            .sort((a, b) => {
              const severityOrder = { high: 3, medium: 2, low: 1 };
              return severityOrder[b.severity] - severityOrder[a.severity];
            })
            .map((prediction) => (
              <div
                key={prediction.id}
                className={`rounded-2xl p-4 shadow-sm border-2 ${
                  prediction.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : prediction.severity === 'medium'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-2xl">{getSeverityEmoji(prediction.severity)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900">{prediction.type}</h4>
                      <span className="text-sm font-bold px-2.5 py-1 bg-white bg-opacity-60 rounded-full">
                        {prediction.probability}% probability
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mb-2">{prediction.description}</p>
                    <p className="text-sm font-semibold text-gray-900 mb-1">💡 Recommendation:</p>
                    <p className="text-sm text-gray-700">{prediction.recommendation}</p>
                    {prediction.basedOn && prediction.basedOn.length > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        Based on: {prediction.basedOn.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Overall Medication Compliance Card */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-blue-100 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Medication Compliance</h3>
          <TrendingUp size={24} className="text-blue-600" />
        </div>
        <div className="text-4xl font-bold text-blue-600 mb-2">{complianceStats.totalComplianceRate}%</div>
        <div className="text-sm text-gray-600">
          {complianceStats.taken} taken • {complianceStats.missed} missed • {complianceStats.skipped} skipped
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-700 font-semibold">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Taken
            </span>
            <span className="flex items-center gap-1 text-red-700 font-semibold">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Missed
            </span>
            <span className="flex items-center gap-1 text-orange-700 font-semibold">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              Skipped
            </span>
          </div>
          <div className="w-full flex gap-1 h-2 rounded-full overflow-hidden bg-gray-200">
            <div
              className="bg-green-500"
              style={{
                width: `${(complianceStats.taken / complianceStats.total) * 100}%`,
              }}
            ></div>
            <div
              className="bg-red-500"
              style={{
                width: `${(complianceStats.missed / complianceStats.total) * 100}%`,
              }}
            ></div>
            <div
              className="bg-orange-500"
              style={{
                width: `${(complianceStats.skipped / complianceStats.total) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {complianceStats.mostMissedTime && (
        <div className="bg-orange-50 rounded-2xl p-4 border-2 border-orange-200 flex gap-3 mb-4">
          <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-orange-900 text-sm">Pattern Detected</p>
            <p className="text-sm text-orange-800 mt-0.5">
              Medicines are often missed at {complianceStats.mostMissedTime}
            </p>
          </div>
        </div>
      )}

      {/* Vitals Trends Section (NEW) */}
      {vitalReadings.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Vitals Trends</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartPeriod(7)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  chartPeriod === 7
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setChartPeriod(30)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  chartPeriod === 30
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Blood Pressure Chart */}
            {bpReadings.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="text-orange-500" size={20} />
                  <h4 className="font-bold text-gray-900">Blood Pressure</h4>
                </div>
                <VitalsChart
                  data={bpReadings}
                  type="bloodPressure"
                  days={chartPeriod}
                  showThresholds={true}
                />
              </div>
            )}

            {/* Heart Rate Chart */}
            {heartRateReadings.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="text-red-500" size={20} />
                  <h4 className="font-bold text-gray-900">Heart Rate</h4>
                </div>
                <VitalsChart
                  data={heartRateReadings}
                  type="heartRate"
                  days={chartPeriod}
                  showThresholds={true}
                />
              </div>
            )}

            {/* Temperature Chart */}
            {tempReadings.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer className="text-yellow-500" size={20} />
                  <h4 className="font-bold text-gray-900">Temperature</h4>
                </div>
                <VitalsChart
                  data={tempReadings}
                  type="temperature"
                  days={chartPeriod}
                  showThresholds={true}
                />
              </div>
            )}

            {/* Weight Chart */}
            {weightReadings.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="text-purple-500" size={20} />
                  <h4 className="font-bold text-gray-900">Weight</h4>
                </div>
                <VitalsChart
                  data={weightReadings}
                  type="weight"
                  days={chartPeriod}
                  showThresholds={true}
                />
              </div>
            )}

            {/* Blood Sugar Chart */}
            {bgReadings.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Droplet className="text-pink-500" size={20} />
                  <h4 className="font-bold text-gray-900">Blood Sugar</h4>
                </div>
                <VitalsChart
                  data={bgReadings}
                  type="bloodSugar"
                  days={chartPeriod}
                  showThresholds={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-Medicine Compliance */}
      {complianceStats.medicineStats.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900">Per Medicine Compliance</h3>
          {complianceStats.medicineStats.map((stat) => (
            <div
              key={stat.medicineId}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{stat.medicineName}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stat.taken} taken • {stat.missed} missed out of {stat.total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{stat.compliance}%</p>
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(stat.taken / stat.total) * 100}%`,
                  }}
                ></div>
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(stat.missed / stat.total) * 100}%`,
                  }}
                ></div>
              </div>

              {/* Status Indicator */}
              <div className="mt-3 flex items-center gap-2">
                {stat.compliance >= 90 && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <CheckCircle size={14} />
                    Excellent
                  </span>
                )}
                {stat.compliance >= 70 && stat.compliance < 90 && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                    Good
                  </span>
                )}
                {stat.compliance < 70 && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                    <AlertCircle size={14} />
                    Needs Attention
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Report Button */}
      {vitalReadings.length > 0 && (
        <button
          onClick={() => setShowAnalysis(true)}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <BarChart3 size={20} />
          Generate Report & Analysis
        </button>
      )}

      {/* Analysis Modal */}
      {showAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Health Analysis</h2>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Overall Health Risk */}
            <div className={`rounded-2xl p-6 shadow-sm border-2 ${getRiskColor(healthAnalysis.riskScore.overall)} mb-4`}>
              <h3 className="font-bold text-lg mb-2">Overall Health Risk</h3>
              <div className="text-4xl font-bold mb-2">{healthAnalysis.riskScore.overall}</div>
              <div className="text-sm font-semibold mb-4">{getRiskLabel(healthAnalysis.riskScore.overall)}</div>
              
              {/* Risk Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Cardiovascular</span>
                  <span className="font-bold">{healthAnalysis.riskScore.cardiovascular}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Metabolic</span>
                  <span className="font-bold">{healthAnalysis.riskScore.metabolic}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Medication Compliance</span>
                  <span className="font-bold">{healthAnalysis.riskScore.compliance}/100</span>
                </div>
              </div>
            </div>

            {/* Health Predictions */}
            {healthAnalysis.predictions.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 mb-3">Health Alerts</h3>
                <div className="space-y-3">
                  {healthAnalysis.predictions
                    .sort((a, b) => {
                      const severityOrder = { high: 3, medium: 2, low: 1 };
                      return severityOrder[b.severity] - severityOrder[a.severity];
                    })
                    .map((prediction) => (
                      <div
                        key={prediction.id}
                        className={`rounded-lg p-3 ${
                          prediction.severity === 'high'
                            ? 'bg-red-50 border border-red-200'
                            : prediction.severity === 'medium'
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <div className="flex gap-2 mb-1">
                          <span className="text-lg">
                            {prediction.severity === 'high' ? '🚨' : prediction.severity === 'medium' ? '⚠️' : 'ℹ️'}
                          </span>
                          <h4 className="font-bold text-gray-900">{prediction.type}</h4>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{prediction.description}</p>
                        <p className="text-sm font-semibold text-gray-900">💡 {prediction.recommendation}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowAnalysis(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {complianceStats.total === 0 && vitalReadings.length === 0 && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
          <p className="text-gray-600 font-semibold">No health data yet</p>
          <p className="text-sm text-gray-500 mt-1">Add medicines and vitals to see analytics</p>
        </div>
      )}
    </div>
  );
};
