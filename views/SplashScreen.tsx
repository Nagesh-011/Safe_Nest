import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Complete after fade animation (2.5s total)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-green-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo with fade-in and scale animation */}
      <div className="animate-splash-logo">
        <img 
          src="/logo.png" 
          alt="SafeNest" 
          className="w-72 h-72 object-contain drop-shadow-xl"
        />
      </div>

      {/* Three animated dots */}
      <div className="flex items-center gap-2 mt-8">
        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce-dot" style={{ animationDelay: '0s' }} />
        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce-dot" style={{ animationDelay: '0.2s' }} />
        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce-dot" style={{ animationDelay: '0.4s' }} />
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes splash-logo {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
        
        .animate-splash-logo {
          animation: splash-logo 0.6s ease-out forwards;
        }
        
        .animate-bounce-dot {
          animation: bounce-dot 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
