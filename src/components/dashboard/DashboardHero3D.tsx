import React from 'react';

export function DashboardHero3D() {
  return (
    <div className="absolute right-[0%] top-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none opacity-[0.15] hidden md:block mix-blend-overlay">
      <div className="w-full h-full animate-[pulse_6s_ease-in-out_infinite]">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
          {/* Isometric Platform */}
          <path d="M100 140 L180 100 L100 60 L20 100 Z" fill="currentColor" className="text-white" opacity="0.1"/>
          <path d="M100 155 L180 115 L180 100 L100 140 Z" fill="currentColor" className="text-white" opacity="0.3"/>
          <path d="M20 115 L100 155 L100 140 L20 100 Z" fill="currentColor" className="text-white" opacity="0.05"/>

          {/* Building/Bar 1 - Construction Block */}
          <path d="M50 90 L80 75 L80 115 L50 130 Z" fill="currentColor" className="text-white" opacity="0.5"/>
          <path d="M80 75 L110 90 L110 130 L80 115 Z" fill="currentColor" className="text-white" opacity="0.3"/>
          <path d="M50 90 L80 75 L110 90 L80 105 Z" fill="currentColor" className="text-white" opacity="0.8"/>

          {/* Building/Bar 2 - Taller Block */}
          <path d="M90 60 L120 45 L120 105 L90 120 Z" fill="currentColor" className="text-white" opacity="0.6"/>
          <path d="M120 45 L150 60 L150 120 L120 105 Z" fill="currentColor" className="text-white" opacity="0.4"/>
          <path d="M90 60 L120 45 L150 60 L120 75 Z" fill="currentColor" className="text-white" opacity="0.9"/>
          
          {/* Building/Bar 3 - Small Block */}
          <path d="M130 95 L150 85 L150 115 L130 125 Z" fill="currentColor" className="text-white" opacity="0.7"/>
          <path d="M150 85 L170 95 L170 125 L150 115 Z" fill="currentColor" className="text-white" opacity="0.5"/>
          <path d="M130 95 L150 85 L170 95 L150 105 Z" fill="currentColor" className="text-white" opacity="0.95"/>
          
          {/* Floating Data Nodes (Charts/Points) */}
          <circle cx="160" cy="40" r="5" fill="currentColor" className="text-white" opacity="0.8" />
          <circle cx="40" cy="60" r="4" fill="currentColor" className="text-white" opacity="0.6" />
          <circle cx="100" cy="20" r="6" fill="currentColor" className="text-white" opacity="0.5" />
          
          {/* Connection Lines */}
          <path d="M100 20 L160 40 L120 45" fill="none" stroke="currentColor" strokeWidth="1" className="text-white" opacity="0.3" strokeDasharray="4 2"/>
          <path d="M40 60 L80 75" fill="none" stroke="currentColor" strokeWidth="1" className="text-white" opacity="0.3" strokeDasharray="4 2"/>
        </svg>
      </div>
    </div>
  );
}
