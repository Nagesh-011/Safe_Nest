import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface EnhancedEmergencyButtonProps {
  onClick: () => void;
  label?: string;
  subLabel?: string;
  showWarning?: boolean;
}

export const EnhancedEmergencyButton: React.FC<EnhancedEmergencyButtonProps> = ({ 
  onClick, 
  label = 'SOS',
  subLabel = 'EMERGENCY',
  showWarning = true 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClick = () => {
    setConfirmCount(prev => prev + 1);
    setIsPressed(true);
    
    // If clicked multiple times, trigger emergency
    if (confirmCount >= 1) {
      setShowConfirmation(true);
      setTimeout(() => {
        onClick();
        setConfirmCount(0);
        setIsPressed(false);
        setShowConfirmation(false);
      }, 500);
    } else {
      setTimeout(() => setIsPressed(false), 200);
    }
  };

  useEffect(() => {
    // Reset counter after 3 seconds
    const timeout = setTimeout(() => setConfirmCount(0), 3000);
    return () => clearTimeout(timeout);
  }, [confirmCount]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Warning Banner */}
      {showWarning && (
        <div className="w-full bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-center gap-2 animate-pulse">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div className="text-sm font-semibold text-red-700">
            This will send emergency alert to your caregiver
          </div>
        </div>
      )}

      {/* Main Emergency Button */}
      <div className="relative py-6 px-4 w-full flex justify-center">
        <button
          onClick={handleClick}
          className="relative w-full max-w-xs h-32 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isPressed 
              ? 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)' 
              : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            boxShadow: isPressed 
              ? '0 0 30px rgba(220, 38, 38, 0.8), inset 0 0 10px rgba(0,0,0,0.2)' 
              : '0 10px 40px rgba(220, 38, 38, 0.3), 0 0 60px rgba(220, 38, 38, 0.2)',
          }}
        >
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-3xl" 
            style={{
              background: 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div className="absolute -inset-2 rounded-3xl border-2 border-red-400 opacity-30" />
          
          {/* Main Content */}
          <div className="relative z-10 text-center">
            <div className="text-6xl font-black text-white drop-shadow-lg mb-1">
              {label}
            </div>
            <div className="text-white font-bold text-lg tracking-wider drop-shadow">
              {subLabel}
            </div>
            {confirmCount > 0 && (
              <div className="text-white text-xs font-semibold mt-2 animate-bounce">
                Tap again to confirm
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Confirmation State */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center animate-bounce-in">
            <div className="text-5xl mb-4">🚨</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Emergency Alert Sent!</h2>
            <p className="text-gray-600 mb-4">Your caregiver has been notified.</p>
            <p className="text-sm text-gray-500">Stay calm. Help is on the way.</p>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {confirmCount === 0 ? 'Ready' : `Tap again to send SOS (${2 - confirmCount} taps)`}
      </div>
    </div>
  );
};
