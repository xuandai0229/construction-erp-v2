import React from 'react';

export function ConstructionHeroIllustration({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      width="100%"
      height="100%"
      viewBox="0 0 1440 300" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Full-width Technical Grid */}
      <pattern id="full-iso-grid" x="0" y="0" width="40" height="24" patternUnits="userSpaceOnUse">
        <path d="M 0 12 L 20 0 L 40 12 L 20 24 Z" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.05" />
      </pattern>
      <rect x="0" y="0" width="1440" height="300" fill="url(#full-iso-grid)" />

      {/* Subtle blueprint lines spanning across */}
      <path d="M 0 200 L 1440 200 M 0 250 L 1440 250 M 0 150 L 1440 150 M 400 0 L 400 300 M 800 0 L 800 300" stroke="currentColor" strokeWidth="1" opacity="0.03" />

      {/* Mid-ground Construction Structures (x=520 to 980) */}
      {/* Blueprint structural lines filling the middle space */}
      <path d="M 450 100 L 980 280 M 500 80 L 1000 250 M 550 60 L 1050 230" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />
      <path d="M 500 280 L 1050 100 M 550 290 L 1100 110" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />
      
      {/* Structure at x=650 */}
      <g transform="translate(650, 170) scale(1.8)" opacity="0.25">
        {/* Core pillar */}
        <path d="M 0 0 L 0 80 L -30 65 L -30 -15 Z" fill="currentColor" opacity="0.4" />
        <path d="M 0 0 L 0 80 L 30 65 L 30 -15 Z" fill="currentColor" opacity="0.7" />
        {/* Scaffolding lines */}
        <path d="M -30 10 L 30 -20 M -30 30 L 30 0 M -30 50 L 30 20" stroke="currentColor" strokeWidth="0.5" opacity="0.8" />
        <path d="M 30 10 L -30 -20 M 30 30 L -30 0 M 30 50 L -30 20" stroke="currentColor" strokeWidth="0.5" opacity="0.8" />
      </g>

      {/* Scaffold / crane base at x=880 */}
      <g transform="translate(880, 140) scale(1.6)" opacity="0.35">
        <path d="M 0 0 L 0 120 L -40 100 L -40 -20 Z" fill="currentColor" opacity="0.3" />
        <path d="M 0 0 L 0 120 L 40 100 L 40 -20 Z" fill="currentColor" opacity="0.6" />
        <path d="M -40 -20 L 0 -40 L 40 -20 L 0 0 Z" fill="currentColor" opacity="0.2" />
        {/* Crane arm connecting towards the right */}
        <path d="M 0 -20 L 150 -70 L 150 -60 L 0 -10 Z" fill="currentColor" opacity="0.5" />
        <path d="M 0 -20 L 150 -70" stroke="white" strokeWidth="1" opacity="0.4" />
        <path d="M 0 -10 L 150 -60" stroke="white" strokeWidth="1" opacity="0.4" />
      </g>

      {/* Main High-Rise Building under construction - Right Side */}
      <g transform="translate(1100, 150) scale(2.8)" opacity="0.95">
        {/* Left face */}
        <path d="M 0 0 L 0 90 L -50 65 L -50 -25 Z" fill="currentColor" opacity="0.4" />
        {/* Right face */}
        <path d="M 0 0 L 0 90 L 40 70 L 40 -20 Z" fill="currentColor" opacity="0.7" />
        {/* Top face */}
        <path d="M 0 0 L -50 -25 L -10 -45 L 40 -20 Z" fill="currentColor" opacity="0.2" />
        
        {/* Exposed rebar / structural columns on top */}
        <path d="M -40 -20 L -40 -35 M -20 -10 L -20 -25 M 0 0 L 0 -15 M 20 10 L 20 -5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <path d="M -40 -20 L 20 10 M -30 -25 L 30 5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

        {/* Windows / Glass panels reflecting */}
        <path d="M -5 10 L -45 -10 L -45 5 L -5 25 Z" fill="white" opacity="0.2" />
        <path d="M -5 30 L -45 10 L -45 25 L -5 45 Z" fill="white" opacity="0.2" />
        <path d="M -5 50 L -45 30 L -45 45 L -5 65 Z" fill="white" opacity="0.2" />
        <path d="M -5 70 L -45 50 L -45 65 L -5 85 Z" fill="white" opacity="0.2" />
        
        {/* Safety netting */}
        <path d="M 5 5 L 35 -10 L 35 10 L 5 25 Z" fill="currentColor" opacity="0.3" />
        <path d="M 5 5 L 35 -10 L 35 10 L 5 25 Z" fill="white" opacity="0.1" />
        <path d="M 5 25 L 35 10 L 35 30 L 5 45 Z" fill="currentColor" opacity="0.3" />
        <path d="M 5 25 L 35 10 L 35 30 L 5 45 Z" fill="white" opacity="0.1" />
      </g>

      {/* Tower Crane (Isometric) - Further Right */}
      <g transform="translate(1300, 40) scale(2.2)" opacity="0.95">
        {/* Mast */}
        <path d="M 0 0 L 0 160 L -8 155 L -8 -5 Z" fill="currentColor" opacity="0.8" />
        <path d="M 0 0 L 8 -5 L 8 155 L 0 160 Z" fill="currentColor" opacity="0.5" />
        <path d="M -8 -5 L 0 5 L -8 15 L 0 25 L -8 35 L 0 45 L -8 55 L 0 65 L -8 75 L 0 85 L -8 95 L 0 105 L -8 115 L 0 125 L -8 135 L 0 145 L -8 155" stroke="white" strokeWidth="0.5" opacity="0.4" fill="none" />
        <path d="M 0 0 L 8 10 L 0 20 L 8 30 L 0 40 L 8 50 L 0 60 L 8 70 L 0 80 L 8 90 L 0 100 L 8 110 L 0 120 L 8 130 L 0 140 L 8 150" stroke="white" strokeWidth="0.5" opacity="0.4" fill="none" />
        
        {/* Jib */}
        <path d="M -10 -8 L -140 55 L -135 60 L -10 -3 Z" fill="currentColor" opacity="0.75" />
        <path d="M -10 -8 L 30 -28 L 35 -23 L -5 2 Z" fill="currentColor" opacity="0.65" />
        <path d="M -10 -5 L -30 10 L -50 10 L -70 20 L -90 30 L -110 40" stroke="white" strokeWidth="0.5" opacity="0.4" fill="none" />
        
        {/* Apex & Cables */}
        <path d="M -4 -5 L -4 -25 L 4 -30 L 4 -10 Z" fill="currentColor" opacity="0.8" />
        <path d="M -4 -25 L -100 40 M -4 -25 L -60 20 M 4 -30 L 25 -25" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        
        {/* Load */}
        <path d="M -80 30 L -80 80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
        <path d="M -85 80 L -70 73 L -70 85 L -85 92 Z" fill="currentColor" opacity="1" />
        <path d="M -85 80 L -88 77 L -73 70 L -70 73 Z" fill="white" opacity="0.4" />
      </g>
    </svg>
  );
}
