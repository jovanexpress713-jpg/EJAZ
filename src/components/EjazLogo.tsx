import React from 'react';

interface EjazLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'white' | 'dark';
  className?: string;
}

export const EjazLogo: React.FC<EjazLogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: { title: 'text-sm font-bold', sub: 'text-[9px]' },
    md: { title: 'text-base font-extrabold', sub: 'text-[10px]' },
    lg: { title: 'text-2xl font-black', sub: 'text-xs' },
    xl: { title: 'text-3xl font-black', sub: 'text-sm' },
  };

  const isLight = variant === 'white';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} dir="rtl">
      {/* Visual Emblem */}
      <div className={`relative flex-shrink-0 flex items-center justify-center rounded-xl transition-transform ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base rounded shield / hexagon container */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill={isLight ? '#FFFFFF' : '#0F172A'}
            stroke={isLight ? '#E2E8F0' : '#1E293B'}
            strokeWidth="3"
          />

          {/* Dynamic Transport Speed Lines (Orange) */}
          <path
            d="M20 34 H44 C48 34 52 38 52 42 V58 C52 62 48 66 44 66 H20"
            stroke="#F97316"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forward Arrow / Truck Cabin Motif */}
          <path
            d="M52 42 L66 42 L78 54 L78 66 L52 66 Z"
            fill="#F97316"
          />

          {/* Cabin Window Cutout */}
          <path
            d="M58 47 H65 L72 54 H58 Z"
            fill={isLight ? '#FFFFFF' : '#0F172A'}
          />

          {/* Highway Wheels / Motion Accents */}
          <circle cx="34" cy="68" r="6" fill={isLight ? '#0F172A' : '#FFFFFF'} stroke="#F97316" strokeWidth="3" />
          <circle cx="70" cy="68" r="6" fill={isLight ? '#0F172A' : '#FFFFFF'} stroke="#F97316" strokeWidth="3" />

          {/* Road / Speed Stripes underneath */}
          <path
            d="M22 80 H78"
            stroke={isLight ? '#CBD5E1' : '#334155'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />

          {/* Sleek Golden Accent Dot */}
          <circle cx="82" cy="24" r="4.5" fill="#FB923C" />
        </svg>
      </div>

      {/* Corporate Typography */}
      {variant !== 'icon' && (
        <div className="flex flex-col text-right justify-center">
          <div
            className={`tracking-tight leading-tight ${textSizes[size].title} ${
              isLight ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span className="text-[#F97316]">إيجـاز </span>
            <span>للنقليات</span>
          </div>
          <div
            className={`font-medium tracking-wider uppercase font-sans ${textSizes[size].sub} ${
              isLight ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            EJAZ TRANSPORT
          </div>
        </div>
      )}
    </div>
  );
};
