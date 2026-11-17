import fs from 'node:fs';

const rep = (src, from, to) => {
  if (!src.includes(from)) {
    throw new Error('Missing anchor: ' + from.slice(0, 65));
  }
  return src.replace(from, to);
};

const edit = (file, marker, steps) => {
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes(marker)) return;
  for (const [from, to] of steps) {
    src = rep(src, from, to);
  }
  fs.writeFileSync(file, src, 'utf8');
};

// 1. src/types.ts
edit('src/types.ts', 'export type TargetPriority =', [
  [
    "export type TowerBranch = 'A' | 'B';",
    "export type TowerBranch = 'A' | 'B';\nexport type TargetPriority = 'first' | 'strongest' | 'weakest' | 'shielded';",
  ],
  [
    '  branch?: TowerBranch | null;\n  overdriveTimer?: number;',
    '  branch?: TowerBranch | null;\n  targetPriority?: TargetPriority;\n  overdriveTimer?: number;',
  ],
  [
    '    auraBoosted?: boolean;\n    t4BranchOptions?: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;',
    '    auraBoosted?: boolean;\n    targetPriority?: TargetPriority;\n    kills?: number;\n    totalDamage?: number;\n    t4BranchOptions?: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;',
  ],
  [
    '  activeComboCount: number;',
    '  activeComboCount: number;\n  nextWaveIntel?: { summary: string; tags: string[]; hasBoss: boolean; hasElite: boolean } | null;\n  mvpTowerSummary?: string | null;',
  ],
]);

// 2. src/render/ToonMaterials.ts & BeaconAndPropsFactory.ts (Holographic 36-tick Radar Range Disc)
edit('src/render/ToonMaterials.ts', 'rangeDisc:', [
  [
    '  shadowBlob: THREE.CanvasTexture;\n}',
    '  shadowBlob: THREE.CanvasTexture;\n  rangeDisc: THREE.CanvasTexture;\n}',
  ],
  [
    'export function getToonTextures(): SharedToonTextures {',
    `function makeRangeDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(256, 256, 24, 256, 256, 248);
  g.addColorStop(0, 'rgba(255,255,255,0.02)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.95, 'rgba(255,255,255,0.24)');
  g.addColorStop(0.98, 'rgba(255,255,255,0.96)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(256, 256, 186, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.68)';
  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI * 2) / 36;
    const r0 = i % 9 === 0 ? 222 : 234;
    ctx.lineWidth = i % 9 === 0 ? 3.4 : 1.8;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
    ctx.lineTo(256 + Math.cos(a) * 245, 256 + Math.sin(a) * 245);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

export function getToonTextures(): SharedToonTextures {`,
  ],
  [
    '      shadowBlob: makeShadowBlobTexture(),',
    '      shadowBlob: makeShadowBlobTexture(),\n      rangeDisc: makeRangeDiscTexture(),',
  ],
]);

edit('src/render/BeaconAndPropsFactory.ts', 'tex.rangeDisc', [
  [
    `  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.965, 1.0, 64),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    })
  );`,
    `  const rangeRing = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 64),
    new THREE.MeshBasicMaterial({
      map: tex.rangeDisc,
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    })
  );`,
  ],
]);

