import React, { useState } from 'react';
import { HealthReport, ReportNotification } from '../types';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Download, Calendar } from 'lucide-react';

interface HealthReportsViewProps {
  reports: HealthReport[];
  notifications: ReportNotification[];
  onMarkAsRead: (notificationId: string) => void;
}

export const HealthReportsView: React.FC<HealthReportsViewProps> = ({
  reports,
  notifications,
  onMarkAsRead,
}) => {
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);

  // Group notifications by report
  const unreadNotifications = notifications.filter(n => !n.read);
  const hasUnreadReports = unreadNotifications.length > 0;

  // Sort reports by date (newest first)
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPeriodLabel = (period: 'weekly' | 'monthly') => {
    return period === 'weekly' ? 'Weekly Report' : 'Monthly Report';
  };

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

  if (selectedReport) {
    return (
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50 pb-24">
        {/* Back Button */}
        <button
          onClick={() => setSelectedReport(null)}
          className="mb-6 text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Reports
        </button>

        {/* Report Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getPeriodLabel(selectedReport.period)}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDate(selectedReport.startDate)} to {formatDate(selectedReport.endDate)}
              </p>
            </div>
            <Calendar className="text-blue-600" size={32} />
          </div>

          <p className="text-gray-700 font-semibold">{selectedReport.summary}</p>
          <p className="text-sm text-gray-600 mt-2">Generated on {formatDate(selectedReport.generatedAt)}</p>
        </div>

        {/* Overall Risk Score */}
        <div className={`rounded-2xl p-6 shadow-sm border-2 ${getRiskColor(selectedReport.riskScore.overall)} mb-6`}>
          <h2 className="text-lg font-bold mb-4">Overall Health Risk</h2>
          <div className="text-5xl font-bold mb-2">{selectedReport.riskScore.overall}</div>
          <div className="text-sm font-semibold mb-4">{getRiskLabel(selectedReport.riskScore.overall)}</div>

          {/* Risk Breakdown */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Cardiovascular Risk</span>
              <span className="font-bold">{selectedReport.riskScore.cardiovascular}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Metabolic Risk</span>
              <span className="font-bold">{selectedReport.riskScore.metabolic}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Medication Compliance</span>
              <span className="font-bold">{selectedReport.riskScore.compliance}/100</span>
            </div>
          </div>

          {/* Trend */}
          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {selectedReport.riskScore.trend === 'improving' && (
                <>
                  <TrendingDown size={18} className="text-green-600" />
                  <span className="text-green-600">Improving trend</span>
                </>
              )}
              {selectedReport.riskScore.trend === 'stable' && (
                <>
                  <CheckCircle size={18} />
                  <span>Stable condition</span>
                </>
              )}
              {selectedReport.riskScore.trend === 'declining' && (
                <>
                  <TrendingUp size={18} className="text-red-600" />
                  <span className="text-red-600">Needs attention</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vitals Data */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Vitals Averages</h2>
          <div className="space-y-3">
            {selectedReport.vitalsData.bloodPressure && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">Blood Pressure</span>
                <span className="text-lg font-bold text-gray-900">
                  {selectedReport.vitalsData.bloodPressure.avgSystolic}/
                  {selectedReport.vitalsData.bloodPressure.avgDiastolic} mmHg
                </span>
              </div>
            )}
            {selectedReport.vitalsData.heartRate && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">Heart Rate</span>
                <span className="text-lg font-bold text-gray-900">{selectedReport.vitalsData.heartRate} bpm</span>
              </div>
            )}
            {selectedReport.vitalsData.temperature && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">Temperature</span>
                <span className="text-lg font-bold text-gray-900">{selectedReport.vitalsData.temperature}°F</span>
              </div>
            )}
            {selectedReport.vitalsData.weight && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">Weight</span>
                <span className="text-lg font-bold text-gray-900">{selectedReport.vitalsData.weight} kg</span>
              </div>
            )}
            {selectedReport.vitalsData.bloodSugar && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">Blood Sugar</span>
                <span className="text-lg font-bold text-gray-900">{selectedReport.vitalsData.bloodSugar} mg/dL</span>
              </div>
            )}
            {selectedReport.vitalsData.spo2 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">SpO2</span>
                <span className="text-lg font-bold text-gray-900">{selectedReport.vitalsData.spo2}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Medication Compliance */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Medication Compliance</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">{selectedReport.medicationCompliance}%</div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${selectedReport.medicationCompliance}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {selectedReport.medicationCompliance >= 90
              ? 'Excellent adherence - keep it up!'
              : selectedReport.medicationCompliance >= 70
              ? 'Good adherence - room for improvement'
              : 'Needs improvement - provide more support'}
          </p>
        </div>

        {/* Predictions */}
        {selectedReport.predictions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Health Alerts</h2>
            <div className="space-y-3">
              {selectedReport.predictions.map((pred) => (
                <div
                  key={pred.id}
                  className={`p-4 rounded-lg border-2 ${
                    pred.severity === 'high'
                      ? 'bg-red-50 border-red-200'
                      : pred.severity === 'medium'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl mt-1">
                      {pred.severity === 'high' ? '🚨' : pred.severity === 'medium' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{pred.type}</h3>
                      <p className="text-sm text-gray-700 mt-1">{pred.description}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">💡 {pred.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recommendations</h2>
          <ul className="space-y-2">
            {selectedReport.recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-3 text-gray-700">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download Button */}
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mb-6">
          <Download size={20} />
          Download Report (PDF)
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Health Reports</h2>
        <p className="text-sm text-gray-600 mt-1">Weekly and monthly health summaries</p>
      </div>

      {/* Unread Notifications */}
      {hasUnreadReports && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-blue-900">New Reports Ready</h3>
              <p className="text-sm text-blue-800 mt-1">
                {unreadNotifications.length} new {unreadNotifications.length === 1 ? 'report' : 'reports'} ready for review
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {sortedReports.length > 0 ? (
        <div className="space-y-4">
          {sortedReports.map((report) => {
            const notification = notifications.find(n => n.reportId === report.id);
            const isNew = notification && !notification.read;

            return (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedReport(report);
                  if (isNew && notification) {
                    onMarkAsRead(notification.id);
                  }
                }}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {getPeriodLabel(report.period)}
                      </h3>
                      {isNew && (
                        <span className="inline-block w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(report.startDate)} to {formatDate(report.endDate)}
                    </p>
                  </div>
                  <div className={`text-right`}>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(report.riskScore.overall)}`}>
                      {getRiskLabel(report.riskScore.overall)}
                    </div>
                  </div>
                </div>

                {/* Summary Preview */}
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{report.summary}</p>

                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="text-xs text-gray-600">Risk Score</p>
                    <p className="text-lg font-bold text-gray-900">{report.riskScore.overall}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="text-xs text-gray-600">Compliance</p>
                    <p className="text-lg font-bold text-gray-900">{report.medicationCompliance}%</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="text-xs text-gray-600">Alerts</p>
                    <p className="text-lg font-bold text-gray-900">{report.predictions.length}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 font-semibold">No reports generated yet</p>
          <p className="text-sm text-gray-500 mt-1">Reports will be generated weekly and monthly</p>
        </div>
      )}
    </div>
  );
};
