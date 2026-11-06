/**
 * AI Drone Pilot Navigation & Behavior System.
 * Simulates intelligent racer drones that follow the 3D track, bank into turns,
 * and adjust speed with distinct pilot styles.
 */

import { RaceGate, Vector3D } from './types';
import { getDistance3D } from './raceLogic';

export interface AIPilotProfile {
  id: string;
  name: string;
  color: string;
  accentHex: number;
  baseSpeed: number;
  turnAgility: number;
  offsetJitter: number; // Slight variation in racing line
  boostTendency: number;
}

export interface AIBotState {
  profile: AIPilotProfile;
  position: Vector3D;
  velocity: Vector3D;
  pitch: number;
  roll: number;
  yaw: number;
  rpm: number;
  currentGateIndex: number;
  lap: number;
  finished: boolean;
  lapTimes: number[];
  currentLapTime: number;
  totalTime: number;
  isBoosting: boolean;
  boostCooldown: number;
}

export const AI_PROFILES: AIPilotProfile[] = [
  {
    id: 'bot-1',
    name: 'VORTEX-1',
    color: '#f97316',
    accentHex: 0xf97316,
    baseSpeed: 29.0,
    turnAgility: 3.8,
    offsetJitter: 1.5,
    boostTendency: 0.8,
  },
  {
    id: 'bot-2',
    name: 'PULSE-7',
    color: '#a855f7',
    accentHex: 0xa855f7,
    baseSpeed: 27.5,
    turnAgility: 4.2,
    offsetJitter: 0.8,
    boostTendency: 0.5,
  },
  {
    id: 'bot-3',
    name: 'GHOST-X',
    color: '#eab308',
    accentHex: 0xeab308,
    baseSpeed: 28.2,
    turnAgility: 3.5,
    offsetJitter: 2.2,
    boostTendency: 0.65,
  },
];

export function createAIBotState(
  profile: AIPilotProfile,
  startPos: Vector3D,
  startYaw = 0
): AIBotState {
  return {
    profile,
    position: { ...startPos },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 0,
    roll: 0,
    yaw: startYaw,
    rpm: 0.4,
    currentGateIndex: 0,
    lap: 0,
    finished: false,
    lapTimes: [],
    currentLapTime: 0,
    totalTime: 0,
    isBoosting: false,
    boostCooldown: 3.0 + Math.random() * 4.0,
  };
}

export function updateAIBot(
  bot: AIBotState,
  gates: RaceGate[],
  dt: number,
  playerDistance: number
): void {
  if (bot.finished) {
    // Gentle circle after finishing
    bot.yaw += 0.8 * dt;
    bot.velocity.x *= 0.95;
    bot.velocity.y *= 0.95;
    bot.velocity.z *= 0.95;
    bot.position.x += bot.velocity.x * dt;
    bot.position.y += bot.velocity.y * dt;
    bot.position.z += bot.velocity.z * dt;
    return;
  }

  const clampedDt = Math.min(dt, 0.05);
  const targetGate = gates[bot.currentGateIndex];
  if (!targetGate) return;

  // Rubber-banding / dynamic catch-up to keep the race thrilling
  let speedMultiplier = 1.0;
  if (playerDistance > 50) {
    speedMultiplier = 1.15; // Speed up if falling behind player
  } else if (playerDistance < -40) {
    speedMultiplier = 0.92; // Don't get impossibly far ahead
  }

  // Boost timer
  bot.boostCooldown -= clampedDt;
  if (bot.boostCooldown <= 0) {
    bot.isBoosting = true;
    if (bot.boostCooldown < -1.8) {
      bot.isBoosting = false;
      bot.boostCooldown = 6.0 + Math.random() * 5.0;
    }
  }

  const currentMaxSpeed = bot.profile.baseSpeed * speedMultiplier * (bot.isBoosting ? 1.4 : 1.0);

  // Direction vector towards gate center with slight lane offset
  const laneOffset = Math.sin(bot.totalTime * 0.7 + bot.profile.offsetJitter) * bot.profile.offsetJitter;
  const targetX = targetGate.position.x + laneOffset;
  const targetY = targetGate.position.y + Math.cos(bot.totalTime * 0.5) * 0.5;
  const targetZ = targetGate.position.z;

  const dx = targetX - bot.position.x;
  const dy = targetY - bot.position.y;
  const dz = targetZ - bot.position.z;
  const dist = Math.hypot(dx, dy, dz);

  // Target yaw
  const desiredYaw = Math.atan2(dx, dz);
  let yawDiff = desiredYaw - bot.yaw;
  // Normalize yawDiff to -PI..PI
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

  bot.yaw += yawDiff * Math.min(1.0, bot.profile.turnAgility * clampedDt);

  // Bank (roll) into turns
  const targetRoll = Math.max(-0.7, Math.min(0.7, -yawDiff * 1.5));
  bot.roll += (targetRoll - bot.roll) * Math.min(1.0, 5.0 * clampedDt);

  // Pitch forward to gain speed
  const targetPitch = -0.35 - (bot.isBoosting ? 0.2 : 0);
  bot.pitch += (targetPitch - bot.pitch) * Math.min(1.0, 4.0 * clampedDt);

  // Velocity integration
  const fwdX = Math.sin(bot.yaw);
  const fwdZ = Math.cos(bot.yaw);
  const fwdY = dist > 5 ? (dy / dist) : 0;

  const targetVx = fwdX * currentMaxSpeed;
  const targetVy = Math.max(-10, Math.min(15, fwdY * currentMaxSpeed));
  const targetVz = fwdZ * currentMaxSpeed;

  bot.velocity.x += (targetVx - bot.velocity.x) * Math.min(1.0, 3.5 * clampedDt);
  bot.velocity.y += (targetVy - bot.velocity.y) * Math.min(1.0, 3.5 * clampedDt);
  bot.velocity.z += (targetVz - bot.velocity.z) * Math.min(1.0, 3.5 * clampedDt);

  bot.position.x += bot.velocity.x * clampedDt;
  bot.position.y += bot.velocity.y * clampedDt;
  bot.position.z += bot.velocity.z * clampedDt;

  bot.rpm = 0.5 + (currentMaxSpeed / bot.profile.baseSpeed) * 0.5;

  // Check if bot reached the target gate (radius check)
  if (dist < targetGate.radius * 1.1) {
    bot.currentGateIndex = (bot.currentGateIndex + 1) % gates.length;
    if (bot.currentGateIndex === 0) {
      // Completed a lap
      bot.lapTimes.push(bot.currentLapTime);
      bot.currentLapTime = 0;
      bot.lap += 1;
      if (bot.lap >= 3) {
        bot.finished = true;
      }
    }
  }

  bot.currentLapTime += clampedDt;
  bot.totalTime += clampedDt;
}
