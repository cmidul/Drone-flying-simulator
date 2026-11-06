/**
 * SkyVector: 3D Drone Racing & Flight Simulator.
 * Main Application Orchestrator.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CameraMode, GameMode, GameState, RacerProgress } from './game/types';
import { createRacerList } from './game/raceLogic';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { Modals } from './components/Modals';
import { soundEngine } from './game/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [mode, setMode] = useState<GameMode>('race');
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // HUD Telemetry state
  const [speedKmh, setSpeedKmh] = useState(0);
  const [altitudeM, setAltitudeM] = useState(8);
  const [throttle, setThrottle] = useState(0);
  const [boostFuel, setBoostFuel] = useState(100);
  const [isBoosting, setIsBoosting] = useState(false);
  const [health, setHealth] = useState(100);
  const [racers, setRacers] = useState<RacerProgress[]>(() => createRacerList());
  const [currentLap, setCurrentLap] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [stuntMessage, setStuntMessage] = useState<string | null>(null);

  const stuntTimeoutRef = useRef<number | null>(null);

  // Sync document.body.dataset.state for Ultra Mode / Testing verification
  useEffect(() => {
    let bodyState = 'title';
    if (gameState === 'playing' || gameState === 'countdown') {
      bodyState = 'playing';
    } else if (gameState === 'paused') {
      bodyState = 'paused';
    } else if (gameState === 'finished') {
      bodyState = 'gameover';
    }
    document.body.dataset.state = bodyState;
  }, [gameState]);

  // Support ?autostart=1 query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
    }
  }, []);

  const handleStartGame = useCallback(() => {
    if (mode === 'race') {
      setGameState('countdown');
      setCountdown(3);
      soundEngine.playCountdown(false);

      let step = 3;
      const interval = window.setInterval(() => {
        step -= 1;
        if (step > 0) {
          setCountdown(step);
          soundEngine.playCountdown(false);
        } else if (step === 0) {
          setCountdown(0);
          soundEngine.playCountdown(true);
        } else {
          clearInterval(interval);
          setCountdown(null);
          setGameState('playing');
        }
      }, 900);
    } else {
      setGameState('playing');
    }
  }, [mode]);

  const handlePause = useCallback(() => {
    setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  }, []);

  const handleResume = useCallback(() => {
    setGameState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    setResetSignal((s) => s + 1);
    setHealth(100);
    setBoostFuel(100);
    setCurrentLap(0);
    setLapTime(0);
    setBestLapTime(null);
    setOrbsCollected(0);
    handleStartGame();
  }, [handleStartGame]);

  const handleToTitle = useCallback(() => {
    setGameState('title');
    setResetSignal((s) => s + 1);
  }, []);

  const handleToggleCamera = useCallback(() => {
    setCameraMode((prev) => (prev === 'chase' ? 'fpv' : 'chase'));
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleStuntMessage = useCallback((msg: string) => {
    setStuntMessage(msg);
    if (stuntTimeoutRef.current) {
      window.clearTimeout(stuntTimeoutRef.current);
    }
    stuntTimeoutRef.current = window.setTimeout(() => {
      setStuntMessage(null);
    }, 2400);
  }, []);

  const handleTelemetryUpdate = useCallback(
    (data: {
      speedKmh: number;
      altitudeM: number;
      throttle: number;
      boostFuel: number;
      isBoosting: boolean;
      health: number;
      racers: RacerProgress[];
      currentLap: number;
      lapTime: number;
      bestLapTime: number | null;
      orbsCollected: number;
    }) => {
      setSpeedKmh(data.speedKmh);
      setAltitudeM(data.altitudeM);
      setThrottle(data.throttle);
      setBoostFuel(data.boostFuel);
      setIsBoosting(data.isBoosting);
      setHealth(data.health);
      setRacers(data.racers);
      setCurrentLap(data.currentLap);
      setLapTime(data.lapTime);
      if (data.bestLapTime !== null) {
        setBestLapTime(data.bestLapTime);
      }
      setOrbsCollected(data.orbsCollected);
    },
    []
  );

  const handleRaceFinish = useCallback(() => {
    setGameState('finished');
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas
        gameState={gameState}
        mode={mode}
        cameraMode={cameraMode}
        onTelemetryUpdate={handleTelemetryUpdate}
        onStuntMessage={handleStuntMessage}
        onRaceFinish={handleRaceFinish}
        onPauseTrigger={handlePause}
        onCameraToggleTrigger={handleToggleCamera}
        resetSignal={resetSignal}
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          selectedMode={mode}
          onSelectMode={setMode}
          onStartGame={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game World-Matched HUD */}
      {(gameState === 'playing' || gameState === 'countdown') && (
        <HUD
          mode={mode}
          cameraMode={cameraMode}
          speedKmh={speedKmh}
          altitudeM={altitudeM}
          throttle={throttle}
          boostFuel={boostFuel}
          isBoosting={isBoosting}
          health={health}
          countdown={countdown}
          racers={racers}
          currentLap={currentLap}
          totalLaps={3}
          lapTime={lapTime}
          bestLapTime={bestLapTime}
          orbsCollected={orbsCollected}
          totalOrbs={25}
          stuntMessage={stuntMessage}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onPause={handlePause}
          onReset={handleRestart}
        />
      )}

      {/* Pause & Results Modals */}
      {(gameState === 'paused' || gameState === 'finished') && (
        <Modals
          state={gameState}
          mode={mode}
          racers={racers}
          bestLapTime={bestLapTime}
          totalTime={lapTime}
          orbsCollected={orbsCollected}
          totalOrbs={25}
          onResume={handleResume}
          onRestart={handleRestart}
          onToTitle={handleToTitle}
          onSwitchMode={(newMode) => {
            setMode(newMode);
            handleRestart();
          }}
        />
      )}
    </main>
  );
}
