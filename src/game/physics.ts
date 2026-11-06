/**
 * Pure 6-DOF Drone Flight Physics Engine.
 * Fully decoupled from Three.js rendering for high performance and deterministic testing.
 */

import { DroneControls, DronePhysicsState, Vector3D } from './types';

export const PHYSICS_CONFIG = {
  GRAVITY: 12.0,
  BASE_THRUST: 24.0,
  BOOST_MULTIPLIER: 1.85,
  PITCH_SPEED: 2.8,
  ROLL_SPEED: 3.2,
  YAW_SPEED: 2.4,
  AUTO_LEVEL_RATE: 3.5,
  LINEAR_DRAG: 0.85,
  ANGULAR_DRAG: 4.0,
  MAX_SPEED: 48.0,
  MAX_BOOST_SPEED: 78.0,
  BOOST_CONSUMPTION: 25.0, // % per second
  BOOST_RECHARGE: 14.0,    // % per second
  GROUND_LEVEL: 1.2,
  WORLD_RADIUS: 280.0,
  MAX_ALTITUDE: 150.0,
};

export function createInitialDroneState(x = 0, y = 3, z = 0, yaw = 0): DronePhysicsState {
  return {
    position: { x, y, z },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 0,
    roll: 0,
    yaw,
    throttle: 0,
    boostFuel: 100,
    isBoosting: false,
    health: 100,
    rpm: 0.3,
  };
}