// 3. src/render/EnemyFactory.ts (Treaded wheels, bulldozer plows, plasma thrusters, swarm mandibles/hover jets, hex shield lattice, Boss furnace stacks)
edit('src/render/EnemyFactory.ts', 'attachTireTreads', [
  [
    'export function createEnemyRig(type: EnemyType): EnemyRig {',
    `function attachTireTreads(wGrp: THREE.Group, r: number, w: number, lugMat: THREE.Material, hubMat: THREE.Material): void {
  for (let t = 0; t < 6; t++) {
    const a = (t * Math.PI * 2) / 6;
    const cleat = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.036, 0.045), lugMat);
    cleat.position.set(0, Math.cos(a) * r, Math.sin(a) * r);
    cleat.rotation.x = -a;
    wGrp.add(cleat);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.48, w * 1.12, 8), hubMat);
  cap.rotation.z = Math.PI / 2;
  wGrp.add(cap);
}

function addPlasmaThrusters(parent: THREE.Object3D, xs: number[], y: number, z: number, r: number, bodyMat: THREE.Material, glowHex: number): void {
  const bellGeo = new THREE.CylinderGeometry(r * 0.72, r, r * 1.6, 10);
  bellGeo.rotateX(Math.PI / 2);
  const plumeGeo = new THREE.ConeGeometry(r * 0.64, r * 2.4, 8);
  plumeGeo.rotateX(-Math.PI / 2);
  const plumeMat = new THREE.MeshBasicMaterial({ color: glowHex, transparent: true, opacity: 0.88, depthWrite: false });
  for (const x of xs) {
    const bell = new THREE.Mesh(bellGeo, bodyMat);
    bell.position.set(x, y, z);
    parent.add(bell);
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(x, y, z - r * 1.45);
    plume.layers.set(1);
    parent.add(plume);
  }
}

export function createEnemyRig(type: EnemyType): EnemyRig {`,
  ],
  [
    '    // Antenna & rear battery pack',
    `    const plow = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.14, 0.14, 2, 0.03), hazardYellowMat);
    plow.position.set(0, 0.16, 0.44);
    plow.rotation.x = 0.28;
    bodyGroup.add(plow);
    addPlasmaThrusters(bodyGroup, [-0.18, 0.18], 0.34, -0.42, 0.085, darkGreyMat, 0xff6b2b);
    // Antenna & rear battery pack`,
  ],
  [
    '        const spoke = new THREE.Mesh(hubGeo, darkGreyMat);\n        wGrp.add(spoke);',
    '        const spoke = new THREE.Mesh(hubGeo, darkGreyMat);\n        wGrp.add(spoke);\n        attachTireTreads(wGrp, 0.18, 0.14, darkGreyMat, hazardYellowMat);',
  ],
  [
    '    const sensorVisor = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.09, 0.1, 2, 0.02), sensorMat);',
    `    for (const mx of [-0.16, 0.16]) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), hazardYellowMat);
      fang.rotation.x = Math.PI / 2;
      fang.position.set(mx, -0.04, 0.42);
      bodyGroup.add(fang);
    }
    const tailFin = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.22, 0.24, 2, 0.02), darkGreyMat);
    tailFin.position.set(0, 0.16, -0.28);
    bodyGroup.add(tailFin);
    const sensorVisor = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.09, 0.1, 2, 0.02), sensorMat);`,
  ],
  [
    '      rotor.add(b1, b2);\n      bodyGroup.add(rotor);',
    `      rotor.add(b1, b2);
      bodyGroup.add(rotor);
      const hoverJet = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, depthWrite: false }));
      hoverJet.rotation.x = Math.PI;
      hoverJet.position.set(sx * 0.44, -0.12, 0);
      hoverJet.layers.set(1);
      bodyGroup.add(hoverJet);`,
  ],
  [
    '    const upperCarapace = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.34, 0.82, 3, 0.07), rustMat);',
    `    addPlasmaThrusters(bodyGroup, [-0.24, 0.24], 0.42, -0.54, 0.11, chassisMat, 0xff5722);
    for (const sx of [-0.28, 0.28]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.38, 8), chassisMat);
      pipe.position.set(sx, 0.98, -0.28);
      pipe.rotation.x = -0.26;
      bodyGroup.add(pipe);
    }
    const upperCarapace = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.34, 0.82, 3, 0.07), rustMat);`,
  ],
  [
    '    const reactorCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), weakCoreMat);',
    '    addPlasmaThrusters(bodyGroup, [-0.48, 0.48], 0.88, -1.18, 0.18, chassisMat, 0xff4500);\n    const reactorCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), weakCoreMat);',
  ],
  [
    '    const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.44, 0.82, 3, 0.07), siegeMat);',
    '    addPlasmaThrusters(bodyGroup, [-0.5, 0.5], 0.9, -1.22, 0.19, chassisMat, 0xff3b30);\n    const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.44, 0.82, 3, 0.07), siegeMat);',
  ],
  [
    '    shieldDome.scale.set(1.05, 0.82, 1.18);\n    setLayerRecursive(shieldDome, 1);\n    bodyGroup.add(shieldDome);',
    `    shieldDome.scale.set(1.05, 0.82, 1.18);
    const hexWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.73, 1), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true, transparent: true, opacity: 0.45, depthWrite: false }));
    shieldDome.add(hexWire);
    addPlasmaThrusters(bodyGroup, [-0.24, 0.24], -0.02, -0.46, 0.09, chassisMat, 0x38bdf8);
    setLayerRecursive(shieldDome, 1);
    bodyGroup.add(shieldDome);`,
  ],
  [
    '        const tire = new THREE.Mesh(wheelGeo, chassisMat);\n        tire.rotation.z = Math.PI / 2;\n        tire.castShadow = true;\n        wGrp.add(tire);',
    '        const tire = new THREE.Mesh(wheelGeo, chassisMat);\n        tire.rotation.z = Math.PI / 2;\n        tire.castShadow = true;\n        wGrp.add(tire);\n        attachTireTreads(wGrp, 0.17, 0.14, darkGreyMat, hazardYellowMat);',
  ],
  [
    '        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 10), chassisMat);\n        tire.rotation.z = Math.PI / 2;\n        wGrp.add(tire);',
    '        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 10), chassisMat);\n        tire.rotation.z = Math.PI / 2;\n        wGrp.add(tire);\n        attachTireTreads(wGrp, 0.15, 0.12, darkGreyMat, hazardYellowMat);',
  ],
  [
    '    const bigEye = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), sensorMat);',
    '    addPlasmaThrusters(bodyGroup, [0], 0.28, -0.34, 0.1, chassisMat, 0xfbbf24);\n    const bigEye = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), sensorMat);',
  ],
  [
    '    shieldDome.position.set(0, 0.58, 0);\n    shieldDome.scale.set(0.95, 0.68, 1.18);\n    setLayerRecursive(shieldDome, 1);\n    bodyGroup.add(shieldDome);',
    `    shieldDome.position.set(0, 0.58, 0);
    shieldDome.scale.set(0.95, 0.68, 1.18);
    shieldDome.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.77, 1), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true, transparent: true, opacity: 0.38, depthWrite: false })));
    addPlasmaThrusters(bodyGroup, [-0.52, 0.52], 0.46, -1.32, 0.2, chassisMat, 0x38bdf8);
    setLayerRecursive(shieldDome, 1);
    bodyGroup.add(shieldDome);`,
  ],
  [
    '    arkCore.position.set(0, 1.72, -0.52);',
    '    addPlasmaThrusters(bodyGroup, [-0.58, 0, 0.58], 0.92, -1.32, 0.2, chassisMat, 0xff2a1a);\n    arkCore.position.set(0, 1.72, -0.52);',
  ],
]);

