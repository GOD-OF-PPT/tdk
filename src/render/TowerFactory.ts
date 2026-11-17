import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TIER_META, TOWER_BLUEPRINTS } from '../config/gameConfig';
import type { FlapHingeAxis, TowerBranch, TowerRig, TowerTier, TowerType } from '../types';
import { makeToonMaterial, PALETTE, setMaterialRimColor } from './ToonMaterials';

/**
 * Builds a real 3D toothed spur gear mesh (extruded hub + rim + distinct teeth).
 */
export function createGearMesh(
  radius: number,
  thickness: number,
  toothCount: number,
  mat: THREE.Material
): THREE.Group {
  const gear = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.84, radius * 0.84, thickness, 16),
    mat
  );
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  gear.add(body);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.36, radius * 0.36, thickness * 1.45, 12),
    mat
  );
  hub.rotation.x = Math.PI / 2;
  gear.add(hub);

  const toothGeo = new THREE.BoxGeometry(radius * 0.24, radius * 0.28, thickness * 0.92);
  for (let i = 0; i < toothCount; i++) {
    const angle = (i / toothCount) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, mat);
    tooth.position.set(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9, 0);
    tooth.rotation.z = angle;
    gear.add(tooth);
  }
  return gear;
}

function addRivets(
  parent: THREE.Object3D,
  positions: Array<[number, number, number]>,
  mat: THREE.Material,
  radius = 0.036
): void {
  const geo = new THREE.CylinderGeometry(radius, radius, 0.035, 8);
  for (const [x, y, z] of positions) {
    const r = new THREE.Mesh(geo, mat);
    r.position.set(x, y, z);
    parent.add(r);
  }
}

function tagArcFlyPart(obj: THREE.Object3D, offsetX: number, offsetY: number, offsetZ: number): void {
  obj.userData.restPos = obj.position.clone();
  obj.userData.restScale = obj.scale.clone();
  obj.userData.flyOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);
}

function registerHingedFlap(
  hingedFlaps: THREE.Object3D[],
  flap: THREE.Object3D,
  hingeAxis: FlapHingeAxis,
  openAngle: number,
  minTier: TowerTier,
  branchTag?: TowerBranch
): void {
  flap.userData.hingeAxis = hingeAxis;
  flap.userData.restAngle = flap.rotation[hingeAxis];
  flap.userData.openAngle = openAngle;
  flap.userData.minTier = minTier;
  if (branchTag) {
    flap.userData.branchTag = branchTag;
  }
  hingedFlaps.push(flap);
}

function tagIdleCore(core: THREE.Object3D): THREE.Object3D {
  core.userData.restPos = core.position.clone();
  core.userData.restScale = core.scale.clone();
  return core;
}

