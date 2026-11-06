/**
 * Types and interfaces for the SkyVector drone flying game.
 */

export type GameMode = 'race' | 'explore';
export type CameraMode = 'chase' | 'fpv';
export type GameState = 'title' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface DroneControls {
  pitch: number;    // -1 (pitch down / forward) to 1 (pitch up / back)
  roll: number;     // -1 (roll left) to 1 (roll right)
  yaw: number;      // -1 (turn left) to 1 (turn right)
  throttle: number; // -1 (descend) to 1 (ascend)
  boost: boolean;   // extra forward/thrust power
}

export interface DronePhysicsState {
  position: Vector3D;
  velocity: Vector3D;
  // Euler angles in radians:
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  boostFuel: number;    // 0 to 100
  isBoosting: boolean;
  health: number;       // 0 to 100
  rpm: number;          // rotor speed representation
}

export interface RaceGate {
  id: number;
  position: Vector3D;
  radius: number;
  normal: Vector3D; // Forward direction through the gate
  yaw: number;      // Rotation around Y
  pitch: number;    // Elevation angle
}

export interface RacerProgress {
  id: string;
  name: string;
  isPlayer: boolean;
  color: string;
  accentColor: string;
  currentGateIndex: number;
  lap: number;          // 0-indexed (0 = Lap 1, 1 = Lap 2, etc.)
  lapTimes: number[];
  currentLapTime: number;
  totalTime: number;
  finished: boolean;
  distanceToNextGate: number;
  rank: number;
}

export interface EnergyOrb {
  id: number;
  position: Vector3D;
  collected: boolean;
  value: number;
}

export interface StuntEvent {
  name: string;
  points: number;
  timestamp: number;
}