// 4. src/render/TowerFactory.ts (Slewing gear ring, reflex sight, ammo feed chutes, barrel cooling shrouds, mortar hydraulic recoil shocks, magnetic capacitors)
edit('src/render/TowerFactory.ts', 'slewGearRing', [
  [
    '  turntableRing.position.y = 0.28;\n  turntableRing.castShadow = true;\n  baseGroup.add(turntableRing);',
    `  turntableRing.position.y = 0.28;
  turntableRing.castShadow = true;
  baseGroup.add(turntableRing);
  const slewGearRing = createGearMesh(0.82, 0.055, 16, darkJointMat);
  slewGearRing.rotation.x = Math.PI / 2;
  slewGearRing.position.y = 0.255;
  baseGroup.add(slewGearRing);
  for (let c = 0; c < 4; c++) {
    const ca = (c * Math.PI) / 2 + Math.PI / 4;
    const cell = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.08, 0.18, 2, 0.02), tierTrimMat);
    cell.position.set(Math.cos(ca) * 0.88, 0.2, Math.sin(ca) * 0.88);
    cell.rotation.y = -ca;
    baseGroup.add(cell);
  }`,
  ],
  [
    '    // Starter side ammo boxes & rear cooling radiator fins',
    `    const sightFrame = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.16, 0.22, 2, 0.025), deepBlueMat);
    sightFrame.position.set(0, 0.34, 0.12);
    weaponPitch.add(sightFrame);
    const sightLens = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.09), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
    sightLens.position.set(0, 0.35, 0.235);
    sightLens.layers.set(1);
    weaponPitch.add(sightLens);
    // Starter side ammo boxes & rear cooling radiator fins`,
  ],
  [
    '      const ammoHazard = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.28, 2, 0.015), hazardMat);\n      ammoHazard.position.set(sx * 0.77, 0.38, -0.02);\n      turretYaw.add(ammoHazard);',
    `      const ammoHazard = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.28, 2, 0.015), hazardMat);
      ammoHazard.position.set(sx * 0.77, 0.38, -0.02);
      turretYaw.add(ammoHazard);
      const feedChute = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.1, 0.26, 2, 0.02), hazardMat);
      feedChute.position.set(sx * 0.48, 0.48, 0.08);
      feedChute.rotation.z = -sx * 0.32;
      turretYaw.add(feedChute);`,
  ],
  [
    '      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.16, 10), weaponAccentMat);\n      brake.rotation.x = Math.PI / 2;\n      brake.position.z = 0.64;\n      bGrp.add(brake);',
    `      for (const rz of [0.18, 0.32, 0.46]) {
        const coolRing = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.018, 6, 12), creamMat);
        coolRing.position.z = rz;
        bGrp.add(coolRing);
      }
      const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 6), rivetMat);
      gasTube.rotation.x = Math.PI / 2;
      gasTube.position.set(0, 0.095, 0.34);
      bGrp.add(gasTube);
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.105, 0.17, 10), weaponAccentMat);
      brake.rotation.x = Math.PI / 2;
      brake.position.z = 0.64;
      bGrp.add(brake);`,
  ],
  [
    '    const boreRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 10, 20), weaponAccentMat);',
    `    for (const sx of [-0.34, 0.34]) {
      const shockCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.56, 8), darkJointMat);
      shockCyl.rotation.x = Math.PI / 2;
      shockCyl.position.set(sx, -0.08, 0.24);
      tubeGrp.add(shockCyl);
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.36, 8), rivetMat);
      piston.rotation.x = Math.PI / 2;
      piston.position.set(sx, -0.08, 0.56);
      tubeGrp.add(piston);
    }
    const accelCoil = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.026, 8, 18), weaponAccentMat);
    accelCoil.position.z = 0.42;
    tubeGrp.add(accelCoil);
    const optPod = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.28, 2, 0.03), creamMat);
    optPod.position.set(0.66, 0.5, 0.14);
    turretYaw.add(optPod);
    const optLens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), weaponAccentMat);
    optLens.rotation.x = Math.PI / 2;
    optLens.position.set(0.66, 0.5, 0.29);
    turretYaw.add(optLens);
    const boreRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 10, 20), weaponAccentMat);`,
  ],
  [
    '      pylon.position.set(Math.cos(ang) * 0.48, 0, Math.sin(ang) * 0.48);\n      pylon.rotation.y = -ang + Math.PI / 2;\n      turretYaw.add(pylon);',
    `      const coilCollar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 6, 12), weaponAccentMat);
      coilCollar.rotation.x = Math.PI / 2;
      coilCollar.position.set(0, 0.52, -0.04);
      pylon.add(coilCollar);
      pylon.position.set(Math.cos(ang) * 0.48, 0, Math.sin(ang) * 0.48);
      pylon.rotation.y = -ang + Math.PI / 2;
      turretYaw.add(pylon);
      const capAng = ang + Math.PI / 3;
      const capCan = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.32, 10), deepBlueMat);
      capCan.position.set(Math.cos(capAng) * 0.52, 0.2, Math.sin(capAng) * 0.52);
      turretYaw.add(capCan);
      const capGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8), weaponAccentMat);
      capGlow.position.set(Math.cos(capAng) * 0.52, 0.39, Math.sin(capAng) * 0.52);
      turretYaw.add(capGlow);`,
  ],
]);

