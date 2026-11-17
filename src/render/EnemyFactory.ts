import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ENEMY_BLUEPRINTS } from '../config/gameConfig';
import type { EnemyRig, EnemyType } from '../types';
import { createGearMesh } from './TowerFactory';
import { getToonTextures, makeToonMaterial, PALETTE } from './ToonMaterials';

function setLayerRecursive(obj: THREE.Object3D, layer: number): void {
  obj.layers.set(layer);
  for (const child of obj.children) {
    setLayerRecursive(child, layer);
  }
}

function attachTireTreads(wGrp: THREE.Group, r: number, w: number, lugMat: THREE.Material, hubMat: THREE.Material): void {
  for (let t = 0; t < 6; t++) { const a = (t * Math.PI * 2) / 6; const cleat = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.036, 0.045), lugMat); cleat.position.set(0, Math.cos(a) * r, Math.sin(a) * r); cleat.rotation.x = -a; wGrp.add(cleat); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.48, w * 1.12, 8), hubMat); cap.rotation.z = Math.PI / 2; wGrp.add(cap);
}
function addPlasmaThrusters(parent: THREE.Object3D, xs: number[], y: number, z: number, r: number, bodyMat: THREE.Material, glowHex: number): void {
  const bellGeo = new THREE.CylinderGeometry(r * 0.72, r, r * 1.6, 10); bellGeo.rotateX(Math.PI / 2);
  const plumeGeo = new THREE.ConeGeometry(r * 0.64, r * 2.4, 8); plumeGeo.rotateX(-Math.PI / 2);
  const plumeMat = new THREE.MeshBasicMaterial({ color: glowHex, transparent: true, opacity: 0.88, depthWrite: false });
  for (const x of xs) { const bell = new THREE.Mesh(bellGeo, bodyMat); bell.position.set(x, y, z); parent.add(bell); const plume = new THREE.Mesh(plumeGeo, plumeMat); plume.position.set(x, y, z - r * 1.45); plume.layers.set(1); parent.add(plume); }
}
export function createEnemyRig(type: EnemyType): EnemyRig {
  const bp = ENEMY_BLUEPRINTS[type];
  const tex = getToonTextures();

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Per-enemy cloneable materials so hit-flash only flashes the struck enemy!
  const darkGreyMat = makeToonMaterial(PALETTE.ENEMY_DARK_GREY, { metallicStep: true });
  const chassisMat = makeToonMaterial(PALETTE.ENEMY_CHASSIS, { metallicStep: true });
  const rustMat = makeToonMaterial(
    bp.isElite ? PALETTE.ENEMY_RUST_BRIGHT : PALETTE.ENEMY_RUST_RED
  );
  const hazardYellowMat = makeToonMaterial(0xeab308);
  const sensorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ENEMY_SENSOR_RED,
    emissive: PALETTE.ENEMY_SENSOR_RED,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const hitFlashMaterials: THREE.Material[] = [darkGreyMat, rustMat];
  const wheelsOrRotors: THREE.Object3D[] = [];
  let drillHead: THREE.Object3D | null = null;
  let secondaryDrillHead: THREE.Object3D | null = null;
  let hydraulicArm: THREE.Group | null = null;
  let forearm: THREE.Group | null = null;
  let weakPointCore: THREE.Mesh | null = null;
  let shieldDome: THREE.Mesh | null = null;
  let supportHalo: THREE.Object3D | null = null;
  const armorPlates: THREE.Object3D[] = [];

  if (type === 'rover') {
    // ==================== 1. PATROL ROVER (普通巡检机) ====================
    const hull = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.42, 0.78, 3, 0.08), rustMat);
    hull.position.y = 0.36;
    hull.castShadow = true;
    bodyGroup.add(hull);

    const lowerPan = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.18, 0.72, 2, 0.04), chassisMat);
    lowerPan.position.y = 0.18;
    lowerPan.castShadow = true;
    bodyGroup.add(lowerPan);

    // Visor hood & glowing red cyclops optical sensor
    const hood = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.18, 0.24, 2, 0.04), darkGreyMat);
    hood.position.set(0, 0.44, 0.36);
    bodyGroup.add(hood);

    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 12), sensorMat);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(0, 0.42, 0.47);
    bodyGroup.add(eye);

    const plow = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.14, 0.14, 2, 0.03), hazardYellowMat); plow.position.set(0, 0.16, 0.44); plow.rotation.x = 0.28; bodyGroup.add(plow);
    addPlasmaThrusters(bodyGroup, [-0.18, 0.18], 0.34, -0.42, 0.085, darkGreyMat, 0xff6b2b);
    // Antenna & rear battery pack
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.32, 6), darkGreyMat);
    ant.position.set(0.18, 0.7, -0.2);
    bodyGroup.add(ant);

    // 4 Rugged rolling wheels
    const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 12);
    const hubGeo = new THREE.BoxGeometry(0.08, 0.24, 0.16);
    for (const sx of [-1, 1]) {
      for (const sz of [-0.24, 0.24]) {
        const wGrp = new THREE.Group();
        wGrp.position.set(sx * 0.38, 0.18, sz);
        const tire = new THREE.Mesh(wheelGeo, chassisMat); tire.rotation.z = Math.PI / 2; tire.castShadow = true; wGrp.add(tire);
        attachTireTreads(wGrp, 0.17, 0.14, darkGreyMat, hazardYellowMat);
        const spoke = new THREE.Mesh(hubGeo, darkGreyMat);
        wGrp.add(spoke);
        attachTireTreads(wGrp, 0.18, 0.14, darkGreyMat, hazardYellowMat);
        bodyGroup.add(wGrp);
        wheelsOrRotors.push(wGrp);
      }
    }
  } else if (type === 'swarm') {
    // ==================== 2. HAULER DRONE SWARM (低空运输蜂群) ====================
    bodyGroup.position.y = 0.86; // Low-altitude hover along road!

    const pod = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.28, 0.68, 3, 0.08), rustMat);
    pod.castShadow = true;
    bodyGroup.add(pod);

    // Underslung raw ore canister
    const cargo = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.2, 0.38, 2, 0.04), darkGreyMat);
    cargo.position.set(0, -0.22, -0.04);
    cargo.castShadow = true;
    bodyGroup.add(cargo);

    for (const mx of [-0.16, 0.16]) { const fang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), hazardYellowMat); fang.rotation.x = Math.PI / 2; fang.position.set(mx, -0.04, 0.42); bodyGroup.add(fang); }
    const tailFin = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.22, 0.24, 2, 0.02), darkGreyMat); tailFin.position.set(0, 0.16, -0.28); bodyGroup.add(tailFin);
    const sensorVisor = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.09, 0.1, 2, 0.02), sensorMat);
    sensorVisor.position.set(0, 0.02, 0.33);
    bodyGroup.add(sensorVisor);

    // Twin side ducted fan nacelles + spinning rotor blades
    for (const sx of [-1, 1]) {
      const duct = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 16), chassisMat);
      duct.rotation.x = Math.PI / 2;
      duct.position.set(sx * 0.44, 0.06, 0);
      duct.castShadow = true;
      bodyGroup.add(duct);

      const rotor = new THREE.Group();
      rotor.position.set(sx * 0.44, 0.07, 0);
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.07), hazardYellowMat);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.36), hazardYellowMat);
      rotor.add(b1, b2); bodyGroup.add(rotor);
      const hoverJet = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, depthWrite: false })); hoverJet.rotation.x = Math.PI; hoverJet.position.set(sx * 0.44, -0.12, 0); hoverJet.layers.set(1); bodyGroup.add(hoverJet);
      wheelsOrRotors.push(rotor);
    }
  } else if (type === 'drill' || type === 'elite_drill') {
    // ==================== 3. HEAVY DRILL RIG & WAVE-4 ELITE RIFT-BREAKER ====================
    const sc = bp.scale;
    bodyGroup.scale.setScalar(sc);

    // Heavy armored industrial hull
    const chassis = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.56, 1.02, 3, 0.08), darkGreyMat);
    chassis.position.y = 0.42;
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    addPlasmaThrusters(bodyGroup, [-0.24, 0.24], 0.42, -0.54, 0.11, chassisMat, 0xff5722);
    for (const sx of [-0.28, 0.28]) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.38, 8), chassisMat); pipe.position.set(sx, 0.98, -0.28); pipe.rotation.x = -0.26; bodyGroup.add(pipe); }
    const upperCarapace = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.34, 0.82, 3, 0.07), rustMat);
    upperCarapace.position.set(0, 0.72, -0.06);
    upperCarapace.castShadow = true;
    bodyGroup.add(upperCarapace);

    // Side layered shield plates
    for (const sx of [-1, 1]) {
      const shield = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.46, 0.78, 2, 0.04), rustMat);
      shield.position.set(sx * 0.5, 0.44, 0.04);
      shield.castShadow = true;
      bodyGroup.add(shield);
      armorPlates.push(shield);

      // Caterpillar track pod
      const track = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.26, 0.96, 2, 0.06), chassisMat);
      track.position.set(sx * 0.44, 0.14, 0);
      track.castShadow = true;
      bodyGroup.add(track);

      for (const sz of [-0.32, 0.32]) {
        const sprocket = createGearMesh(0.13, 0.24, 8, darkGreyMat);
        sprocket.rotation.y = Math.PI / 2;
        sprocket.position.set(sx * 0.44, 0.14, sz);
        bodyGroup.add(sprocket);
        wheelsOrRotors.push(sprocket);
      }
    }

    // Slit red optical sensor bar
    const eyeBar = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.1, 0.1, 2, 0.02), sensorMat);
    eyeBar.position.set(0, 0.68, 0.38);
    bodyGroup.add(eyeBar);

    // Spinning conical 3D auger drill head!
    const drillGrp = new THREE.Group();
    drillGrp.position.set(0, 0.38, 0.56);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.68, 10), darkGreyMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.32;
    cone.castShadow = true;
    drillGrp.add(cone);

    // Spiral flute rings around cone
    for (let k = 0; k < 3; k++) {
      const r = 0.28 - k * 0.075;
      const flute = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 12), hazardYellowMat);
      flute.rotation.y = 0.25;
      flute.position.z = 0.12 + k * 0.17;
      drillGrp.add(flute);
    }
    bodyGroup.add(drillGrp);
    drillHead = drillGrp;

    if (type === 'elite_drill') {
      // Elite Rift-Breaker extra twin smokestacks & glowing crimson command beacon
      for (const sx of [-1, 1]) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 8), chassisMat);
        stack.position.set(sx * 0.28, 1.02, -0.34);
        bodyGroup.add(stack);
      }
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), sensorMat);
      beacon.position.set(0, 1.05, -0.05);
      bodyGroup.add(beacon);
    }
  } else if (type === 'boss_crawler') {
    // ==================== 4. STAGE 1 BOSS: COLOSSUS CRAWLER EXCAVATOR (大型履带采掘机) ====================
    // Twin heavy crawler track pontoons
    for (const sx of [-1, 1]) {
      const trackHull = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.54, 2.55, 3, 0.12),
        chassisMat
      );
      trackHull.position.set(sx * 0.98, 0.28, -0.05);
      trackHull.castShadow = true;
      bodyGroup.add(trackHull);

      const fender = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.14, 2.3, 2, 0.04), darkGreyMat);
      fender.position.set(sx * 0.98, 0.6, -0.05);
      fender.castShadow = true;
      bodyGroup.add(fender);

      for (const sz of [-0.88, 0, 0.88]) {
        const driveWheel = createGearMesh(0.26, 0.6, 10, darkGreyMat);
        driveWheel.rotation.y = Math.PI / 2;
        driveWheel.position.set(sx * 0.98, 0.28, sz);
        bodyGroup.add(driveWheel);
        wheelsOrRotors.push(driveWheel);
      }
    }

    // Massive central mining superstructure
    const mainBody = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.92, 2.15, 4, 0.12), darkGreyMat);
    mainBody.position.set(0, 0.78, -0.1);
    mainBody.castShadow = true;
    bodyGroup.add(mainBody);

    // Command bridge visor with triple glowing red optical sensors
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.42, 0.74, 3, 0.07), rustMat);
    bridge.position.set(0, 1.38, 0.36);
    bridge.castShadow = true;
    bodyGroup.add(bridge);

    const bossEyes = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.14, 0.12, 2, 0.03), sensorMat);
    bossEyes.position.set(0, 1.38, 0.72);
    bodyGroup.add(bossEyes);

    // Prominent Glowing Energy Weak-Point Core (nested in upper rear reactor bay!)
    const weakCoreMat = new THREE.MeshStandardMaterial({
      color: 0xff4d2a,
      emissive: 0xff2a1a,
      emissiveIntensity: 2.1,
      roughness: 0.15,
    });
    addPlasmaThrusters(bodyGroup, [-0.48, 0.48], 0.88, -1.18, 0.18, chassisMat, 0xff4500);
    const reactorCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), weakCoreMat);
    reactorCore.position.set(0, 1.48, -0.46);
    bodyGroup.add(reactorCore);
    weakPointCore = reactorCore;

    const coreCage = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.055, 8, 18), hazardYellowMat);
    coreCage.rotation.x = Math.PI / 2;
    coreCage.position.set(0, 1.48, -0.46);
    bodyGroup.add(coreCage);

    // 3 Layered Breakaway Armor Plates (detach sequentially at 75% / 50% / 25% HP!)
    const plateL = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.74, 1.45, 3, 0.05), rustMat);
    plateL.position.set(-0.88, 0.92, -0.12);
    plateL.castShadow = true;
    bodyGroup.add(plateL);

    const plateR = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.74, 1.45, 3, 0.05), rustMat);
    plateR.position.set(0.88, 0.92, -0.12);
    plateR.castShadow = true;
    bodyGroup.add(plateR);

    const dorsalShield = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.16, 0.92, 3, 0.04), rustMat);
    dorsalShield.position.set(0, 1.88, -0.46);
    dorsalShield.castShadow = true;
    bodyGroup.add(dorsalShield);

    armorPlates.push(plateL, plateR, dorsalShield);

    // Giant Front Rotary Bore Drill
    const bossDrill = new THREE.Group();
    bossDrill.position.set(0, 0.64, 1.02);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.34, 14), hazardYellowMat);
    collar.rotation.x = Math.PI / 2;
    bossDrill.add(collar);

    const megaCone = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.18, 12), darkGreyMat);
    megaCone.rotation.x = Math.PI / 2;
    megaCone.position.z = 0.68;
    megaCone.castShadow = true;
    bossDrill.add(megaCone);

    for (let k = 0; k < 4; k++) {
      const r = 0.5 - k * 0.1;
      const cutter = createGearMesh(r, 0.08, 8, rustMat);
      cutter.position.z = 0.25 + k * 0.24;
      bossDrill.add(cutter);
    }
    bodyGroup.add(bossDrill);
    drillHead = bossDrill;

    // Articulated 2-Joint Hydraulic Crusher Arm (for telegraphed ground-slam skill!)
    const shoulder = new THREE.Group();
    shoulder.position.set(0.58, 1.26, 0.18);
    const boom = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.86, 0.28, 2, 0.04), hazardYellowMat);
    boom.position.set(0, 0.38, 0.12);
    boom.rotation.x = 0.35;
    boom.castShadow = true;
    shoulder.add(boom);

    const elbow = new THREE.Group();
    elbow.position.set(0, 0.76, 0.28);
    const stick = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.22, 0.88, 2, 0.04), rustMat);
    stick.position.set(0, -0.06, 0.38);
    stick.castShadow = true;
    elbow.add(stick);

    // Heavy industrial crusher claw at tip
    const claw = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.34, 0.36, 2, 0.04), chassisMat);
    claw.position.set(0, -0.14, 0.84);
    claw.castShadow = true;
    elbow.add(claw);

    shoulder.add(elbow);
    bodyGroup.add(shoulder);
    hydraulicArm = shoulder;
    forearm = elbow;
  } else if (type === 'shield_skimmer') {
    // ==================== 5. SHIELD SKIMMER (护盾掠袭艇) ====================
    bodyGroup.position.y = 0.48;

    const hullPod = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.28, 0.78, 3, 0.07), rustMat);
    hullPod.castShadow = true;
    bodyGroup.add(hullPod);

    // Twin forward-swept catamaran prongs
    for (const sx of [-1, 1]) {
      const prong = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, 0.96, 3, 0.05), darkGreyMat);
      prong.position.set(sx * 0.36, -0.04, 0.16);
      prong.castShadow = true;
      bodyGroup.add(prong);

      const vFin = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.3, 0.32, 2, 0.02), hazardYellowMat);
      vFin.position.set(sx * 0.34, 0.18, -0.32);
      vFin.rotation.z = -sx * 0.36;
      bodyGroup.add(vFin);

      const thruster = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), chassisMat);
      thruster.position.set(sx * 0.24, -0.02, -0.42);
      bodyGroup.add(thruster);
      wheelsOrRotors.push(thruster);
    }

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.1, 0.12, 2, 0.02), sensorMat);
    visor.position.set(0, 0.08, 0.38);
    bodyGroup.add(visor);

    const emitterNode = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.8,
        roughness: 0.15,
      })
    );
    emitterNode.position.set(0, 0.22, -0.04);
    bodyGroup.add(emitterNode);

    // Layer-1 Non-Outlined Geodesic Energy Shield Dome!
    shieldDome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 1),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      })
    );
    shieldDome.scale.set(1.05, 0.82, 1.18);
    shieldDome.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.73, 1), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true, transparent: true, opacity: 0.45, depthWrite: false })));
    addPlasmaThrusters(bodyGroup, [-0.24, 0.24], -0.02, -0.46, 0.09, chassisMat, 0x38bdf8);
    setLayerRecursive(shieldDome, 1);
    bodyGroup.add(shieldDome);
  } else if (type === 'splitter_rover') {
    // ==================== 6. SPLITTER CARRIER ROVER (裂殖母体车) ====================
    const chassis = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.38, 1.02, 3, 0.08), darkGreyMat);
    chassis.position.y = 0.32;
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const cab = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.28, 0.42, 3, 0.06), rustMat);
    cab.position.set(0, 0.56, 0.26);
    cab.castShadow = true;
    bodyGroup.add(cab);

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.1, 0.1, 2, 0.02), sensorMat);
    visor.position.set(0, 0.56, 0.47);
    bodyGroup.add(visor);

    // Dorsal yellow clamp rack carrying 2 visible miniature micro-rover pods!
    const rack = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.1, 0.54, 2, 0.03), hazardYellowMat);
    rack.position.set(0, 0.54, -0.2);
    bodyGroup.add(rack);

    for (const sx of [-1, 1]) {
      const miniPod = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.22, 0.38, 2, 0.05), rustMat);
      miniPod.position.set(sx * 0.22, 0.68, -0.2);
      miniPod.castShadow = true;
      bodyGroup.add(miniPod);

      const miniEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), sensorMat);
      miniEye.position.set(sx * 0.22, 0.69, -0.01);
      bodyGroup.add(miniEye);
    }

    // 6 Heavy Carrier Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 10);
    for (const sx of [-1, 1]) {
      for (const sz of [-0.34, 0, 0.34]) {
        const wGrp = new THREE.Group();
        wGrp.position.set(sx * 0.46, 0.17, sz);
        const tire = new THREE.Mesh(wheelGeo, chassisMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wGrp.add(tire);
        bodyGroup.add(wGrp);
        wheelsOrRotors.push(wGrp);
      }
    }
  } else if (type === 'mini_scout') {
    // ==================== 7. MINI SCOUT (裂殖子机) ====================
    bodyGroup.scale.setScalar(bp.scale);

    const shell = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.36, 0.64, 3, 0.09), rustMat);
    shell.position.y = 0.3;
    shell.castShadow = true;
    bodyGroup.add(shell);

    addPlasmaThrusters(bodyGroup, [0], 0.28, -0.34, 0.1, chassisMat, 0xfbbf24);
    const bigEye = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), sensorMat);
    bigEye.rotation.x = Math.PI / 2;
    bigEye.position.set(0, 0.32, 0.33);
    bodyGroup.add(bigEye);

    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.2, 0.26, 2, 0.02), hazardYellowMat);
      fin.position.set(sx * 0.28, 0.48, -0.16);
      bodyGroup.add(fin);

      for (const sz of [-0.2, 0.2]) {
        const wGrp = new THREE.Group();
        wGrp.position.set(sx * 0.33, 0.15, sz);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 10), chassisMat); tire.rotation.z = Math.PI / 2; wGrp.add(tire);
        attachTireTreads(wGrp, 0.15, 0.12, darkGreyMat, hazardYellowMat);
        bodyGroup.add(wGrp);
        wheelsOrRotors.push(wGrp);
      }
    }
  } else if (type === 'repair_drone') {
    // ==================== 8. REPAIR DRONE (工程抢修无人机) ====================
    bodyGroup.position.y = 0.92;
    bodyGroup.scale.setScalar(bp.scale);

    const coreHull = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.3, 8), darkGreyMat);
    coreHull.castShadow = true;
    bodyGroup.add(coreHull);

    const domeCap = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.18, 0.46, 3, 0.06), rustMat);
    domeCap.position.y = 0.18;
    domeCap.castShadow = true;
    bodyGroup.add(domeCap);

    const eye = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.08, 0.1, 2, 0.02), sensorMat);
    eye.position.set(0, 0.16, 0.24);
    bodyGroup.add(eye);

    // Underslung articulated micro-welder arm
    const welder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 8), hazardYellowMat);
    welder.rotation.x = 0.45;
    welder.position.set(0, -0.22, 0.12);
    bodyGroup.add(welder);

    // Tri-rotor nacelles at 0 / 120 / 240 deg
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const rx = Math.sin(a) * 0.5;
      const rz = Math.cos(a) * 0.5;

      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.32), chassisMat);
      strut.position.set(rx * 0.6, 0.02, rz * 0.6);
      strut.rotation.y = a;
      bodyGroup.add(strut);

      const duct = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 14), darkGreyMat);
      duct.rotation.x = Math.PI / 2;
      duct.position.set(rx, 0.04, rz);
      bodyGroup.add(duct);

      const rotor = new THREE.Group();
      rotor.position.set(rx, 0.05, rz);
      rotor.add(
        new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.06), hazardYellowMat),
        new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.3), hazardYellowMat)
      );
      bodyGroup.add(rotor);
      wheelsOrRotors.push(rotor);
    }

    // Spinning dorsal emerald-amber 3D cross-halo projector!
    const haloGrp = new THREE.Group();
    haloGrp.position.set(0, 0.38, 0);
    const healMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.7,
      roughness: 0.2,
    });
    haloGrp.add(
      new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.08, 0.1, 2, 0.02), healMat),
      new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.08, 0.34, 2, 0.02), healMat)
    );
    const gimbal = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 14), hazardYellowMat);
    gimbal.rotation.x = Math.PI / 2;
    haloGrp.add(gimbal);

    const repairAuraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 20),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      })
    );
    repairAuraRing.rotation.x = -Math.PI / 2;
    repairAuraRing.position.y = -0.02;
    setLayerRecursive(repairAuraRing, 1);
    haloGrp.add(repairAuraRing);

    bodyGroup.add(haloGrp);
    supportHalo = haloGrp;
  } else if (type === 'boss_siege_driller') {
    // ==================== 9. STAGE 2 BOSS: SIEGE DRILLER (碎星号双联破城钻) ====================
    bodyGroup.scale.setScalar(bp.scale);
    const siegeMat = makeToonMaterial(0x5b2136);
    hitFlashMaterials.push(siegeMat);

    for (const sx of [-1, 1]) {
      const track = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.56, 2.58, 3, 0.12), chassisMat);
      track.position.set(sx * 1.02, 0.28, -0.06);
      track.castShadow = true;
      bodyGroup.add(track);

      for (const sz of [-0.88, 0, 0.88]) {
        const gear = createGearMesh(0.26, 0.62, 10, darkGreyMat);
        gear.rotation.y = Math.PI / 2;
        gear.position.set(sx * 1.02, 0.28, sz);
        bodyGroup.add(gear);
        wheelsOrRotors.push(gear);
      }
    }

    const hull = new THREE.Mesh(new RoundedBoxGeometry(1.66, 0.96, 2.2, 4, 0.12), darkGreyMat);
    hull.position.set(0, 0.8, -0.08);
    hull.castShadow = true;
    bodyGroup.add(hull);

    addPlasmaThrusters(bodyGroup, [-0.5, 0.5], 0.9, -1.22, 0.19, chassisMat, 0xff3b30);
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.44, 0.82, 3, 0.07), siegeMat);
    bridge.position.set(0, 1.42, 0.34);
    bridge.castShadow = true;
    bodyGroup.add(bridge);

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.14, 0.12, 2, 0.03), sensorMat);
    visor.position.set(0, 1.42, 0.74);
    bodyGroup.add(visor);

    // Violet-crimson Rift Weak-Point Core
    const weakCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.44, 1),
      new THREE.MeshStandardMaterial({
        color: 0xe879f9,
        emissive: 0xc026d3,
        emissiveIntensity: 2.2,
        roughness: 0.15,
      })
    );
    weakCore.position.set(0, 1.54, -0.5);
    bodyGroup.add(weakCore);
    weakPointCore = weakCore;

    // 3 Layered Siege Armor Plates
    const pL = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.78, 1.52, 3, 0.05), siegeMat);
    pL.position.set(-0.94, 0.94, -0.1);
    pL.castShadow = true;
    const pR = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.78, 1.52, 3, 0.05), siegeMat);
    pR.position.set(0.94, 0.94, -0.1);
    pR.castShadow = true;
    const pTop = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.18, 0.96, 3, 0.04), rustMat);
    pTop.position.set(0, 1.94, -0.5);
    pTop.castShadow = true;
    bodyGroup.add(pL, pR, pTop);
    armorPlates.push(pL, pR, pTop);

    // Twin Counter-Rotating Magma-Fluted Bore Drills!
    const buildBore = (xOff: number): THREE.Group => {
      const grp = new THREE.Group();
      grp.position.set(xOff, 0.64, 1.0);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.3, 12), hazardYellowMat);
      col.rotation.x = Math.PI / 2;
      grp.add(col);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.08, 10), darkGreyMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.z = 0.62;
      cone.castShadow = true;
      grp.add(cone);
      for (let k = 0; k < 3; k++) {
        const ring = createGearMesh(0.35 - k * 0.08, 0.07, 8, rustMat);
        ring.position.z = 0.24 + k * 0.24;
        grp.add(ring);
      }
      bodyGroup.add(grp);
      return grp;
    };
    drillHead = buildBore(-0.46);
    secondaryDrillHead = buildBore(0.46);

    // Overhead Seismic Ram Arm
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 1.38, 0.15);
    const boom = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.78, 0.3, 2, 0.04), hazardYellowMat);
    boom.position.set(0, 0.34, 0.12);
    boom.rotation.x = 0.32;
    shoulder.add(boom);
    const elbow = new THREE.Group();
    elbow.position.set(0, 0.68, 0.26);
    const ram = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.32, 0.88, 2, 0.05), siegeMat);
    ram.position.set(0, -0.08, 0.42);
    elbow.add(ram);
    shoulder.add(elbow);
    bodyGroup.add(shoulder);
    hydraulicArm = shoulder;
    forearm = elbow;
  } else if (type === 'boss_mag_dreadnought') {
    // ==================== 10. STAGE 3 BOSS: MAG-LEV DREADNOUGHT (苍穹轨霸·磁浮无畏舰) ====================
    bodyGroup.scale.setScalar(bp.scale);
    bodyGroup.position.y = 0.52;
    const dreadMat = makeToonMaterial(0x2b3f5c, { metallicStep: true });
    hitFlashMaterials.push(dreadMat);

    const mainHull = new THREE.Mesh(new RoundedBoxGeometry(1.78, 0.78, 2.48, 4, 0.12), dreadMat);
    mainHull.position.set(0, 0.44, -0.05);
    mainHull.castShadow = true;
    bodyGroup.add(mainHull);

    const citadel = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.48, 1.12, 3, 0.08), rustMat);
    citadel.position.set(0, 0.98, 0.18);
    citadel.castShadow = true;
    bodyGroup.add(citadel);

    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.14, 0.12, 2, 0.03), sensorMat);
    visor.position.set(0, 1.0, 0.74);
    bodyGroup.add(visor);

    // 4 Repulsor Hover Pods + Twin Side Rail-Sponsons
    for (const sx of [-1, 1]) {
      const sponson = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.34, 1.88, 3, 0.06), darkGreyMat);
      sponson.position.set(sx * 1.06, 0.48, 0.22);
      sponson.castShadow = true;
      bodyGroup.add(sponson);

      const railTip = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.18, 0.54, 2, 0.03), hazardYellowMat);
      railTip.position.set(sx * 1.06, 0.48, 1.24);
      bodyGroup.add(railTip);

      for (const sz of [-0.76, 0.72]) {
        const pod = new THREE.Group();
        pod.position.set(sx * 0.98, 0.08, sz);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.065, 8, 14), chassisMat);
        ring.rotation.x = Math.PI / 2;
        pod.add(ring);
        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 0.08, 10),
          sensorMat
        );
        pod.add(glow);
        bodyGroup.add(pod);
        wheelsOrRotors.push(pod);
      }
    }

    // Aft Magnetic Reactor Weak-Point Core
    const weakCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 1),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0xff3b30,
        emissiveIntensity: 2.1,
        roughness: 0.15,
      })
    );
    weakCore.position.set(0, 1.08, -0.72);
    bodyGroup.add(weakCore);
    weakPointCore = weakCore;

    // 3 Breakaway Dreadnought Armor Plates
    const pL = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.68, 1.48, 3, 0.05), rustMat);
    pL.position.set(-1.18, 0.52, -0.1);
    const pR = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.68, 1.48, 3, 0.05), rustMat);
    pR.position.set(1.18, 0.52, -0.1);
    const pAft = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.18, 0.88, 3, 0.04), hazardYellowMat);
    pAft.position.set(0, 1.48, -0.72);
    bodyGroup.add(pL, pR, pAft);
    armorPlates.push(pL, pR, pAft);

    // Forward Arc-Surge Emitter Arm
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 0.86, 0.68);
    const emitterBoom = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.42, 0.52, 2, 0.04), hazardYellowMat);
    shoulder.add(emitterBoom);
    const elbow = new THREE.Group();
    elbow.position.set(0, 0.12, 0.34);
    const prongBar = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.22, 0.48, 2, 0.04), dreadMat);
    elbow.add(prongBar);
    shoulder.add(elbow);
    bodyGroup.add(shoulder);
    hydraulicArm = shoulder;
    forearm = elbow;

    // Layer-1 Capital Geodesic Shield Dome!
    shieldDome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.76, 1),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      })
    );
    shieldDome.position.set(0, 0.58, 0); shieldDome.scale.set(0.95, 0.68, 1.18);
    shieldDome.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.77, 1), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true, transparent: true, opacity: 0.38, depthWrite: false })));
    addPlasmaThrusters(bodyGroup, [-0.52, 0.52], 0.46, -1.32, 0.2, chassisMat, 0x38bdf8);
    setLayerRecursive(shieldDome, 1); bodyGroup.add(shieldDome);
  } else {
    // ==================== 11. STAGE 4 FINAL BOSS: OMEGA ARK OVERLORD (欧米茄·终末方舟母舰) ====================
    bodyGroup.scale.setScalar(bp.scale);
    const overlordMat = makeToonMaterial(0x4a1d2f);
    hitFlashMaterials.push(overlordMat);

    for (const sx of [-1, 1]) {
      const pontoon = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.6, 2.75, 3, 0.12),
        chassisMat
      );
      pontoon.position.set(sx * 1.08, 0.3, -0.05);
      pontoon.castShadow = true;
      bodyGroup.add(pontoon);

      for (const sz of [-0.95, 0, 0.95]) {
        const megaGear = createGearMesh(0.28, 0.66, 10, darkGreyMat);
        megaGear.rotation.y = Math.PI / 2;
        megaGear.position.set(sx * 1.08, 0.3, sz);
        bodyGroup.add(megaGear);
        wheelsOrRotors.push(megaGear);
      }
    }

    const citadelBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.82, 1.06, 2.38, 4, 0.14),
      darkGreyMat
    );
    citadelBase.position.set(0, 0.86, -0.08);
    citadelBase.castShadow = true;
    bodyGroup.add(citadelBase);

    const upperKeep = new THREE.Mesh(
      new RoundedBoxGeometry(1.36, 0.52, 1.12, 3, 0.08),
      overlordMat
    );
    upperKeep.position.set(0, 1.52, 0.28);
    upperKeep.castShadow = true;
    bodyGroup.add(upperKeep);

    const overlordEyes = new THREE.Mesh(
      new RoundedBoxGeometry(1.04, 0.16, 0.12, 2, 0.03),
      sensorMat
    );
    overlordEyes.position.set(0, 1.54, 0.84);
    bodyGroup.add(overlordEyes);

    // Prominent Spinning Golden-Crimson Octahedral Ark Weak-Point Core!
    const arkCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffb703,
        emissive: 0xff2a1a,
        emissiveIntensity: 2.35,
        roughness: 0.12,
      })
    );
    addPlasmaThrusters(bodyGroup, [-0.58, 0, 0.58], 0.92, -1.32, 0.2, chassisMat, 0xff2a1a);
    arkCore.position.set(0, 1.72, -0.52);
    bodyGroup.add(arkCore);
    weakPointCore = arkCore;

    // Rotating Gimbal Containment Ring around Ark Core
    const gimbalRing = new THREE.Group();
    gimbalRing.position.set(0, 1.72, -0.52);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.065, 8, 20), hazardYellowMat);
    torus.rotation.x = 0.55;
    gimbalRing.add(torus);
    bodyGroup.add(gimbalRing);
    secondaryDrillHead = gimbalRing;

    // 4 Layered Breakaway Armor Plates (75% / 55% / 35% / 18% HP!)
    const pPort = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.84, 1.68, 3, 0.05), overlordMat);
    pPort.position.set(-1.02, 0.98, -0.08);
    const pStar = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.84, 1.68, 3, 0.05), overlordMat);
    pStar.position.set(1.02, 0.98, -0.08);
    const pBrow = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.28, 0.42, 3, 0.04), rustMat);
    pBrow.position.set(0, 1.24, 1.06);
    const pCap = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.2, 1.06, 3, 0.04), hazardYellowMat);
    pCap.position.set(0, 2.24, -0.52);
    bodyGroup.add(pPort, pStar, pBrow, pCap);
    armorPlates.push(pPort, pStar, pBrow, pCap);

    // Central Mega-Auger
    const megaDrill = new THREE.Group();
    megaDrill.position.set(0, 0.68, 1.12);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.72, 0.36, 14), hazardYellowMat);
    collar.rotation.x = Math.PI / 2;
    megaDrill.add(collar);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.28, 12), darkGreyMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.72;
    cone.castShadow = true;
    megaDrill.add(cone);
    for (let k = 0; k < 4; k++) {
      const cutter = createGearMesh(0.54 - k * 0.1, 0.08, 9, rustMat);
      cutter.position.z = 0.26 + k * 0.26;
      megaDrill.add(cutter);
    }
    bodyGroup.add(megaDrill);
    drillHead = megaDrill;

    // Dual-Claw Cataclysmic Crusher Assembly
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 1.48, 0.22);
    for (const sx of [-0.62, 0.62]) {
      const boom = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.88, 0.28, 2, 0.04), hazardYellowMat);
      boom.position.set(sx, 0.38, 0.12);
      boom.rotation.x = 0.34;
      shoulder.add(boom);
    }
    const elbow = new THREE.Group();
    elbow.position.set(0, 0.78, 0.28);
    for (const sx of [-0.62, 0.62]) {
      const stick = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.24, 0.92, 2, 0.04), overlordMat);
      stick.position.set(sx, -0.06, 0.4);
      elbow.add(stick);
      const claw = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.36, 0.38, 2, 0.04), chassisMat);
      claw.position.set(sx, -0.14, 0.88);
      elbow.add(claw);
    }
    shoulder.add(elbow);
    bodyGroup.add(shoulder);
    hydraulicArm = shoulder;
    forearm = elbow;
  }

  // ==================== LAYER 1 NON-OUTLINED ATTACHMENTS: SHADOW, SLOW RING & ON-DEMAND HP BAR ====================
  const baseRadius = bp.isBoss ? 1.85 : bp.hitRadius * 1.65;
  const shadowBlob = new THREE.Mesh(
    new THREE.PlaneGeometry(baseRadius * 2, baseRadius * 2),
    new THREE.MeshBasicMaterial({
      map: tex.shadowBlob,
      transparent: true,
      opacity: bp.isFlying ? 0.38 : 0.62,
      depthWrite: false,
    })
  );
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = 0.025;
  setLayerRecursive(shadowBlob, 1);
  root.add(shadowBlob);

  // Purple magnetic slow debuff ring on ground around enemy
  const slowRing = new THREE.Mesh(
    new THREE.RingGeometry(baseRadius * 0.72, baseRadius * 0.94, 24),
    new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  slowRing.rotation.x = -Math.PI / 2;
  slowRing.position.y = 0.06;
  slowRing.visible = false;
  setLayerRecursive(slowRing, 1);
  root.add(slowRing);

  // Cyan-violet [Flux-Marked] synergy targeting ring on Layer 1 (rotates when fluxTimer > 0)
  const fluxRingGroup = new THREE.Group();
  fluxRingGroup.position.y = 0.08;
  fluxRingGroup.visible = false;
  const fluxArcMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  const fluxTickMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  for (let q = 0; q < 4; q++) {
    const startAng = (q * Math.PI) / 2 + 0.18;
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(baseRadius * 0.98, baseRadius * 1.14, 8, 1, startAng, Math.PI * 0.28),
      fluxArcMat
    );
    arc.rotation.x = -Math.PI / 2;
    fluxRingGroup.add(arc);

    const tickAng = (q * Math.PI) / 2;
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), fluxTickMat);
    tick.rotation.x = -Math.PI / 2;
    tick.rotation.z = Math.PI / 4;
    tick.position.set(
      Math.cos(tickAng) * baseRadius * 1.08,
      0.004,
      Math.sin(tickAng) * baseRadius * 1.08
    );
    fluxRingGroup.add(tick);
  }
  setLayerRecursive(fluxRingGroup, 1);
  root.add(fluxRingGroup);

  // Compact Floating HP (+ Unconditional Dynamic Shield + Shred Badge) Bar on Layer 1
  const hpBarGroup = new THREE.Group();
  const barW = bp.isBoss ? 2.1 : bp.isElite ? 1.35 : 0.86;
  const barH = bp.isBoss ? 0.15 : 0.1;
  hpBarGroup.position.y = bp.isBoss ? 2.48 : bp.isFlying ? 1.44 : bp.isElite ? 1.75 : 1.0;
  hpBarGroup.visible = false;

  const bgPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(barW + 0.06, barH + 0.05),
    new THREE.MeshBasicMaterial({
      color: 0x130e24,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    })
  );
  hpBarGroup.add(bgPlane);

  const fillGeo = new THREE.PlaneGeometry(barW, barH);
  fillGeo.translate(barW / 2, 0, 0); // Left-aligned scaling!
  const hpFillMesh = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({
      color: bp.isBoss || bp.isElite ? 0xff4757 : 0xf97316,
      depthWrite: false,
    })
  );
  hpFillMesh.position.set(-barW / 2, 0, 0.005);
  hpBarGroup.add(hpFillMesh);

  // Unconditional shieldFillMesh on ALL 12 rigs so projected shields on non-shield escorts show dynamically!
  const sGeo = new THREE.PlaneGeometry(barW, barH * 0.58);
  sGeo.translate(barW / 2, 0, 0);
  const shieldFillMesh = new THREE.Mesh(
    sGeo,
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      depthWrite: false,
    })
  );
  shieldFillMesh.position.set(-barW / 2, barH * 0.95, 0.006);
  shieldFillMesh.visible = (bp.maxShield ?? 0) > 0;
  hpBarGroup.add(shieldFillMesh);

  // Amber [破甲裂隙] cracked-armor chevron badge beside HP bar (Layer 1 via hpBarGroup)
  const shredBadgeGroup = new THREE.Group();
  shredBadgeGroup.position.set(barW * 0.5 + 0.16, 0.02, 0.008);
  shredBadgeGroup.visible = false;
  const shredBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0x1a1033,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  shredBg.rotation.z = Math.PI / 4;
  shredBadgeGroup.add(shredBg);

  const shredChevronMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const dir of [-1, 1]) {
    const chev = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.04), shredChevronMat);
    chev.position.set(dir * 0.024, dir * 0.014, 0.003);
    chev.rotation.z = -0.52;
    shredBadgeGroup.add(chev);
  }
  hpBarGroup.add(shredBadgeGroup);

  setLayerRecursive(hpBarGroup, 1);
  root.add(hpBarGroup);

  return {
    root,
    bodyGroup,
    wheelsOrRotors,
    drillHead,
    secondaryDrillHead,
    hydraulicArm,
    forearm,
    weakPointCore,
    armorPlates,
    shieldDome,
    shieldFillMesh,
    supportHalo,
    fluxRingGroup,
    shredBadgeGroup,
    slowRing,
    shadowBlob,
    hpBarGroup,
    hpFillMesh,
    hitFlashMaterials,
  };
}
