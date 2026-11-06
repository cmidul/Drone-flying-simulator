/**
 * Game Status Modals: Pause, Race Victory/Podium, and Explore Summary.
 * Built with world-matched styling, tabular numerals, and zero backdrop-filter over WebGL.
 */

import React from 'react';
import { GameMode, RacerProgress } from '../game/types';
import { Trophy, Play, RotateCcw, Home, Zap, Compass, CheckCircle2 } from 'lucide-react';

interface ModalsProps {
  state: 'paused' | 'finished';
  mode: GameMode;
  racers: RacerProgress[];
  bestLapTime: number | null;
  totalTime: number;
  orbsCollected: number;
  totalOrbs: number;
  onResume: () => void;
  onRestart: () => void;
  onToTitle: () => void;
  onSwitchMode: (mode: GameMode) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
}

export const Modals: React.FC<ModalsProps> = ({
  state,
  mode,
  racers,
  bestLapTime,
  totalTime,
  orbsCollected,
  totalOrbs,
  onResume,
  onRestart,
  onToTitle,
  onSwitchMode,
}) => {
  const player = racers.find((r) => r.isPlayer);
  const playerRank = player?.rank || 1;
  const isPodium = playerRank <= 3;

  if (state === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 select-none font-sans text-white">
        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
          <div className="text-center">
            <span className="text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase">
              SYSTEM PAUSED
            </span>
            <h2 className="text-3xl font-mono font-black tracking-wider text-white mt-1">
              FLIGHT HOLD
            </h2>
          </div>

          {/* Quick controls breakdown */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 flex flex-col gap-2">
            <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-400 font-bold">
              <span>ACTION</span>
              <span>INPUT</span>
            </div>
            <div className="flex justify-between">
              <span>Throttle Up / Down</span>
              <span className="text-cyan-300">W / S</span>
            </div>
            <div className="flex justify-between">
              <span>Yaw Turn Right / Left</span>
              <span className="text-cyan-300">A / D</span>
            </div>
            <div className="flex justify-between">
              <span>Forward / Backward</span>
              <span className="text-cyan-300">Up / Down Arrows</span>
            </div>
            <div className="flex justify-between">
              <span>Strafe / Bank Left & Right</span>
              <span className="text-cyan-300">Left / Right Arrows</span>
            </div>
            <div className="flex justify-between">
              <span>Afterburner Boost</span>
              <span className="text-amber-300">Space / Shift / F</span>
            </div>
            <div className="flex justify-between">
              <span>Camera FPV / Chase</span>
              <span className="text-cyan-300">Tab / C</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onResume}
              data-start="true"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>RESUME FLIGHT</span>
            </button>

            <button
              onClick={onRestart}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-medium text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART RUN</span>
            </button>

            <button
              onClick={onToTitle}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-medium text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>MAIN MENU & MODE SELECT</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FINISHED STATE MODAL
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 select-none font-sans text-white">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        {mode === 'race' ? (
          <>
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-800 border border-cyan-500/40 mb-2">
                <Trophy className={`w-8 h-8 ${playerRank === 1 ? 'text-amber-400' : 'text-cyan-400'}`} />
              </div>
              <h2 className="text-3xl font-mono font-black tracking-wider text-white">
                {playerRank === 1 ? 'VICTORY! 1ST PLACE' : `RACE COMPLETE: ${playerRank}TH PLACE`}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                ALL 3 CIRCUIT LAPS LOGGED
              </p>
            </div>

            {/* Standings Table */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-1 font-bold">
                <span>PILOT</span>
                <span>TOTAL TIME</span>
              </div>
              {racers.map((racer) => (
                <div
                  key={racer.id}
                  className={`flex justify-between items-center text-xs font-mono py-1 px-2 rounded ${
                    racer.isPlayer ? 'bg-cyan-950/70 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-slate-500 font-bold">{racer.rank}.</span>
                    <span style={{ color: racer.color }}>{racer.name}</span>
                    {racer.isPlayer && <span className="text-[10px] bg-cyan-900 text-cyan-200 px-1 rounded">YOU</span>}
                  </div>
                  <span className="tabular-nums font-bold">
                    {formatTime(racer.totalTime || totalTime)}
                  </span>
                </div>
              ))}
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">BEST LAP</div>
                <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">
                  {bestLapTime ? formatTime(bestLapTime) : '--:--'}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">TOTAL RACE TIME</div>
                <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                  {formatTime(totalTime)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-800 border border-amber-500/40 mb-2">
                <CheckCircle2 className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-3xl font-mono font-black tracking-wider text-white">
                EXPEDITION DEBRIEF
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                EXPLORE MODE SUMMARY
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">CORES RETRIEVED</div>
                <div className="text-3xl font-mono font-black text-amber-400 tabular-nums">
                  {orbsCollected} <span className="text-sm font-normal text-slate-400">/ {totalOrbs}</span>
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">FLIGHT DURATION</div>
                <div className="text-3xl font-mono font-black text-cyan-300 tabular-nums">
                  {formatTime(totalTime)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            data-start="true"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{mode === 'race' ? 'RACE AGAIN' : 'CONTINUE EXPLORING'}</span>
          </button>

          <button
            onClick={() => onSwitchMode(mode === 'race' ? 'explore' : 'race')}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-medium text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            {mode === 'race' ? <Compass className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            <span>SWITCH TO {mode === 'race' ? 'EXPLORE' : 'RACE'} MODE</span>
          </button>

          <button
            onClick={onToTitle}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-medium text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>TITLE SCREEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