// 5. src/fx/VfxManager.ts (Spinning brass shell casings, hemispherical mortar blast domes, in-flight contrails, railgun Mach rings, shield crystal shards)
edit('src/fx/VfxManager.ts', 'brassCasingGeo', [
  [
    '  private debrisGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);',
    `  private debrisGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);
  private brassCasingGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.11, 6);
  private brassCasingMat = makeToonMaterial(0xfbbf24, { emissive: 0xd97706, emissiveIntensity: 0.35, metallicStep: true });
  private shieldShardGeo = new THREE.OctahedronGeometry(0.09, 0);
  private shieldShardMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 });`,
  ],
  [
    '    this.tracers.push({ mesh, mat, life: 0, maxLife: 0.085, maxOpacity: 0.95 });\n  }',
    `    this.tracers.push({ mesh, mat, life: 0, maxLife: 0.085, maxOpacity: 0.95 });
    this.spawnFlashBall(to, 0xfef08a, 0.18, 0.065);
    this.spawnGroundRing(new THREE.Vector3(to.x, 0.09, to.z), 0xffbe3b, 0.12, 0.58, 0.14, 0.55);
    if (this.debris3D.length < 42) {
      const shell = new THREE.Mesh(this.brassCasingGeo, this.brassCasingMat);
      shell.position.copy(from);
      const dir = to.clone().sub(from).normalize();
      const sideX = -dir.z * (Math.random() > 0.5 ? 1 : -1);
      const sideZ = dir.x * (Math.random() > 0.5 ? 1 : -1);
      this.solidScene.add(shell);
      this.debris3D.push({
        mesh: shell,
        vel: new THREE.Vector3(sideX * (1.8 + Math.random()), 2.4 + Math.random() * 1.1, sideZ * (1.8 + Math.random())),
        rotVel: new THREE.Vector3(14, 11, 18),
        life: 0,
        maxLife: 0.46,
      });
    }
  }`,
  ],
  [
    '  public spawnMortarImpact(x: number, z: number, radius: number): void {\n    const pos = new THREE.Vector3(x, 0.08, z);\n    this.spawnGroundRing(pos, 0x22d3ee, 0.35, radius * 2.05, 0.36);\n    this.spawnFlashBall(new THREE.Vector3(x, 0.35, z), 0x67e8f9, radius * 0.72, 0.18);',
    `  public spawnMortarImpact(x: number, z: number, radius: number): void {
    const pos = new THREE.Vector3(x, 0.08, z);
    this.spawnGroundRing(pos, 0x22d3ee, 0.35, radius * 2.15, 0.38);
    this.spawnGroundRing(pos, 0xe0f2fe, 0.2, radius * 1.35, 0.24, 0.85);
    this.spawnFlashBall(new THREE.Vector3(x, 0.35, z), 0x67e8f9, radius * 0.78, 0.2);
    const domeGeo = new THREE.SphereGeometry(radius * 0.76, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(x, 0.06, z);
    this.vfxScene.add(dome);
    this.tracers.push({ mesh: dome, mat: domeMat, life: 0, maxLife: 0.24, maxOpacity: 0.62 });
    this.spawnLunarDustRing(new THREE.Vector3(x, 0.06, z), 8, radius * 0.7);`,
  ],
  [
    '    this.tracers.push({ mesh: ring, mat: ringMat, life: 0, maxLife: 0.14, maxOpacity: 0.82 });\n  }',
    `    this.tracers.push({ mesh: ring, mat: ringMat, life: 0, maxLife: 0.14, maxOpacity: 0.82 });
    for (const frac of [0.42, 0.72]) {
      const mGeo = new THREE.TorusGeometry(0.28, 0.028, 6, 16);
      const mMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.78, depthWrite: false });
      const mRing = new THREE.Mesh(mGeo, mMat);
      mRing.position.copy(from).lerp(to, frac);
      mRing.lookAt(to);
      this.vfxScene.add(mRing);
      this.tracers.push({ mesh: mRing, mat: mMat, life: 0, maxLife: 0.18, maxOpacity: 0.78 });
    }
    this.spawnGroundRing(new THREE.Vector3(to.x, 0.1, to.z), 0x38bdf8, 0.25, 1.65, 0.22, 0.82);
  }`,
  ],
  [
    '    this.spawnFlashBall(hit, 0xfde047, 0.28, 0.12);',
    '    this.spawnFlashBall(hit, 0xfde047, 0.38, 0.14);\n    this.spawnGroundRing(new THREE.Vector3(hit.x, 0.1, hit.z), 0xfde047, 0.2, 1.45, 0.2, 0.88);',
  ],
  [
    '    this.spawnFlashBall(center, 0x67e8f9, 0.32, 0.13);',
    `    this.spawnFlashBall(center, 0x67e8f9, 0.42, 0.15);
    for (let sIdx = 0; sIdx < 5 && this.debris3D.length < 48; sIdx++) {
      const sa = (sIdx / 5) * Math.PI * 2;
      const shard = new THREE.Mesh(this.shieldShardGeo, this.shieldShardMat);
      shard.position.copy(center);
      this.solidScene.add(shard);
      this.debris3D.push({
        mesh: shard,
        vel: new THREE.Vector3(Math.cos(sa) * 2.6, 2.2 + Math.random(), Math.sin(sa) * 2.6),
        rotVel: new THREE.Vector3(10, 14, 9),
        life: 0,
        maxLife: 0.38,
      });
    }`,
  ],
  [
    '        s.group.position.lerpVectors(s.start, s.end, u);\n        s.group.position.y += 4 * s.arcHeight * u * (1 - u);',
    `        s.group.position.lerpVectors(s.start, s.end, u);
        s.group.position.y += 4 * s.arcHeight * u * (1 - u);
        if (this.sparks.length < 90 && Math.random() < 0.65) {
          this.spawnSpark(
            s.group.position.clone(),
            new THREE.Vector3((Math.random() - 0.5) * 0.5, -0.3, (Math.random() - 0.5) * 0.5),
            s.orientAlongVelocity ? 0xfbbf24 : 0x67e8f9,
            0.18,
            0.8
          );
        }`,
  ],
  [
    '    this.debrisGeo.dispose();',
    '    this.debrisGeo.dispose();\n    this.brassCasingGeo.dispose();\n    this.brassCasingMat.dispose();\n    this.shieldShardGeo.dispose();\n    this.shieldShardMat.dispose();',
  ],
]);

