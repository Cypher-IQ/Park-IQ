/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';

const AnimationContext = createContext(null);

export function CarAnimationProvider({ children }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationText, setAnimationText] = useState('');

  const triggerCarAnimation = useCallback((text = '', durationMs = 2200) => {
    setAnimationText(text);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setAnimationText('');
    }, durationMs);
  }, []);

  return (
    <AnimationContext.Provider value={{ triggerCarAnimation }}>
      {children}
      {isAnimating && <Car3DOverlay text={animationText} />}
    </AnimationContext.Provider>
  );
}

export const useCarAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) throw new Error('useCarAnimation must be used within a CarAnimationProvider');
  return context;
};

// ── 3-D Isometric Car Overlay ──────────────────────────────────────────────────
function Car3DOverlay({ text }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-md" />

      {/* Scene */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* 3-D Car SVG */}
        <div className="car-3d-wrapper">
          <svg
            viewBox="0 0 220 120"
            width="280"
            height="150"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bodyTop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22E5FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="bodyRight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="bodyFront" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00B8E0" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="roofTop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.9" />
              </linearGradient>
              <filter id="carGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="shadowFilter">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="110" cy="112" rx="75" ry="8" fill="#00D4FF" opacity="0.15" filter="url(#shadowFilter)" />

            {/* === ISO CAR BODY === */}
            <g filter="url(#carGlow)">
              {/* Main body — top face */}
              <polygon
                points="50,55  160,55  175,70  35,70"
                fill="url(#bodyTop)"
                opacity="0.95"
              />
              {/* Body — right side face */}
              <polygon
                points="160,55  175,70  175,90  160,90"
                fill="url(#bodyRight)"
              />
              {/* Body — front face */}
              <polygon
                points="35,70  175,70  175,90  35,90"
                fill="url(#bodyFront)"
              />
              {/* Body edge highlights */}
              <line x1="35" y1="70" x2="175" y2="70" stroke="#22E5FF" strokeWidth="0.8" opacity="0.6" />
              <line x1="35" y1="70" x2="35" y2="90" stroke="#22E5FF" strokeWidth="0.8" opacity="0.4" />
              <line x1="175" y1="70" x2="175" y2="90" stroke="#22E5FF" strokeWidth="0.8" opacity="0.4" />

              {/* Cabin — top face */}
              <polygon
                points="75,35  145,35  160,55  60,55"
                fill="url(#roofTop)"
                opacity="0.9"
              />
              {/* Cabin — right face */}
              <polygon
                points="145,35  160,55  160,55  145,35"
                fill="#8B5CF6"
                opacity="0.7"
              />
              {/* Cabin glass — windshield (front) */}
              <polygon
                points="63,55  157,55  143,38  77,38"
                fill="#0A0F1E"
                opacity="0.6"
              />
              <polygon
                points="65,54  155,54  141,40  79,40"
                fill="#00D4FF"
                opacity="0.07"
              />

              {/* Headlights */}
              <ellipse cx="168" cy="78" rx="5" ry="4" fill="#22E5FF" opacity="0.9" />
              <ellipse cx="168" cy="78" rx="3" ry="2.5" fill="white" opacity="0.8" />
              <ellipse cx="168" cy="78" rx="7" ry="5" fill="#22E5FF" opacity="0.3" filter="url(#carGlow)" />

              {/* Taillights */}
              <ellipse cx="42" cy="80" rx="4" ry="3.5" fill="#EF4444" opacity="0.85" />
              <ellipse cx="42" cy="80" rx="5.5" ry="4.5" fill="#EF4444" opacity="0.25" filter="url(#carGlow)" />

              {/* Front Wheel */}
              <ellipse cx="155" cy="91" rx="14" ry="9" fill="#0A0F1E" />
              <ellipse cx="155" cy="91" rx="11" ry="7" fill="#1a2235" />
              <ellipse cx="155" cy="91" rx="6" ry="4" fill="#00D4FF" opacity="0.6" />
              <ellipse cx="155" cy="91" rx="2.5" ry="1.8" fill="#22E5FF" opacity="0.9" />
              {/* Wheel rim spokes */}
              <line x1="155" y1="84" x2="155" y2="88" stroke="#22E5FF" strokeWidth="1" opacity="0.5" />
              <line x1="149" y1="88" x2="152" y2="90" stroke="#22E5FF" strokeWidth="1" opacity="0.5" />
              <line x1="161" y1="88" x2="158" y2="90" stroke="#22E5FF" strokeWidth="1" opacity="0.5" />

              {/* Rear Wheel */}
              <ellipse cx="55" cy="91" rx="14" ry="9" fill="#0A0F1E" />
              <ellipse cx="55" cy="91" rx="11" ry="7" fill="#1a2235" />
              <ellipse cx="55" cy="91" rx="6" ry="4" fill="#7C3AED" opacity="0.6" />
              <ellipse cx="55" cy="91" rx="2.5" ry="1.8" fill="#8B5CF6" opacity="0.9" />
              <line x1="55" y1="84" x2="55" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
              <line x1="49" y1="88" x2="52" y2="90" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
              <line x1="61" y1="88" x2="58" y2="90" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />

              {/* Speed lines from front */}
              <line x1="180" y1="70" x2="205" y2="68" stroke="#22E5FF" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 3" />
              <line x1="180" y1="76" x2="210" y2="75" stroke="#22E5FF" strokeWidth="2" opacity="0.4" strokeDasharray="6 4" />
              <line x1="180" y1="82" x2="208" y2="82" stroke="#00D4FF" strokeWidth="1" opacity="0.3" strokeDasharray="3 5" />
            </g>
          </svg>

          {/* Floating glow under the car */}
          <div className="car-ground-glow" />
        </div>

        {/* Bouncing dots loader */}
        <div className="flex items-center gap-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
              style={{
                animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Text label */}
        {text && (
          <p className="text-cyan-300 font-semibold tracking-[0.25em] uppercase text-sm animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
