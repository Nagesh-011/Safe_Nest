import React, { useState, useEffect } from 'react';
import { Droplets, Plus, Settings, ChevronLeft, Target, Clock, TrendingUp } from 'lucide-react';
import { waterReminder } from '../services/waterReminder';
import { WaterLog, WaterSettings } from '../types';

interface WaterTrackerViewProps {
  onBack?: () => void;
}

export const WaterTrackerView: React.FC<WaterTrackerViewProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [settings, setSettings] = useState<WaterSettings>(waterReminder.getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);

  useEffect(() => {
    refreshData();
    // Start reminders when component mounts
    waterReminder.startReminders();
    
    return () => {
      // Don't stop reminders on unmount - they should keep running
    };
  }, []);

  const refreshData = () => {
    setLogs(waterReminder.getTodayLogs());
    setProgress(waterReminder.getProgress());
    setTodayTotal(waterReminder.getTodayTotal());
  };

  const handleLogWater = (amount: number) => {
    waterReminder.logWater(amount);
    refreshData();
  };

  const handleUpdateSettings = (newSettings: Partial<WaterSettings>) => {
    waterReminder.updateSettings(newSettings);
    setSettings(waterReminder.getSettings());
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const remaining = waterReminder.getRemaining();
  const glassesRemaining = Math.ceil(remaining / 250);

  return (
    <div className="pb-24 pt-6 px-4 min-h-full bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg bg-white shadow-sm">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">💧 Water Tracker</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg bg-white shadow-sm"
        >
          <Settings size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Progress Circle */}
      <div className="bg-white rounded-3xl shadow-lg p-8 mb-6 text-center">
        <div className="relative w-48 h-48 mx-auto mb-4">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#3b82f6"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={553}
              strokeDashoffset={553 - (553 * progress) / 100}
              className="transition-all duration-500"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets size={32} className="text-blue-500 mb-1" />
            <span className="text-4xl font-bold text-gray-900">{progress}%</span>
            <span className="text-sm text-gray-500">{todayTotal} / {settings.dailyGoal} ml</span>
          </div>
        </div>

        {progress >= 100 ? (
          <div className="bg-green-100 text-green-700 py-2 px-4 rounded-full inline-block font-semibold">
            🎉 Goal Reached!
          </div>
        ) : (
          <p className="text-gray-500">
            {glassesRemaining} more glass{glassesRemaining > 1 ? 'es' : ''} to go
          </p>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => handleLogWater(100)}
          className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors"
        >
          <div className="text-2xl mb-1">🥤</div>
          <div className="text-sm font-semibold text-gray-700">Small</div>
          <div className="text-xs text-gray-400">100 ml</div>
        </button>
        
        <button
          onClick={() => handleLogWater(250)}
          className="bg-blue-500 rounded-xl p-4 shadow-md hover:bg-blue-600 transition-colors"
        >
          <div className="text-2xl mb-1">🥛</div>
          <div className="text-sm font-semibold text-white">Glass</div>
          <div className="text-xs text-blue-100">250 ml</div>
        </button>
        
        <button
          onClick={() => handleLogWater(500)}
          className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors"
        >
          <div className="text-2xl mb-1">🍶</div>
          <div className="text-sm font-semibold text-gray-700">Bottle</div>
          <div className="text-xs text-gray-400">500 ml</div>
        </button>
      </div>

      {/* Custom Amount */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Custom Amount</p>
        <div className="flex gap-2">
          {[150, 200, 300, 350, 400].map(amount => (
            <button
              key={amount}
              onClick={() => handleLogWater(amount)}
              className="flex-1 py-2 px-2 text-xs bg-gray-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {amount}ml
            </button>
          ))}
        </div>
      </div>

      {/* Today's Log */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Clock size={18} className="text-blue-500" />
          Today's Log
        </h3>
        
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No water logged yet today</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.slice().reverse().map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💧</span>
                  <span className="font-medium text-gray-700">{log.amount} ml</span>
                </div>
                <span className="text-sm text-gray-400">{formatTime(log.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Water Reminder Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Target size={16} />
                  Daily Goal (ml)
                </label>
                <input
                  type="number"
                  value={settings.dailyGoal}
                  onChange={(e) => handleUpdateSettings({ dailyGoal: parseInt(e.target.value) || 2000 })}
                  className="w-full p-3 border rounded-xl mt-1"
                  step="250"
                />
                <p className="text-xs text-gray-400 mt-1">Recommended: 2000-3000 ml per day</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Remind Every (minutes)</label>
                <div className="flex gap-2 mt-1">
                  {[30, 45, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      onClick={() => handleUpdateSettings({ reminderInterval: mins })}
                      className={`flex-1 py-2 rounded-lg text-sm ${
                        settings.reminderInterval === mins
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => handleUpdateSettings({ startTime: e.target.value })}
                    className="w-full p-3 border rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => handleUpdateSettings({ endTime: e.target.value })}
                    className="w-full p-3 border rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="font-medium text-gray-900">Enable Reminders</p>
                  <p className="text-xs text-gray-500">Get notifications to drink water</p>
                </div>
                <button
                  onClick={() => handleUpdateSettings({ enabled: !settings.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.enabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                    settings.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
