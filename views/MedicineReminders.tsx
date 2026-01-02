import React, { useState, useEffect } from 'react';
import { Pill, Clock, CheckCircle, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { Medicine, MedicineLog } from '../types';

// Normalize time strings to HH:MM (zero padded)
const normalizeTime = (time: string) => {
  if (!time) return time;
  const parts = time.split(':').map(s => parseInt(s, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return time.trim();
  return `${parts[0].toString().padStart(2,'0')}:${parts[1].toString().padStart(2,'0')}`;
};

// Timezone-safe: get local midnight timestamp for a date
const getLocalMidnight = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Check if two dates are the same local day
const isSameLocalDay = (date1: Date, date2: Date): boolean => {
  return getLocalMidnight(date1) === getLocalMidnight(date2);
};

// Check if medicine is active on a given date (timezone-safe)
const isMedicineActiveOnDate = (medicine: Medicine, targetDate: Date): boolean => {
  const targetMidnight = getLocalMidnight(targetDate);
  const startMidnight = getLocalMidnight(new Date(medicine.startDate));
  const endMidnight = medicine.endDate ? getLocalMidnight(new Date(medicine.endDate)) : null;
  
  return startMidnight <= targetMidnight && (!endMidnight || endMidnight >= targetMidnight);
};

// Check if a scheduled time has passed today
const isTimeOverdue = (scheduledTime: string, graceMinutes: number = 30): boolean => {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const now = new Date();
  const scheduledDate = new Date();
  scheduledDate.setHours(hours, minutes, 0, 0);
  
  // Add grace period
  const overdueThreshold = new Date(scheduledDate.getTime() + graceMinutes * 60 * 1000);
  return now > overdueThreshold;
};

interface MedicineRemindersProps {
  medicines: Medicine[];
  onMarkTaken: (medicineId: string, time: string) => void;
  onSkip: (medicineId: string, time: string, markAsMissed?: boolean) => void;
  medicineLogs: MedicineLog[];
}

export const MedicineReminders: React.FC<MedicineRemindersProps> = ({
  medicines,
  onMarkTaken,
  onSkip,
  medicineLogs,
}) => {
  const [todaysMedicines, setTodaysMedicines] = useState<
    Array<{
      medicine: Medicine;
      time: string;
      status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'OVERDUE';
      timeIndex: number;
    }>
  >([]);

  useEffect(() => {
    // Calculate today's medicines using timezone-safe date comparison
    const today = new Date();
    const medicines_for_today: typeof todaysMedicines = [];

    medicines.forEach((medicine) => {
      // Check if medicine is active today (timezone-safe)
      if (isMedicineActiveOnDate(medicine, today)) {
        medicine.times.forEach((time, timeIndex) => {
          // Check log for this medicine dose (timezone-safe comparison)
          const log = medicineLogs.find((l) => {
            const logDate = l.date instanceof Date ? l.date : new Date(l.date);
            return (
              l.medicineId === medicine.id &&
              isSameLocalDay(logDate, today) &&
              normalizeTime(l.scheduledTime || '') === normalizeTime(time)
            );
          });

          // Determine status: if no log and time is overdue, mark as OVERDUE (visual only)
          let status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'OVERDUE' = log?.status || 'PENDING';
          if (status === 'PENDING' && isTimeOverdue(time)) {
            status = 'OVERDUE';
          }

          medicines_for_today.push({
            medicine,
            time,
            status,
            timeIndex,
          });
        });
      }
    });

    // Sort by time
    medicines_for_today.sort((a, b) => a.time.localeCompare(b.time));
    setTodaysMedicines(medicines_for_today);
  }, [medicines, medicineLogs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return 'bg-green-50 border-green-200';
      case 'MISSED':
        return 'bg-red-50 border-red-200';
      case 'OVERDUE':
        return 'bg-yellow-50 border-yellow-400 border-2';
      case 'SKIPPED':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return <CheckCircle size={24} className="text-green-600" />;
      case 'MISSED':
        return <AlertCircle size={24} className="text-red-600" />;
      case 'OVERDUE':
        return <AlertTriangle size={24} className="text-yellow-600" />;
      case 'SKIPPED':
        return <X size={24} className="text-orange-600" />;
      default:
        return <Clock size={24} className="text-blue-600" />;
    }
  };

  const getTimeRemaining = (time: string, status: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const medicineTime = new Date();
    medicineTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const diffMs = medicineTime.getTime() - now.getTime();

    if (diffMs < 0) {
      // Calculate how long overdue
      const overdueMs = Math.abs(diffMs);
      const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
      const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
      if (overdueHours > 0) return `${overdueHours}h ${overdueMins}m overdue`;
      return `${overdueMins}m overdue`;
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const completionRate = todaysMedicines.length > 0
    ? Math.round(
        (todaysMedicines.filter((m) => m.status === 'TAKEN').length / todaysMedicines.length) * 100
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Pill size={20} className="text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-900">Today's Medicines</h2>
      </div>

      {/* Completion Indicator */}
      {todaysMedicines.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {todaysMedicines.filter((m) => m.status === 'TAKEN').length} of {todaysMedicines.length} taken
            </span>
            <span className="text-xl font-bold text-purple-600">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Medicines List */}
      {todaysMedicines.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
          <Pill size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-600 font-semibold">No medicines scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaysMedicines.map((item, idx) => (
            <div
              key={`${item.medicine.id}-${item.time}-${idx}`}
              className={`rounded-2xl p-4 border shadow-sm transition-all ${getStatusColor(item.status)}`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Time & Medicine Name */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">{item.time}</p>
                      <h3 className="text-base font-bold text-gray-900">{item.medicine.name}</h3>
                    </div>
                    {(item.status === 'PENDING' || item.status === 'OVERDUE') && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                        item.status === 'OVERDUE' 
                          ? 'text-yellow-700 bg-yellow-100 animate-pulse' 
                          : 'text-blue-600 bg-blue-100'
                      }`}>
                        {getTimeRemaining(item.time, item.status)}
                      </span>
                    )}
                  </div>

                  {/* Dosage */}
                  <p className="text-sm font-semibold text-gray-700 mb-1">{item.medicine.dosage}</p>

                  {/* Instructions */}
                  {item.medicine.instructions && (
                    <p className="text-xs text-gray-600 italic mb-2">
                      💡 {item.medicine.instructions}
                    </p>
                  )}

                  {/* Status Text */}
                  {item.status !== 'PENDING' && item.status !== 'OVERDUE' && (
                    <p className="text-xs font-semibold mb-2">
                      {item.status === 'TAKEN' && '✓ Marked as taken'}
                      {item.status === 'MISSED' && '⚠️ Missed'}
                      {item.status === 'SKIPPED' && '— Skipped'}
                    </p>
                  )}

                  {/* Overdue Warning Banner */}
                  {item.status === 'OVERDUE' && (
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-1.5 mb-2">
                      <p className="text-xs font-bold text-yellow-800">⏰ Medicine time has passed! Please take action.</p>
                    </div>
                  )}

                  {/* Action Buttons - Show for PENDING and OVERDUE */}
                  {(item.status === 'PENDING' || item.status === 'OVERDUE') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { console.log('[MedicineReminders] onMarkTaken click', item.medicine.id, item.time); onMarkTaken(item.medicine.id, item.time); }}
                        className={`flex-1 py-2 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                          item.status === 'OVERDUE' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {item.status === 'OVERDUE' ? '✓ Took Late' : '✓ Taken'}
                      </button>
                      <button
                        onClick={() => { 
                          console.log('[MedicineReminders] onSkip click', item.medicine.id, item.time, item.status === 'OVERDUE'); 
                          onSkip(item.medicine.id, item.time, item.status === 'OVERDUE'); 
                        }}
                        className={`flex-1 py-2 border-2 text-sm font-semibold rounded-lg transition-colors ${
                          item.status === 'OVERDUE' 
                            ? 'border-red-300 text-red-700 hover:bg-red-50' 
                            : 'border-orange-300 text-orange-700 hover:bg-orange-50'
                        }`}
                      >
                        {item.status === 'OVERDUE' ? '✗ Mark Missed' : 'Skip'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
