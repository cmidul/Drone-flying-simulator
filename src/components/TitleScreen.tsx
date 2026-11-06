/**
 * Atmospheric Title Screen with Bespoke Inline SVG Lockup and Mode Selection.
 */

import React, { useEffect } from 'react';
import { GameMode } from '../game/types';
import { Trophy, Compass, Volume2, VolumeX, Play } from 'lucide-react';

interface TitleScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onStartGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  onSelectMode,
  onStartGame,
  isMuted,
  onToggleMute,
}) => {
  // Listen for Enter or Space to quickly launch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-12 pointer-events-none select-none font-sans text-white">
      {/* Top Bar with Audio & Version */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono tracking-widest text-cyan-400 font-semibold uppercase">
            6-DOF QUADCOPTER SIMULATOR v2.4
          </span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors shadow-lg active:scale-95"
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span className="text-xs font-mono">{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
        </button>
      </div>

      {/* Center Left Hero Lockup & Mode Selection (Leaving 40% negative space on right for 3D world flyover) */}
      <div className="max-w-xl pointer-events-auto flex flex-col gap-6 my-auto">
        {/* Bespoke Inline SVG Logo Lockup */}
        <div className="flex flex-col gap-2">
          <svg className="w-full max-w-md h-auto" viewBox="0 0 520 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background cyber bracket accents */}
            <path d="M 10 30 L 10 10 L 40 10" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 510 30 L 510 10 L 480 10" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 10 80 L 10 100 L 40 100" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 510 80 L 510 100 L 480 100" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />

            {/* Drone Rotor Silhouette Glyph */}
            <circle cx="45" cy="55" r="18" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
            <circle cx="45" cy="55" r="6" fill="#06b6d4" />
            <line x1="28" y1="55" x2="62" y2="55" stroke="#facc15" strokeWidth="2" />
            <line x1="45" y1="38" x2="45" y2="72" stroke="#facc15" strokeWidth="2" />

            {/* Typography */}
            <text x="80" y="62" fill="#ffffff" fontFamily="monospace" fontSize="42" fontWeight="900" letterSpacing="4">
              SKYVECTOR
            </text>
            <text x="82" y="86" fill="#38bdf8" fontFamily="sans-serif" fontSize="13" fontWeight="700" letterSpacing="6">
              AEROBATIC DRONE COMBAT & FLIGHT SIM
            </text>
          </svg>

          <p className="text-slate-300 text-sm leading-relaxed font-sans max-w-md pl-1">
            Experience ultra-responsive 6-DOF drone aerodynamics. Master high-speed banking, dive through neon gates against AI pilot bots, or freely roam futuristic canyon proving grounds.
          </p>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          {/* Race Mode Option */}
          <button
            onClick={() => onSelectMode('race')}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              selectedMode === 'race'
                ? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy className={`w-5 h-5 ${selectedMode === 'race' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className={`font-bold font-mono tracking-wide ${selectedMode === 'race' ? 'text-white' : 'text-slate-300'}`}>
                RACE MODE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Compete against 3 AI pilot drones across 3 intense laps with neon checkpoints & live telemetry.
            </p>
          </button>

          {/* Explore Mode Option */}
          <button
            onClick={() => onSelectMode('explore')}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              selectedMode === 'explore'
                ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-500/30 shadow-lg shadow-amber-950/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Compass className={`w-5 h-5 ${selectedMode === 'explore' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className={`font-bold font-mono tracking-wide ${selectedMode === 'explore' ? 'text-white' : 'text-slate-300'}`}>
                EXPLORE MODE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Free-flight sandbox. Hunt 25 hidden energy cores, test FPV maneuvers, and perform aerobatics.
            </p>
          </button>
        </div>

        {/* Primary Start CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
          <button
            data-start="true"
            onClick={onStartGame}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-black font-mono text-base tracking-widest shadow-xl shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>LAUNCH DRONE [SPACE]</span>
          </button>

          <span className="text-xs font-mono text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">Enter</kbd>
          </span>
        </div>
      </div>

      {/* Single Flat Control Hint Line */}
      <div className="w-full flex items-center justify-center text-xs font-mono text-slate-400 tracking-wider">
        <span>W/S Throttle Up/Down · A/D Turn Right/Left · Arrows Forward/Back/Roll · Space/Shift Boost · Tab Cam · Esc Pause</span>
      </div>
    </div>
  );
};