export function updateDronePhysics(
  state: DronePhysicsState,
  controls: DroneControls,
  dt: number,
  flightAssist = true
): { nextState: DronePhysicsState; collisionOccurred: boolean; impactSpeed: number } {
  // Clamp delta time to avoid physics tunneling
  const clampedDt = Math.min(dt, 0.05);

  const next: DronePhysicsState = {
    position: { ...state.position },
    velocity: { ...state.velocity },
    pitch: state.pitch,
    roll: state.roll,
    yaw: state.yaw,
    throttle: state.throttle,
    boostFuel: state.boostFuel,
    isBoosting: false,
    health: state.health,
    rpm: state.rpm,
  };

  // 1. Boost Management
  const wantsBoost = controls.boost && next.boostFuel > 5;
  if (wantsBoost) {
    next.isBoosting = true;
    next.boostFuel = Math.max(0, next.boostFuel - PHYSICS_CONFIG.BOOST_CONSUMPTION * clampedDt);
  } else {
    next.boostFuel = Math.min(100, next.boostFuel + PHYSICS_CONFIG.BOOST_RECHARGE * clampedDt);
  }

  // 2. Angular Rates & Rotation (Pitch, Roll, Yaw)
  next.yaw += controls.yaw * PHYSICS_CONFIG.YAW_SPEED * clampedDt;

  if (controls.pitch !== 0) {
    next.pitch += controls.pitch * PHYSICS_CONFIG.PITCH_SPEED * clampedDt;
  } else if (flightAssist) {
    // Auto-level pitch toward 0
    next.pitch -= next.pitch * Math.min(1.0, PHYSICS_CONFIG.AUTO_LEVEL_RATE * clampedDt);
  }

  if (controls.roll !== 0) {
    next.roll += controls.roll * PHYSICS_CONFIG.ROLL_SPEED * clampedDt;
  } else if (flightAssist) {
    // Auto-level roll toward 0
    next.roll -= next.roll * Math.min(1.0, PHYSICS_CONFIG.AUTO_LEVEL_RATE * clampedDt);
  }

  // Clamp max pitch and roll angles in assist mode for smooth aerobatics
  if (flightAssist) {
    const maxTilt = Math.PI / 2.3; // ~78 degrees
    next.pitch = Math.max(-maxTilt, Math.min(maxTilt, next.pitch));
    next.roll = Math.max(-maxTilt, Math.min(maxTilt, next.roll));
  }

  // 3. Thrust Calculations
  // Throttle base input maps from -1..1 or 0..1.
  // When idle (throttle = 0), quadcopter hovers with gentle descent if controls.throttle is not pressed
  const throttleInput = controls.throttle;
  let targetThrottle = 0.5 + throttleInput * 0.5; // 0 to 1
  if (throttleInput > 0) targetThrottle = 0.5 + throttleInput * 0.5;
  if (throttleInput < 0) targetThrottle = 0.5 + throttleInput * 0.5;

  next.throttle += (targetThrottle - next.throttle) * Math.min(1.0, 8.0 * clampedDt);

  const boostMult = next.isBoosting ? PHYSICS_CONFIG.BOOST_MULTIPLIER : 1.0;
  const totalThrust = (next.throttle * PHYSICS_CONFIG.BASE_THRUST) * boostMult;

  // Direction vectors:
  // Forward vector pointing in drone's facing direction (yaw angle around Y)
  // yaw = 0 points in +Z direction, yaw = PI/2 points in +X
  const sinY = Math.sin(next.yaw);
  const cosY = Math.cos(next.yaw);
  
  // When pitched forward (pitch > 0), the drone's top tilts forward
  // Let pitch > 0 mean nose is down (forward pitch)
  const sinP = Math.sin(next.pitch);
  const cosP = Math.cos(next.pitch);
  const sinR = Math.sin(next.roll);
  const cosR = Math.cos(next.roll);

  // Forward unit vector in world space
  const fwdX = sinY * cosP;
  const fwdY = -sinP;
  const fwdZ = cosY * cosP;

  // Up vector in world space:
  // When pitch is positive (nose down), the drone tilts forward, so its thrust pushes upward AND forward (+Z)
  const upX = sinY * sinP * cosR + cosY * sinR;
  const upY = cosP * cosR;
  const upZ = cosY * sinP * cosR - sinY * sinR;

  // Quadcopter thrust pushes in the drone's local up/forward direction
  const thrustX = (upX * 0.8 + fwdX * 0.2) * totalThrust;
  const thrustY = upY * totalThrust;
  const thrustZ = (upZ * 0.8 + fwdZ * 0.2) * totalThrust;

  // Direct thrust nudge for pitch (forward/backward) and roll (left/right strafe)
  const pitchMagnitude = (next.isBoosting ? 28.0 : 16.0) * Math.sin(next.pitch);
  const rollMagnitude = 16.0 * Math.sin(next.roll);

  // Pitch moves forward/back along drone facing heading (sinY, cosY)
  const pushPitchX = sinY * pitchMagnitude;
  const pushPitchZ = cosY * pitchMagnitude;

  // Roll strafes left/right perpendicular to drone facing heading (cosY, -sinY)
  const pushRollX = cosY * rollMagnitude;
  const pushRollZ = -sinY * rollMagnitude;

  const pushX = pushPitchX + pushRollX;
  const pushZ = pushPitchZ + pushRollZ;

  // 4. Accelerations (Thrust + Gravity + Drag)
  const accelX = thrustX + pushX - next.velocity.x * PHYSICS_CONFIG.LINEAR_DRAG;
  const accelY = thrustY - PHYSICS_CONFIG.GRAVITY - next.velocity.y * (PHYSICS_CONFIG.LINEAR_DRAG * 0.8);
  const accelZ = thrustZ + pushZ - next.velocity.z * PHYSICS_CONFIG.LINEAR_DRAG;

  next.velocity.x += accelX * clampedDt;
  next.velocity.y += accelY * clampedDt;
  next.velocity.z += accelZ * clampedDt;

  // Clamp speed to maximum allowable
  const speedCap = next.isBoosting ? PHYSICS_CONFIG.MAX_BOOST_SPEED : PHYSICS_CONFIG.MAX_SPEED;
  const currentSpeed = Math.hypot(next.velocity.x, next.velocity.y, next.velocity.z);
  if (currentSpeed > speedCap) {
    const scale = speedCap / currentSpeed;
    next.velocity.x *= scale;
    next.velocity.y *= scale;
    next.velocity.z *= scale;
  }

  // 5. Position Update
  next.position.x += next.velocity.x * clampedDt;
  next.position.y += next.velocity.y * clampedDt;
  next.position.z += next.velocity.z * clampedDt;

  // 6. Collision & World Boundaries
  let collisionOccurred = false;
  let impactSpeed = 0;

  // Ground collision
  if (next.position.y < PHYSICS_CONFIG.GROUND_LEVEL) {
    next.position.y = PHYSICS_CONFIG.GROUND_LEVEL;
    impactSpeed = Math.abs(next.velocity.y);
    if (impactSpeed > 3.0) {
      collisionOccurred = true;
      next.health = Math.max(0, next.health - impactSpeed * 1.5);
    }
    // Bounce slightly with damping
    next.velocity.y = Math.max(0, -next.velocity.y * 0.35);
    next.velocity.x *= 0.8;
    next.velocity.z *= 0.8;
    // Flatten attitude
    next.pitch *= 0.7;
    next.roll *= 0.7;
  }

  // Ceiling collision
  if (next.position.y > PHYSICS_CONFIG.MAX_ALTITUDE) {
    next.position.y = PHYSICS_CONFIG.MAX_ALTITUDE;
    next.velocity.y = Math.min(0, next.velocity.y);
  }

  // Horizontal world boundary (soft barrier bounce)
  const distFromCenter = Math.hypot(next.position.x, next.position.z);
  if (distFromCenter > PHYSICS_CONFIG.WORLD_RADIUS) {
    const angle = Math.atan2(next.position.x, next.position.z);
    next.position.x = Math.sin(angle) * PHYSICS_CONFIG.WORLD_RADIUS;
    next.position.z = Math.cos(angle) * PHYSICS_CONFIG.WORLD_RADIUS;
    // Invert normal velocity
    const dot = next.velocity.x * Math.sin(angle) + next.velocity.z * Math.cos(angle);
    if (dot > 0) {
      next.velocity.x -= 1.4 * dot * Math.sin(angle);
      next.velocity.z -= 1.4 * dot * Math.cos(angle);
      collisionOccurred = true;
      impactSpeed = Math.abs(dot);
    }
  }

  // 7. Rotor RPM (for audio & visual propeller blur)
  const targetRpm = 0.2 + next.throttle * 0.8 + (next.isBoosting ? 0.3 : 0);
  next.rpm += (targetRpm - next.rpm) * Math.min(1.0, 10.0 * clampedDt);

  return { nextState: next, collisionOccurred, impactSpeed };
}

/**
 * Calculates current drone speed in km/h for the HUD readout.
 */
export function getSpeedKmh(velocity: Vector3D): number {
  const mps = Math.hypot(velocity.x, velocity.y, velocity.z);
  return Math.round(mps * 3.6);
}
