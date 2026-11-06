/**
 * Race Track, Waypoint Navigation and Timing Engine.
 */

import { RaceGate, RacerProgress, Vector3D } from './types';

export const RACE_CONFIG = {
  TOTAL_LAPS: 3,
  DEFAULT_GATE_RADIUS: 7.5,
  COUNTDOWN_SECONDS: 3,
};

/**
 * Procedurally generated high-octane 3D race circuit with elevation changes,
 * chicane twists, high-speed straights, and a vertical loop-dive.
 */
export const RACE_TRACK_GATES: RaceGate[] = [
  // Gate 0: Start / Finish Line
  { id: 0, position: { x: 0, y: 10, z: -40 }, radius: 8.5, normal: { x: 0, y: 0, z: 1 }, yaw: 0, pitch: 0 },
  // Gate 1: Gentle right rise
  { id: 1, position: { x: 35, y: 16, z: -10 }, radius: 8.0, normal: { x: 0.8, y: 0.1, z: 0.6 }, yaw: 0.6, pitch: 0.1 },
  // Gate 2: High apex right curve
  { id: 2, position: { x: 80, y: 24, z: 30 }, radius: 8.0, normal: { x: 0.6, y: 0, z: 0.8 }, yaw: 1.0, pitch: 0 },
  // Gate 3: Canyon entry dive
  { id: 3, position: { x: 95, y: 15, z: 85 }, radius: 7.5, normal: { x: 0.1, y: -0.2, z: 0.98 }, yaw: 1.5, pitch: -0.2 },
  // Gate 4: Low tunnel pass
  { id: 4, position: { x: 65, y: 8, z: 140 }, radius: 7.0, normal: { x: -0.6, y: 0, z: 0.8 }, yaw: 2.2, pitch: 0 },
  // Gate 5: Sharp left hairpin turn
  { id: 5, position: { x: 10, y: 14, z: 165 }, radius: 7.5, normal: { x: -0.9, y: 0.1, z: 0.3 }, yaw: 2.9, pitch: 0.1 },
  // Gate 6: Elevated slalom arch
  { id: 6, position: { x: -50, y: 28, z: 135 }, radius: 8.0, normal: { x: -0.7, y: 0.2, z: -0.7 }, yaw: 3.8, pitch: 0.2 },
  // Gate 7: High-speed sky bridge
  { id: 7, position: { x: -90, y: 32, z: 70 }, radius: 8.0, normal: { x: -0.2, y: 0, z: -0.98 }, yaw: 4.5, pitch: 0 },
  // Gate 8: Sweeping descent through towers
  { id: 8, position: { x: -85, y: 18, z: -15 }, radius: 7.5, normal: { x: 0.4, y: -0.2, z: -0.9 }, yaw: 5.2, pitch: -0.2 },
  // Gate 9: Final straight alignment back to Start/Finish
  { id: 9, position: { x: -40, y: 11, z: -60 }, radius: 8.0, normal: { x: 0.7, y: 0, z: 0.7 }, yaw: 5.9, pitch: 0 },
];

/**
 * Tests if an object moving from prevPos to currPos crossed through a circular gate.
 */
export function checkGatePass(
  prevPos: Vector3D,
  currPos: Vector3D,
  gatePos: Vector3D,
  gateRadius: number,
  gateNormal: Vector3D
): boolean {
  // Vector from gate center to prev and curr
  const p1 = { x: prevPos.x - gatePos.x, y: prevPos.y - gatePos.y, z: prevPos.z - gatePos.z };
  const p2 = { x: currPos.x - gatePos.x, y: currPos.y - gatePos.y, z: currPos.z - gatePos.z };

  // Dot products with gate normal plane
  const d1 = p1.x * gateNormal.x + p1.y * gateNormal.y + p1.z * gateNormal.z;
  const d2 = p2.x * gateNormal.x + p2.y * gateNormal.y + p2.z * gateNormal.z;

  // If both are on the same side, it did not cross the plane
  if ((d1 < 0 && d2 < 0) || (d1 > 0 && d2 > 0)) {
    // Proximity fallback: if very close to center (e.g. within 3m), count as hit
    const distSq = p2.x * p2.x + p2.y * p2.y + p2.z * p2.z;
    if (distSq < (gateRadius * 0.75) ** 2) {
      return true;
    }
    return false;
  }

  // Calculate intersection point on gate plane
  const denom = d1 - d2;
  if (Math.abs(denom) < 1e-6) return false;

  const t = d1 / denom; // interpolation factor between p1 and p2 [0..1]
  const ix = p1.x + (p2.x - p1.x) * t;
  const iy = p1.y + (p2.y - p1.y) * t;
  const iz = p1.z + (p2.z - p1.z) * t;

  // Check radial distance from gate center
  const radialDistSq = ix * ix + iy * iy + iz * iz;
  return radialDistSq <= gateRadius * gateRadius;
}

/**
 * Creates initial racer progress objects for the player and AI bots.
 */
export function createRacerList(): RacerProgress[] {
  return [
    {
      id: 'player',
      name: 'YOU',
      isPlayer: true,
      color: '#06b6d4', // Cyan
      accentColor: '#38bdf8',
      currentGateIndex: 0,
      lap: 0,
      lapTimes: [],
      currentLapTime: 0,
      totalTime: 0,
      finished: false,
      distanceToNextGate: 0,
      rank: 1,
    },
    {
      id: 'bot-1',
      name: 'VORTEX-1',
      isPlayer: false,
      color: '#f97316', // Orange
      accentColor: '#fb923c',
      currentGateIndex: 0,
      lap: 0,
      lapTimes: [],
      currentLapTime: 0,
      totalTime: 0,
      finished: false,
      distanceToNextGate: 0,
      rank: 2,
    },
    {
      id: 'bot-2',
      name: 'PULSE-7',
      isPlayer: false,
      color: '#a855f7', // Purple
      accentColor: '#c084fc',
      currentGateIndex: 0,
      lap: 0,
      lapTimes: [],
      currentLapTime: 0,
      totalTime: 0,
      finished: false,
      distanceToNextGate: 0,
      rank: 3,
    },
    {
      id: 'bot-3',
      name: 'GHOST-X',
      isPlayer: false,
      color: '#eab308', // Amber / Gold
      accentColor: '#facc15',
      currentGateIndex: 0,
      lap: 0,
      lapTimes: [],
      currentLapTime: 0,
      totalTime: 0,
      finished: false,
      distanceToNextGate: 0,
      rank: 4,
    },
  ];
}

/**
 * Computes race rankings based on lap, current gate, and distance to next gate.
 */
export function updateRacerRankings(racers: RacerProgress[], gates: RaceGate[]): void {
  // Sort descending by progress score
  const score = (r: RacerProgress) => {
    if (r.finished) {
      // Finished racers ranked by their total time (lowest time wins)
      return 1000000 - r.totalTime;
    }
    const gateCount = gates.length;
    const progressScore = r.lap * gateCount * 1000 + r.currentGateIndex * 1000;
    // Closer distance gives higher score
    const proximityScore = Math.max(0, 1000 - Math.min(1000, r.distanceToNextGate));
    return progressScore + proximityScore;
  };

  const sorted = [...racers].sort((a, b) => score(b) - score(a));

  for (let i = 0; i < sorted.length; i++) {
    sorted[i].rank = i + 1;
  }
}

/**
 * Computes distance between two 3D vectors.
 */
export function getDistance3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
