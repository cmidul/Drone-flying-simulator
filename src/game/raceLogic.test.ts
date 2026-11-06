import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkGatePass,
  createRacerList,
  updateRacerRankings,
  RACE_TRACK_GATES,
} from './raceLogic';

test('checkGatePass detects crossing plane within gate radius', () => {
  const gatePos = { x: 0, y: 10, z: 0 };
  const gateNormal = { x: 0, y: 0, z: 1 }; // Facing along Z
  const gateRadius = 5.0;

  // Passing from z = -2 to z = +2 right through center
  const prev = { x: 0, y: 10, z: -2 };
  const curr = { x: 0, y: 10, z: 2 };

  const passed = checkGatePass(prev, curr, gatePos, gateRadius, gateNormal);
  assert.equal(passed, true, 'Should detect plane crossing through center');
});

test('checkGatePass rejects crossing plane outside gate radius', () => {
  const gatePos = { x: 0, y: 10, z: 0 };
  const gateNormal = { x: 0, y: 0, z: 1 };
  const gateRadius = 5.0;

  // Passing way out at x = 20
  const prev = { x: 20, y: 10, z: -2 };
  const curr = { x: 20, y: 10, z: 2 };

  const passed = checkGatePass(prev, curr, gatePos, gateRadius, gateNormal);
  assert.equal(passed, false, 'Should reject crossing outside radius');
});

test('checkGatePass returns false if path does not cross plane', () => {
  const gatePos = { x: 0, y: 10, z: 0 };
  const gateNormal = { x: 0, y: 0, z: 1 };
  const gateRadius = 5.0;

  // Moving from z = 2 to z = 5 (both on same side of plane)
  const prev = { x: 0, y: 10, z: 2 };
  const curr = { x: 0, y: 10, z: 5 };

  const passed = checkGatePass(prev, curr, gatePos, gateRadius, gateNormal);
  assert.equal(passed, false);
});

test('updateRacerRankings correctly ranks racers by lap and gate progression', () => {
  const racers = createRacerList();
  assert.equal(racers.length, 4);

  // Player on lap 1, gate 3
  racers[0].lap = 1;
  racers[0].currentGateIndex = 3;
  racers[0].distanceToNextGate = 10;

  // Bot 1 on lap 0, gate 5
  racers[1].lap = 0;
  racers[1].currentGateIndex = 5;
  racers[1].distanceToNextGate = 5;

  // Bot 2 on lap 1, gate 3, but closer to next gate than Player
  racers[2].lap = 1;
  racers[2].currentGateIndex = 3;
  racers[2].distanceToNextGate = 2; // closer than player!

  updateRacerRankings(racers, RACE_TRACK_GATES);

  // Bot 2 should be Rank 1 (lap 1, gate 3, dist 2)
  assert.equal(racers[2].rank, 1);
  // Player should be Rank 2 (lap 1, gate 3, dist 10)
  assert.equal(racers[0].rank, 2);
  // Bot 1 should be lower (lap 0)
  assert.ok(racers[1].rank > 2);
});