export function createTowerRig(type: TowerType, initialTier: TowerTier = 1): TowerRig {
  const bp = TOWER_BLUEPRINTS[type];
  const tierInfo = TIER_META[initialTier];

  const root = new THREE.Group();
  const baseGroup = new THREE.Group();
  const turretYaw = new THREE.Group();
  const weaponPitch = new THREE.Group();

  root.add(baseGroup);
  root.add(turretYaw);

  // Per-instance tier-reactive materials (cream & deep blue stay constant; ONLY trim, nameplate, core & rim use tier color!)
  const creamMat = makeToonMaterial(PALETTE.CREAM_ARMOR, {
    rimColor: tierInfo.rimColor,
    rimStrength: 0.3,
  });
  const deepBlueMat = makeToonMaterial(PALETTE.DEEP_BLUE_FRAME, { metallicStep: true });
  const darkJointMat = makeToonMaterial(PALETTE.DEEP_BLUE_DARK, { metallicStep: true });
  const hazardMat = makeToonMaterial(PALETTE.HAZard_ORANGE);
  const rivetMat = makeToonMaterial(PALETTE.RIVET_LIGHT, { metallicStep: true });
  const weaponAccentMat = makeToonMaterial(bp.weaponColor, {
    emissive: bp.weaponColor,
    emissiveIntensity: 0.35,
  });

  // Tier accent material (used strictly on trim, nameplate collar, and tier badges)
  const tierTrimMat = makeToonMaterial(tierInfo.color, {
    emissive: tierInfo.color,
    emissiveIntensity: 0.22,
    rimColor: tierInfo.rimColor,
    rimStrength: 0.42,
  });

  // Glowing Tier Core material
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: tierInfo.color,
    emissive: tierInfo.color,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.1,
  });

  const tierAccentMaterials: THREE.MeshToonMaterial[] = [creamMat, tierTrimMat];

  // ==================== TIER 1 BASE: SINGLE-LAYER OCTAGONAL PEDESTAL ====================
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.04, 0.24, 8), deepBlueMat);
  plinth.position.y = 0.12;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  baseGroup.add(plinth);

  // Stepped bevel ring (creates real physical seam gap above plinth)
  const turntableRing = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.82, 0.1, 12), darkJointMat);
  turntableRing.position.y = 0.28;
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
  }

  // Tier-colored front nameplate plaque on base
  const nameplate = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.11, 0.12, 2, 0.025), tierTrimMat);
  nameplate.position.set(0, 0.14, 0.96);
  nameplate.rotation.x = -0.22;
  baseGroup.add(nameplate);

  // Hazard stripe blocks on left/right base
  for (const sx of [-1, 1]) {
    const hz = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.09, 0.42, 2, 0.02), hazardMat);
    hz.position.set(sx * 0.94, 0.13, 0);
    baseGroup.add(hz);
  }

  addRivets(
    baseGroup,
    [
      [-0.62, 0.25, 0.62],
      [0.62, 0.25, 0.62],
      [-0.62, 0.25, -0.62],
      [0.62, 0.25, -0.62],
    ],
    rivetMat
  );

  // Modular progression groups
  const t2Base = new THREE.Group();
  const t2Turret = new THREE.Group();
  const t3Turret = new THREE.Group();
  const t4ATurret = new THREE.Group();
  const t4BTurret = new THREE.Group();
  const rotaryBarrels: THREE.Object3D[] = [];
  const branchBarrelOverlayA: THREE.Object3D[] = [];
  const branchBarrelOverlayB: THREE.Object3D[] = [];
  baseGroup.add(t2Base);

  // ==================== TIER 2 REINFORCED OUTRIGGER STRUTS (SHARED INDUSTRIAL LANGUAGE) ====================
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const strut = new THREE.Group();
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.2, 0.46, 2, 0.04), creamMat);
    arm.position.set(0, 0.14, 0.12);
    arm.rotation.x = 0.25;
    arm.castShadow = true;
    strut.add(arm);

    const padFoot = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.1, 0.28, 2, 0.03), deepBlueMat);
    padFoot.position.set(0, 0.05, 0.28);
    padFoot.castShadow = true;
    strut.add(padFoot);

    const trimCap = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.16, 2, 0.015), tierTrimMat);
    trimCap.position.set(0, 0.23, 0.12);
    strut.add(trimCap);

    strut.position.set(Math.cos(angle) * 0.84, 0, Math.sin(angle) * 0.84);
    strut.rotation.y = angle;
    tagArcFlyPart(strut, Math.cos(angle) * 1.3, 1.4, Math.sin(angle) * 1.3);
    t2Base.add(strut);
  }

  let barrelL: THREE.Object3D | null = null;
  let barrelR: THREE.Object3D | null = null;
  let mortarTube: THREE.Object3D | null = null;
  let magInnerCore: THREE.Object3D | null = null;
  let magRingOuter: THREE.Object3D | null = null;
  let magRingInner: THREE.Object3D | null = null;
  const magClamps: THREE.Object3D[] = [];
  let specialGear: THREE.Object3D | null = null;
  let idleCore: THREE.Object3D | undefined;
  const hingedFlaps: THREE.Object3D[] = [];
  const muzzlePoints: THREE.Object3D[] = [];

  if (type === 'autocannon') {
    // ==================== 1. TWIN AUTOCANNON: LOW, WIDE, CHUNKY ====================
    turretYaw.position.y = 0.34;
    weaponPitch.position.set(0, 0.36, 0.05);
    turretYaw.add(weaponPitch);
    turretYaw.add(t2Turret);
    weaponPitch.add(t3Turret);
    turretYaw.add(t4ATurret);
    turretYaw.add(t4BTurret);

    // Wide chunky cream-white housing with physical seam step over deep-blue frame
    const lowerFrame = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.26, 0.96, 3, 0.06), deepBlueMat);
    lowerFrame.position.y = 0.15;
    lowerFrame.castShadow = true;
    turretYaw.add(lowerFrame);

    const mainHull = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.42, 0.88, 3, 0.09), creamMat);
    mainHull.position.set(0, 0.42, -0.04);
    mainHull.castShadow = true;
    turretYaw.add(mainHull);

    // Tier-colored armor trim collar & rear core window
    const topTrim = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.07, 0.64, 2, 0.025), tierTrimMat);
    topTrim.position.set(0, 0.65, -0.06);
    turretYaw.add(topTrim);

    const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMaterial);
    coreGem.position.set(0, 0.45, -0.5);
    turretYaw.add(coreGem);
    idleCore = tagIdleCore(coreGem);

    const sightFrame = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.16, 0.22, 2, 0.025), deepBlueMat);
    sightFrame.position.set(0, 0.34, 0.12);
    weaponPitch.add(sightFrame);
    const sightLens = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.09), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
    sightLens.position.set(0, 0.35, 0.235);
    sightLens.layers.set(1);
    weaponPitch.add(sightLens);
    // Starter side ammo boxes & rear cooling radiator fins
    for (const sx of [-1, 1]) {
      const ammoBox = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.3, 0.48, 2, 0.04), deepBlueMat);
      ammoBox.position.set(sx * 0.64, 0.36, -0.02);
      ammoBox.castShadow = true;
      turretYaw.add(ammoBox);

      const ammoHazard = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.28, 2, 0.015), hazardMat);
      ammoHazard.position.set(sx * 0.77, 0.38, -0.02);
      turretYaw.add(ammoHazard);
      const feedChute = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.1, 0.26, 2, 0.02), hazardMat);
      feedChute.position.set(sx * 0.48, 0.48, 0.08);
      feedChute.rotation.z = -sx * 0.32;
      turretYaw.add(feedChute);
    }

    // Rear cooling radiator grilles
    for (let r = -1; r <= 1; r++) {
      const fin = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.05, 0.14, 2, 0.015), darkJointMat);
      fin.position.set(0, 0.32 + r * 0.09, -0.5);
      turretYaw.add(fin);
    }

    // Twin short chunky barrels (recoil independently along +Z / -Z)
    const buildBarrel = (sx: number): THREE.Group => {
      const bGrp = new THREE.Group();
      bGrp.position.set(sx * 0.26, 0.06, 0.36);

      const jacket = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.22, 0.46, 2, 0.04), deepBlueMat);
      jacket.castShadow = true;
      bGrp.add(jacket);

      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.64, 12), darkJointMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.z = 0.32;
      tube.castShadow = true;
      bGrp.add(tube);

      // Orange-amber muzzle brake (weapon signature color stays constant!)
      for (const rz of [0.18, 0.32, 0.46]) {
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
      bGrp.add(brake);

      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0, 0.76);
      bGrp.add(muzzle);
      muzzlePoints.push(muzzle);
      return bGrp;
    };

    barrelL = buildBarrel(-1);
    barrelR = buildBarrel(1);
    weaponPitch.add(barrelL);
    weaponPitch.add(barrelR);

    // T4 Branch Barrel Overlays on barrelL & barrelR (mutually exclusive via setTowerTierVisibility)
    for (const [sx, bGrp] of [
      [-1, barrelL],
      [1, barrelR],
    ] as const) {
      // AC-04A (暴风火神机甲): 3-barrel rotary Gatling cluster + armored clamp collar
      const gatlingGrp = new THREE.Group();
      gatlingGrp.position.set(0, 0, 0.34);

      const clampCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.135, 0.135, 0.075, 12),
        tierTrimMat
      );
      clampCollar.rotation.x = Math.PI / 2;
      clampCollar.castShadow = true;
      gatlingGrp.add(clampCollar);

      const spinCluster = new THREE.Group();
      spinCluster.position.z = 0.24;
      for (let b = 0; b < 3; b++) {
        const ba = (b * Math.PI * 2) / 3;
        const subTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.036, 0.58, 8),
          darkJointMat
        );
        subTube.rotation.x = Math.PI / 2;
        subTube.position.set(Math.cos(ba) * 0.072, Math.sin(ba) * 0.072, 0);
        subTube.castShadow = true;
        spinCluster.add(subTube);
      }
      const midBrace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.118, 0.118, 0.045, 12),
        creamMat
      );
      midBrace.rotation.x = Math.PI / 2;
      midBrace.position.z = 0.12;
      spinCluster.add(midBrace);

      gatlingGrp.add(spinCluster);
      rotaryBarrels.push(spinCluster);

      const gatlingMuzzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.125, 0.08, 12),
        weaponAccentMat
      );
      gatlingMuzzle.rotation.x = Math.PI / 2;
      gatlingMuzzle.position.z = 0.52;
      gatlingGrp.add(gatlingMuzzle);

      tagArcFlyPart(gatlingGrp, sx * 0.9, 1.2, 0.9);
      bGrp.add(gatlingGrp);
      branchBarrelOverlayA.push(gatlingGrp);

      // AC-04B (双联电磁轨炮): Elongated parallel Gauss rail blades with physical air-gap + 3 coil clamps
      const railAssembly = new THREE.Group();
      railAssembly.position.set(0, 0, 0.44);

      const upperRail = new THREE.Mesh(
        new RoundedBoxGeometry(0.085, 0.062, 0.86, 2, 0.02),
        creamMat
      );
      upperRail.position.set(0, 0.072, 0.38);
      upperRail.castShadow = true;
      railAssembly.add(upperRail);

      const lowerRail = new THREE.Mesh(
        new RoundedBoxGeometry(0.085, 0.062, 0.86, 2, 0.02),
        deepBlueMat
      );
      lowerRail.position.set(0, -0.072, 0.38);
      lowerRail.castShadow = true;
      railAssembly.add(lowerRail);

      const coreConductor = new THREE.Mesh(
        new RoundedBoxGeometry(0.034, 0.024, 0.78, 2, 0.008),
        weaponAccentMat
      );
      coreConductor.position.set(0, 0, 0.36);
      railAssembly.add(coreConductor);

      for (const cz of [0.12, 0.38, 0.64]) {
        const coilClamp = new THREE.Mesh(
          new RoundedBoxGeometry(0.16, 0.19, 0.06, 2, 0.018),
          cz === 0.38 ? weaponAccentMat : tierTrimMat
        );
        coilClamp.position.set(0, 0, cz);
        railAssembly.add(coilClamp);
      }

      tagArcFlyPart(railAssembly, sx * 0.8, 1.1, 1.1);
      bGrp.add(railAssembly);
      branchBarrelOverlayB.push(railAssembly);
    }

    // T2 Turret addition: beveled cheek armor shields + top optical rangefinder
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.36, 0.62, 3, 0.05), creamMat);
      cheek.position.set(sx * 0.56, 0.46, 0.14);
      cheek.castShadow = true;
      tagArcFlyPart(cheek, sx * 1.4, 1.3, 0.4);
      t2Turret.add(cheek);
    }
    const opticPod = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.18, 0.32, 2, 0.04), deepBlueMat);
    opticPod.position.set(0, 0.74, 0.05);
    const opticLens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), weaponAccentMat);
    opticLens.rotation.x = Math.PI / 2;
    opticLens.position.set(0, 0, 0.17);
    opticPod.add(opticLens);
    tagArcFlyPart(opticPod, 0, 1.8, -0.3);
    t2Turret.add(opticPod);

    // T3 Elite Module: Oversized twin rotary drum magazines + perforated barrel heat-shrouds
    for (const sx of [-1, 1]) {
      const drumGrp = new THREE.Group();
      drumGrp.position.set(sx * 0.82, 0.04, -0.05);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.34, 14), creamMat);
      drum.rotation.z = Math.PI / 2;
      drum.castShadow = true;
      drumGrp.add(drum);

      const drumRim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.37, 12), tierTrimMat);
      drumRim.rotation.z = Math.PI / 2;
      drumGrp.add(drumRim);

      const feedChute = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.14, 0.26, 2, 0.03), hazardMat);
      feedChute.position.set(-sx * 0.18, 0.12, 0.08);
      drumGrp.add(feedChute);

      tagArcFlyPart(drumGrp, sx * 1.8, 1.4, -0.2);
      t3Turret.add(drumGrp);
    }

    // T3 Secondary Sub-Part: Hinged top radiator heat-sink louvers (顶部开合散热鳍片)
    const topRadiatorGrp = new THREE.Group();
    topRadiatorGrp.position.set(0, 0.325, -0.42);

    const manifold = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 0.07, 0.17, 2, 0.02),
      deepBlueMat
    );
    manifold.position.set(0, 0.025, 0);
    manifold.castShadow = true;
    topRadiatorGrp.add(manifold);

    const thermalCore = new THREE.Mesh(
      new RoundedBoxGeometry(0.54, 0.035, 0.11, 2, 0.012),
      weaponAccentMat
    );
    thermalCore.position.set(0, 0.052, 0);
    topRadiatorGrp.add(thermalCore);

    for (const sx of [-1, 1]) {
      const trimCollar = new THREE.Mesh(
        new RoundedBoxGeometry(0.055, 0.09, 0.19, 2, 0.018),
        tierTrimMat
      );
      trimCollar.position.set(sx * 0.35, 0.035, 0);
      topRadiatorGrp.add(trimCollar);

      const louverPivot = new THREE.Group();
      louverPivot.position.set(sx * 0.16, 0.062, -0.065);
      louverPivot.rotation.x = -0.08;

      const primarySlat = new THREE.Mesh(
        new RoundedBoxGeometry(0.27, 0.036, 0.13, 2, 0.012),
        creamMat
      );
      primarySlat.position.set(0, 0.014, 0.065);
      primarySlat.castShadow = true;
      louverPivot.add(primarySlat);

      const accentSlat = new THREE.Mesh(
        new RoundedBoxGeometry(0.23, 0.026, 0.07, 2, 0.01),
        hazardMat
      );
      accentSlat.position.set(0, 0.034, 0.045);
      louverPivot.add(accentSlat);

      topRadiatorGrp.add(louverPivot);
      registerHingedFlap(hingedFlaps, louverPivot, 'x', -0.58, 3);
    }

    tagArcFlyPart(topRadiatorGrp, 0, 1.75, -0.55);
    t3Turret.add(topRadiatorGrp);

    // T4-A Legendary (AC-04A · 暴风火神机甲): Heavy pauldrons, mecha brow crest, auxiliary drum pods, spinning feed gear & hinged vents
    const browCrest = new THREE.Group();
    browCrest.position.set(0, 0.88, 0.08);
    const visorHelm = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.24, 0.54, 3, 0.07), creamMat);
    visorHelm.castShadow = true;
    browCrest.add(visorHelm);
    const crestHornL = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.24, 0.1, 2, 0.025), tierTrimMat);
    crestHornL.position.set(-0.26, 0.16, 0.22);
    crestHornL.rotation.z = 0.35;
    browCrest.add(crestHornL);
    const crestHornR = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.24, 0.1, 2, 0.025), tierTrimMat);
    crestHornR.position.set(0.26, 0.16, 0.22);
    crestHornR.rotation.z = -0.35;
    browCrest.add(crestHornR);
    tagArcFlyPart(browCrest, 0, 2.2, 0.5);
    t4ATurret.add(browCrest);

    for (const sx of [-1, 1]) {
      const pauldron = new THREE.Group();
      pauldron.position.set(sx * 0.88, 0.64, -0.04);
      const armor = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.38, 0.74, 3, 0.08), creamMat);
      armor.castShadow = true;
      pauldron.add(armor);
      const trim = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.1, 0.78, 2, 0.03), tierTrimMat);
      trim.position.y = -0.14;
      pauldron.add(trim);

      // Hinged heat-sink vent flap on top of pauldron (rotates around hinge edge!)
      const flapPivot = new THREE.Group();
      flapPivot.position.set(0, 0.2, -0.18);
      const flap = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.05, 0.34, 2, 0.015), hazardMat);
      flap.position.set(0, 0.02, 0.16);
      flapPivot.add(flap);
      pauldron.add(flapPivot);
      registerHingedFlap(hingedFlaps, flapPivot, 'x', -0.55, 4, 'A');

      tagArcFlyPart(pauldron, sx * 2.1, 1.9, 0);
      t4ATurret.add(pauldron);

      // Dual upper auxiliary ammo drum pods feeding the rotary Vulcan barrels
      const auxDrum = new THREE.Group();
      auxDrum.position.set(sx * 0.66, 0.52, -0.42);
      const drumShell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12),
        creamMat
      );
      drumShell.rotation.z = Math.PI / 2;
      drumShell.castShadow = true;
      auxDrum.add(drumShell);

      const drumCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.145, 0.33, 10),
        tierTrimMat
      );
      drumCap.rotation.z = Math.PI / 2;
      auxDrum.add(drumCap);

      const feedBridge = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 0.1, 0.22, 2, 0.025),
        hazardMat
      );
      feedBridge.position.set(-sx * 0.12, 0.08, 0.14);
      auxDrum.add(feedBridge);

      tagArcFlyPart(auxDrum, sx * 1.6, 1.6, -0.9);
      t4ATurret.add(auxDrum);
    }

    // Exposed rotary ammo-feed spur gear on rear deck
    const gear = createGearMesh(0.26, 0.09, 10, tierTrimMat);
    gear.position.set(0, 0.58, -0.54);
    tagArcFlyPart(gear, 0, 1.6, -1.5);
    t4ATurret.add(gear);
    specialGear = gear;

    // T4-B Legendary (AC-04B · 双联电磁轨炮): Sniper visor hood, angular rail-shield cowls & dorsal capacitor bank
    const sniperHood = new THREE.Group();
    sniperHood.position.set(0, 0.88, 0.12);
    const hoodCowl = new THREE.Mesh(
      new RoundedBoxGeometry(0.74, 0.22, 0.62, 3, 0.06),
      creamMat
    );
    hoodCowl.castShadow = true;
    sniperHood.add(hoodCowl);

    for (const sx of [-1, 1]) {
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.08, 10),
        weaponAccentMat
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(sx * 0.16, -0.02, 0.31);
      sniperHood.add(lens);
    }
    const dorsalFin = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.16, 0.48, 2, 0.025),
      tierTrimMat
    );
    dorsalFin.position.set(0, 0.15, -0.02);
    sniperHood.add(dorsalFin);
    tagArcFlyPart(sniperHood, 0, 2.2, 0.6);
    t4BTurret.add(sniperHood);

    for (const sx of [-1, 1]) {
      const railCowl = new THREE.Group();
      railCowl.position.set(sx * 0.86, 0.6, -0.02);
      const cowlPlate = new THREE.Mesh(
        new RoundedBoxGeometry(0.26, 0.34, 0.78, 3, 0.06),
        creamMat
      );
      cowlPlate.castShadow = true;
      railCowl.add(cowlPlate);

      const lowerStrip = new THREE.Mesh(
        new RoundedBoxGeometry(0.29, 0.09, 0.82, 2, 0.025),
        tierTrimMat
      );
      lowerStrip.position.y = -0.14;
      railCowl.add(lowerStrip);

      const sideBadge = new THREE.Mesh(
        new RoundedBoxGeometry(0.05, 0.12, 0.36, 2, 0.015),
        hazardMat
      );
      sideBadge.position.set(sx * 0.13, 0.04, 0.08);
      railCowl.add(sideBadge);

      tagArcFlyPart(railCowl, sx * 2.0, 1.8, 0.1);
      t4BTurret.add(railCowl);
    }

    const capBank = new THREE.Group();
    capBank.position.set(0, 0.62, -0.52);
    const bankBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 0.3, 0.38, 3, 0.05),
      deepBlueMat
    );
    bankBody.castShadow = true;
    capBank.add(bankBody);

    for (const cx of [-0.2, 0, 0.2]) {
      const capCell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.28, 10),
        weaponAccentMat
      );
      capCell.position.set(cx, 0.06, -0.14);
      capBank.add(capCell);
    }

    for (const sx of [-1, 1]) {
      const finPivot = new THREE.Group();
      finPivot.position.set(sx * 0.34, 0.12, 0);
      const finBlade = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.055, 0.28, 2, 0.018),
        creamMat
      );
      finBlade.position.set(sx * 0.11, 0.02, 0);
      finBlade.castShadow = true;
      finPivot.add(finBlade);

      const finTip = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.065, 0.24, 2, 0.015),
        tierTrimMat
      );
      finTip.position.set(sx * 0.21, 0.02, 0);
      finPivot.add(finTip);

      capBank.add(finPivot);
      registerHingedFlap(hingedFlaps, finPivot, 'z', -sx * 0.48, 4, 'B');
    }
    tagArcFlyPart(capBank, 0, 1.8, -1.4);
    t4BTurret.add(capBank);
  } else if (type === 'mortar') {
    // ==================== 2. PULSE MORTAR: TALL, HEAVY TUBE, SUPPORT ARMS & CAPACITOR ====================
    turretYaw.position.y = 0.34;
    weaponPitch.position.set(0, 0.62, -0.06);
    weaponPitch.rotation.x = -0.58; // High parabolic elevation angle!
    turretYaw.add(weaponPitch);
    turretYaw.add(t2Turret);
    turretYaw.add(t3Turret);
    turretYaw.add(t4ATurret);
    turretYaw.add(t4BTurret);

    // Tall twin support A-frame stanchions
    for (const sx of [-1, 1]) {
      const upright = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.76, 0.58, 3, 0.05), deepBlueMat);
      upright.position.set(sx * 0.44, 0.38, -0.04);
      upright.castShadow = true;
      turretYaw.add(upright);

      const sidePlate = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.54, 0.44, 2, 0.035), creamMat);
      sidePlate.position.set(sx * 0.57, 0.4, -0.04);
      sidePlate.castShadow = true;
      turretYaw.add(sidePlate);

      // Axle trunnion cap
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12), tierTrimMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(sx * 0.64, 0.62, -0.06);
      turretYaw.add(axle);
    }

    // Glowing rear pulse energy storage chamber (cyan weapon color + tier core)
    const capHousing = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.42, 0.44, 3, 0.06), creamMat);
    capHousing.position.set(0, 0.32, -0.46);
    capHousing.castShadow = true;
    turretYaw.add(capHousing);

    const energyCell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.52, 14), weaponAccentMat);
    energyCell.rotation.z = Math.PI / 2;
    energyCell.position.set(0, 0.36, -0.64);
    turretYaw.add(energyCell);

    const tierCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMaterial);
    tierCore.position.set(0, 0.58, -0.48);
    turretYaw.add(tierCore);
    idleCore = tagIdleCore(tierCore);

    // Thick heavy mortar barrel assembly inside weaponPitch (recoils along its local Z!)
    const tubeGrp = new THREE.Group();
    const breech = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.48, 14), deepBlueMat);
    breech.rotation.x = Math.PI / 2;
    breech.castShadow = true;
    tubeGrp.add(breech);

    const mainBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.32, 0.78, 16), creamMat);
    mainBarrel.rotation.x = Math.PI / 2;
    mainBarrel.position.z = 0.52;
    mainBarrel.castShadow = true;
    tubeGrp.add(mainBarrel);

    for (const sx of [-0.34, 0.34]) {
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
    const boreRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 10, 20), weaponAccentMat);
    boreRing.position.z = 0.91;
    tubeGrp.add(boreRing);

    const boreDark = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.12, 14), darkJointMat);
    boreDark.rotation.x = Math.PI / 2;
    boreDark.position.z = 0.88;
    tubeGrp.add(boreDark);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, 0.98);
    tubeGrp.add(muzzle);
    muzzlePoints.push(muzzle);

    // PM-04A (天穹聚变巨炮): Heavy fusion siege barrel collar + 3 plasma containment coils (boreDark kept unobstructed!)
    const fusionCollarGrp = new THREE.Group();
    for (const cz of [0.28, 0.52, 0.76]) {
      const plasmaToroid = new THREE.Mesh(
        new THREE.TorusGeometry(0.355, 0.042, 10, 20),
        weaponAccentMat
      );
      plasmaToroid.position.z = cz;
      fusionCollarGrp.add(plasmaToroid);
    }
    for (const sx of [-1, 1]) {
      const hydroBuffer = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.16, 0.64, 2, 0.03),
        creamMat
      );
      hydroBuffer.position.set(sx * 0.35, 0, 0.48);
      hydroBuffer.castShadow = true;
      fusionCollarGrp.add(hydroBuffer);
    }
    const crownedMuzzle = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.05, 10, 20),
      tierTrimMat
    );
    crownedMuzzle.position.z = 0.93;
    fusionCollarGrp.add(crownedMuzzle);
    tagArcFlyPart(fusionCollarGrp, 0, 1.5, 1.2);
    tubeGrp.add(fusionCollarGrp);
    branchBarrelOverlayA.push(fusionCollarGrp);

    mortarTube = tubeGrp;
    weaponPitch.add(tubeGrp);

    // T2 Standard: Hydraulic recoil cylinders & heavy front blast apron
    const frontApron = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.34, 0.18, 3, 0.05), creamMat);
    frontApron.position.set(0, 0.24, 0.46);
    frontApron.rotation.x = -0.35;
    frontApron.castShadow = true;
    const apronStripe = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.08, 0.06, 2, 0.015), hazardMat);
    apronStripe.position.set(0, 0.06, 0.09);
    frontApron.add(apronStripe);
    tagArcFlyPart(frontApron, 0, 1.3, 1.4);
    t2Turret.add(frontApron);

    // T3 Elite: Twin lateral cyan plasma accumulator tanks + articulated rangefinder mast
    for (const sx of [-1, 1]) {
      const pod = new THREE.Group();
      pod.position.set(sx * 0.78, 0.48, -0.14);
      const shell = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.52, 0.52, 3, 0.06), creamMat);
      shell.castShadow = true;
      pod.add(shell);
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.44, 12), weaponAccentMat);
      coil.position.set(sx * 0.08, 0.04, 0);
      pod.add(coil);
      const cap = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.08, 0.54, 2, 0.02), tierTrimMat);
      cap.position.y = 0.27;
      pod.add(cap);
      tagArcFlyPart(pod, sx * 1.8, 1.6, -0.3);
      t3Turret.add(pod);
    }

    // T3 Secondary Sub-Part: Articulated side optical rangefinder arm (光学测距摇臂)
    const rangefinderArm = new THREE.Group();
    rangefinderArm.position.set(-0.8, 0.8, -0.06);

    const mountJoint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.115, 0.09, 10),
      deepBlueMat
    );
    mountJoint.position.set(0, 0.035, 0);
    mountJoint.castShadow = true;
    rangefinderArm.add(mountJoint);

    const pivotPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.15, 10),
      rivetMat
    );
    pivotPin.rotation.z = Math.PI / 2;
    pivotPin.position.set(0, 0.075, 0.01);
    rangefinderArm.add(pivotPin);

    const boomArm = new THREE.Mesh(
      new RoundedBoxGeometry(0.085, 0.28, 0.1, 2, 0.024),
      darkJointMat
    );
    boomArm.position.set(-0.04, 0.19, 0.08);
    boomArm.rotation.set(0.4, 0, 0.14);
    boomArm.castShadow = true;
    rangefinderArm.add(boomArm);

    const elbowCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.11, 10),
      tierTrimMat
    );
    elbowCap.rotation.z = Math.PI / 2;
    elbowCap.position.set(-0.06, 0.31, 0.16);
    rangefinderArm.add(elbowCap);

    const sensorHead = new THREE.Group();
    sensorHead.position.set(-0.06, 0.34, 0.19);
    sensorHead.rotation.x = -0.18;

    const podBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.21, 0.17, 0.27, 2, 0.04),
      creamMat
    );
    podBody.castShadow = true;
    sensorHead.add(podBody);

    const visorTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.23, 0.048, 0.21, 2, 0.015),
      tierTrimMat
    );
    visorTrim.position.set(0, 0.095, 0.02);
    sensorHead.add(visorTrim);

    const lensBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.082, 0.08, 12),
      deepBlueMat
    );
    lensBarrel.rotation.x = Math.PI / 2;
    lensBarrel.position.set(-0.02, -0.01, 0.145);
    sensorHead.add(lensBarrel);

    const opticLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.045, 12),
      weaponAccentMat
    );
    opticLens.rotation.x = Math.PI / 2;
    opticLens.position.set(-0.02, -0.01, 0.17);
    sensorHead.add(opticLens);

    const laserNode = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.05, 10),
      coreMaterial
    );
    laserNode.rotation.x = Math.PI / 2;
    laserNode.position.set(0.058, 0.032, 0.14);
    sensorHead.add(laserNode);

    rangefinderArm.add(sensorHead);
    tagArcFlyPart(rangefinderArm, -1.65, 1.95, 0.45);
    t3Turret.add(rangefinderArm);

    // T4-A Legendary (PM-04A · 天穹聚变巨炮): Siege mecha carapace, hinged capacitor bay doors & calibration gear
    const siegeCrown = new THREE.Group();
    siegeCrown.position.set(0, 0.96, -0.26);
    const arch = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.24, 0.52, 3, 0.07), creamMat);
    arch.castShadow = true;
    siegeCrown.add(arch);
    const goldCrest = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.14, 0.58, 2, 0.03), tierTrimMat);
    goldCrest.position.y = 0.14;
    siegeCrown.add(goldCrest);
    tagArcFlyPart(siegeCrown, 0, 2.3, -0.5);
    t4ATurret.add(siegeCrown);

    // Hinged rear capacitor bay doors (swing open on fire / idle breath!)
    for (const sx of [-1, 1]) {
      const doorHinge = new THREE.Group();
      doorHinge.position.set(sx * 0.36, 0.52, -0.7);
      const door = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.38, 0.08, 2, 0.025), tierTrimMat);
      door.position.set(-sx * 0.15, 0, -0.04);
      doorHinge.add(door);
      tagArcFlyPart(doorHinge, sx * 1.5, 1.5, -1.6);
      t4ATurret.add(doorHinge);
      registerHingedFlap(hingedFlaps, doorHinge, 'y', -sx * 0.58, 4, 'A');
    }

    const elevGear = createGearMesh(0.28, 0.08, 12, tierTrimMat);
    elevGear.rotation.y = Math.PI / 2;
    elevGear.position.set(0.68, 0.62, -0.06);
    tagArcFlyPart(elevGear, 1.8, 1.6, 0);
    t4ATurret.add(elevGear);
    specialGear = elevGear;

    // T4-B Legendary (PM-04B · 集束火箭弹巢): Twin 6-cell beveled MLRS missile pods + central targeter dome
    for (const sx of [-1, 1]) {
      const podGrp = new THREE.Group();
      podGrp.position.set(sx * 0.46, 0.84, 0.02);
      podGrp.rotation.x = -0.36;

      const podArmor = new THREE.Mesh(
        new RoundedBoxGeometry(0.5, 0.42, 0.68, 3, 0.06),
        creamMat
      );
      podArmor.castShadow = true;
      podGrp.add(podArmor);

      const podGoldBand = new THREE.Mesh(
        new RoundedBoxGeometry(0.53, 0.09, 0.62, 2, 0.022),
        tierTrimMat
      );
      podGoldBand.position.y = -0.14;
      podGrp.add(podGoldBand);

      const tubePlate = new THREE.Mesh(
        new RoundedBoxGeometry(0.42, 0.34, 0.06, 2, 0.02),
        deepBlueMat
      );
      tubePlate.position.z = 0.32;
      podGrp.add(tubePlate);

      // 2x3 = 6 closed launch tubes tipped with warhead nose cones
      for (const col of [-1, 0, 1]) {
        for (const row of [-0.5, 0.5]) {
          const cx = col * 0.125;
          const cy = row * 0.14;
          const cellTube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.056, 0.056, 0.08, 10),
            darkJointMat
          );
          cellTube.rotation.x = Math.PI / 2;
          cellTube.position.set(cx, cy, 0.33);
          podGrp.add(cellTube);

          const warheadCone = new THREE.Mesh(
            new THREE.ConeGeometry(0.045, 0.09, 10),
            (col + (row > 0 ? 1 : 0) + 2) % 2 === 0 ? hazardMat : weaponAccentMat
          );
          warheadCone.rotation.x = Math.PI / 2;
          warheadCone.position.set(cx, cy, 0.38);
          podGrp.add(warheadCone);
        }
      }

      // Top hinged reload hatch
      const hatchPivot = new THREE.Group();
      hatchPivot.position.set(0, 0.21, -0.22);
      const hatchLid = new THREE.Mesh(
        new RoundedBoxGeometry(0.42, 0.05, 0.38, 2, 0.018),
        tierTrimMat
      );
      hatchLid.position.set(0, 0.02, 0.18);
      hatchLid.castShadow = true;
      hatchPivot.add(hatchLid);
      podGrp.add(hatchPivot);
      registerHingedFlap(hingedFlaps, hatchPivot, 'x', -0.62, 4, 'B');

      const podMuzzle = new THREE.Object3D();
      podMuzzle.position.set(0, 0, 0.44);
      podGrp.add(podMuzzle);
      muzzlePoints.push(podMuzzle);

      tagArcFlyPart(podGrp, sx * 1.9, 2.0, 0.4);
      t4BTurret.add(podGrp);
    }

    const targeterDome = new THREE.Group();
    targeterDome.position.set(0, 1.12, -0.18);
    const domeBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.4, 0.24, 0.36, 3, 0.06),
      creamMat
    );
    domeBody.castShadow = true;
    targeterDome.add(domeBody);

    const scannerLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.07, 12),
      weaponAccentMat
    );
    scannerLens.rotation.x = Math.PI / 2;
    scannerLens.position.set(0, 0, 0.18);
    targeterDome.add(scannerLens);

    const dishFin = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.1, 0.24, 2, 0.02),
      tierTrimMat
    );
    dishFin.position.set(0, 0.15, -0.02);
    targeterDome.add(dishFin);

    tagArcFlyPart(targeterDome, 0, 2.3, -0.4);
    t4BTurret.add(targeterDome);
  } else {
    // ==================== 3. MAGNETIC RESTRAINT TOWER: UPRIGHT GANTRY & ROTATING RINGS ====================
    turretYaw.position.y = 0.34;
    weaponPitch.position.set(0, 1.15, 0);
    turretYaw.add(weaponPitch);
    turretYaw.add(t2Turret);
    turretYaw.add(t3Turret);
    turretYaw.add(t4ATurret);
    turretYaw.add(t4BTurret);

    // Central upright gantry hub
    const pedCore = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 0.44, 8), creamMat);
    pedCore.position.y = 0.22;
    pedCore.castShadow = true;
    turretYaw.add(pedCore);

    // 3 Upright structural gantry arms holding the suspended magnetic assembly
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const pylon = new THREE.Group();
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.16, 1.05, 0.22, 2, 0.04), deepBlueMat);
      post.position.set(0, 0.66, 0);
      post.rotation.x = -0.14;
      post.castShadow = true;
      pylon.add(post);

      const clampPivot = new THREE.Group();
      clampPivot.position.set(0, 1.14, -0.08);
      const jaw = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.26, 0.18, 2, 0.03), creamMat);
      jaw.castShadow = true;
      clampPivot.add(jaw);
      const emitterTip = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.18, 0.08, 2, 0.02), weaponAccentMat);
      emitterTip.position.set(0, 0, -0.11);
      clampPivot.add(emitterTip);
      pylon.add(clampPivot);
      magClamps.push(clampPivot);

      const coilCollar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 6, 12), weaponAccentMat);
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
      turretYaw.add(capGlow);
    }

    // Primary rotating purple magnetic ring (mounted inside weaponPitch at y = 1.15!)
    const outerRingGrp = new THREE.Group();
    const torus1 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.065, 10, 28), weaponAccentMat);
    torus1.rotation.x = Math.PI / 2;
    torus1.castShadow = true;
    outerRingGrp.add(torus1);

    for (let n = 0; n < 4; n++) {
      const a = (n * Math.PI) / 2;
      const node = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.14, 2, 0.03), tierTrimMat);
      node.position.set(Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46);
      outerRingGrp.add(node);
    }
    weaponPitch.add(outerRingGrp);
    magRingOuter = outerRingGrp;

    // Faceted tier-colored inner core (rotates rapidly before each magnetic pulse!)
    const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), coreMaterial);
    coreMesh.castShadow = true;
    weaponPitch.add(coreMesh);
    magInnerCore = coreMesh;
    idleCore = tagIdleCore(coreMesh);

    const muzzle = new THREE.Object3D();
    weaponPitch.add(muzzle);
    muzzlePoints.push(muzzle);

    // MR-04A (奇点引力中枢): Gyroscopic singularity gimbals + 4 gravity-well emitters inside weaponPitch (y = 1.15 preserved!)
    const gyroGrp = new THREE.Group();
    const outerGimbal = new THREE.Group();
    outerGimbal.rotation.z = Math.PI / 4;
    const outerGimbalMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.038, 10, 28),
      tierTrimMat
    );
    outerGimbalMesh.castShadow = true;
    outerGimbal.add(outerGimbalMesh);

    for (let g = 0; g < 4; g++) {
      const ga = (g * Math.PI) / 2;
      const gravNode = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.065, 0),
        weaponAccentMat
      );
      gravNode.position.set(Math.cos(ga) * 0.58, Math.sin(ga) * 0.58, 0);
      outerGimbal.add(gravNode);
    }
    gyroGrp.add(outerGimbal);
    rotaryBarrels.push(outerGimbal);

    const innerGimbal = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.032, 10, 24),
      darkJointMat
    );
    innerGimbal.rotation.x = -Math.PI / 4;
    gyroGrp.add(innerGimbal);
    rotaryBarrels.push(innerGimbal);

    tagArcFlyPart(gyroGrp, 0, 1.6, 0);
    weaponPitch.add(gyroGrp);
    branchBarrelOverlayA.push(gyroGrp);

    // T2 Standard: Armored coil cowls around the mid-section
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.PI / 3;
      const shield = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.44, 0.14, 2, 0.04), creamMat);
      shield.position.set(Math.cos(ang) * 0.54, 0.54, Math.sin(ang) * 0.54);
      shield.rotation.y = -ang + Math.PI / 2;
      shield.castShadow = true;
      tagArcFlyPart(shield, Math.cos(ang) * 1.5, 1.4, Math.sin(ang) * 1.5);
      t2Turret.add(shield);
    }

    // T3 Elite: Second tilted counter-rotating magnetic containment ring + flux capacitors
    const innerRingGrp = new THREE.Group();
    innerRingGrp.position.set(0, 1.15, 0);
    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 10, 32), tierTrimMat);
    torus2.rotation.x = Math.PI / 3;
    innerRingGrp.add(torus2);
    tagArcFlyPart(innerRingGrp, 0, 2.2, 0);
    t3Turret.add(innerRingGrp);
    magRingInner = innerRingGrp;

    // T3 Secondary Sub-Part: 3-Way radial magnetic flux amplifier pylons (三向磁通增幅柱)
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.PI / 3;
      const fluxPylon = new THREE.Group();
      fluxPylon.position.set(Math.cos(ang) * 0.85, 0, Math.sin(ang) * 0.85);
      fluxPylon.rotation.y = -ang + Math.PI / 2;

      const bridgeStrut = new THREE.Mesh(
        new RoundedBoxGeometry(0.15, 0.12, 0.42, 2, 0.03),
        deepBlueMat
      );
      bridgeStrut.position.set(0, 0.12, -0.16);
      bridgeStrut.castShadow = true;
      fluxPylon.add(bridgeStrut);

      const baseShoe = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.18, 0.22, 2, 0.04),
        creamMat
      );
      baseShoe.position.set(0, 0.2, 0);
      baseShoe.castShadow = true;
      fluxPylon.add(baseShoe);

      const coreRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.08, 0.86, 10),
        deepBlueMat
      );
      coreRod.position.set(0, 0.68, 0);
      coreRod.castShadow = true;
      fluxPylon.add(coreRod);

      const coilLower = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.028, 8, 18),
        weaponAccentMat
      );
      coilLower.rotation.x = Math.PI / 2;
      coilLower.position.set(0, 0.5, 0);
      fluxPylon.add(coilLower);

      const coilUpper = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.026, 8, 18),
        tierTrimMat
      );
      coilUpper.rotation.x = Math.PI / 2;
      coilUpper.position.set(0, 0.78, 0);
      fluxPylon.add(coilUpper);

      const finialCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.085, 0.11, 8),
        creamMat
      );
      finialCollar.position.set(0, 1.13, 0);
      fluxPylon.add(finialCollar);

      const fluxTip = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.065, 0),
        weaponAccentMat
      );
      fluxTip.position.set(0, 1.22, 0);
      fluxPylon.add(fluxTip);

      tagArcFlyPart(fluxPylon, Math.cos(ang) * 1.65, 1.75, Math.sin(ang) * 1.65);
      t3Turret.add(fluxPylon);
    }

    // T4-A Legendary (MR-04A · 奇点引力中枢): Spire crown petals, 3 gravity anchor buttresses & lower drive gear
    const crownHalo = new THREE.Group();
    crownHalo.position.set(0, 1.68, 0);
    const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.16, 6), creamMat);
    crownRing.castShadow = true;
    crownHalo.add(crownRing);

    for (let p = 0; p < 4; p++) {
      const pa = (p * Math.PI) / 2;
      const petalPivot = new THREE.Group();
      petalPivot.position.set(Math.cos(pa) * 0.38, 0, Math.sin(pa) * 0.38);
      petalPivot.rotation.y = -pa;
      const petal = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.34, 0.08, 2, 0.025), tierTrimMat);
      petal.position.set(0.1, 0.14, 0);
      petal.rotation.z = -0.35;
      petalPivot.add(petal);
      crownHalo.add(petalPivot);
      registerHingedFlap(hingedFlaps, petalPivot, 'z', -0.48, 4, 'A');
    }
    tagArcFlyPart(crownHalo, 0, 2.5, 0);
    t4ATurret.add(crownHalo);

    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const buttress = new THREE.Group();
      buttress.position.set(Math.cos(ang) * 0.58, 0.88, Math.sin(ang) * 0.58);
      buttress.rotation.y = -ang + Math.PI / 2;

      const finBody = new THREE.Mesh(
        new RoundedBoxGeometry(0.16, 0.52, 0.24, 2, 0.035),
        creamMat
      );
      finBody.castShadow = true;
      buttress.add(finBody);

      const finCap = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 0.1, 0.28, 2, 0.02),
        tierTrimMat
      );
      finCap.position.y = 0.24;
      buttress.add(finCap);

      tagArcFlyPart(buttress, Math.cos(ang) * 1.5, 1.5, Math.sin(ang) * 1.5);
      t4ATurret.add(buttress);
    }

    const driveGear = createGearMesh(0.56, 0.08, 14, tierTrimMat);
    driveGear.rotation.x = Math.PI / 2;
    driveGear.position.set(0, 0.48, 0);
    tagArcFlyPart(driveGear, 0, 1.6, 1.4);
    t4ATurret.add(driveGear);
    specialGear = driveGear;

    // T4-B Legendary (MR-04B · 高压电弧矩阵): 3 tall Tesla transformer spires + high-voltage arc crown
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const spire = new THREE.Group();
      spire.position.set(Math.cos(ang) * 0.62, 0, Math.sin(ang) * 0.62);

      const xfmrBlock = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.42, 0.24, 2, 0.04),
        creamMat
      );
      xfmrBlock.position.y = 0.86;
      xfmrBlock.castShadow = true;
      spire.add(xfmrBlock);

      for (const iy of [1.16, 1.3, 1.44]) {
        const insulatorDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 0.045, 12),
          weaponAccentMat
        );
        insulatorDisc.position.y = iy;
        spire.add(insulatorDisc);
      }

      const upperRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.072, 0.42, 10),
        tierTrimMat
      );
      upperRod.position.y = 1.4;
      spire.add(upperRod);

      const arcOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 12, 10),
        coreMaterial
      );
      arcOrb.position.y = 1.68;
      spire.add(arcOrb);

      tagArcFlyPart(spire, Math.cos(ang) * 1.8, 2.0, Math.sin(ang) * 1.8);
      t4BTurret.add(spire);
    }

    const teslaCrown = new THREE.Group();
    teslaCrown.position.set(0, 1.68, 0);
    const hvBus = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.046, 10, 24),
      tierTrimMat
    );
    hvBus.rotation.x = Math.PI / 2;
    hvBus.castShadow = true;
    teslaCrown.add(hvBus);

    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.PI / 3;
      const prongGrp = new THREE.Group();
      prongGrp.position.set(Math.cos(ang) * 0.48, 0, Math.sin(ang) * 0.48);
      prongGrp.rotation.y = -ang + Math.PI / 2;

      const prong = new THREE.Mesh(
        new RoundedBoxGeometry(0.1, 0.08, 0.26, 2, 0.02),
        creamMat
      );
      prong.castShadow = true;
      prongGrp.add(prong);

      const arcNode = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.06, 0),
        weaponAccentMat
      );
      arcNode.position.set(0, 0, -0.14);
      prongGrp.add(arcNode);
      teslaCrown.add(prongGrp);

      const ventPivot = new THREE.Group();
      ventPivot.position.set(Math.cos(ang) * 0.62, 0.04, Math.sin(ang) * 0.62);
      ventPivot.rotation.y = -ang + Math.PI / 2;
      const ventFlap = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 0.045, 0.22, 2, 0.015),
        tierTrimMat
      );
      ventFlap.position.set(0, 0.02, 0.1);
      ventPivot.add(ventFlap);
      teslaCrown.add(ventPivot);
      registerHingedFlap(hingedFlaps, ventPivot, 'x', -0.52, 4, 'B');
    }
    tagArcFlyPart(teslaCrown, 0, 2.5, 0);
    t4BTurret.add(teslaCrown);
  }

  const rig: TowerRig = {
    root,
    baseGroup,
    turretYaw,
    weaponPitch,
    barrelL,
    barrelR,
    mortarTube,
    magInnerCore,
    magRingOuter,
    magRingInner,
    magClamps,
    specialGear,
    idleCore,
    hingedFlaps,
    muzzlePoints,
    rotaryBarrels,
    branchBarrelOverlayA,
    branchBarrelOverlayB,
    tierGroups: {
      t2: new THREE.Group(),
      t3: t3Turret,
      t4: t4ATurret, // Alias preserved for 100% backward compatibility
      t4A: t4ATurret,
      t4B: t4BTurret,
    },
    tierAccentMaterials,
    coreMaterial,
  };

  // Group both t2Base & t2Turret visibility cleanly via helper sync
  rig.tierGroups.t2.userData.subGroups = [t2Base, t2Turret];
  applyTowerTierVisuals(rig, initialTier);

  return rig;
}

