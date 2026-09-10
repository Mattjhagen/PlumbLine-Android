import React from 'react';

interface PlumbLineLogoProps {
  size?: number;
  color?: string;
  className?: string;
  useImage?: boolean;
}

/**
 * PlumbLineLogo
 * Uses app-logo-adaptive.png as requested, with fallback vector emblem.
 */
export const PlumbLineLogo: React.FC<PlumbLineLogoProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  useImage = true,
}) => {
  if (useImage) {
    return (
      <img
        src="/app-logo-adaptive.png"
        alt="Rooted Guide Plumb Line Logo"
        width={size}
        height={size}
        className={`rounded-xl object-contain shadow-sm ${className}`}
        onError={(e) => {
          // If image fails to load, gracefully hide and fallback
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Plumb Line emblem"
    >
      <line x1="8" y1="2" x2="16" y2="2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="15" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <polygon
        points="12,15 15,18 12,22 9,18"
        fill={color}
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
};

