/**
 * SkyVector Low-Occlusion In-Game HUD Overlay.
 * Designed with world-matched cyber aesthetics, tabular numerals,
 * and >= 85% clear playfield viewport.
 */

import React from 'react';
import { CameraMode, GameMode, RacerProgress } from '../game/types';
import { Volume2, VolumeX, Video, Pause, RotateCcw, Zap, Compass, Flag } from 'lucide-react';

interface HUDProps {
  mode: GameMode;
  cameraMode: CameraMode;
  speedKmh: number;
  altitudeM: number;
  throttle: number;
  boostFuel: number;
  isBoosting: boolean;
  health: number;
  countdown: number | null;
  racers: RacerProgress[];
  currentLap: number;
  totalLaps: number;
  lapTime: number;
  bestLapTime: number | null;
  orbsCollected: number;
  totalOrbs: number;
  stuntMessage: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onPause: () => void;
  onReset: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
}

export const HUD: React.FC<HUDProps> = ({
  mode,
  cameraMode,
  speedKmh,
  altitudeM,
  throttle,
  boostFuel,
  isBoosting,
  health,
  countdown,
  racers,
  currentLap,
  totalLaps,
  lapTime,
  bestLapTime,
  orbsCollected,
  totalOrbs,
  stuntMessage,
  isMuted,
  onToggleMute,
  onToggleCamera,
  onPause,
  onReset,
}) => {
  const player = racers.find((r) => r.isPlayer);
  const playerRank = player?.rank || 1;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 font-mono text-white flex flex-col justify-between p-4 sm:p-6">
      {/* 1. TOP ROW CLUSTERS */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Flight Telemetry */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-lg p-3 shadow-lg shadow-cyan-950/20 pointer-events-auto backdrop-blur-none flex flex-col gap-2 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] tracking-widest text-cyan-400 font-bold">
              {mode === 'race' ? 'RACE TELEMETRY' : 'EXPLORE FLIGHT'}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {cameraMode === 'fpv' ? 'FPV CAM' : 'CHASE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-slate-400">SPEED</div>
              <div className="text-2xl font-bold text-cyan-300 tabular-nums leading-none">
                {speedKmh} <span className="text-[10px] font-normal text-slate-400">KM/H</span>
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">ALTITUDE</div>
              <div className="text-2xl font-bold text-sky-200 tabular-nums leading-none">
                {altitudeM} <span className="text-[10px] font-normal text-slate-400">M</span>
              </div>
            </div>
          </div>

          {/* Throttle & Health Bars */}
          <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>THROTTLE</span>
              <span className="tabular-nums font-bold text-cyan-400">{Math.round(throttle * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-75"
                style={{ width: `${Math.max(5, Math.min(100, throttle * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
              <span>HULL INTEGRITY</span>
              <span className="tabular-nums font-bold text-emerald-400">{Math.round(health)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  health > 50 ? 'bg-emerald-400' : health > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: Race Standings or Explore Progress */}
        {mode === 'race' ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-slate-950/85 border border-cyan-500/40 rounded-lg px-4 py-2 shadow-xl flex items-center gap-4 text-center">
              <div>
                <div className="text-[9px] text-slate-400 tracking-wider">POSITION</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none text-amber-400">
                  {playerRank}<span className="text-sm text-slate-400">/4</span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-800" />

              <div>
                <div className="text-[9px] text-slate-400 tracking-wider">LAP</div>
                <div className="text-2xl font-bold tabular-nums text-cyan-300 leading-none">
                  {Math.min(totalLaps, currentLap + 1)}<span className="text-xs text-slate-400">/{totalLaps}</span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-800" />

              <div>
                <div className="text-[9px] text-slate-400 tracking-wider">LAP TIME</div>
                <div className="text-xl font-bold tabular-nums text-white leading-none">
                  {formatTime(lapTime)}
                </div>
              </div>
            </div>

            {bestLapTime && (
              <div className="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-0.5 rounded-full tabular-nums">
                BEST LAP: {formatTime(bestLapTime)}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-950/85 border border-amber-500/40 rounded-lg px-5 py-2.5 shadow-xl flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 animate-bounce" />
            <div>
              <div className="text-[9px] text-slate-400 tracking-wider">ENERGY CORES DISCOVERED</div>
              <div className="text-2xl font-extrabold text-amber-400 tabular-nums leading-none">
                {orbsCollected} <span className="text-sm font-normal text-slate-400">/ {totalOrbs}</span>
              </div>
            </div>
          </div>
        )}

        {/* Top-Right: Utility Icon Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleCamera}
            title="Toggle Camera (Tab / C)"
            aria-label="Toggle Camera View"
            tabIndex={-1}
            className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors shadow-md active:scale-95"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMute}
            title="Toggle Audio (M)"
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            tabIndex={-1}
            className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors shadow-md active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onReset}
            title="Reset Drone (R)"
            aria-label="Reset Drone Position"
            tabIndex={-1}
            className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors shadow-md active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            title="Pause Game (Esc / P)"
            aria-label="Pause Game"
            tabIndex={-1}
            className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors shadow-md active:scale-95"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CENTER STUNT / COUNTDOWN OVERLAYS */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {countdown !== null && (
          <div className="text-center animate-pulse">
            <div className="text-7xl sm:text-9xl font-black text-amber-400 tracking-wider drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]">
              {countdown > 0 ? countdown : 'FLY!'}
            </div>
            <div className="text-xs tracking-widest text-cyan-300 uppercase mt-2">
              All Thrusters Engaged
            </div>
          </div>
        )}

        {stuntMessage && (
          <div className="bg-slate-950/90 border border-amber-400/80 text-amber-300 px-4 py-2 rounded-lg text-sm font-bold tracking-widest uppercase shadow-2xl animate-fade-in flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            {stuntMessage}
          </div>
        )}

        {/* FPV Crosshair Reticle & Pitch Horizon */}
        {cameraMode === 'fpv' && (
          <div className="relative w-48 h-48 pointer-events-none opacity-60">
            {/* Center crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-cyan-400/80 rounded-full" />
            <div className="absolute top-1/2 left-4 right-4 h-px bg-cyan-400/40" />
            <div className="absolute left-1/2 top-4 bottom-4 w-px bg-cyan-400/40" />
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
          </div>
        )}
      </div>

      {/* 3. BOTTOM ROW: BOOST GAUGE & LEADERBOARD CLUSTER */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Mini Leaderboard in Race Mode */}
        {mode === 'race' ? (
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 min-w-[190px] shadow-lg pointer-events-auto">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 border-b border-slate-800 pb-1">
              <Flag className="w-3 h-3 text-cyan-400" />
              <span>LIVE STANDINGS</span>
            </div>
            <div className="flex flex-col gap-1 text-[11px]">
              {racers.map((racer) => (
                <div
                  key={racer.id}
                  className={`flex items-center justify-between px-1.5 py-0.5 rounded ${
                    racer.isPlayer ? 'bg-cyan-950/70 text-cyan-300 font-bold border border-cyan-800/60' : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 text-right text-[10px] text-slate-500">{racer.rank}.</span>
                    <span style={{ color: racer.color }}>{racer.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {racer.finished ? 'FIN' : `L${racer.lap + 1} G${racer.currentGateIndex}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-400 max-w-[220px]">
            <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider mb-1">
              EXPLORER INTEL
            </div>
            <p className="leading-tight text-[10px]">
              Explore the sci-fi proving ground! Fly through mega arches, search canyon valleys, and discover energy cores.
            </p>
          </div>
        )}

        {/* Bottom-Center: Boost Fuel Gauge */}
        <div className="flex flex-col items-center gap-1 w-full max-w-xs px-4">
          <div className="flex items-center justify-between w-full text-[10px] text-cyan-300 font-bold">
            <div className="flex items-center gap-1">
              <Zap className={`w-3.5 h-3.5 ${isBoosting ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
              <span>AFTERBURNER BOOST [SPACE / SHIFT]</span>
            </div>
            <span className="tabular-nums">{Math.round(boostFuel)}%</span>
          </div>

          <div className="w-full bg-slate-900 border border-cyan-900/60 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isBoosting
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                  : 'bg-gradient-to-r from-cyan-500 to-sky-400'
              }`}
              style={{ width: `${boostFuel}%` }}
            />
          </div>
        </div>

        {/* Bottom-Right: Flight Controls Hint (Flat, borderless) */}
        <div className="hidden sm:flex flex-col items-end text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800/60 rounded-lg px-3 py-2">
          <span className="text-cyan-400 font-bold tracking-wider text-[9px] mb-0.5">CONTROLS</span>
          <span>W / S · Throttle Up / Down</span>
          <span>A / D · Turn Right / Left</span>
          <span>ARROWS · Forward / Back / Roll</span>
          <span>SPACE / SHIFT · Boost</span>
          <span>TAB · Toggle Cam</span>
        </div>
      </div>
    </div>
  );
};
