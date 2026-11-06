/**
 * Procedural 3D Drone Model Generator (Quadcopter).
 * Builds a high-fidelity 9-part composite THREE.Group:
 * 1. Aerodynamic carbon-fiber center fuselage
 * 2. 4 Tubular carbon diagonal motor arms
 * 3. 4 Aerodynamic circular rotor duct guards
 * 4. 4 Twin-blade spinning aerodynamic propellers (animated)
 * 5. Front tiltable FPV camera gimbal with optical lens
 * 6. High-intensity LED nav lights (front green/red, rear status)
 * 7. Vented battery pack module with cooling fins
 * 8. Dual lightweight landing skids underneath
 * 9. Soft grounded contact shadow disc
 */

import * as THREE from 'three';

/**
 * Creates a procedural carbon-fiber twill weave CanvasTexture.
 */
function createCarbonFiberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181a1d';
  ctx.fillRect(0, 0, 128, 128);

  const tileSize = 8;
  for (let y = 0; y < 128; y += tileSize) {
    for (let x = 0; x < 128; x += tileSize) {
      const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#24272c' : '#121316';
      ctx.fillRect(x, y, tileSize, tileSize);

      // Thread highlights
      ctx.fillStyle = isAlt ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x + 1, y + 1, tileSize - 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface DroneMeshHandles {
  root: THREE.Group;
  propellers: THREE.Mesh[];
  cameraGimbal: THREE.Group;
  navLights: THREE.Mesh[];
  shadowDisc: THREE.Mesh;
}

export function createProceduralDrone(
  colorHex: number = 0x06b6d4, // Main accent
  secondaryColorHex: number = 0x1e293b,
  isPlayer: boolean = true
): DroneMeshHandles {
  const root = new THREE.Group();
  root.name = isPlayer ? 'PlayerDrone' : 'AIDrone';

  const carbonTex = createCarbonFiberTexture();

  // 1. Materials
  const fuselageMat = new THREE.MeshStandardMaterial({
    map: carbonTex,
    color: 0x22262c,
    roughness: 0.35,
    metalness: 0.5,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.2,
    metalness: 0.8,
  });

  const armMat = new THREE.MeshStandardMaterial({
    color: secondaryColorHex,
    roughness: 0.6,
    metalness: 0.7,
  });

  const propMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.9,
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.05,
    metalness: 0.9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
  });

  const ledFrontLeftMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red port
  const ledFrontRightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Green starboard
  const ledRearMat = new THREE.MeshBasicMaterial({ color: colorHex }); // Status tail

  // 2. Primary Silhouette: Fuselage / Canopy
  const canopyGeo = new THREE.ConeGeometry(0.55, 1.4, 6);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1.0, 0.45, 1.0);
  const canopy = new THREE.Mesh(canopyGeo, fuselageMat);
  canopy.position.set(0, 0.12, 0);
  canopy.castShadow = true;
  root.add(canopy);

  // Top Aerodynamic Fin / Dorsal Spine
  const spineGeo = new THREE.BoxGeometry(0.08, 0.16, 0.9);
  const spine = new THREE.Mesh(spineGeo, accentMat);
  spine.position.set(0, 0.28, -0.05);
  root.add(spine);

  // 3. Battery Module with Heat Sink Fins
  const batteryGeo = new THREE.BoxGeometry(0.38, 0.22, 0.7);
  const batteryMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8, metalness: 0.2 });
  const battery = new THREE.Mesh(batteryGeo, batteryMat);
  battery.position.set(0, -0.08, -0.08);
  root.add(battery);

  // 4. Cross Arms (4 arms reaching out to rotors at 45 degree angles)
  const armLength = 1.05;
  const armRadius = 0.04;
  const armAngles = [
    Math.PI * 0.25,  // Front Right
    Math.PI * 0.75,  // Rear Right
    Math.PI * 1.25,  // Rear Left
    Math.PI * 1.75,  // Front Left
  ];

  const propellers: THREE.Mesh[] = [];
  const navLights: THREE.Mesh[] = [];

  armAngles.forEach((angle, i) => {
    const armGeo = new THREE.CylinderGeometry(armRadius, armRadius, armLength, 8);
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = angle;
    arm.position.set(
      Math.sin(angle) * (armLength * 0.45),
      0,
      Math.cos(angle) * (armLength * 0.45)
    );
    root.add(arm);

    // Motor Pod Housing
    const podX = Math.sin(angle) * armLength;
    const podZ = Math.cos(angle) * armLength;
    const motorPodGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12);
    const motorPod = new THREE.Mesh(motorPodGeo, accentMat);
    motorPod.position.set(podX, 0.02, podZ);
    root.add(motorPod);

    // Aerodynamic Circular Propeller Guard Duct
    const guardGeo = new THREE.TorusGeometry(0.42, 0.025, 8, 24);
    guardGeo.rotateX(Math.PI / 2);
    const guard = new THREE.Mesh(guardGeo, fuselageMat);
    guard.position.set(podX, 0.1, podZ);
    root.add(guard);

    // Twin-blade Propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(podX, 0.12, podZ);

    const bladeGeo = new THREE.BoxGeometry(0.74, 0.015, 0.07);
    const propMesh = new THREE.Mesh(bladeGeo, propMat);
    propGroup.add(propMesh);
    root.add(propGroup);
    propellers.push(propMesh);

    // Navigation LEDs on arm tips
    const ledGeo = new THREE.SphereGeometry(0.045, 8, 8);
    let lMat = ledRearMat;
    if (i === 0) lMat = ledFrontRightMat;
    if (i === 3) lMat = ledFrontLeftMat;
    const led = new THREE.Mesh(ledGeo, lMat);
    led.position.set(podX * 1.15, 0.02, podZ * 1.15);
    root.add(led);
    navLights.push(led);
  });

  // 5. Front FPV Camera Gimbal
  const cameraGimbal = new THREE.Group();
  cameraGimbal.position.set(0, 0.06, 0.65); // Front of drone

  const gimbalHousingGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const gimbalHousing = new THREE.Mesh(gimbalHousingGeo, accentMat);
  cameraGimbal.add(gimbalHousing);

  const lensGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12);
  lensGeo.rotateX(Math.PI / 2);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 0, 0.08);
  cameraGimbal.add(lens);
  root.add(cameraGimbal);

  // 6. Dual Landing Skids
  [-0.22, 0.22].forEach((xOffset) => {
    const skidGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6);
    skidGeo.rotateX(Math.PI / 2);
    const skid = new THREE.Mesh(skidGeo, armMat);
    skid.position.set(xOffset, -0.25, 0);
    root.add(skid);

    // Vertical skid struts
    [-0.2, 0.2].forEach((zOffset) => {
      const strutGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6);
      const strut = new THREE.Mesh(strutGeo, armMat);
      strut.position.set(xOffset, -0.16, zOffset);
      root.add(strut);
    });
  });

  // 7. Ground Contact Shadow Disc
  const shadowGeo = new THREE.CircleGeometry(0.9, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.set(0, -0.28, 0);
  root.add(shadowDisc);

  return { root, propellers, cameraGimbal, navLights, shadowDisc };
}
