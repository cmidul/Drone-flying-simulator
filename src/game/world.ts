/**
 * Procedural 3D World Environment, Track Gates, Landmarks, and Particle Pool.
 */

import * as THREE from 'three';
import { EnergyOrb, RaceGate } from './types';
import { RACE_TRACK_GATES } from './raceLogic';

export interface WorldHandles {
  scene: THREE.Scene;
  gateMeshes: THREE.Group[];
  gateRingMeshes: THREE.Mesh[];
  orbMeshes: Map<number, THREE.Group>;
  turbines: THREE.Group[];
  updateWorld: (dt: number, activeGateIndex: number) => void;
  spawnParticles: (pos: THREE.Vector3, count: number, color: number, speed?: number) => void;
}

export const EXPLORE_ORBS: EnergyOrb[] = [];

// Generate 25 exciting orb coordinates (high towers, canyon tunnels, slalom gaps)
for (let i = 0; i < 25; i++) {
  const angle = (i / 25) * Math.PI * 2 + (i % 3) * 0.2;
  const rad = 35 + ((i * 19) % 190);
  const height = 6 + ((i * 13) % 45);

  EXPLORE_ORBS.push({
    id: i,
    position: {
      x: Math.sin(angle) * rad,
      y: height,
      z: Math.cos(angle) * rad,
    },
    collected: false,
    value: 100,
  });
}