// 6. src/game/GameEngine.ts (Targeting priority, squash-jolt, floating damage callouts, wave intel, codex discovery, MVP summary)
edit('src/game/GameEngine.ts', 'cycleSelectedTowerPriority', [
  [
    'import type {\n  CommanderSkillId,',
    'import type {\n  CommanderSkillId,\n  TargetPriority,',
  ],
  [
    '  public sellSelectedTower(): boolean {',
    `  public cycleSelectedTowerPriority(): TargetPriority | null {
    if (this.mode !== 'playing' || !this.selectedPadId) return null;
    const tower = this.towers.get(this.selectedPadId);
    if (!tower) return null;
    const order: TargetPriority[] = ['first', 'strongest', 'weakest', 'shielded'];
    const cur = tower.targetPriority ?? 'first';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    tower.targetPriority = next;
    tower.targetEnemyId = null;
    this.audio.playUiClick();
    this.emitSnapshot();
    return next;
  }

  public sellSelectedTower(): boolean {`,
  ],
  [
    '      const s = sampleLaneAtDistance(lane, e.distanceTraveled);',
    `      if (e.isBoss && e.hp > 0 && e.hp < e.maxHp * 0.48 && Math.random() < dt * 3.2) {
        this.vfx.spawnHitSparks(e.worldPos.clone().setY(1.15), true);
      }
      const baseSc = ENEMY_BLUEPRINTS[e.type].scale;
      const jolt = e.hitRecoil * 0.11;
      e.rig.bodyGroup.scale.set(baseSc * (1 + jolt), baseSc * (1 - jolt * 0.85), baseSc * (1 + jolt));
      const s = sampleLaneAtDistance(lane, e.distanceTraveled);`,
  ],
  [
    '      let target = this.findValidTarget(tower.targetEnemyId, tower.worldPos, stats.range);\n      if (!target) {\n        target = this.acquireBestTarget(tower.worldPos, stats.range);\n        tower.targetEnemyId = target ? target.id : null;\n      }',
    `      const prio: TargetPriority = tower.targetPriority ?? 'first';
      let target = prio === 'first' ? this.findValidTarget(tower.targetEnemyId, tower.worldPos, stats.range) : null;
      if (!target) {
        target = this.acquireBestTarget(tower.worldPos, stats.range, prio);
        tower.targetEnemyId = target ? target.id : null;
      }`,
  ],
  [
    `  private acquireBestTarget(origin: THREE.Vector3, range: number): EnemyInstance | null {
    let best: EnemyInstance | null = null;
    let bestRemainingDist = Infinity;

    for (const e of this.enemies) {
      if (e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.worldPos.x - origin.x, e.worldPos.z - origin.z);
      if (d <= range + (e.isBoss ? 0.65 : 0.15)) {
        const laneLen = this.compiledLanes[e.laneIndex]?.totalLength ?? 1;
        const remainingDist = Math.max(0, laneLen - e.distanceTraveled);
        if (remainingDist < bestRemainingDist) {
          bestRemainingDist = remainingDist;
          best = e;
        }
      }
    }
    return best;
  }`,
    `  private acquireBestTarget(origin: THREE.Vector3, range: number, priority: TargetPriority = 'first'): EnemyInstance | null {
    let best: EnemyInstance | null = null;
    let bestScore = -Infinity;

    for (const e of this.enemies) {
      if (e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.worldPos.x - origin.x, e.worldPos.z - origin.z);
      if (d <= range + (e.isBoss ? 0.65 : 0.15)) {
        const laneLen = this.compiledLanes[e.laneIndex]?.totalLength ?? 1;
        const progressScore = -Math.max(0, laneLen - e.distanceTraveled);
        let score = progressScore;
        if (priority === 'strongest') {
          score = e.hp + e.shieldHp * 1.2 + e.armor * 400 + (e.isBoss ? 5000 : 0) + progressScore * 0.01;
        } else if (priority === 'weakest') {
          score = -(e.hp + e.shieldHp) + progressScore * 0.05;
        } else if (priority === 'shielded') {
          score = (e.shieldHp > 0 ? 10000 + e.shieldHp : 0) + (e.fluxTimer <= 0 ? 500 : 0) + progressScore;
        }
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
    }
    return best;
  }`,
  ],
  [
    '        this.vfx.spawnShieldBreak(enemy.worldPos);\n        this.audio.playShieldBreak();',
    `        this.vfx.spawnShieldBreak(enemy.worldPos);
        this.audio.playShieldBreak();
        const sbPt = this.projectWorldToScreen(enemy.worldPos);
        this.callbacks.onComboCallout?.(sbPt.x, sbPt.y - 28, '🛡护盾击碎!', '#38BDF8', 1);`,
  ],
  [
    '    enemy.hitFlashTimer = 0.085;\n    enemy.hitRecoil = 1.0;',
    `    enemy.hitFlashTimer = 0.085;
    enemy.hitRecoil = 1.0;
    if (finalDamage >= 65 || (sourceTower && sourceTower.type === 'mortar')) {
      const lastPop = (enemy as unknown as { _lastDmgPop?: number })._lastDmgPop ?? -10;
      if (this.combatSimElapsed - lastPop >= 0.16) {
        (enemy as unknown as { _lastDmgPop?: number })._lastDmgPop = this.combatSimElapsed;
        const dPt = this.projectWorldToScreen(enemy.worldPos);
        const jitterX = ((enemy.hp % 7) - 3) * 5;
        const isBig = finalDamage >= 130;
        this.callbacks.onComboCallout?.(
          dPt.x + jitterX,
          dPt.y - 20,
          isBig ? \`💥-\${finalDamage}\` : \`-\${finalDamage}\`,
          isBig ? '#FDE047' : '#F8FAFC',
          1
        );
      }
    }`,
  ],
  [
    '    this.audio.playMortarImpact();',
    '    this.audio.playMortarImpact();\n    this.cinematics.addCameraShake(0.042);',
  ],
  [
    '    this.enemies.push(inst);',
    '    this.progression.discoverCodex(type);\n    this.enemies.push(inst);',
  ],
  [
    '          overdriven: (tw.overdriveTimer ?? 0) > 0,\n          auraBoosted: (tw.auraHasteBonus ?? 0) > 0,\n          t4BranchOptions: selectedTowerBranchOptions,',
    `          overdriven: (tw.overdriveTimer ?? 0) > 0,
          auraBoosted: (tw.auraHasteBonus ?? 0) > 0,
          targetPriority: tw.targetPriority ?? 'first',
          kills: tw.kills,
          totalDamage: tw.totalDamage,
          t4BranchOptions: selectedTowerBranchOptions,`,
  ],
  [
    '    return {\n      mode: this.mode,',
    `    let nextWaveIntel: UISnapshot['nextWaveIntel'] = null;
    if (!this.waveInProgress) {
      const nw = this.getActiveWaveConfig();
      if (nw) {
        const counts = new Map<EnemyType, number>();
        for (const g of nw.groups) {
          counts.set(g.enemyType, (counts.get(g.enemyType) ?? 0) + g.count);
        }
        const parts: string[] = [];
        const tagSet = new Set<string>();
        for (const [et, cnt] of counts.entries()) {
          const ebp = ENEMY_BLUEPRINTS[et];
          parts.push(\`\${ebp.name}×\${cnt}\`);
          if (ebp.isFlying) tagSet.add('✈空军');
          if ((ebp.maxShield ?? 0) > 0) tagSet.add('🛡护盾');
          if (ebp.armor >= 0.3) tagSet.add('🪨重甲');
          if (et === 'splitter_rover') tagSet.add('🧬裂殖');
          if (et === 'repair_drone') tagSet.add('🔧维修');
          if (ebp.isBoss) tagSet.add('☠首领');
        }
        nextWaveIntel = {
          summary: parts.slice(0, 3).join(' · ') + (parts.length > 3 ? ' 等' : ''),
          tags: [...tagSet],
          hasBoss: nw.hasBoss,
          hasElite: nw.hasElite,
        };
      }
    }

    let mvpTowerSummary: string | null = null;
    let bestDmg = -1;
    for (const t of this.towers.values()) {
      if (t.totalDamage > bestDmg) {
        bestDmg = t.totalDamage;
        const bp = TOWER_BLUEPRINTS[t.type];
        const nm = t.tier === 4 && t.branch ? bp.branches[t.branch].name : bp.name;
        mvpTowerSummary = \`\${nm}（击杀 \${t.kills} · 总伤 \${t.totalDamage}）\`;
      }
    }

    return {
      mode: this.mode,
      nextWaveIntel,
      mvpTowerSummary,`,
  ],
]);

