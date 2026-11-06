/**
 * 3D WebGL Game Canvas for SkyVector Drone Simulator.
 * Enforces Three.js physical rendering directives, software-WebGL loop pacing,
 * and zero-allocation per-frame tick.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraMode, GameMode, GameState, RacerProgress } from './types';
import { createInitialDroneState, updateDronePhysics, getSpeedKmh } from './physics';
import { createProceduralDrone, DroneMeshHandles } from './droneModel';
import { createWorld, WorldHandles } from './world';
import { checkGatePass, createRacerList, getDistance3D, RACE_TRACK_GATES, updateRacerRankings } from './raceLogic';
import { AI_PROFILES, AIBotState, createAIBotState, updateAIBot } from './aiPilot';
import { soundEngine } from './audio';

// Pre-allocated scratch math objects to guarantee zero garbage collection in render loop
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

interface GameCanvasProps {
  gameState: GameState;
  mode: GameMode;
  cameraMode: CameraMode;
  onTelemetryUpdate: (data: {
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
  }) => void;
  onStuntMessage: (msg: string) => void;
  onRaceFinish: () => void;
  onPauseTrigger: () => void;
  onCameraToggleTrigger: () => void;
  resetSignal: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  mode,
  cameraMode,
  onTelemetryUpdate,
  onStuntMessage,
  onRaceFinish,
  onPauseTrigger,
  onCameraToggleTrigger,
  resetSignal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Store mutable state & callbacks in refs to avoid tearing down the canvas
  const stateRef = useRef({
    gameState,
    mode,
    cameraMode,
    resetSignal,
  });

  useEffect(() => {
    stateRef.current = { gameState, mode, cameraMode, resetSignal };
  }, [gameState, mode, cameraMode, resetSignal]);

  const callbacksRef = useRef({
    onTelemetryUpdate,
    onStuntMessage,
    onRaceFinish,
    onPauseTrigger,
    onCameraToggleTrigger,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTelemetryUpdate,
      onStuntMessage,
      onRaceFinish,
      onPauseTrigger,
      onCameraToggleTrigger,
    };
  }, [onTelemetryUpdate, onStuntMessage, onRaceFinish, onPauseTrigger, onCameraToggleTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection Guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Three.js Renderer Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Scene, Camera, and Lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d16);
    scene.fog = new THREE.FogExp2(0x080d16, 0.0035);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.2, 800);
    camera.position.set(0, 15, -45);

    // RoomEnvironment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting: Warm key + cool fill
    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    keyLight.position.set(60, 100, 40);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 280;
      keyLight.shadow.camera.left = -90;
      keyLight.shadow.camera.right = 90;
      keyLight.shadow.camera.top = 90;
      keyLight.shadow.camera.bottom = -90;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    scene.add(fillLight);

    // 4. Instantiate World & Models
    const world: WorldHandles = createWorld(scene);

    // Player Drone Model
    const playerModel: DroneMeshHandles = createProceduralDrone(0x06b6d4, 0x1e293b, true);
    scene.add(playerModel.root);

    // 3 AI Pilot Drones
    const aiBots: { bot: AIBotState; model: DroneMeshHandles }[] = AI_PROFILES.map((profile, i) => {
      const model = createProceduralDrone(profile.accentHex, 0x0f172a, false);
      scene.add(model.root);
      const startPos = {
        x: (i % 2 === 0 ? -1 : 1) * (3.5 + i * 1.5),
        y: 8 + i * 0.8,
        z: -35 - i * 4,
      };
      const botState = createAIBotState(profile, startPos, 0);
      return { bot: botState, model };
    });

    // 5. Physics & Race State
    let playerDrone = createInitialDroneState(0, 8, -35, 0);
    let racerProgressList: RacerProgress[] = createRacerList();
    let currentGateIndex = 0;
    let currentLap = 0;
    let lapTimes: number[] = [];
    let currentLapTime = 0;
    let totalRaceTime = 0;
    let bestLapTime: number | null = null;
    let orbsCollectedCount = 0;

    // Resets positions for a fresh race or explore session
    const resetFlightState = () => {
      playerDrone = createInitialDroneState(0, 8, -35, 0);
      currentGateIndex = 0;
      currentLap = 0;
      lapTimes = [];
      currentLapTime = 0;
      totalRaceTime = 0;
      racerProgressList = createRacerList();

      aiBots.forEach(({ bot }, i) => {
        bot.position = {
          x: (i % 2 === 0 ? -1 : 1) * (3.5 + i * 1.5),
          y: 8 + i * 0.8,
          z: -35 - i * 4,
        };
        bot.velocity = { x: 0, y: 0, z: 0 };
        bot.yaw = 0;
        bot.pitch = 0;
        bot.roll = 0;
        bot.currentGateIndex = 0;
        bot.lap = 0;
        bot.finished = false;
        bot.currentLapTime = 0;
        bot.totalTime = 0;
        bot.lapTimes = [];
      });
    };

    let lastResetSignal = stateRef.current.resetSignal;

    // 6. Input Management (Held Continuous vs. JustPressed Edges)
    const keysHeld = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keysHeld.add(e.code);

      // Edge triggers
      if (e.code === 'KeyP' || e.code === 'Escape') {
        callbacksRef.current.onPauseTrigger();
      } else if (e.code === 'Tab' || e.code === 'KeyC') {
        e.preventDefault();
        callbacksRef.current.onCameraToggleTrigger();
      } else if (e.code === 'KeyM') {
        soundEngine.toggleMute();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const onBlur = () => {
      keysHeld.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Animation Loop with Software-WebGL Pacing
    let frameId = 0;
    let lastTime = performance.now();
    let telemetryThrottleTimer = 0;
    let titleCamAngle = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (syncState === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const clock = new THREE.Clock();

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      const currentState = stateRef.current.gameState;
      const currentMode = stateRef.current.mode;
      const currentCam = stateRef.current.cameraMode;

      // Check external reset signal
      if (stateRef.current.resetSignal !== lastResetSignal) {
        lastResetSignal = stateRef.current.resetSignal;
        resetFlightState();
      }

      // Update Audio Engine status
      if (currentState === 'playing' || currentState === 'countdown') {
        soundEngine.startMotor();
        soundEngine.updateMotor(
          playerDrone.rpm,
          Math.hypot(playerDrone.velocity.x, playerDrone.velocity.y, playerDrone.velocity.z),
          playerDrone.isBoosting
        );
      } else {
        soundEngine.stopMotor();
      }

      // ── GAME STATE SIMULATION ─────────────────────────────
      if (currentState === 'title') {
        // Live World Camera Flyover Tour
        titleCamAngle += dt * 0.15;
        const radius = 65;
        camera.position.set(
          Math.sin(titleCamAngle) * radius,
          22 + Math.sin(titleCamAngle * 1.5) * 6,
          Math.cos(titleCamAngle) * radius - 20
        );
        camera.lookAt(0, 12, 10);

        // Spin player drone blades gently on pad
        playerModel.propellers.forEach((p) => (p.rotation.y += 8 * dt));
        playerModel.root.position.set(0, 8 + Math.sin(titleCamAngle * 2) * 0.2, -35);
      } else if (currentState === 'playing' || currentState === 'countdown') {
        // Calculate player control inputs
        const canControl = currentState === 'playing';

        // Directional Flight: Arrow Keys to go forward, backwards, left, right
        const pitchInput = canControl
          ? (keysHeld.has('ArrowUp') ? 1 : 0) -
            (keysHeld.has('ArrowDown') ? 1 : 0)
          : 0;

        const rollInput = canControl
          ? (keysHeld.has('ArrowRight') ? 1 : 0) -
            (keysHeld.has('ArrowLeft') ? 1 : 0)
          : 0;

        // Yaw Turning: A for turn to right, D for turn to left
        const yawInput = canControl
          ? (keysHeld.has('KeyA') || keysHeld.has('KeyQ') ? 1 : 0) -
            (keysHeld.has('KeyD') || keysHeld.has('KeyE') ? 1 : 0)
          : 0;

        // Throttle: WS for throttle up and down
        const throttleInput = canControl
          ? (keysHeld.has('KeyW') ? 1 : 0) -
            (keysHeld.has('KeyS') ? 1 : 0)
          : 0;

        // Afterburner Boost: Space, Shift, or F
        const boostInput = canControl && (
          keysHeld.has('Space') ||
          keysHeld.has('ShiftLeft') ||
          keysHeld.has('ShiftRight') ||
          keysHeld.has('KeyF')
        );

        const prevPos = { ...playerDrone.position };

        // Advance Physics
        const { nextState, collisionOccurred, impactSpeed } = updateDronePhysics(
          playerDrone,
          {
            pitch: pitchInput,
            roll: rollInput,
            yaw: yawInput,
            throttle: throttleInput,
            boost: boostInput,
          },
          dt,
          true
        );
        playerDrone = nextState;

        // Collision Audio & Sparks
        if (collisionOccurred) {
          soundEngine.playImpact(impactSpeed);
          _v1.set(playerDrone.position.x, playerDrone.position.y, playerDrone.position.z);
          world.spawnParticles(_v1, 14, 0xf97316, 12);
        }

        // Boost Particle Contrail
        if (playerDrone.isBoosting) {
          _v1.set(playerDrone.position.x, playerDrone.position.y - 0.2, playerDrone.position.z);
          world.spawnParticles(_v1, 4, 0x38bdf8, 5);
        }

        // Synchronize 3D Mesh with Physics State
        playerModel.root.position.set(playerDrone.position.x, playerDrone.position.y, playerDrone.position.z);

        // Apply Euler rotations: Yaw (Y), Pitch (X), Roll (Z)
        _euler.set(-playerDrone.pitch, playerDrone.yaw, -playerDrone.roll, 'YXZ');
        playerModel.root.quaternion.setFromEuler(_euler);

        // Spin propellers based on RPM
        const propSpeed = 45 * playerDrone.rpm;
        playerModel.propellers.forEach((p, idx) => {
          p.rotation.y += (idx % 2 === 0 ? 1 : -1) * propSpeed * dt;
        });

        // Contact shadow position & scale
        playerModel.shadowDisc.position.y = -playerDrone.position.y + 0.02;
        const shadowScale = Math.max(0.3, 1.2 - playerDrone.position.y * 0.025);
        playerModel.shadowDisc.scale.set(shadowScale, shadowScale, shadowScale);

        // ── RACE MODE LOGIC ─────────────────────────────────
        if (currentMode === 'race') {
          if (currentState === 'playing') {
            currentLapTime += dt;
            totalRaceTime += dt;
          }

          // Check if player passed through target gate
          const targetGate = RACE_TRACK_GATES[currentGateIndex];
          if (targetGate) {
            const passed = checkGatePass(
              prevPos,
              playerDrone.position,
              targetGate.position,
              targetGate.radius,
              targetGate.normal
            );

            if (passed) {
              _v1.set(targetGate.position.x, targetGate.position.y, targetGate.position.z);
              world.spawnParticles(_v1, 24, 0x06b6d4, 15);

              currentGateIndex = (currentGateIndex + 1) % RACE_TRACK_GATES.length;

              if (currentGateIndex === 0) {
                // Completed Lap
                lapTimes.push(currentLapTime);
                if (!bestLapTime || currentLapTime < bestLapTime) {
                  bestLapTime = currentLapTime;
                }
                soundEngine.playGatePass(true);
                currentLapTime = 0;
                currentLap += 1;

                if (currentLap >= 3) {
                  // Player finished race!
                  callbacksRef.current.onStuntMessage('RACE FINISHED! PODIUM CLEAR');
                  callbacksRef.current.onRaceFinish();
                } else {
                  callbacksRef.current.onStuntMessage(`LAP ${currentLap} COMPLETE!`);
                }
              } else {
                soundEngine.playGatePass(false);
              }
            }
          }

          // Update AI Bots
          aiBots.forEach(({ bot, model }) => {
            if (currentState === 'playing') {
              const distToPlayer = bot.position.z - playerDrone.position.z;
              updateAIBot(bot, RACE_TRACK_GATES, dt, distToPlayer);
            }

            model.root.position.set(bot.position.x, bot.position.y, bot.position.z);
            _euler.set(bot.pitch, bot.yaw, bot.roll, 'YXZ');
            model.root.quaternion.setFromEuler(_euler);

            // Spin AI propellers
            model.propellers.forEach((p, idx) => {
              p.rotation.y += (idx % 2 === 0 ? 1 : -1) * 35 * bot.rpm * dt;
            });

            // Contact shadow
            model.shadowDisc.position.y = -bot.position.y + 0.02;
          });

          // Sync racer progress objects & update rankings
          const playerRacer = racerProgressList.find((r) => r.isPlayer);
          if (playerRacer) {
            playerRacer.currentGateIndex = currentGateIndex;
            playerRacer.lap = currentLap;
            playerRacer.currentLapTime = currentLapTime;
            playerRacer.totalTime = totalRaceTime;
            playerRacer.finished = currentLap >= 3;
            if (targetGate) {
              playerRacer.distanceToNextGate = getDistance3D(playerDrone.position, targetGate.position);
            }
          }

          aiBots.forEach(({ bot }, idx) => {
            const botRacer = racerProgressList[idx + 1];
            if (botRacer) {
              botRacer.currentGateIndex = bot.currentGateIndex;
              botRacer.lap = bot.lap;
              botRacer.currentLapTime = bot.currentLapTime;
              botRacer.totalTime = bot.totalTime;
              botRacer.finished = bot.finished;
              const nextGate = RACE_TRACK_GATES[bot.currentGateIndex];
              if (nextGate) {
                botRacer.distanceToNextGate = getDistance3D(bot.position, nextGate.position);
              }
            }
          });

          updateRacerRankings(racerProgressList, RACE_TRACK_GATES);
        } else {
          // ── EXPLORE MODE LOGIC ────────────────────────────
          totalRaceTime += dt;

          // Check proximity to 25 Energy Orbs
          world.orbMeshes.forEach((mesh, orbId) => {
            if (mesh.visible) {
              const dx = mesh.position.x - playerDrone.position.x;
              const dy = mesh.position.y - playerDrone.position.y;
              const dz = mesh.position.z - playerDrone.position.z;
              const distSq = dx * dx + dy * dy + dz * dz;

              if (distSq < 16.0) {
                // Collect orb!
                mesh.visible = false;
                orbsCollectedCount += 1;
                soundEngine.playOrbCollect();
                _v1.set(mesh.position.x, mesh.position.y, mesh.position.z);
                world.spawnParticles(_v1, 28, 0xfacc15, 14);

                callbacksRef.current.onStuntMessage(`ENERGY CORE RETRIEVED! (+100 PTS)`);
              }
            }
          });
        }

        // ── CAMERA TRACKING RIG ─────────────────────────────
        if (currentCam === 'fpv') {
          // FPV Cockpit Cam: Positioned in front camera gimbal
          _camPos.set(0, 0.08, 0.75).applyQuaternion(playerModel.root.quaternion).add(playerModel.root.position);
          camera.position.copy(_camPos);

          // Look ahead along forward vector
          _camTarget.set(0, -0.05, 5).applyQuaternion(playerModel.root.quaternion).add(_camPos);
          camera.lookAt(_camTarget);
          camera.fov = playerDrone.isBoosting ? 80 : 70;
          camera.updateProjectionMatrix();
        } else {
          // Third-Person Chase Cam: Silky spring-damped follow
          const chaseDist = playerDrone.isBoosting ? 5.8 : 4.6;
          const chaseHeight = 1.9;

          // Ideal camera position behind drone
          _v1.set(
            -Math.sin(playerDrone.yaw) * chaseDist,
            chaseHeight,
            -Math.cos(playerDrone.yaw) * chaseDist
          ).add(playerModel.root.position);

          // Exponential damping for smooth cinematic glide
          const lerpFactor = Math.min(1.0, 8.0 * dt);
          camera.position.lerp(_v1, lerpFactor);

          // Look slightly ahead of drone
          _camTarget.set(
            Math.sin(playerDrone.yaw) * 4.0,
            0.5,
            Math.cos(playerDrone.yaw) * 4.0
          ).add(playerModel.root.position);
          camera.lookAt(_camTarget);

          camera.fov = playerDrone.isBoosting ? 75 : 65;
          camera.updateProjectionMatrix();
        }
      }

      // Update 3D World Animation (gates, turbines, particles)
      world.updateWorld(dt, currentGateIndex);

      // Render Scene
      renderer.render(scene, camera);

      // Throttled HUD Telemetry Updates (~10Hz)
      telemetryThrottleTimer += dt;
      if (telemetryThrottleTimer > 0.1) {
        telemetryThrottleTimer = 0;
        callbacksRef.current.onTelemetryUpdate({
          speedKmh: getSpeedKmh(playerDrone.velocity),
          altitudeM: Math.round(playerDrone.position.y),
          throttle: playerDrone.throttle,
          boostFuel: playerDrone.boostFuel,
          isBoosting: playerDrone.isBoosting,
          health: playerDrone.health,
          racers: [...racerProgressList],
          currentLap,
          lapTime: currentLapTime,
          bestLapTime,
          orbsCollected: orbsCollectedCount,
        });
      }

      // Schedule next frame with Software-WebGL pacing if applicable
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    // Start render loop
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      soundEngine.stopMotor();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950"
      style={{ touchAction: 'none' }}
    />
  );
};
