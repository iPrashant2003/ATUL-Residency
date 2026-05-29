import React from "react";

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  glow?: boolean;
}

export default function Logo({ width = 48, height = 48, className = "", glow = true }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={width}
      height={height}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE259" />
          <stop offset="60%" stopColor="#FFA751" />
          <stop offset="100%" stopColor="#FF6B6B" />
        </linearGradient>
        <linearGradient id="logoTeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#4FACFE" />
        </linearGradient>
        {glow && (
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>
      
      {/* Background soft glow circle */}
      <circle cx="50" cy="50" r="42" fill="url(#logoGold)" opacity="0.05" />
      
      {/* Outermost elegant thin ring */}
      <circle cx="50" cy="50" r="45" stroke="url(#logoGold)" strokeWidth="1" strokeDasharray="3 6" opacity="0.4" />
      
      {/* Stylized A-Frame modern high-rise tower structure */}
      {/* Left & Right pillars forming the shape of A */}
      <path
        d="M24 82 L47 18 C48 15, 52 15, 53 18 L76 82"
        stroke="url(#logoGold)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? "url(#logoGlow)" : undefined}
      />

      {/* Horizontal beam representing residential levels (making it look like an 'A') */}
      <path
        d="M33 58 L67 58"
        stroke="url(#logoGold)"
        strokeWidth="4"
        strokeLinecap="round"
        filter={glow ? "url(#logoGlow)" : undefined}
      />
      
      {/* Inner modern tower structure with glass panel design */}
      <path
        d="M50 24 L50 82"
        stroke="url(#logoTeal)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Modern architectural wings / balconies */}
      <path
        d="M38 42 L50 30 L62 42"
        stroke="url(#logoGold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M30 65 L50 50 L70 65"
        stroke="url(#logoGold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Foundation base line */}
      <path
        d="M18 82 L82 82"
        stroke="url(#logoGold)"
        strokeWidth="5"
        strokeLinecap="round"
        filter={glow ? "url(#logoGlow)" : undefined}
      />
      
      {/* Radiant star on top representing excellence */}
      <path
        d="M50 6 L52 11 L57 11 L53 14 L55 19 L50 16 L45 19 L47 14 L43 11 L48 11 Z"
        fill="url(#logoGold)"
        filter={glow ? "url(#logoGlow)" : undefined}
      />
    </svg>
  );
}
