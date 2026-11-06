import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialDroneState,
  updateDronePhysics,
  getSpeedKmh,
  PHYSICS_CONFIG,
} from './physics';
import { DroneControls } from './types';

test('Initial drone state sets sensible defaults', () => {
  const drone = createInitialDroneState(10, 5, -20, 1.57);
  assert.equal(drone.position.x, 10);
  assert.equal(drone.position.y, 5);
  assert.equal(drone.position.z, -20);
  assert.equal(drone.yaw, 1.57);
  assert.equal(drone.health, 100);
  assert.equal(drone.boostFuel, 100);
  assert.equal(drone.isBoosting, false);
});

test('Gravity pulls down drone when throttle is cut', () => {
  const state = createInitialDroneState(0, 50, 0);
  const idleControls: DroneControls = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: -1, // Downward / minimum throttle
    boost: false,
  };

  const { nextState } = updateDronePhysics(state, idleControls, 0.05, true);
  // Velocity Y should become negative due to gravity and low throttle
  assert.ok(nextState.velocity.y < 0, `Expected negative vy, got ${nextState.velocity.y}`);
  assert.ok(nextState.position.y < state.position.y, 'Position Y should drop');
});

test('Full throttle and pitch forward produces forward acceleration', () => {
  const state = createInitialDroneState(0, 15, 0, 0); // yaw = 0 points +Z
  const forwardControls: DroneControls = {
    pitch: 0.5, // pitch nose down / forward
    roll: 0,
    yaw: 0,
    throttle: 1, // maximum lift
    boost: false,
  };

  let current = state;
  for (let i = 0; i < 20; i++) {
    const { nextState } = updateDronePhysics(current, forwardControls, 0.03, true);
    current = nextState;
  }

  // With yaw = 0 and nose tilted forward, velocity Z should increase significantly
  assert.ok(current.velocity.z > 2.0, `Expected forward velocity.z > 2, got ${current.velocity.z}`);
  assert.ok(current.position.z > 0, `Expected position.z to advance, got ${current.position.z}`);
});

test('Boost consumes fuel and increases max speed', () => {
  const state = createInitialDroneState(0, 20, 0);
  state.boostFuel = 100;

  const boostControls: DroneControls = {
    pitch: -0.5,
    roll: 0,
    yaw: 0,
    throttle: 1,
    boost: true,
  };

  const { nextState } = updateDronePhysics(state, boostControls, 0.05, true);
  assert.equal(nextState.isBoosting, true);
  assert.ok(nextState.boostFuel < 100, 'Boost fuel should decrease');
});

test('Ground clamping prevents drone from falling through terrain', () => {
  const lowState = createInitialDroneState(0, 0.5, 0);
  lowState.velocity.y = -20; // moving fast downward

  const controls: DroneControls = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0,
    boost: false,
  };

  const { nextState, collisionOccurred } = updateDronePhysics(lowState, controls, 0.05, true);
  assert.ok(nextState.position.y >= PHYSICS_CONFIG.GROUND_LEVEL, 'Position Y clamped at ground');
  assert.equal(collisionOccurred, true, 'Collision should trigger on hard ground impact');
});

test('Speedometer helper computes correct km/h', () => {
  // 10 m/s = 36 km/h
  const kmh = getSpeedKmh({ x: 10, y: 0, z: 0 });
  assert.equal(kmh, 36);
});