// 7. src/ui/UIManager.ts (Priority button, kills/damage telemetry, wave intel bar, hotkeys, MVP plaque)
edit('src/ui/UIManager.ts', 'btn-target-priority', [
  [
    "  TowerType,\n  UISnapshot,\n} from '../types';",
    `  TargetPriority,
  TowerType,
  UISnapshot,
} from '../types';

const PRIORITY_LABELS: Record<TargetPriority, string> = {
  first: '🎯最前',
  strongest: '🛡高血',
  weakest: '⚡残血',
  shielded: '💠破盾',
};`,
  ],
  [
    `    const k = ev.key.toLowerCase();
    if (k === '1' || k === 'q') {
      this.engine.activateCommanderSkill('orbital_strike');
    } else if (k === '2' || k === 'w') {
      this.engine.activateCommanderSkill('emp_overdrive');
    } else if (k === '3' || k === 'e') {
      this.engine.activateCommanderSkill('nano_repair');
    }`,
    `    const k = ev.key.toLowerCase();
    if (k === '1' || k === 'q') {
      this.engine.activateCommanderSkill('orbital_strike');
    } else if (k === '2' || k === 'w') {
      this.engine.activateCommanderSkill('emp_overdrive');
    } else if (k === '3' || k === 'e') {
      this.engine.activateCommanderSkill('nano_repair');
    } else if (ev.code === 'Space') {
      ev.preventDefault();
      const snap = this.engine.getSnapshot();
      if (snap.mode === 'playing' && !snap.waveInProgress) {
        this.engine.startNextWave();
      } else if (snap.mode === 'playing') {
        this.engine.toggleSpeed();
      }
    } else if (k === 't') {
      this.engine.cycleSelectedTowerPriority();
    } else if (k === 'u') {
      this.engine.upgradeSelectedTower('A');
    } else if (k === 'b') {
      const snap = this.engine.getSnapshot();
      if (snap.selectedTower?.tier === 3) {
        this.engine.upgradeSelectedTower('B');
      }
    } else if (k === 'x') {
      this.engine.sellSelectedTower();
    } else if (k === 'p') {
      this.engine.togglePause();
    } else if (k === 'h') {
      if (this.hubOpen) this.closeHub();
      else this.openHub('campaign');
    }`,
  ],
  [
    '    this.comboFloatLayer.appendChild(chip);',
    `    while (this.comboFloatLayer.children.length >= 16) {
      this.comboFloatLayer.firstElementChild?.remove();
    }
    if (text.startsWith('-') || text.startsWith('💥-')) {
      chip.classList.add('dmg-num-tag');
    }
    this.comboFloatLayer.appendChild(chip);`,
  ],
  [
    "      const nextBtnSig = `wave_${snap.stageId}_${snap.waveNumber}_${snap.isEndless ? 'inf' : snap.totalWaves}`;",
    "      const intelSummary = snap.nextWaveIntel?.summary ?? '';\n      const nextBtnSig = `wave_${snap.stageId}_${snap.waveNumber}_${snap.isEndless ? 'inf' : snap.totalWaves}_${intelSummary}`;",
  ],
  [
    `        this.nextWaveWrap.innerHTML = \`
          <button class="enamel-cta-btn wave-start" id="btn-start-wave" type="button">
            \${label}
          </button>
        \`;`,
    `        const intel = snap.nextWaveIntel;
        const intelTagsHtml = intel && intel.tags.length > 0
          ? intel.tags.map((tg) => \`<em class="wave-intel-tag">\${tg}</em>\`).join('')
          : '';
        const intelHtml = intel
          ? \`<div class="wave-intel-bar \${intel.hasBoss ? 'boss-warn' : ''}" id="wave-intel-bar" title="下一波来袭敌械情报（快捷键 Space 出击）"><span class="wave-intel-text">📡 下波：\${intel.summary}</span>\${intelTagsHtml}</div>\`
          : '';
        this.nextWaveWrap.innerHTML = \`
          <div class="next-wave-pack">
            \${intelHtml}
            <button class="enamel-cta-btn wave-start" id="btn-start-wave" type="button" title="快捷键 [Space] 开始波次">
              \${label}
            </button>
          </div>
        \`;`,
  ],
  [
    "      const sig = `inspect:${tw.id}:t${tw.tier}:br${tw.branch ?? '0'}:dmg${tw.damage}:rng${tw.range.toFixed(1)}:hg${Boolean(tw.isHighGround)}:afford${canAffordUpgrade}:cost${tw.upgradeCost}:brAf${brAffordKey}:stun${tw.isStunned}:od${Boolean(tw.overdriven)}:au${Boolean(tw.auraBoosted)}`;",
    "      const prioKey = tw.targetPriority ?? 'first';\n      const kCount = tw.kills ?? 0;\n      const dTotal = tw.totalDamage ?? 0;\n      const dCompact = dTotal >= 1000 ? `${(dTotal / 1000).toFixed(1)}k` : String(dTotal);\n      const sig = `inspect:${tw.id}:t${tw.tier}:br${tw.branch ?? '0'}:pr${prioKey}:k${kCount}:d${Math.floor(dTotal / 25)}:dmg${tw.damage}:rng${tw.range.toFixed(1)}:hg${Boolean(tw.isHighGround)}:afford${canAffordUpgrade}:cost${tw.upgradeCost}:brAf${brAffordKey}:stun${tw.isStunned}:od${Boolean(tw.overdriven)}:au${Boolean(tw.auraBoosted)}`;",
  ],
  [
    `              <div class="sheet-head-actions">
                <button class="enamel-sell-btn compact-sell-pill" id="btn-sell-tower" type="button">`,
    `            <div class="sheet-head-actions">
              <span class="tower-record-chip" title="本塔累计战绩">⚔\${kCount} · 💥\${dCompact}</span>
              \${tw.type !== 'magnetic' ? \`<button class="prio-cycle-btn" id="btn-target-priority" type="button" title="切换索敌策略 [T]">\${PRIORITY_LABELS[prioKey]}</button>\` : ''}
              <button class="enamel-sell-btn compact-sell-pill" id="btn-sell-tower" type="button">`,
  ],
  [
    "        this.trayHost\n          .querySelector('#btn-sell-tower')!\n          .addEventListener('click', () => this.engine.sellSelectedTower());\n        this.trayHost\n          .querySelector('#btn-upgrade-tower')!",
    `        this.trayHost
          .querySelector('#btn-sell-tower')!
          .addEventListener('click', () => this.engine.sellSelectedTower());
        this.trayHost
          .querySelector('#btn-target-priority')
          ?.addEventListener('click', () => this.engine.cycleSelectedTowerPriority());
        this.trayHost
          .querySelector('#btn-upgrade-tower')!`,
  ],
  [
    '            <button class="sheet-close-btn" id="btn-close-sheet" type="button" aria-label="关闭面板">✕</button>\n          </div>',
    `            <div class="sheet-head-actions">
              <span class="tower-record-chip" title="本塔累计击杀与总伤害">击杀 \${kCount} · 总伤 \${dCompact}</span>
              \${tw.type !== 'magnetic' ? \`<button class="prio-cycle-btn" id="btn-target-priority" type="button" title="切换索敌策略 [快捷键 T]">\${PRIORITY_LABELS[prioKey]}</button>\` : ''}
              <button class="sheet-close-btn" id="btn-close-sheet" type="button" aria-label="关闭面板">✕</button>
            </div>
          </div>`,
  ],
  [
    "      const upBtn = this.trayHost.querySelector('#btn-upgrade-tower');",
    `      this.trayHost
        .querySelector('#btn-target-priority')
        ?.addEventListener('click', () => this.engine.cycleSelectedTowerPriority());
      const upBtn = this.trayHost.querySelector('#btn-upgrade-tower');`,
  ],
  [
    '          <div class="victory-stats-grid">',
    `          \${snap.mvpTowerSummary ? \`<div class="mvp-tower-banner">🏆 王牌机甲：<strong>\${snap.mvpTowerSummary}</strong></div>\` : ''}
          <div class="victory-stats-grid">`,
  ],
]);

