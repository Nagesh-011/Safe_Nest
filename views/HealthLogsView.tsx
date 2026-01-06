import React, { useState, useEffect } from 'react';
import { 
  Heart, Droplets, Moon, Plus, TrendingUp, TrendingDown, 
  Calendar, Clock, ChevronLeft, Activity, Minus
} from 'lucide-react';
import { BloodPressureLog, BloodSugarLog, SleepLog } from '../types';

interface HealthLogsViewProps {
  bpLogs: BloodPressureLog[];
  sugarLogs: BloodSugarLog[];
  sleepLogs: SleepLog[];
  onAddBPLog: (log: Omit<BloodPressureLog, 'id'>) => void;
  onAddSugarLog: (log: Omit<BloodSugarLog, 'id'>) => void;
  onAddSleepLog: (log: Omit<SleepLog, 'id'>) => void;
  onBack?: () => void;
  userRole: 'senior' | 'caregiver';
}

type TabType = 'bp' | 'sugar' | 'sleep';

export const HealthLogsView: React.FC<HealthLogsViewProps> = ({
  bpLogs,
  sugarLogs,
  sleepLogs,
  onAddBPLog,
  onAddSugarLog,
  onAddSleepLog,
  onBack,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('bp');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // BP Form
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [bpPulse, setBpPulse] = useState('');
  const [bpTimeOfDay, setBpTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [bpNotes, setBpNotes] = useState('');

  // Sugar Form
  const [sugarValue, setSugarValue] = useState('');
  const [sugarType, setSugarType] = useState<'fasting' | 'before_meal' | 'after_meal' | 'random' | 'bedtime'>('fasting');
  const [sugarNotes, setSugarNotes] = useState('');

  // Sleep Form
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleepDuration, setSleepDuration] = useState('7');
  const [sleepBedTime, setSleepBedTime] = useState('22:00');
  const [sleepWakeTime, setSleepWakeTime] = useState('06:00');
  const [sleepInterruptions, setSleepInterruptions] = useState('0');
  const [sleepNotes, setSleepNotes] = useState('');

  const getBPStatus = (systolic: number, diastolic: number): { status: string; color: string } => {
    if (systolic < 90 || diastolic < 60) return { status: 'Low', color: 'text-blue-600 bg-blue-100' };
    if (systolic <= 120 && diastolic <= 80) return { status: 'Normal', color: 'text-green-600 bg-green-100' };
    if (systolic <= 139 || diastolic <= 89) return { status: 'Elevated', color: 'text-yellow-600 bg-yellow-100' };
    if (systolic <= 159 || diastolic <= 99) return { status: 'High (Stage 1)', color: 'text-orange-600 bg-orange-100' };
    return { status: 'High (Stage 2)', color: 'text-red-600 bg-red-100' };
  };

  const getSugarStatus = (value: number, type: string): { status: string; color: string } => {
    if (type === 'fasting') {
      if (value < 70) return { status: 'Low', color: 'text-blue-600 bg-blue-100' };
      if (value <= 100) return { status: 'Normal', color: 'text-green-600 bg-green-100' };
      if (value <= 125) return { status: 'Pre-diabetic', color: 'text-yellow-600 bg-yellow-100' };
      return { status: 'High', color: 'text-red-600 bg-red-100' };
    } else if (type === 'after_meal') {
      if (value < 70) return { status: 'Low', color: 'text-blue-600 bg-blue-100' };
      if (value <= 140) return { status: 'Normal', color: 'text-green-600 bg-green-100' };
      if (value <= 199) return { status: 'Elevated', color: 'text-yellow-600 bg-yellow-100' };
      return { status: 'High', color: 'text-red-600 bg-red-100' };
    }
    // Random
    if (value < 70) return { status: 'Low', color: 'text-blue-600 bg-blue-100' };
    if (value <= 140) return { status: 'Normal', color: 'text-green-600 bg-green-100' };
    return { status: 'Elevated', color: 'text-yellow-600 bg-yellow-100' };
  };

  const getSleepQualityLabel = (quality: number): string => {
    const labels = ['', 'Very Poor 😴', 'Poor 😕', 'Fair 😐', 'Good 😊', 'Excellent 🌟'];
    return labels[quality] || '';
  };

  const handleAddBP = () => {
    if (!bpSystolic || !bpDiastolic) return;
    onAddBPLog({
      systolic: parseInt(bpSystolic),
      diastolic: parseInt(bpDiastolic),
      pulse: bpPulse ? parseInt(bpPulse) : undefined,
      timestamp: new Date(),
      timeOfDay: bpTimeOfDay,
      notes: bpNotes || undefined,
      enteredBy: userRole,
    });
    setBpSystolic('');
    setBpDiastolic('');
    setBpPulse('');
    setBpNotes('');
    setShowAddModal(false);
  };

  const handleAddSugar = () => {
    if (!sugarValue) return;
    onAddSugarLog({
      value: parseInt(sugarValue),
      measurementType: sugarType,
      timestamp: new Date(),
      notes: sugarNotes || undefined,
      enteredBy: userRole,
    });
    setSugarValue('');
    setSugarNotes('');
    setShowAddModal(false);
  };

  const handleAddSleep = () => {
    onAddSleepLog({
      date: new Date(),
      bedTime: sleepBedTime,
      wakeTime: sleepWakeTime,
      duration: parseFloat(sleepDuration),
      quality: sleepQuality,
      interruptions: parseInt(sleepInterruptions) || 0,
      notes: sleepNotes || undefined,
      enteredBy: userRole,
    });
    setSleepNotes('');
    setShowAddModal(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecentBPAverage = (): { systolic: number; diastolic: number } | null => {
    const recent = bpLogs.slice(0, 7);
    if (recent.length === 0) return null;
    const avgSys = Math.round(recent.reduce((sum, l) => sum + l.systolic, 0) / recent.length);
    const avgDia = Math.round(recent.reduce((sum, l) => sum + l.diastolic, 0) / recent.length);
    return { systolic: avgSys, diastolic: avgDia };
  };

  const getRecentSugarAverage = (): number | null => {
    const recent = sugarLogs.slice(0, 7);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((sum, l) => sum + l.value, 0) / recent.length);
  };

  const getAverageSleep = (): number | null => {
    const recent = sleepLogs.slice(0, 7);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((sum, l) => sum + (l.duration || 0), 0) / recent.length * 10) / 10;
  };

  return (
    <div className="pb-24 pt-6 px-4 min-h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg bg-white shadow-sm">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Health Logs</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('bp')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'bp' 
              ? 'bg-red-500 text-white' 
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          <Heart size={18} />
          BP
        </button>
        <button
          onClick={() => setActiveTab('sugar')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'sugar' 
              ? 'bg-purple-500 text-white' 
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          <Droplets size={18} />
          Sugar
        </button>
        <button
          onClick={() => setActiveTab('sleep')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'sleep' 
              ? 'bg-indigo-500 text-white' 
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          <Moon size={18} />
          Sleep
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        {activeTab === 'bp' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">7-Day Average</p>
              {getRecentBPAverage() ? (
                <>
                  <p className="text-3xl font-bold text-gray-900">
                    {getRecentBPAverage()?.systolic}/{getRecentBPAverage()?.diastolic}
                  </p>
                  <p className={`text-sm font-medium px-2 py-0.5 rounded inline-block ${getBPStatus(getRecentBPAverage()!.systolic, getRecentBPAverage()!.diastolic).color}`}>
                    {getBPStatus(getRecentBPAverage()!.systolic, getRecentBPAverage()!.diastolic).status}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">No readings yet</p>
              )}
            </div>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Heart size={32} className="text-red-500" />
            </div>
          </div>
        )}
        
        {activeTab === 'sugar' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">7-Day Average</p>
              {getRecentSugarAverage() ? (
                <>
                  <p className="text-3xl font-bold text-gray-900">
                    {getRecentSugarAverage()} <span className="text-lg text-gray-500">mg/dL</span>
                  </p>
                </>
              ) : (
                <p className="text-gray-400">No readings yet</p>
              )}
            </div>
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <Droplets size={32} className="text-purple-500" />
            </div>
          </div>
        )}
        
        {activeTab === 'sleep' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Sleep Duration</p>
              {getAverageSleep() ? (
                <p className="text-3xl font-bold text-gray-900">
                  {getAverageSleep()} <span className="text-lg text-gray-500">hours</span>
                </p>
              ) : (
                <p className="text-gray-400">No logs yet</p>
              )}
            </div>
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <Moon size={32} className="text-indigo-500" />
            </div>
          </div>
        )}
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 mb-6 ${
          activeTab === 'bp' ? 'bg-red-500' : activeTab === 'sugar' ? 'bg-purple-500' : 'bg-indigo-500'
        }`}
      >
        <Plus size={20} />
        Add {activeTab === 'bp' ? 'Blood Pressure' : activeTab === 'sugar' ? 'Blood Sugar' : 'Sleep'} Reading
      </button>

      {/* Logs List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-500 uppercase">Recent Readings</h3>
        
        {activeTab === 'bp' && bpLogs.length === 0 && (
          <p className="text-center text-gray-400 py-8">No blood pressure readings yet</p>
        )}
        
        {activeTab === 'bp' && bpLogs.map(log => (
          <div key={log.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{log.systolic}/{log.diastolic}</p>
                {log.pulse && <p className="text-sm text-gray-500">Pulse: {log.pulse} bpm</p>}
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getBPStatus(log.systolic, log.diastolic).color}`}>
                  {getBPStatus(log.systolic, log.diastolic).status}
                </span>
                <p className="text-xs text-gray-400 mt-1 capitalize">{log.timeOfDay}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{formatDate(log.timestamp)}</p>
            {log.notes && <p className="text-sm text-gray-600 mt-1">📝 {log.notes}</p>}
          </div>
        ))}

        {activeTab === 'sugar' && sugarLogs.length === 0 && (
          <p className="text-center text-gray-400 py-8">No blood sugar readings yet</p>
        )}
        
        {activeTab === 'sugar' && sugarLogs.map(log => (
          <div key={log.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{log.value} <span className="text-sm text-gray-500">mg/dL</span></p>
                <p className="text-sm text-gray-500 capitalize">{log.measurementType.replace('_', ' ')}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${getSugarStatus(log.value, log.measurementType).color}`}>
                {getSugarStatus(log.value, log.measurementType).status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{formatDate(log.timestamp)}</p>
            {log.notes && <p className="text-sm text-gray-600 mt-1">📝 {log.notes}</p>}
          </div>
        ))}

        {activeTab === 'sleep' && sleepLogs.length === 0 && (
          <p className="text-center text-gray-400 py-8">No sleep logs yet</p>
        )}
        
        {activeTab === 'sleep' && sleepLogs.map(log => (
          <div key={log.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{log.duration}h</p>
                <p className="text-sm text-gray-500">{getSleepQualityLabel(log.quality)}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                {log.bedTime && <p>🛏️ {log.bedTime}</p>}
                {log.wakeTime && <p>⏰ {log.wakeTime}</p>}
              </div>
            </div>
            {log.interruptions && log.interruptions > 0 && (
              <p className="text-xs text-orange-500 mt-1">Woke up {log.interruptions} times</p>
            )}
            <p className="text-xs text-gray-400 mt-2">{formatDate(log.date)}</p>
            {log.notes && <p className="text-sm text-gray-600 mt-1">📝 {log.notes}</p>}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                Add {activeTab === 'bp' ? 'Blood Pressure' : activeTab === 'sugar' ? 'Blood Sugar' : 'Sleep'} Reading
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>

            {activeTab === 'bp' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Systolic (Top)</label>
                    <input
                      type="number"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder="120"
                      className="w-full p-3 border rounded-xl text-lg font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Diastolic (Bottom)</label>
                    <input
                      type="number"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder="80"
                      className="w-full p-3 border rounded-xl text-lg font-bold text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pulse (Optional)</label>
                  <input
                    type="number"
                    value={bpPulse}
                    onChange={(e) => setBpPulse(e.target.value)}
                    placeholder="72"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Time of Day</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {(['morning', 'afternoon', 'evening', 'night'] as const).map(time => (
                      <button
                        key={time}
                        onClick={() => setBpTimeOfDay(time)}
                        className={`py-2 px-3 rounded-lg text-sm capitalize ${
                          bpTimeOfDay === time ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <input
                    type="text"
                    value={bpNotes}
                    onChange={(e) => setBpNotes(e.target.value)}
                    placeholder="e.g., After exercise"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <button
                  onClick={handleAddBP}
                  disabled={!bpSystolic || !bpDiastolic}
                  className="w-full py-4 bg-red-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  Save Reading
                </button>
              </div>
            )}

            {activeTab === 'sugar' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    value={sugarValue}
                    onChange={(e) => setSugarValue(e.target.value)}
                    placeholder="100"
                    className="w-full p-3 border rounded-xl text-2xl font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Measurement Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {([
                      { value: 'fasting', label: 'Fasting' },
                      { value: 'before_meal', label: 'Before Meal' },
                      { value: 'after_meal', label: 'After Meal' },
                      { value: 'random', label: 'Random' },
                      { value: 'bedtime', label: 'Bedtime' },
                    ] as const).map(type => (
                      <button
                        key={type.value}
                        onClick={() => setSugarType(type.value)}
                        className={`py-2 px-3 rounded-lg text-sm ${
                          sugarType === type.value ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <input
                    type="text"
                    value={sugarNotes}
                    onChange={(e) => setSugarNotes(e.target.value)}
                    placeholder="e.g., Felt dizzy"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <button
                  onClick={handleAddSugar}
                  disabled={!sugarValue}
                  className="w-full py-4 bg-purple-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  Save Reading
                </button>
              </div>
            )}

            {activeTab === 'sleep' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Sleep Quality</label>
                  <div className="flex justify-between mt-2">
                    {[1, 2, 3, 4, 5].map(q => (
                      <button
                        key={q}
                        onClick={() => setSleepQuality(q as 1|2|3|4|5)}
                        className={`w-12 h-12 rounded-full text-xl ${
                          sleepQuality === q ? 'bg-indigo-500 text-white' : 'bg-gray-100'
                        }`}
                      >
                        {q === 1 ? '😴' : q === 2 ? '😕' : q === 3 ? '😐' : q === 4 ? '😊' : '🌟'}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-1">{getSleepQualityLabel(sleepQuality)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Bed Time</label>
                    <input
                      type="time"
                      value={sleepBedTime}
                      onChange={(e) => setSleepBedTime(e.target.value)}
                      className="w-full p-3 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Wake Time</label>
                    <input
                      type="time"
                      value={sleepWakeTime}
                      onChange={(e) => setSleepWakeTime(e.target.value)}
                      className="w-full p-3 border rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Hours Slept</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(e.target.value)}
                    className="w-full p-3 border rounded-xl text-center text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Times Woke Up</label>
                  <input
                    type="number"
                    value={sleepInterruptions}
                    onChange={(e) => setSleepInterruptions(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <input
                    type="text"
                    value={sleepNotes}
                    onChange={(e) => setSleepNotes(e.target.value)}
                    placeholder="e.g., Had nightmares"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <button
                  onClick={handleAddSleep}
                  className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl"
                >
                  Save Sleep Log
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
