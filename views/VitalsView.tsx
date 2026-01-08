import React, { useState } from 'react';
import { Heart, Droplet, Activity, Thermometer, Gauge, Plus } from 'lucide-react';
import { SeniorStatus, VitalReading } from '../types';
import { ManualVitalsEntry } from './ManualVitalsEntry';

interface VitalsViewProps {
  status: SeniorStatus;
  vitalReadings?: VitalReading[];
  onAddVital?: (vital: Omit<VitalReading, 'id' | 'timestamp'>) => void;
  enteredBy?: 'senior' | 'caregiver';
}

export const VitalsView: React.FC<VitalsViewProps> = ({ 
  status, 
  vitalReadings = [],
  onAddVital,
  enteredBy = 'senior'
}) => {
  const [showVitalsEntry, setShowVitalsEntry] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>('');

  // Check cooldown on mount and when vitalReadings changes
  React.useEffect(() => {
    const lastEntryStr = localStorage.getItem('vitalsLastCompletedEntry');
    if (lastEntryStr) {
      const lastEntry = new Date(lastEntryStr);
      const cooldownEnd = new Date(lastEntry.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      if (now < cooldownEnd) {
        setCooldownUntil(cooldownEnd);
      } else {
        // Cooldown has expired
        setCooldownUntil(null);
        localStorage.removeItem('vitalsLastCompletedEntry');
      }
    }
  }, [vitalReadings]);

  // Update remaining time every minute
  React.useEffect(() => {
    if (!cooldownUntil) return;
    
    const updateTimer = () => {
      const now = new Date();
      const diff = cooldownUntil.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCooldownUntil(null);
        setRemainingTime('');
        localStorage.removeItem('vitalsLastCompletedEntry');
        
        // Clear today's vitals tracking when cooldown expires
        const today = new Date().toDateString();
        localStorage.removeItem(`vitals_entered_${today}`);
        return;
      }
      
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      
      setRemainingTime(`${days}d ${hours}h ${mins}m`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Check if today is different from stored date, reset if needed
  React.useEffect(() => {
    const lastEntryStr = localStorage.getItem('vitalsLastCompletedEntry');
    if (lastEntryStr) {
      const lastEntry = new Date(lastEntryStr);
      const lastEntryDate = lastEntry.toDateString();
      const today = new Date().toDateString();
      
      // If it's a new day after cooldown expires, clear old tracking
      if (lastEntryDate !== today) {
        localStorage.removeItem(`vitals_entered_${lastEntryDate}`);
      }
    }
  }, []);

  // Get latest manual vitals
    const getLatestVital = (type: 'bloodPressure' | 'temperature' | 'weight' | 'bloodSugar' | 'heartRate') => {
    const filtered = vitalReadings
      .filter(v => v.type === type && v.source === 'manual')
      .sort((a, b) => {
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
    return filtered[0];
  };

  const latestBP = getLatestVital('bloodPressure');
  const latestTemp = getLatestVital('temperature');
  const latestWeight = getLatestVital('weight');
  const latestBG = getLatestVital('bloodSugar');
  const latestHR = getLatestVital('heartRate');

  const formatTimestamp = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  };

  // Track which vitals have been entered today
  const getVitalsEnteredToday = () => {
    const today = new Date().toDateString();
    const vitalsToday = vitalReadings.filter(v => {
      const vDate = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
      return v.source === 'manual' && vDate.toDateString() === today;
    });
    const types = new Set(vitalsToday.map(v => v.type));
    return types;
  };

  const handleSaveVital = (vital: Omit<VitalReading, 'id' | 'timestamp'>) => {
    if (onAddVital) {
      onAddVital(vital);
    }
    
    // Store entry in localStorage for immediate tracking (don't wait for parent state)
    const today = new Date().toDateString();
    const storedKey = `vitals_entered_${today}`;
    const storedEntered = JSON.parse(localStorage.getItem(storedKey) || '[]') as string[];
    if (!storedEntered.includes(vital.type)) {
      storedEntered.push(vital.type);
    }
    localStorage.setItem(storedKey, JSON.stringify(storedEntered));
    
    // Check if all 5 vitals are now entered today
    if (storedEntered.length === 5) {
      const now = new Date();
      localStorage.setItem('vitalsLastCompletedEntry', now.toISOString());
      const cooldownEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setCooldownUntil(cooldownEnd);
    }
    
    setShowVitalsEntry(false);
  };

  return (
    <div className="pb-24 pt-6 px-4 space-y-4 animate-fade-in bg-gray-50 min-h-full">
      
      {/* Blood Pressure Card (New) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                      <Gauge className="text-orange-500" size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900 text-lg">Blood Pressure</h3>
                      <p className="text-gray-500 text-sm">{latestBP ? formatTimestamp(latestBP.timestamp) : 'No data'}</p>
                  </div>
              </div>
              {latestBP && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  (latestBP.value as { systolic: number }).systolic > 140 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                    {(latestBP.value as { systolic: number }).systolic > 140 ? 'Elevated' : 'Normal'}
                </span>
              )}
          </div>

          <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black text-gray-900">
                {latestBP 
                  ? `${(latestBP.value as { systolic: number; diastolic: number }).systolic}/${(latestBP.value as { systolic: number; diastolic: number }).diastolic}`
                  : '--/--'}
              </span>
              <span className="text-gray-500 font-bold mb-1">mmHg</span>
          </div>

          <p className="text-gray-500 text-sm font-medium">
             {latestBP ? 'Recent reading' : 'Add your first blood pressure reading'}
          </p>
      </div>

      {/* Temperature Card */}
      {latestTemp && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center">
                        <Thermometer className="text-yellow-500" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Temperature</h3>
                        <p className="text-gray-500 text-sm">{latestTemp ? formatTimestamp(latestTemp.timestamp) : 'No data'}</p>
                    </div>
                </div>
                {latestTemp && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (latestTemp.value as number) > 100.4 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                      {(latestTemp.value as number) > 100.4 ? 'Fever' : 'Normal'}
                  </span>
                )}
            </div>

            <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-gray-900">{latestTemp ? (latestTemp.value as number).toFixed(1) : '--'}</span>
                <span className="text-gray-500 font-bold mb-1">°F</span>
            </div>
        </div>
      )}

      {/* Weight Card */}
      {latestWeight && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                        <Activity className="text-purple-500" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Weight</h3>
                        <p className="text-gray-500 text-sm">{latestWeight ? formatTimestamp(latestWeight.timestamp) : 'No data'}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-gray-900">{latestWeight ? (latestWeight.value as number).toFixed(1) : '--'}</span>
                <span className="text-gray-500 font-bold mb-1">kg</span>
            </div>
        </div>
      )}

      {/* Blood Sugar Card */}
      {latestBG && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center">
                        <Droplet className="text-pink-500" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Blood Sugar</h3>
                        <p className="text-gray-500 text-sm">{latestBG ? formatTimestamp(latestBG.timestamp) : 'No data'}</p>
                    </div>
                </div>
                {latestBG && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (latestBG.value as number) > 180 || (latestBG.value as number) < 70
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                      {(latestBG.value as number) > 180 ? 'High' : (latestBG.value as number) < 70 ? 'Low' : 'Normal'}
                  </span>
                )}
            </div>

            <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-gray-900">{latestBG ? Math.round(latestBG.value as number) : '--'}</span>
                <span className="text-gray-500 font-bold mb-1">mg/dL</span>
            </div>
        </div>
      )}

      {/* Manual Heart Rate Card */}
      {latestHR && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                        <Activity className="text-red-500" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Heart Rate (Manual)</h3>
                        <p className="text-gray-500 text-sm">{latestHR ? formatTimestamp(latestHR.timestamp) : 'No data'}</p>
                    </div>
                </div>
                {latestHR && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (latestHR.value as number) > 100 || (latestHR.value as number) < 60
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                      {(latestHR.value as number) > 100 ? 'High' : (latestHR.value as number) < 60 ? 'Low' : 'Normal'}
                  </span>
                )}
            </div>

            <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-gray-900">{latestHR ? Math.round(latestHR.value as number) : '--'}</span>
                <span className="text-gray-500 font-bold mb-1">BPM</span>
            </div>
        </div>
      )}

      {/* Daily Steps Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                      <Activity className="text-teal-500" size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900 text-lg">Daily Steps</h3>
                      <p className="text-gray-500 text-sm">Activity</p>
                  </div>
              </div>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">Goal: 5k</span>
          </div>

          <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-black text-gray-900">{status?.steps !== undefined ? status.steps.toLocaleString() : '--'}</span>
              <span className="text-gray-500 font-bold mb-1">steps</span>
          </div>

          <div className="mb-2 flex justify-between items-center text-xs text-gray-500 font-medium">
             <span>Progress</span>
             <span>{status?.steps !== undefined ? Math.round((status.steps / 5000) * 100) : 0}%</span>
          </div>

          <div className="relative mb-4">
            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100">
                <div style={{ width: `${status?.steps !== undefined ? (status.steps / 5000) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-400 rounded-full"></div>
            </div>
          </div>
          
            <p className="text-gray-500 text-sm font-medium">
             {status?.steps !== undefined ? (5000 - status.steps).toLocaleString() : 'Set your goal and start tracking'}
            </p>
          </div>

      {/* Cooldown Message */}
      {cooldownUntil && (
        <div className="fixed bottom-32 left-4 right-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-lg z-30">
          <div className="flex items-start gap-3">
            <div className="text-2xl mt-0.5">⏱️</div>
            <div>
              <p className="font-bold text-amber-900">You've completed all 5 vitals!</p>
              <p className="text-sm text-amber-700 mt-1">Come back in <span className="font-bold">{remainingTime}</span> to log again.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Vitals Button (Floating) */}
      {onAddVital && (
        <button
          onClick={() => setShowVitalsEntry(true)}
          disabled={!!cooldownUntil}
          className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all active:scale-95 z-40 ${
            cooldownUntil
              ? 'bg-gray-300 opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-300 hover:shadow-xl'
          }`}
          aria-label="Add Vitals"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* Manual Vitals Entry Modal */}
      {showVitalsEntry && onAddVital && (
        <ManualVitalsEntry
          onSave={handleSaveVital}
          onClose={() => setShowVitalsEntry(false)}
          enteredBy={enteredBy}
        />
      )}

    </div>
  );
};