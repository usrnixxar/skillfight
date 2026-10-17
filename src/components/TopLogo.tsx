import React, { useState } from 'react';

interface TopLogoProps {
  className?: string;
}

export const TopLogo: React.FC<TopLogoProps> = ({ className = '' }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`top-logo-container ${className}`}>
      {!imgError ? (
        <img
          src="/assets/extracted/logo.png"
          alt="Skillence Typing Battle"
          className="top-logo-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="logo-fallback">
          <div className="logo-fallback-title">SKILLENCE</div>
          <div className="logo-fallback-sub">TYPING BATTLE</div>
        </div>
      )}
    </div>
  );
};
