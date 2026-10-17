import React from 'react';

interface TopLogoProps {
  className?: string;
  mini?: boolean;
}

export const TopLogo: React.FC<TopLogoProps> = ({ className = '', mini = false }) => {
  return (
    <div className={`top-logo-container ${className} ${mini ? 'mini' : ''}`}>
      <svg
        className="top-logo-svg"
        viewBox="0 0 460 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fae19c" />
            <stop offset="50%" stopColor="#d4a34b" />
            <stop offset="100%" stopColor="#966a22" />
          </linearGradient>

          <linearGradient id="crestCyan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9fe5ff" />
            <stop offset="100%" stopColor="#2c7eb8" />
          </linearGradient>

          <linearGradient id="textNavy" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#244a77" />
            <stop offset="60%" stopColor="#153356" />
            <stop offset="100%" stopColor="#0d2138" />
          </linearGradient>

          <linearGradient id="subGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7a9bc2" stopOpacity="0" />
            <stop offset="50%" stopColor="#d4a34b" />
            <stop offset="100%" stopColor="#7a9bc2" stopOpacity="0" />
          </linearGradient>

          <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#09182a" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Top Fantasy Academy Crest / Diamond Jewel */}
        <g transform="translate(230, 26)" filter="url(#logoShadow)">
          {/* Outer Diamond Wing Accents */}
          <path
            d="M-28 0 L-10 -18 L-4 -8 L-14 0 L-4 8 L-10 18 Z"
            fill="url(#crestGold)"
          />
          <path
            d="M28 0 L10 -18 L4 -8 L14 0 L4 8 L10 18 Z"
            fill="url(#crestGold)"
          />

          {/* Central Blue Crystal Diamond */}
          <polygon
            points="0,-22 12,0 0,22 -12,0"
            fill="url(#crestCyan)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {/* Inner faceted shine */}
          <polygon
            points="0,-22 0,22 12,0"
            fill="#ffffff"
            fillOpacity="0.35"
          />
        </g>

        {/* Main Title: SKILLENCE */}
        <text
          x="230"
          y="86"
          textAnchor="middle"
          fill="url(#textNavy)"
          stroke="#ffffff"
          strokeWidth="3.5"
          paintOrder="stroke fill"
          filter="url(#logoShadow)"
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontWeight: 900,
            fontSize: '52px',
            letterSpacing: '5px'
          }}
        >
          SKILLENCE
        </text>

        {/* Golden Wings / Chevron Separator */}
        <g transform="translate(230, 100)">
          <line x1="-190" y1="0" x2="-80" y2="0" stroke="url(#subGold)" strokeWidth="1.5" />
          <polygon points="-80,0 -86,-3 -83,0 -86,3" fill="#d4a34b" />
          
          <polygon points="0,-4 5,0 0,4 -5,0" fill="#d4a34b" />

          <polygon points="80,0 86,-3 83,0 86,3" fill="#d4a34b" />
          <line x1="80" y1="0" x2="190" y2="0" stroke="url(#subGold)" strokeWidth="1.5" />
        </g>

        {/* Subtitle: TYPING BATTLE */}
        <text
          x="230"
          y="126"
          textAnchor="middle"
          fill="#1b3f69"
          stroke="#ffffff"
          strokeWidth="1.8"
          paintOrder="stroke fill"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '22px',
            letterSpacing: '9px'
          }}
        >
          TYPING BATTLE
        </text>
      </svg>
    </div>
  );
};
export default TopLogo;
