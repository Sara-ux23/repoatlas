'use client';

import React from 'react';

export function RepoAtlasLogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative ${className} rounded-xl bg-gradient-to-br from-[#1E40AF] via-[#2563EB] to-[#172554] p-1 shadow-sm group-hover:shadow-md transition-all duration-300 flex items-center justify-center border border-[#60A5FA]/30 shrink-0`}>
      <svg viewBox="0 0 100 100" className="w-full h-full fill-none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Circular Network Ring */}
        <circle cx="50" cy="50" r="32" stroke="#60A5FA" strokeWidth="2.5" strokeOpacity="0.6" strokeDasharray="3 3" />

        {/* Spoke Lines */}
        <line x1="50" y1="50" x2="50" y2="18" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="50" x2="72.6" y2="27.4" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="50" x2="82" y2="50" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="50" x2="72.6" y2="72.6" stroke="#38BDF8" strokeWidth="2.5" strokeOpacity="0.9" />
        <line x1="50" y1="50" x2="50" y2="82" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="50" x2="27.4" y2="72.6" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="50" x2="18" y2="50" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="50" x2="27.4" y2="27.4" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.7" />

        {/* 7 Standard White Nodes */}
        <circle cx="50" cy="18" r="4.5" fill="#FFFFFF" />
        <circle cx="72.6" cy="27.4" r="4.5" fill="#FFFFFF" />
        <circle cx="82" cy="50" r="4.5" fill="#FFFFFF" />
        <circle cx="50" cy="82" r="4.5" fill="#FFFFFF" />
        <circle cx="27.4" cy="72.6" r="4.5" fill="#FFFFFF" />
        <circle cx="18" cy="50" r="4.5" fill="#FFFFFF" />
        <circle cx="27.4" cy="27.4" r="4.5" fill="#FFFFFF" />

        {/* Active Glowing Cyan Node */}
        <circle cx="72.6" cy="72.6" r="7" fill="#06B6D4" fillOpacity="0.3" className="animate-ping" />
        <circle cx="72.6" cy="72.6" r="5.5" fill="#22D3EE" />

        {/* Central Pulse Node */}
        <circle cx="50" cy="50" r="10" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2" />
        <path d="M 43 50 L 46 50 L 48 44 L 50 56 L 52 47 L 54 50 L 57 50" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function RepoAtlasLogo({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 group shrink-0">
      <RepoAtlasLogoIcon className="w-9 h-9" />
      <div className="flex flex-col justify-center">
        <span className="text-xl font-extrabold tracking-tight text-[#0F172A] font-sans flex items-center gap-1.5 leading-none">
          RepoAtlas
          <span className="text-[#2563EB] font-mono text-[11px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] leading-none">
            AI
          </span>
        </span>
        {showTagline && (
          <span className="text-[8px] font-mono font-bold text-[#64748B] uppercase tracking-widest mt-0.5">
            Visual Code Intelligence
          </span>
        )}
      </div>
    </div>
  );
}