export function setTowerTierVisibility(
  rig: TowerRig,
  tier: TowerTier,
  branch: TowerBranch = 'A'
): void {
  const t2Subs = (rig.tierGroups.t2.userData.subGroups as THREE.Group[]) ?? [];
  const showT2 = tier >= 2;
  rig.tierGroups.t2.visible = showT2;
  for (const g of t2Subs) {
    g.visible = showT2;
  }
  rig.tierGroups.t3.visible = tier >= 3;

  const showT4A = tier >= 4 && branch !== 'B';
  const showT4B = tier >= 4 && branch === 'B';
  rig.tierGroups.t4A.visible = showT4A;
  rig.tierGroups.t4B.visible = showT4B;
  rig.tierGroups.t4.visible = showT4A; // t4 aliases t4A

  for (const obj of rig.branchBarrelOverlayA ?? []) {
    obj.visible = showT4A;
  }
  for (const obj of rig.branchBarrelOverlayB ?? []) {
    obj.visible = showT4B;
  }

  // Mortar T4-B (集束火箭弹巢) replaces single mortarTube with twin 6-cell MLRS pods
  if (rig.mortarTube) {
    rig.mortarTube.visible = !showT4B;
  }
}

export function applyTowerTierVisuals(
  rig: TowerRig,
  tier: TowerTier,
  options?: { visibilityOnly?: boolean; branch?: TowerBranch }
): void {
  setTowerTierVisibility(rig, tier, options?.branch ?? 'A');
  if (options?.visibilityOnly) {
    return;
  }

  const meta = TIER_META[tier];

  // Update tier color ONLY on trim, nameplate, core & rim light (never dyeing main armor!)
  rig.coreMaterial.color.setHex(meta.color);
  rig.coreMaterial.emissive.setHex(meta.color);

  // Index 0 is creamMat (update rim light only!), index 1 is tierTrimMat (update color + emissive + rim)
  setMaterialRimColor(rig.tierAccentMaterials[0], meta.rimColor, tier === 4 ? 0.48 : 0.3);
  const trimMat = rig.tierAccentMaterials[1];
  trimMat.color.setHex(meta.color);
  trimMat.emissive.setHex(meta.color);
  setMaterialRimColor(trimMat, meta.rimColor, 0.45);
}

export function getTierPartObjects(
  rig: TowerRig,
  tier: TowerTier,
  branch: TowerBranch = 'A'
): THREE.Object3D[] {
  if (tier === 2) {
    const subs = (rig.tierGroups.t2.userData.subGroups as THREE.Group[]) ?? [];
    return subs.flatMap((g) => [...g.children]);
  }
  if (tier === 3) return [...rig.tierGroups.t3.children];
  if (tier === 4) {
    const activeGroup = branch === 'B' ? rig.tierGroups.t4B : rig.tierGroups.t4A;
    const overlays =
      branch === 'B' ? (rig.branchBarrelOverlayB ?? []) : (rig.branchBarrelOverlayA ?? []);
    return [...activeGroup.children, ...overlays];
  }
  return [];
}

/**
 * Creates a clean translucent cyan/amber hologram preview model for build pad selection!
 */
export function createGhostTowerPreview(type: TowerType): THREE.Group {
  const rig = createTowerRig(type, 1);
  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });

  rig.root.traverse((obj) => {
    obj.layers.set(1);
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.material = ghostMat;
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
  return rig.root;
}