// 8. src/style.css
{
  const css = fs.readFileSync('src/style.css', 'utf8');
  if (!css.includes('.wave-intel-bar')) {
    fs.writeFileSync(
      'src/style.css',
      css +
        `\n/* V3 Deep Combat Feedback & Tactical Completeness */
.next-wave-pack { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.wave-intel-bar { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 11px; background: linear-gradient(170deg, rgba(22,32,58,0.95) 0%, rgba(14,20,38,0.95) 100%); border: 2px solid var(--outline-dark); box-shadow: var(--bevel-plate); font-size: 11.5px; font-weight: 800; color: #e2e8f0; max-width: 390px; }
.wave-intel-bar.boss-warn { border-color: #fb7185; box-shadow: var(--bevel-plate), 0 0 14px rgba(251,113,133,0.35); }
.wave-intel-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wave-intel-tag { font-style: normal; padding: 1px 5px; border-radius: 5px; background: rgba(56,189,248,0.18); border: 1px solid rgba(56,189,248,0.48); color: #7dd3fc; font-size: 10.5px; font-weight: 900; white-space: nowrap; }
.prio-cycle-btn { height: 26px; padding: 0 9px; border-radius: 8px; background: linear-gradient(170deg, #334978 0%, #1f2e4d 100%); border: 1.8px solid rgba(103,232,249,0.72); color: #e0f2fe; font-size: 11.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.prio-cycle-btn:hover { filter: brightness(1.14); }
.tower-record-chip { padding: 2px 7px; border-radius: 7px; background: rgba(15,23,42,0.72); border: 1.5px solid rgba(251,191,36,0.42); color: #fde68a; font-size: 11px; font-weight: 800; white-space: nowrap; }
.combo-float-tag.dmg-num-tag { padding: 1px 6px; font-family: var(--font-heavy); font-size: 13px; background: rgba(15,23,42,0.82); border-width: 1.5px; text-shadow: 0 1.5px 0 #1a1033; }
.mvp-tower-banner { padding: 5px 10px; border-radius: 9px; background: rgba(251,191,36,0.14); border: 1.5px solid rgba(251,191,36,0.48); color: #fef08a; font-size: 12px; text-align: center; }
@media (max-width: 640px) { .wave-intel-bar, .tower-record-chip { display: none; } }\n`,
      'utf8'
    );
  }
}

console.log('All strict V3 anchors verified & applied!');