export function createWorld(scene: THREE.Scene): WorldHandles {
  // 1. Procedural Grid / Surface Runway Terrain
  const groundSize = 700;
  const terrainGeo = new THREE.PlaneGeometry(groundSize, groundSize, 48, 48);
  terrainGeo.rotateX(-Math.PI / 2);

  // Subtle height displacement for natural rolling hills and canyon ridges
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const distFromCenter = Math.hypot(x, z);

    // Keep center race area mostly flat, build hills/canyons on the perimeter
    if (distFromCenter > 110) {
      const hill = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 18 + Math.sin(x * 0.05 + z * 0.03) * 8;
      posAttr.setY(i, Math.max(0, hill * (distFromCenter - 110) / 140));
    }
  }
  terrainGeo.computeVertexNormals();

  // Terrain Texture
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = 512;
  terrainCanvas.height = 512;
  const tCtx = terrainCanvas.getContext('2d')!;
  tCtx.fillStyle = '#0b0f17';
  tCtx.fillRect(0, 0, 512, 512);

  // Grid lines
  tCtx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  tCtx.lineWidth = 1.5;
  const step = 32;
  for (let i = 0; i <= 512; i += step) {
    tCtx.beginPath();
    tCtx.moveTo(i, 0);
    tCtx.lineTo(i, 512);
    tCtx.stroke();

    tCtx.beginPath();
    tCtx.moveTo(0, i);
    tCtx.lineTo(512, i);
    tCtx.stroke();
  }

  // Accent runway cross markings
  tCtx.fillStyle = 'rgba(14, 165, 233, 0.25)';
  for (let x = 64; x < 512; x += 128) {
    for (let y = 64; y < 512; y += 128) {
      tCtx.fillRect(x - 4, y - 1, 8, 2);
      tCtx.fillRect(x - 1, y - 4, 2, 8);
    }
  }

  const terrainTex = new THREE.CanvasTexture(terrainCanvas);
  terrainTex.wrapS = THREE.RepeatWrapping;
  terrainTex.wrapT = THREE.RepeatWrapping;
  terrainTex.repeat.set(36, 36);
  terrainTex.colorSpace = THREE.SRGBColorSpace;

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    roughness: 0.85,
    metalness: 0.2,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.y = 0;
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 2. Neon Race Gates
  const gateMeshes: THREE.Group[] = [];
  const gateRingMeshes: THREE.Mesh[] = [];

  RACE_TRACK_GATES.forEach((gate: RaceGate, idx: number) => {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(gate.position.x, gate.position.y, gate.position.z);
    gateGroup.rotation.y = gate.yaw;
    gateGroup.rotation.x = gate.pitch;

    // Glowing Torus Gate
    const ringGeo = new THREE.TorusGeometry(gate.radius, 0.45, 12, 32);
    const isStartFinish = idx === 0;
    const ringMat = new THREE.MeshStandardMaterial({
      color: isStartFinish ? 0x22c55e : 0x06b6d4,
      emissive: isStartFinish ? 0x22c55e : 0x06b6d4,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.7,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    gateGroup.add(ringMesh);
    gateRingMeshes.push(ringMesh);

    // Support pylons reaching down to ground
    const pylonHeight = Math.max(1, gate.position.y);
    const pylonGeo = new THREE.CylinderGeometry(0.3, 0.5, pylonHeight, 8);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.5 });

    [-gate.radius, gate.radius].forEach((offset) => {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(offset, -pylonHeight / 2, 0);
      gateGroup.add(pylon);
    });

    // Holographic chevron arrow in center indicating flight direction
    const arrowGeo = new THREE.ConeGeometry(1.2, 2.5, 4);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: isStartFinish ? 0x4ade80 : 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.set(0, gate.radius - 1.2, 0);
    gateGroup.add(arrowMesh);

    scene.add(gateGroup);
    gateMeshes.push(gateGroup);
  });

  // 3. Sci-Fi Wind Turbines
  const turbines: THREE.Group[] = [];
  const turbinePositions = [
    { x: -120, z: -100, scale: 1.2 },
    { x: 140, z: -80, scale: 1.4 },
    { x: 120, z: 160, scale: 1.1 },
    { x: -140, z: 120, scale: 1.3 },
  ];

  const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.8, emissive: 0x06b6d4, emissiveIntensity: 0.2 });

  turbinePositions.forEach((tp) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tp.x, 0, tp.z);
    tGroup.scale.setScalar(tp.scale);

    // Tower
    const towerGeo = new THREE.CylinderGeometry(1.2, 2.8, 65, 12);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 32.5;
    tGroup.add(tower);

    // Rotor Hub
    const hub = new THREE.Group();
    hub.position.set(0, 65, 1.2);

    const nacelleGeo = new THREE.CylinderGeometry(1.4, 1.4, 4.5, 12);
    nacelleGeo.rotateX(Math.PI / 2);
    const nacelle = new THREE.Mesh(nacelleGeo, towerMat);
    hub.add(nacelle);

    // 3 Blades
    const bladeGeo = new THREE.BoxGeometry(0.8, 26, 0.15);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 13;
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = (b * Math.PI * 2) / 3;
      bladeHolder.add(blade);
      hub.add(bladeHolder);
    }

    tGroup.add(hub);
    scene.add(tGroup);
    turbines.push(hub);
  });

  // 4. Sci-Fi Monolith Pillars & Arches
  const pillarGeo = new THREE.BoxGeometry(5, 50, 5);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
  const pillarAccentMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 });

  const archPositions = [
    { x: -50, z: 20 },
    { x: 50, z: -20 },
    { x: 0, z: 90 },
    { x: -70, z: 90 },
  ];

  archPositions.forEach((pos) => {
    const pillar1 = new THREE.Mesh(pillarGeo, pillarMat);
    pillar1.position.set(pos.x - 12, 25, pos.z);
    scene.add(pillar1);

    const pillar2 = new THREE.Mesh(pillarGeo, pillarMat);
    pillar2.position.set(pos.x + 12, 25, pos.z);
    scene.add(pillar2);

    // Cross beam arch
    const beamGeo = new THREE.BoxGeometry(28, 4, 6);
    const beam = new THREE.Mesh(beamGeo, pillarAccentMat);
    beam.position.set(pos.x, 48, pos.z);
    scene.add(beam);
  });

  // 5. Explore Mode Collectible Energy Orbs (25 placed across the world)
  const orbMeshes = new Map<number, THREE.Group>();
  const orbGeo = new THREE.IcosahedronGeometry(1.2, 2);
  const orbRingGeo = new THREE.TorusGeometry(2.0, 0.1, 8, 24);

  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.8,
  });

  const orbRingMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.9,
  });


  // Instantiate 3D meshes for explore mode energy orbs
  EXPLORE_ORBS.forEach((orbData) => {
    const orbGroup = new THREE.Group();
    orbGroup.position.set(orbData.position.x, orbData.position.y, orbData.position.z);

    const centerMesh = new THREE.Mesh(orbGeo, orbMat);
    orbGroup.add(centerMesh);

    const ring1 = new THREE.Mesh(orbRingGeo, orbRingMat);
    orbGroup.add(ring1);

    const ring2 = new THREE.Mesh(orbRingGeo, orbRingMat);
    ring2.rotation.x = Math.PI / 2;
    orbGroup.add(ring2);

    scene.add(orbGroup);
    orbMeshes.set(orbData.id, orbGroup);
  });

  // 6. Zero-GC Pooled Particle Ring Buffer
  const MAX_PARTICLES = 300;
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  const particleColors = new Float32Array(MAX_PARTICLES * 3);
  const particleVelocities: { x: number; y: number; z: number; life: number; maxLife: number }[] = [];

  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePositions[i * 3 + 0] = 0;
    particlePositions[i * 3 + 1] = -999;
    particlePositions[i * 3 + 2] = 0;
    particleColors[i * 3 + 0] = 1;
    particleColors[i * 3 + 1] = 1;
    particleColors[i * 3 + 2] = 1;
    particleVelocities.push({ x: 0, y: 0, z: 0, life: 0, maxLife: 1 });
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particleSystem = new THREE.Points(pGeo, pMat);
  scene.add(particleSystem);

  let particleHead = 0;

  const spawnParticles = (pos: THREE.Vector3, count: number, hexColor: number, speed = 8) => {
    const color = new THREE.Color(hexColor);
    for (let c = 0; c < count; c++) {
      const idx = particleHead;
      particleHead = (particleHead + 1) % MAX_PARTICLES;

      particlePositions[idx * 3 + 0] = pos.x;
      particlePositions[idx * 3 + 1] = pos.y;
      particlePositions[idx * 3 + 2] = pos.z;

      particleColors[idx * 3 + 0] = color.r;
      particleColors[idx * 3 + 1] = color.g;
      particleColors[idx * 3 + 2] = color.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const spd = (0.3 + Math.random() * 0.7) * speed;

      particleVelocities[idx].x = Math.cos(theta) * Math.cos(phi) * spd;
      particleVelocities[idx].y = Math.sin(phi) * spd;
      particleVelocities[idx].z = Math.sin(theta) * Math.cos(phi) * spd;
      particleVelocities[idx].life = 0;
      particleVelocities[idx].maxLife = 0.4 + Math.random() * 0.4;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  };

  // World Animation Loop
  let worldTime = 0;
  const updateWorld = (dt: number, activeGateIndex: number) => {
    worldTime += dt;

    // Spin wind turbines
    turbines.forEach((hub, i) => {
      hub.rotation.z += (1.2 + (i % 3) * 0.3) * dt;
    });

    // Animate Race Gates (Highlight current target gate)
    gateRingMeshes.forEach((mesh, idx) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (idx === activeGateIndex) {
        // High visibility bright pulse for current objective gate
        const pulse = 1.0 + Math.sin(worldTime * 8) * 0.5;
        mat.emissiveIntensity = 1.2 * pulse;
        mat.color.setHex(0xfacc15); // Golden yellow target
        mat.emissive.setHex(0xfacc15);
      } else if (idx === 0) {
        mat.emissiveIntensity = 0.8;
        mat.color.setHex(0x22c55e);
        mat.emissive.setHex(0x22c55e);
      } else {
        mat.emissiveIntensity = 0.45;
        mat.color.setHex(0x06b6d4);
        mat.emissive.setHex(0x06b6d4);
      }
    });

    // Spin Energy Orbs
    orbMeshes.forEach((group) => {
      group.rotation.y += 1.5 * dt;
      group.children[1].rotation.x += 2.0 * dt;
      group.children[2].rotation.y += 1.8 * dt;
    });

    // Update Particles
    let needsPosUpdate = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const pv = particleVelocities[i];
      if (pv.life < pv.maxLife) {
        pv.life += dt;
        particlePositions[i * 3 + 0] += pv.x * dt;
        particlePositions[i * 3 + 1] += pv.y * dt;
        particlePositions[i * 3 + 2] += pv.z * dt;
        needsPosUpdate = true;
      } else {
        particlePositions[i * 3 + 1] = -999;
      }
    }
    if (needsPosUpdate) {
      pGeo.attributes.position.needsUpdate = true;
    }
  };

  return { scene, gateMeshes, gateRingMeshes, orbMeshes, turbines, updateWorld, spawnParticles };
}
