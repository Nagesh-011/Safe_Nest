import React, { useState, useEffect } from 'react';
import { Bell, Shield, Navigation, Mic, Activity, LogOut, ChevronRight, Volume2, Globe } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { UserRole } from '../types';

interface SettingsViewProps {
    onSignOut?: () => void;
    onJoinAnotherHousehold?: () => void;
    userRole?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSignOut, onJoinAnotherHousehold, userRole }) => {
    const { language, setLanguage, t } = useLanguage();
  
  useEffect(() => {
    console.log('[SettingsView] onSignOut:', typeof onSignOut);
  }, [onSignOut]);

  const [fallSensitivity, setFallSensitivity] = useState('Medium');
  const [notifications, setNotifications] = useState(true);

    // Language selection limited to English, Hindi, Marathi
  
  const getSensitivityDescription = (level: string) => {
    switch(level) {
      case 'Low':
        return '📊 Only major falls detected. Best for active seniors. ~99% less false alarms.';
      case 'High':
        return '⚠️ Very sensitive. Detects minor falls & stumbles. ~5% false alarms.';
      case 'Medium':
      default:
        return '✓ Balanced sensitivity. Recommended for most seniors.';
    }
  };

  return (
    <div className="pb-24 pt-6 px-4 space-y-6 animate-fade-in bg-gray-50 min-h-full">
      <h1 className="text-2xl font-bold text-gray-900">{t.settings}</h1>

      <div className="space-y-6">
        
        {/* Detection Settings */}
        <section>
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t.safetyDetection}</h2>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <Activity size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">{t.fallSensitivity}</p>
                            <p className="text-xs text-gray-500">{t.adjustDetection}</p>
                        </div>
                    </div>
                    
                    {/* Sensitivity Options with descriptions */}
                    <div className="space-y-2 mt-3">
                        {['Low', 'Medium', 'High'].map((level) => (
                            <label key={level} className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all" style={{borderColor: fallSensitivity === level ? '#3b82f6' : '#e5e7eb', backgroundColor: fallSensitivity === level ? '#eff6ff' : '#fff'}}>
                                <input 
                                    type="radio" 
                                    name="sensitivity" 
                                    value={level}
                                    checked={fallSensitivity === level}
                                    onChange={(e) => setFallSensitivity(e.target.value)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <div className="ml-3 flex-1">
                                    <p className="font-semibold text-gray-900">{level}</p>
                                    <p className="text-xs text-gray-600">{getSensitivityDescription(level)}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    
                    {/* Info box */}
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                        <strong>💡 How it works:</strong> SafeNest uses accelerometer + gyroscope + pressure sensors to detect falls accurately. Adjust based on your activity level.
                    </div>
                </div>

                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                            <Mic size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">Voice Emergency</p>
                            <p className="text-xs text-gray-500">Detect shouts/loud sounds after fall</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                 <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg text-green-600">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{t.autoSOSTimer}</p>
                            <p className="text-xs text-gray-500">{t.delayBefore102}</p>
                        </div>
                    </div>
                     <span className="text-sm font-bold text-gray-600">10s</span>
                </div>
             </div>
        </section>

        {/* Alerts & Notifications */}
        <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t.alerts}</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <Volume2 size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{t.sirenVolume}</p>
                            <p className="text-xs text-gray-500">{t.maxVolume}</p>
                        </div>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                    </div>
                </div>
                 <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                            <Bell size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{t.notifications}</p>
                            <p className="text-xs text-gray-500">{t.alertsForCaregivers}</p>
                        </div>
                    </div>
                    <div 
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${notifications ? 'bg-green-500' : 'bg-gray-300'}`}
                        onClick={() => setNotifications(!notifications)}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifications ? 'right-1' : 'left-1'}`}></div>
                    </div>
                </div>
            </div>
        </section>

                {/* Language Preferences */}
                <section>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t.language}</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <Globe size={20} />
                                </div>
                                <p className="font-semibold text-gray-900">{t.selectLanguage}</p>
                
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setLanguage('en' as any)}
                                    className={`py-2 px-3 rounded-lg text-sm font-semibold border ${language === 'en' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => setLanguage('hi' as any)}
                                    className={`py-2 px-3 rounded-lg text-sm font-semibold border ${language === 'hi' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                                >
                                    हिन्दी
                                </button>
                                <button
                                    onClick={() => setLanguage('mr' as any)}
                                    className={`py-2 px-3 rounded-lg text-sm font-semibold border ${language === 'mr' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                                >
                                    मराठी
                                </button>
                            </div>
                        </div>
                </section>

         {/* Account */}
         <section>
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t.account}</h2>
             <div className="space-y-3">
               {userRole === UserRole.CAREGIVER && onJoinAnotherHousehold && (
                 <button 
                   onClick={onJoinAnotherHousehold}
                   className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:bg-blue-50 transition-colors"
                 >
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                       <Shield size={20} className="text-blue-600" />
                     </div>
                     <div className="text-left">
                       <p className="font-semibold text-gray-900">Join Another Household</p>
                       <p className="text-xs text-gray-500">Monitor multiple seniors</p>
                     </div>
                   </div>
                   <ChevronRight size={20} className="text-gray-400" />
                 </button>
               )}
               
               <button 
                 onClick={() => {
                   console.log('[SettingsView] Clicked, onSignOut=', onSignOut);
                   if (onSignOut) onSignOut();
                 }}
                 className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3 text-red-600 font-bold hover:bg-red-50 transition-colors"
               >
                   <LogOut size={20} />
                   {t.signOut}
               </button>
             </div>
         </section>

         <div className="text-center pt-4 pb-8">
             <p className="text-xs text-gray-400">{t.appName} {t.version} 1.0.4</p>
         </div>

      </div>
    </div>
  );
};