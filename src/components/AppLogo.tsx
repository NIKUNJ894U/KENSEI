import React from 'react';

interface AppLogoProps {
  className?: string;
  showText?: boolean;
}

export function AppLogo({ className = "w-9 h-9", showText = false }: AppLogoProps) {
  // SVG Logo Mark
  const logoMark = (
    <svg 
      viewBox="0 0 100 100" 
      className={`${className} shrink-0 overflow-visible`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      id="kansei-logo-mark"
    >
      {/* Yellow Q-mark shape */}
      <path
        d="M 85,50 A 35,35 0 0,1 50,85 A 35,35 0 0,1 15,50 A 35,35 0 0,1 50,15 M 75,75 L 95,95 L 75,75"
        stroke="#DFE104"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* White top-right arc */}
      <path
        d="M 50,15 A 35,35 0 0,1 85,50"
        stroke="#FFFFFF"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!showText) {
    return logoMark;
  }

  // Full Brand Identity Component (width: 320px, height: 80px, padding: 20px)
  return (
    <div 
      id="kansei-full-brand-logo"
      className="flex items-center gap-4 p-5 rounded-xl select-none"
      style={{ 
        backgroundColor: '#0A0A0A',
        width: '320px',
        height: '80px',
        boxSizing: 'border-box'
      }}
    >
      {/* Logo Mark */}
      <div className="w-10 h-10 flex items-center justify-center">
        {logoMark}
      </div>

      {/* Text block: Wordmark stacked above tagline */}
      <div className="flex flex-col justify-center text-left leading-none">
        {/* Wordmark KANSEI */}
        <div 
          className="flex items-center text-white font-bold" 
          style={{ 
            fontFamily: '"Rajdhani", "Barlow Condensed", sans-serif',
            fontSize: '30px',
            lineHeight: '1',
            letterSpacing: '0.22em'
          }}
        >
          <span>K</span>
          <span>A</span>
          <span>N</span>
          <span>S</span>
          {/* Custom E with three horizontal lines */}
          <span 
            className="inline-flex flex-col justify-between h-[18px] w-[13px] self-center mr-[0.22em]"
            style={{ padding: '1px 0', margin: '0 0.05em' }}
            aria-label="E"
          >
            <span className="h-[3px] bg-[#C8E500] w-full rounded-xs" />
            <span className="h-[3px] bg-[#C8E500] w-full rounded-xs" />
            <span className="h-[3px] bg-[#C8E500] w-full rounded-xs" />
          </span>
          <span>I</span>
        </div>

        {/* Tagline below */}
        <div 
          className="mt-1.5 uppercase font-medium select-none"
          style={{ 
            fontFamily: '"Rajdhani", "Barlow Condensed", sans-serif',
            fontSize: '10.5px',
            letterSpacing: '0.14em',
            lineHeight: '1'
          }}
        >
          <span className="text-white font-semibold">CONNECT. COMMIT. </span>
          <span className="text-[#C8E500] font-bold">COMPLETE.</span>
        </div>
      </div>
    </div>
  );
}
