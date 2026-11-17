import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BUILD_PADS, ROAD_SAMPLES, sampleLaneAtDistance } from '../config/gameConfig';
import type {
  BuildPadConfig,
  CompiledLane,
  MapMechanismConfig,
  MapMechanismInstance,
  PathSample,
  PortalConfig,
  StageConfig,
  Vec3Like,
} from '../types';
import { getToonTextures, makeToonMaterial, PALETTE } from './ToonMaterials';

function setLayerRecursive(obj: THREE.Object3D, layer: number): void {
  obj.layers.set(layer);
  for (const child of obj.children) {
    setLayerRecursive(child, layer);
  }
}

export function disposeObject3DTree(rootObj: THREE.Object3D): void {
  if (rootObj.parent) {
    rootObj.parent.remove(rootObj);
  }
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  rootObj.traverse((obj) => {
    if (obj instanceof THREE.Sprite) {
      // NEVER dispose THREE.Sprite.geometry (Three.js global singleton BufferGeometry!)
      if (obj.material && !obj.material.userData?.shared) {
        mats.add(obj.material);
      }
    } else if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Points ||
      obj instanceof THREE.Line
    ) {
      if (obj.geometry && !obj.geometry.userData?.shared) {
        geos.add(obj.geometry);
      }
      const matList = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of matList) {
        if (m && !m.userData?.shared) {
          mats.add(m);
        }
      }
    }
  });
  for (const g of geos) {
    g.dispose();
  }
  // NEVER dispose m.map or m.gradientMap — all shared procedural textures live in singleton getToonTextures()!
  for (const m of mats) {
    m.dispose();
  }
}

export interface PadVisual {
  config: BuildPadConfig;
  baseY: number;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  hopPhaseOffset: number;
}

export interface ReturnBeaconRig {
  group: THREE.Group;
  dishGroup: THREE.Group;
  coreMesh: THREE.Mesh;
  statusLampMats: THREE.MeshStandardMaterial[];
  signalFins: THREE.Group[];
  skyBeam: THREE.Mesh;
}

export interface MineEntranceRig {
  group: THREE.Group;
  hazardRotors: THREE.Object3D[];
  hazardLampMats: THREE.MeshStandardMaterial[];
  fissureGroup: THREE.Group;
  fissureMat: THREE.MeshBasicMaterial;
}

export interface SupplyChestRig {
  group: THREE.Group;
  lidPivot: THREE.Group;
  claspMesh: THREE.Mesh;
  innerGlow: THREE.Mesh;
}

export interface LunarStationEnvironment {
  root: THREE.Group;
  vfxRoot: THREE.Group;
  stageConfig?: StageConfig;
  pads: Map<string, PadVisual>;
  mechanisms: Map<string, MapMechanismInstance>;
  speedZoneVisuals: THREE.Mesh[];
  craterRing?: THREE.Object3D;
  beacon: ReturnBeaconRig;
  entrance: MineEntranceRig;
  entrances: MineEntranceRig[];
  rangeRing: THREE.Mesh;
  selectRing: THREE.Mesh;
  legendaryBackdrop: THREE.Mesh;
  supplyChest: SupplyChestRig;
  dispose: () => void;
}

function buildRoadRibbonGeometry(
  samples: PathSample[],
  halfWidth: number,
  yHeight = 0.032
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const nx = -s.tz;
    const nz = s.tx;

    const lx = s.x + nx * halfWidth;
    const lz = s.z + nz * halfWidth;
    const rx = s.x - nx * halfWidth;
    const rz = s.z - nz * halfWidth;

    positions.push(lx, yHeight, lz, rx, yHeight, rz);
    normals.push(0, 1, 0, 0, 1, 0);
    const u = s.dist * 0.36;
    uvs.push(u, 0, u, 1);

    if (i < samples.length - 1) {
      const b = i * 2;
      indices.push(b, b + 2, b + 1);
      indices.push(b + 1, b + 2, b + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Real 3D beveled Gold Coin (embossed rim + raised center ingot bar, NO flat SVG!).
 */
export function create3DGoldCoinMesh(): THREE.Group {
  const coin = new THREE.Group();
  const goldMat = makeToonMaterial(0xfbbf24, {
    emissive: 0xd97706,
    emissiveIntensity: 0.28,
    metallicStep: true,
  });
  const rimMat = makeToonMaterial(0xfef08a, { metallicStep: true });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), goldMat);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  coin.add(disc);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.038, 8, 12), rimMat);
  coin.add(rim);

  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.22, 0.11, 2, 0.02), rimMat);
  coin.add(bar);

  return coin;
}

/**
 * Real 3D multi-faceted gem-cut Energy Crystal (hexagonal prism + double pyramid crown, NO flat SVG!).
 */
export function create3DEnergyCrystalMesh(): THREE.Group {
  const crystal = new THREE.Group();
  const gemMat = makeToonMaterial(0x38bdf8, {
    emissive: 0x0284c7,
    emissiveIntensity: 0.42,
    rimColor: 0xe0f2fe,
    rimStrength: 0.55,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 6), gemMat);
  body.castShadow = true;
  crystal.add(body);

  const topCrown = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 6), gemMat);
  topCrown.position.y = 0.28;
  crystal.add(topCrown);

  const botPoint = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 6), gemMat);
  botPoint.rotation.x = Math.PI;
  botPoint.position.y = -0.26;
  crystal.add(botPoint);

  return crystal;
}

function buildReturnBeacon(beaconPos?: Vec3Like): ReturnBeaconRig {
  const group = new THREE.Group();
  const endSample = ROAD_SAMPLES[ROAD_SAMPLES.length - 1];
  const bx = beaconPos ? beaconPos.x : endSample.x + 1.15;
  const by = beaconPos?.y ?? 0;
  const bz = beaconPos ? beaconPos.z : endSample.z;
  group.position.set(bx, by, bz);

  const creamMat = makeToonMaterial(PALETTE.CREAM_ARMOR, { rimColor: 0x7dd3fc, rimStrength: 0.32 });
  const deepBlueMat = makeToonMaterial(PALETTE.DEEP_BLUE_FRAME, { metallicStep: true });
  const hazardMat = makeToonMaterial(PALETTE.HAZard_ORANGE);

  // Stepped octagonal foundation
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.75, 0.36, 8), deepBlueMat);
  base1.position.y = 0.18;
  base1.castShadow = true;
  base1.receiveShadow = true;
  group.add(base1);

  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.32, 0.3, 8), creamMat);
  base2.position.y = 0.51;
  base2.castShadow = true;
  group.add(base2);

  // 4 Sequential Industrial Boot Lamps around the collar (light up 1 -> 2 -> 3 -> 4 at start!)
  const statusLampMats: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.2, 0.26, 2, 0.03), deepBlueMat);
    housing.position.set(Math.cos(a) * 1.24, 0.56, Math.sin(a) * 1.24);
    housing.rotation.y = -a;
    group.add(housing);

    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x26354d,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.0, // Boots sequentially in Stage 1!
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMat);
    bulb.position.set(Math.cos(a) * 1.24, 0.69, Math.sin(a) * 1.24);
    group.add(bulb);
    statusLampMats.push(lampMat);
  }

  // Central tower mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 1.15, 8), deepBlueMat);
  mast.position.y = 1.18;
  mast.castShadow = true;
  group.add(mast);

  // Hazard collar band
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.14, 8), hazardMat);
  collar.position.y = 0.84;
  group.add(collar);

  // Faceted Beacon Energy Core
  const coreMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38, 0),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.15,
    })
  );
  coreMesh.position.y = 1.98;
  group.add(coreMesh);

  // 3 Hinged Signal Array Fins around the core
  const signalFins: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const finPivot = new THREE.Group();
    finPivot.position.set(Math.cos(a) * 0.54, 1.68, Math.sin(a) * 0.54);
    finPivot.rotation.y = -a;

    const fin = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.84, 0.24, 2, 0.03), creamMat);
    fin.position.set(0.1, 0.36, 0);
    fin.rotation.z = -0.22;
    fin.castShadow = true;
    finPivot.add(fin);

    const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.52, 0.26, 2, 0.015), hazardMat);
    stripe.position.set(0.14, 0.38, 0);
    stripe.rotation.z = -0.22;
    finPivot.add(stripe);

    group.add(finPivot);
    signalFins.push(finPivot);
  }

  const darkReflectorMat = makeToonMaterial(PALETTE.DEEP_BLUE_DARK, { metallicStep: true });

  // Upper mast support collar & recessed energy-core socket lip (bridges mast top y = 1.755 cleanly)
  const upperMastCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.57, 0.14, 8),
    deepBlueMat
  );
  upperMastCollar.position.y = 1.7;
  upperMastCollar.castShadow = true;
  group.add(upperMastCollar);

  const coreSocketRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.048, 8, 16),
    hazardMat
  );
  coreSocketRing.rotation.x = Math.PI / 2;
  coreSocketRing.position.y = 1.76;
  group.add(coreSocketRing);

  // Stationary 3-Strut Structural Gantry Cage in the 60°/180°/300° inter-fin bays:
  // Clears rotating octahedral coreMesh (r <= 0.38m) by +14.25cm and stationary signalFins by +35.5cm!
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 3;
    const legGroup = new THREE.Group();
    legGroup.rotation.y = -a;

    const lowerStrut = new THREE.Mesh(
      new RoundedBoxGeometry(0.1, 0.38, 0.12, 2, 0.025),
      deepBlueMat
    );
    lowerStrut.position.set(0.55, 1.87, 0);
    lowerStrut.rotation.z = -0.286;
    lowerStrut.castShadow = true;
    legGroup.add(lowerStrut);

    const midKnuckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.13, 0.15, 2, 0.025),
      creamMat
    );
    midKnuckle.position.set(0.6, 2.04, 0);
    midKnuckle.castShadow = true;
    legGroup.add(midKnuckle);

    const knuckleStripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.04, 0.08, 0.16, 2, 0.01),
      hazardMat
    );
    knuckleStripe.position.set(0.66, 2.04, 0);
    legGroup.add(knuckleStripe);

    const upperStrut = new THREE.Mesh(
      new RoundedBoxGeometry(0.1, 0.54, 0.12, 2, 0.025),
      deepBlueMat
    );
    upperStrut.position.set(0.485, 2.27, 0);
    upperStrut.rotation.z = 0.464;
    upperStrut.castShadow = true;
    legGroup.add(upperStrut);

    const topLug = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.12, 0.15, 2, 0.025),
      deepBlueMat
    );
    topLug.position.set(0.37, 2.5, 0);
    legGroup.add(topLug);

    group.add(legGroup);
  }

  // Stationary Open-Bore Azimuth Bearing Ring at y = 2.50 (inner bore r = 0.29m > skyBeam r = 0.24m!)
  const azimuthRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.06, 10, 16),
    deepBlueMat
  );
  azimuthRing.rotation.x = Math.PI / 2;
  azimuthRing.position.y = 2.5;
  azimuthRing.castShadow = true;
  group.add(azimuthRing);

  // Rotating Upper Telemetry Dish Assembly (100% closed manifold 3D solids, zero openEnded cones!)
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 2.58, 0);

  // Interlocked rotating slew ring & 4 bearing clamps riding on azimuthRing
  const slewRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.052, 10, 16),
    creamMat
  );
  slewRing.rotation.x = Math.PI / 2;
  slewRing.position.y = -0.01;
  slewRing.castShadow = true;
  dishGroup.add(slewRing);

  for (let c = 0; c < 4; c++) {
    const ang = (c * Math.PI) / 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.13, 0.12, 2, 0.02),
      deepBlueMat
    );
    clamp.position.set(Math.cos(ang) * 0.37, -0.04, Math.sin(ang) * 0.37);
    clamp.rotation.y = -ang;
    dishGroup.add(clamp);
  }

  // Cantilevered twin-cheek elevation gimbal yoke (+Z side, keeping central skyBeam bore unobstructed!)
  const gimbalBoom = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.12, 0.28, 2, 0.025),
    deepBlueMat
  );
  gimbalBoom.position.set(0, 0.06, 0.46);
  gimbalBoom.rotation.x = -0.48;
  gimbalBoom.castShadow = true;
  dishGroup.add(gimbalBoom);

  for (const sx of [-0.135, 0.135]) {
    const cheek = new THREE.Mesh(
      new RoundedBoxGeometry(0.075, 0.28, 0.15, 2, 0.02),
      deepBlueMat
    );
    cheek.position.set(sx, 0.22, 0.57);
    cheek.rotation.x = -0.18;
    cheek.castShadow = true;
    dishGroup.add(cheek);
  }

  const trunnionPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.36, 10),
    hazardMat
  );
  trunnionPin.rotation.z = Math.PI / 2;
  trunnionPin.position.set(0, 0.3, 0.59);
  dishGroup.add(trunnionPin);

  // Closed, Solid Beveled 3D Telemetry Dish aimed ~45° skyward
  const dishAssembly = new THREE.Group();
  dishAssembly.position.set(0, 0.34, 0.6);
  dishAssembly.rotation.x = 0.78;

  const rearBoss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.14, 0.11, 10),
    deepBlueMat
  );
  rearBoss.position.y = -0.07;
  dishAssembly.add(rearBoss);

  const dishShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.18, 0.14, 16),
    creamMat
  );
  dishShell.position.y = 0.02;
  dishShell.castShadow = true;
  dishAssembly.add(dishShell);

  const dishRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.375, 0.042, 10, 16),
    creamMat
  );
  dishRim.rotation.x = Math.PI / 2;
  dishRim.position.y = 0.085;
  dishRim.castShadow = true;
  dishAssembly.add(dishRim);

  for (let k = 0; k < 3; k++) {
    const ka = (k * Math.PI * 2) / 3;
    const rimClamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.08, 0.065, 0.1, 2, 0.015),
      hazardMat
    );
    rimClamp.position.set(Math.cos(ka) * 0.385, 0.088, Math.sin(ka) * 0.385);
    rimClamp.rotation.y = -ka;
    dishAssembly.add(rimClamp);
  }

  const innerReflector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.345, 0.16, 0.05, 16),
    darkReflectorMat
  );
  innerReflector.position.y = 0.072;
  dishAssembly.add(innerReflector);

  const feedPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.11, 0.06, 10),
    deepBlueMat
  );
  feedPedestal.position.y = 0.115;
  dishAssembly.add(feedPedestal);

  const feedMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.042, 0.26, 8),
    creamMat
  );
  feedMast.position.y = 0.25;
  dishAssembly.add(feedMast);

  for (let s = 0; s < 3; s++) {
    const sa = (s * Math.PI * 2) / 3 + Math.PI / 3;
    const strutPivot = new THREE.Group();
    strutPivot.rotation.y = -sa;
    const fStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.33, 6),
      deepBlueMat
    );
    fStrut.position.set(0.15, 0.23, 0);
    fStrut.rotation.z = 0.66;
    strutPivot.add(fStrut);
    dishAssembly.add(strutPivot);
  }

  const emitterHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.042, 0.08, 10),
    hazardMat
  );
  emitterHorn.position.y = 0.38;
  dishAssembly.add(emitterHorn);

  const emitterLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    })
  );
  emitterLens.position.y = 0.425;
  dishAssembly.add(emitterLens);

  dishGroup.add(dishAssembly);

  // Opposite -Z Armored Telemetry Transceiver Counterweight & Whip Stubs (balances 360° rotation!)
  const transceiverPod = new THREE.Mesh(
    new RoundedBoxGeometry(0.28, 0.18, 0.22, 2, 0.03),
    deepBlueMat
  );
  transceiverPod.position.set(0, 0.04, -0.4);
  transceiverPod.castShadow = true;
  dishGroup.add(transceiverPod);

  const podStripe = new THREE.Mesh(
    new RoundedBoxGeometry(0.22, 0.05, 0.24, 2, 0.01),
    hazardMat
  );
  podStripe.position.set(0, 0.04, -0.4);
  dishGroup.add(podStripe);

  for (const wx of [-0.08, 0.08]) {
    const whip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.026, 0.24, 6),
      creamMat
    );
    whip.position.set(wx, 0.22, -0.42);
    dishGroup.add(whip);

    const whipTip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), hazardMat);
    whipTip.position.set(wx, 0.34, -0.42);
    dishGroup.add(whipTip);
  }

  group.add(dishGroup);

  // Skyward Evacuation Signal Beam (Layer 1 — ignites during Victory Stage 5!)
  const beamGeo = new THREE.CylinderGeometry(0.55, 0.24, 18, 16, 1, true);
  beamGeo.translate(0, 9, 0);
  const skyBeam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  skyBeam.position.y = 2.0;
  skyBeam.visible = false;
  skyBeam.layers.set(1);
  group.add(skyBeam);

  return { group, dishGroup, coreMesh, statusLampMats, signalFins, skyBeam };
}

function buildMineEntrance(portal?: PortalConfig): MineEntranceRig {
  const group = new THREE.Group();
  const start = ROAD_SAMPLES[0];
  const px = portal ? portal.x : start.x - 0.65;
  const pz = portal ? portal.z : start.z;
  group.position.set(px, 0, pz);
  group.rotation.y = portal?.yaw ?? 0;

  const slateMat = makeToonMaterial(0x283044, { metallicStep: true });
  const rustBeamMat = makeToonMaterial(0x7c342b);
  const hazardMat = makeToonMaterial(PALETTE.HAZard_ORANGE);

  // Heavy industrial mine tunnel portal frame
  for (const sz of [-1.42, 1.42]) {
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.84, 2.35, 0.64, 3, 0.08), slateMat);
    pillar.position.set(0, 1.17, sz);
    pillar.castShadow = true;
    group.add(pillar);

    const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.22, 0.68, 2, 0.02), hazardMat);
    stripe.position.set(0, 0.48, sz);
    group.add(stripe);
  }

  const lintel = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.68, 3.65, 3, 0.08), rustBeamMat);
  lintel.position.set(0, 2.52, 0);
  lintel.castShadow = true;
  group.add(lintel);

  // Dark shaft interior plane
  const darkVoid = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 2.2, 2.24),
    new THREE.MeshBasicMaterial({ color: 0x0b0a14 })
  );
  darkVoid.position.set(-0.18, 1.1, 0);
  group.add(darkVoid);

  // 2 Rotating Hazard Warning Beacons on top of portal
  const hazardRotors: THREE.Object3D[] = [];
  const hazardLampMats: THREE.MeshStandardMaterial[] = [];
  for (const sz of [-1.25, 1.25]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 10), slateMat);
    cap.position.set(0.1, 2.92, sz);
    group.add(cap);

    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      emissive: 0xff3b1f,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 10), lampMat);
    dome.position.set(0.1, 3.1, sz);
    group.add(dome);
    hazardLampMats.push(lampMat);

    const reflector = new THREE.Group();
    reflector.position.set(0.1, 3.1, sz);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), hazardMat);
    reflector.add(bar);
    group.add(reflector);
    hazardRotors.push(reflector);
  }

  // Ground Fissure Cracks in front of entrance (glow brightly during Boss Entrance!)
  const fissureGroup = new THREE.Group();
  fissureGroup.position.set(1.15, 0.055, 0);
  const fissureMat = new THREE.MeshBasicMaterial({
    color: 0xff4d29,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    fog: false,
  });
  const crackSpecs = [
    [0, 0, 1.5, 0.14, 0.12],
    [0.3, -0.45, 1.1, 0.1, -0.48],
    [0.25, 0.48, 1.2, 0.11, 0.42],
    [-0.2, 0.25, 0.85, 0.09, -0.3],
  ] as const;
  for (const [cx, cz, len, wid, rot] of crackSpecs) {
    const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), fissureMat);
    cMesh.rotation.x = -Math.PI / 2;
    cMesh.rotation.z = rot;
    cMesh.position.set(cx, 0, cz);
    cMesh.layers.set(1);
    fissureGroup.add(cMesh);
  }
  fissureGroup.visible = false;
  group.add(fissureGroup);

  return { group, hazardRotors, hazardLampMats, fissureGroup, fissureMat };
}

function buildSupplyChestRig(): SupplyChestRig {
  const group = new THREE.Group();
  group.visible = false;

  const creamMat = makeToonMaterial(PALETTE.CREAM_ARMOR, { rimColor: 0xffd166, rimStrength: 0.45 });
  const deepBlueMat = makeToonMaterial(PALETTE.DEEP_BLUE_FRAME, { metallicStep: true });
  const goldMat = makeToonMaterial(0xf59e0b, {
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
    metallicStep: true,
  });

  // Lower armored chest tub
  const tub = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.68, 0.96, 3, 0.08), deepBlueMat);
  tub.position.y = 0.34;
  tub.castShadow = true;
  group.add(tub);

  const sideRib = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.22, 1.02, 2, 0.04), creamMat);
  sideRib.position.y = 0.24;
  group.add(sideRib);

  // Inner golden energy glow plane when opened (Layer 1)
  const innerGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.72),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  innerGlow.rotation.x = -Math.PI / 2;
  innerGlow.position.y = 0.69;
  innerGlow.layers.set(1);
  group.add(innerGlow);

  // Rear-hinged heavy lid!
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.68, -0.46);

  const lidBody = new THREE.Mesh(new RoundedBoxGeometry(1.38, 0.32, 0.98, 3, 0.08), creamMat);
  lidBody.position.set(0, 0.15, 0.46);
  lidBody.castShadow = true;
  lidPivot.add(lidBody);

  const goldBand = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.35, 1.02, 2, 0.04), goldMat);
  goldBand.position.set(0, 0.16, 0.46);
  lidPivot.add(goldBand);

  group.add(lidPivot);

  // Front locking clasp
  const claspMesh = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.28, 0.12, 2, 0.03), goldMat);
  claspMesh.position.set(0, 0.66, 0.51);
  group.add(claspMesh);

  return { group, lidPivot, claspMesh, innerGlow };
}

function buildHighGroundBastion(cfg: BuildPadConfig, root: THREE.Group): void {
  const bastion = new THREE.Group();
  bastion.position.set(cfg.x, 0, cfg.z);

  const deepBlueMat = makeToonMaterial(PALETTE.DEEP_BLUE_FRAME, { metallicStep: true });
  const creamMat = makeToonMaterial(PALETTE.CREAM_ARMOR, { rimColor: 0xfde047, rimStrength: 0.36 });
  const hazardMat = makeToonMaterial(PALETTE.HAZard_ORANGE);

  // Lower stepped armored plinth grounded cleanly at y=0
  const plinth = new THREE.Mesh(
    new RoundedBoxGeometry(2.68, 0.38, 2.68, 3, 0.08),
    deepBlueMat
  );
  plinth.position.y = 0.19;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  bastion.add(plinth);

  // Upper octagonal cream armor deck collar (top at y = 0.68)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.58, 0.3, 8), creamMat);
  collar.position.y = 0.53;
  collar.castShadow = true;
  collar.receiveShadow = true;
  bastion.add(collar);

  // 4 angled hazard-orange buttress gussets
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const gusset = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.36, 0.36, 2, 0.03), hazardMat);
    gusset.position.set(Math.cos(a) * 1.38, 0.36, Math.sin(a) * 1.38);
    gusset.rotation.y = -a;
    gusset.castShadow = true;
    bastion.add(gusset);
  }

  // Layer-1 cyan-gold chevron aura ring on top of bastion (un-outlined!)
  const boostRing = new THREE.Mesh(
    new THREE.RingGeometry(1.18, 1.32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  boostRing.rotation.x = -Math.PI / 2;
  boostRing.position.y = 0.69;
  setLayerRecursive(boostRing, 1);
  bastion.add(boostRing);

  root.add(bastion);
}

function buildMechanismInstance(
  cfg: MapMechanismConfig,
  root: THREE.Group,
  vfxRoot: THREE.Group
): MapMechanismInstance {
  const group = new THREE.Group();
  group.position.set(cfg.x, 0, cfg.z);
  group.rotation.y = cfg.yaw ?? 0;
  root.add(group);

  const vfxGroup = new THREE.Group();
  vfxGroup.position.set(cfg.x, 0, cfg.z);
  vfxGroup.rotation.y = cfg.yaw ?? 0;
  vfxRoot.add(vfxGroup);

  const activeVisuals: THREE.Object3D[] = [];
  const deepBlueMat = makeToonMaterial(PALETTE.DEEP_BLUE_FRAME, { metallicStep: true });
  const creamMat = makeToonMaterial(PALETTE.CREAM_ARMOR, { rimColor: 0x7dd3fc, rimStrength: 0.35 });
  const hazardMat = makeToonMaterial(PALETTE.HAZard_ORANGE);

  let readyColor = 0x38bdf8;
  let ringInner = 0.96;
  let ringOuter = 1.18;
  let cooldownTotal = 18.0;
  let activeDuration = 0;

  if (cfg.type === 'crystal_vein') {
    readyColor = 0x38bdf8;
    ringInner = 0.96;
    ringOuter = 1.18;
    cooldownTotal = 18.0;
    activeDuration = 0;

    const rockMat = makeToonMaterial(PALETTE.LUNAR_ROCK_DARK);
    const bed = new THREE.Mesh(new THREE.DodecahedronGeometry(0.92, 0), rockMat);
    bed.scale.set(1.25, 0.38, 1.15);
    bed.position.y = 0.16;
    bed.castShadow = true;
    bed.receiveShadow = true;
    group.add(bed);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.14, 6), deepBlueMat);
    collar.position.y = 0.22;
    group.add(collar);

    const gemMat = makeToonMaterial(0x38bdf8, {
      emissive: 0x0284c7,
      emissiveIntensity: 0.52,
      rimColor: 0xfde047,
      rimStrength: 0.55,
    });
    const amberGemMat = makeToonMaterial(0xfbbf24, {
      emissive: 0xd97706,
      emissiveIntensity: 0.42,
      metallicStep: true,
    });

    const clusterSpecs: Array<[number, number, number, number, number, boolean]> = [
      [0, 0, 0.58, 0.04, -0.05, false],
      [-0.3, 0.18, 0.44, -0.28, 0.22, false],
      [0.32, 0.14, 0.48, 0.26, -0.18, true],
      [-0.16, -0.28, 0.42, 0.2, 0.28, false],
      [0.24, -0.24, 0.38, -0.22, -0.24, true],
    ];
    for (const [ox, oz, h, rx, rz, isAmber] of clusterSpecs) {
      const prismGrp = new THREE.Group();
      prismGrp.position.set(ox, 0.24, oz);
      prismGrp.rotation.set(rx, 0, rz);
      const mat = isAmber ? amberGemMat : gemMat;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, h, 6), mat);
      shaft.position.y = h * 0.5;
      shaft.castShadow = true;
      prismGrp.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 6), mat);
      tip.position.y = h + 0.11;
      prismGrp.add(tip);
      group.add(prismGrp);
      activeVisuals.push(prismGrp);
    }

    // Layer-1 un-outlined sparkle halo on top of vein
    const topHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.56, 18),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      })
    );
    topHalo.rotation.x = -Math.PI / 2;
    topHalo.position.y = 0.88;
    setLayerRecursive(topHalo, 1);
    group.add(topHalo);
  } else if (cfg.type === 'capacitor_pylon') {
    readyColor = 0x22d3ee;
    ringInner = 1.08;
    ringOuter = 1.32;
    cooldownTotal = 20.0;
    activeDuration = 0.6;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.14, 0.34, 6), deepBlueMat);
    base.position.y = 0.17;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.44, 1.28, 8), creamMat);
    mast.position.y = 0.92;
    mast.castShadow = true;
    group.add(mast);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.56, 0.32, 2, 0.03), hazardMat);
      fin.position.set(Math.cos(a) * 0.48, 0.58, Math.sin(a) * 0.48);
      fin.rotation.y = -a;
      group.add(fin);
    }

    const coilMat = makeToonMaterial(0x22d3ee, {
      emissive: 0x0891b2,
      emissiveIntensity: 0.55,
      metallicStep: true,
    });
    const torusOuter = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 8, 18), coilMat);
    torusOuter.rotation.x = Math.PI / 2;
    torusOuter.position.y = 1.32;
    group.add(torusOuter);

    const torusInner = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 8, 16), coilMat);
    torusInner.rotation.x = Math.PI / 2 + 0.35;
    torusInner.position.y = 1.56;
    group.add(torusInner);

    const arcCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.6,
        roughness: 0.15,
      })
    );
    arcCore.position.y = 1.88;
    group.add(arcCore);

    activeVisuals.push(torusOuter, torusInner, arcCore);

    // Subtle 4.6m shock radius tick ring in vfxGroup (un-outlined!)
    const shockRadiusRing = new THREE.Mesh(
      new THREE.RingGeometry(4.52, 4.6, 48),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    shockRadiusRing.rotation.x = -Math.PI / 2;
    shockRadiusRing.position.y = 0.055;
    vfxGroup.add(shockRadiusRing);
  } else {
    // laser_gate: Twin emitter pylons at local (±1.55, 0, 0) straddling road curbs!
    readyColor = 0xf97316;
    ringInner = 1.36;
    ringOuter = 1.58;
    cooldownTotal = 22.0;
    activeDuration = 6.0;

    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xf97316,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    for (const sx of [-1.55, 1.55]) {
      const pFoot = new THREE.Mesh(
        new RoundedBoxGeometry(0.68, 0.28, 0.72, 2, 0.05),
        deepBlueMat
      );
      pFoot.position.set(sx, 0.14, 0);
      pFoot.castShadow = true;
      group.add(pFoot);

      const pTower = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 1.68, 0.52, 3, 0.06),
        creamMat
      );
      pTower.position.set(sx, 1.08, 0);
      pTower.castShadow = true;
      group.add(pTower);

      const pCap = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.22, 0.58, 2, 0.04),
        hazardMat
      );
      pCap.position.set(sx, 1.96, 0);
      group.add(pCap);

      const inwardSign = sx < 0 ? 1 : -1;
      for (const ly of [0.52, 0.96, 1.4]) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), lensMat);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(sx + inwardSign * 0.24, ly, 0);
        group.add(lens);
      }
    }

    // Layer-1 non-outlined triple plasma laser beams + floor thermal strip (visible when active!)
    const beamGroup = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (const ly of [0.52, 0.96, 1.4]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.86, 10), beamMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, ly, 0);
      beamGroup.add(bar);
    }
    const floorBurn = new THREE.Mesh(
      new THREE.PlaneGeometry(2.86, 0.48),
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    floorBurn.rotation.x = -Math.PI / 2;
    floorBurn.position.y = 0.055;
    beamGroup.add(floorBurn);

    beamGroup.visible = false;
    setLayerRecursive(beamGroup, 1);
    group.add(beamGroup);
    activeVisuals.push(beamGroup);
  }

  const readyRingMat = new THREE.MeshBasicMaterial({
    color: readyColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const readyRing = new THREE.Mesh(new THREE.RingGeometry(ringInner, ringOuter, 28), readyRingMat);
  readyRing.rotation.x = -Math.PI / 2;
  readyRing.position.y = 0.065;
  vfxGroup.add(readyRing);

  return {
    config: cfg,
    group,
    vfxGroup,
    readyRingMat,
    activeVisuals,
    cooldownRemaining: 0,
    cooldownTotal,
    activeRemaining: 0,
    activeDuration,
  };
}

function addStageThemeProps(
  root: THREE.Group,
  vfxRoot: THREE.Group,
  stage: StageConfig | undefined,
  compiledLanes: CompiledLane[]
): { speedZoneVisuals: THREE.Mesh[]; craterRing?: THREE.Object3D } {
  const slateMat = makeToonMaterial(0x273044, { metallicStep: true });
  const purpleRockMat = makeToonMaterial(PALETTE.LUNAR_PURPLE_GREY);
  const darkRockMat = makeToonMaterial(PALETTE.LUNAR_ROCK_DARK);
  const crateBlueMat = makeToonMaterial(0x2a3d66);
  const crateCreamMat = makeToonMaterial(0xdad4c8);
  const hazardMat = makeToonMaterial(PALETTE.HAZard_ORANGE);
  const speedZoneVisuals: THREE.Mesh[] = [];
  let craterRing: THREE.Object3D | undefined;

  const theme = stage?.themeVariant ?? 'outpost_canyon';

  // Stage 2: Central Energized Magma-Violet Crater Shaft at (-1.4, 0, 0)
  if (theme === 'twin_rift_crater') {
    const shaftGrp = new THREE.Group();
    shaftGrp.position.set(-1.4, 0, 0);

    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.24, 8, 16), purpleRockMat);
    outerRim.rotation.x = Math.PI / 2;
    outerRim.scale.z = 0.55;
    outerRim.position.y = 0.08;
    shaftGrp.add(outerRim);

    const pitVoid = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.15, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0x0d071b })
    );
    pitVoid.position.y = 0.02;
    shaftGrp.add(pitVoid);

    const ringPivot = new THREE.Group();
    ringPivot.position.y = 0.24;
    const containmentTorus = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.075, 8, 16),
      slateMat
    );
    containmentTorus.rotation.x = Math.PI / 2;
    ringPivot.add(containmentTorus);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const node = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.22, 2, 0.03), hazardMat);
      node.position.set(Math.cos(a) * 1.18, 0, Math.sin(a) * 1.18);
      ringPivot.add(node);
    }
    shaftGrp.add(ringPivot);
    craterRing = ringPivot;

    const coreGlow = new THREE.Mesh(
      new THREE.CircleGeometry(1.12, 24),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreGlow.rotation.x = -Math.PI / 2;
    coreGlow.position.y = 0.09;
    setLayerRecursive(coreGlow, 1);
    shaftGrp.add(coreGlow);

    root.add(shaftGrp);
  }

  // Stage 3: Glowing Speed-Boost Accelerator Rail Zones along road!
  if (stage && stage.speedZones.length > 0) {
    for (const sz of stage.speedZones) {
      const lane = compiledLanes[sz.laneIndex];
      if (!lane) continue;
      for (let d = sz.startDist + 0.45; d <= sz.endDist - 0.35; d += 1.1) {
        const s = sampleLaneAtDistance(lane, d);
        const yaw = Math.atan2(s.tx, s.tz);

        // Un-outlined glowing cyan-amber chevron coil in vfxRoot (Layer 0 of vfxScene!)
        const chevMat = new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const chevron = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.66, 3), chevMat);
        chevron.rotation.x = -Math.PI / 2;
        chevron.rotation.z = -yaw - Math.PI / 2;
        chevron.position.set(s.x, 0.048, s.z);
        vfxRoot.add(chevron);
        speedZoneVisuals.push(chevron);

        // Low-profile solid induction curb blocks beside road
        const nx = -s.tz;
        const nz = s.tx;
        for (const side of [-1.28, 1.28]) {
          const railBlock = new THREE.Mesh(
            new RoundedBoxGeometry(0.18, 0.14, 0.46, 2, 0.03),
            slateMat
          );
          railBlock.position.set(s.x + nx * side, 0.07, s.z + nz * side);
          railBlock.rotation.y = yaw;
          root.add(railBlock);
        }
      }
    }
  }

  // Stage 4 / Endless: Ark Citadel golden plaza ring around Return Beacon
  if (theme === 'ark_citadel' && stage) {
    const arkRing = new THREE.Mesh(
      new THREE.RingGeometry(1.92, 2.25, 32),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    arkRing.rotation.x = -Math.PI / 2;
    arkRing.position.set(stage.beaconPos.x, 0.045, stage.beaconPos.z);
    vfxRoot.add(arkRing);
  }

  // 1. Broken Overhead Monorail Track along far North Edge (clear of Stage 4 North Portal at x=-2.2!)
  const hasNorthPortal = (stage?.entrances.length ?? 1) > 1;
  if (!hasNorthPortal) {
    const railGroup = new THREE.Group();
    railGroup.position.set(-5.2, 0, -8.55);
    for (const px of [-5.8, -1.6, 4.4, 8.8]) {
      const pier = new THREE.Mesh(new RoundedBoxGeometry(0.52, 1.55, 0.52, 2, 0.05), slateMat);
      pier.position.set(px, 0.77, 0);
      pier.castShadow = true;
      railGroup.add(pier);
    }
    const girderL = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.28, 0.46, 2, 0.04), slateMat);
    girderL.position.set(-3.4, 1.58, 0);
    girderL.rotation.z = -0.06;
    girderL.castShadow = true;
    railGroup.add(girderL);

    const girderR = new THREE.Mesh(new RoundedBoxGeometry(5.8, 0.28, 0.46, 2, 0.04), slateMat);
    girderR.position.set(6.5, 1.54, 0);
    girderR.rotation.z = 0.04;
    girderR.castShadow = true;
    railGroup.add(girderR);
    root.add(railGroup);
  }

  // 2. Abandoned Industrial Cargo Containers on outer corners
  const addCargoCrate = (x: number, y: number, z: number, rotY: number, isCream: boolean) => {
    const c = new THREE.Group();
    c.position.set(x, y, z);
    c.rotation.y = rotY;
    const box = new THREE.Mesh(
      new RoundedBoxGeometry(1.45, 0.86, 0.92, 3, 0.06),
      isCream ? crateCreamMat : crateBlueMat
    );
    box.position.y = 0.43;
    box.castShadow = true;
    c.add(box);
    const tag = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.14, 0.96, 2, 0.02), hazardMat);
    tag.position.set(0.32, 0.56, 0);
    c.add(tag);
    root.add(c);
  };
  addCargoCrate(-13.2, 0, 7.2, 0.28, false);
  addCargoCrate(-11.6, 0, 7.8, -0.18, true);
  addCargoCrate(12.6, 0, -7.2, -0.32, false);

  // 3. Perimeter Lunar Craters & Distant Moon Boulders
  const craterCoords: Array<[number, number, number]> = [
    [-12.4, -7.6, 1.15],
    [13.6, -3.8, 1.05],
    [-0.2, 8.6, 0.9],
  ];
  for (const [cx, cz, cr] of craterCoords) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(cr, cr * 0.22, 8, 18), purpleRockMat);
    rim.rotation.x = Math.PI / 2;
    rim.scale.z = 0.45;
    rim.position.set(cx, 0.04, cz);
    root.add(rim);
  }

  const distantRocks: Array<[number, number, number, number]> = [
    [-19.5, -1.2, -10.5, 2.6],
    [19.2, -0.8, -11.2, 3.1],
    [-18.8, -1.6, 10.8, 2.2],
    [19.8, -1.4, 10.2, 2.5],
    [0.5, -2.2, -14.5, 3.4],
  ];
  for (const [rx, ry, rz, rs] of distantRocks) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), darkRockMat);
    rock.scale.set(1.25, 0.68, 0.95);
    rock.position.set(rx, ry, rz);
    rock.rotation.set(0.2, rx, 0.1);
    root.add(rock);
  }

  return { speedZoneVisuals, craterRing };
}

export function buildLunarStationEnvironment(
  solidScene: THREE.Scene,
  vfxScene: THREE.Scene,
  stage?: StageConfig,
  compiledLanes?: CompiledLane[]
): LunarStationEnvironment {
  const root = new THREE.Group();
  solidScene.add(root);

  const vfxRoot = new THREE.Group();
  vfxScene.add(vfxRoot);

  const tex = getToonTextures();
  const deckTintHex = stage?.palette.deckTintHex ?? 0xffffff;
  const roadTintHex = stage?.palette.roadTintHex ?? 0xffffff;
  const markerAccentHex = stage?.palette.markerAccentHex ?? PALETTE.LUNAR_COOL_CYAN;

  // 1. Thick 3D Lunar Facility Slab + Lower Regolith Crust (genuine 3D diorama slab thickness!)
  const deckMat = makeToonMaterial(deckTintHex, { map: tex.lunarDeck });
  const upperSlab = new THREE.Mesh(new RoundedBoxGeometry(32.4, 0.86, 19.6, 4, 0.2), deckMat);
  upperSlab.position.set(-0.2, -0.43, 0.1);
  upperSlab.receiveShadow = true;
  root.add(upperSlab);

  const trimSkirt = new THREE.Mesh(
    new RoundedBoxGeometry(32.9, 0.48, 20.1, 3, 0.14),
    makeToonMaterial(0x1f273b, { metallicStep: true })
  );
  trimSkirt.position.set(-0.2, -0.96, 0.1);
  root.add(trimSkirt);

  const regolithBase = new THREE.Mesh(
    new RoundedBoxGeometry(31.2, 1.5, 18.4, 3, 0.35),
    makeToonMaterial(PALETTE.LUNAR_ROCK_DARK)
  );
  regolithBase.position.set(-0.2, -1.85, 0.1);
  root.add(regolithBase);

  // Subtle accent edge marker lights along front lip of station slab
  const cyanMarkerMat = new THREE.MeshStandardMaterial({
    color: markerAccentHex,
    emissive: markerAccentHex,
    emissiveIntensity: 0.75,
  });
  for (const mx of [-11, -5.5, 0, 5.5, 11]) {
    const marker = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.1, 0.12, 2, 0.02), cyanMarkerMat);
    marker.position.set(mx, -0.78, 10.15);
    root.add(marker);
  }

  // 2. Multi-Lane Recessed Industrial Haulage Roads (offset by 2mm per lane -> zero coplanar z-fighting!)
  const roadMat = makeToonMaterial(roadTintHex, { map: tex.haulRoad });
  const lanesToBuild: CompiledLane[] =
    compiledLanes && compiledLanes.length > 0
      ? compiledLanes
      : [
          {
            index: 0,
            samples: ROAD_SAMPLES,
            totalLength: ROAD_SAMPLES[ROAD_SAMPLES.length - 1].dist,
          },
        ];

  lanesToBuild.forEach((lane, laneIdx) => {
    const roadMesh = new THREE.Mesh(
      buildRoadRibbonGeometry(lane.samples, 1.18, 0.032 + laneIdx * 0.002),
      roadMat
    );
    roadMesh.receiveShadow = true;
    root.add(roadMesh);
  });

  // 3. Fixed Build Pads (+ Stationary High-Ground Bastions when padType === 'high_ground')
  const pads = new Map<string, PadVisual>();
  const padSocketMat = makeToonMaterial(0x313d5a, { metallicStep: true });
  const padClampMat = makeToonMaterial(0x1e2942, { metallicStep: true });
  const padConfigs = stage?.buildPads ?? BUILD_PADS;

  padConfigs.forEach((cfg, idx) => {
    const isHighGround = cfg.padType === 'high_ground';
    const baseY = cfg.y ?? 0;

    if (isHighGround) {
      buildHighGroundBastion(cfg, root);
    }

    const group = new THREE.Group();
    group.position.set(cfg.x, baseY, cfg.z);

    const socket = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.18, 0.15, 8), padSocketMat);
    socket.position.y = 0.075;
    socket.castShadow = true;
    socket.receiveShadow = true;
    group.add(socket);

    for (let c = 0; c < 4; c++) {
      const ang = (c * Math.PI) / 2 + Math.PI / 4;
      const clamp = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.14, 0.28, 2, 0.03), padClampMat);
      clamp.position.set(Math.cos(ang) * 0.98, 0.12, Math.sin(ang) * 0.98);
      clamp.rotation.y = -ang;
      group.add(clamp);
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: isHighGround ? 0xfbbf24 : markerAccentHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.8, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.16;
    ring.layers.set(1); // Non-outlined clean glow ring!
    group.add(ring);

    root.add(group);
    pads.set(cfg.id, {
      config: cfg,
      baseY,
      group,
      ringMat,
      hopPhaseOffset: idx * 0.55,
    });
  });

  // 4. Last Return Beacon & Multi-Portal Mine Shaft Entrances
  const beacon = buildReturnBeacon(stage?.beaconPos);
  root.add(beacon.group);

  const entrances: MineEntranceRig[] =
    stage && stage.entrances.length > 0
      ? stage.entrances.map((p) => buildMineEntrance(p))
      : [buildMineEntrance()];
  for (const ent of entrances) {
    root.add(ent.group);
  }
  const entrance = entrances[0];

  // 5. Interactive 3D Map Mechanisms (Crystal Veins, Capacitor Pylons, Laser Containment Gates)
  const mechanisms = new Map<string, MapMechanismInstance>();
  for (const mCfg of stage?.mechanisms ?? []) {
    const inst = buildMechanismInstance(mCfg, root, vfxRoot);
    mechanisms.set(mCfg.id, inst);
  }

  // 6. Stage Landmarks & Environmental Storytelling Props
  const { speedZoneVisuals, craterRing } = addStageThemeProps(root, vfxRoot, stage, lanesToBuild);

  // Restrained distant lunar starfield (parented under vfxRoot in vfxScene -> zero outline!)
  const starPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    const r = 46 + Math.random() * 44;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.65;
    starPos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
    starPos[i * 3 + 1] = Math.cos(ph) * r * 0.55 + 4;
    starPos[i * 3 + 2] = -Math.abs(Math.sin(th) * Math.sin(ph) * r) - 6;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xcbd5e1,
      map: tex.softGlow,
      size: 0.62,
      transparent: true,
      opacity: 0.72,
      alphaTest: 0.04,
      depthWrite: false,
    })
  );
  vfxRoot.add(stars);
  const earthGroup = new THREE.Group();
  earthGroup.position.set(-19, 21, -56);
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(5.5, 28, 20), new THREE.MeshBasicMaterial({ color: 0x0b1933, fog: false })));
  const earthLit = new THREE.Mesh(new THREE.SphereGeometry(5.55, 28, 20, -1.3, 2.95, 0.18, 2.55), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, fog: false }));
  earthLit.rotation.z = -0.32;
  earthGroup.add(earthLit);
  earthGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ map: tex.softGlow, color: 0x38bdf8, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  const orbArc = new THREE.Mesh(new THREE.RingGeometry(8.1, 8.38, 56), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: 0.24, depthWrite: false, fog: false }));
  orbArc.rotation.set(1.18, 0.28, -0.22);
  earthGroup.add(orbArc);
  vfxRoot.add(earthGroup);

  // 7. Tactical Attack Range Ring & Selection Ring (under vfxRoot -> zero outline!)
  const rangeRing = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 64),
    new THREE.MeshBasicMaterial({
      map: tex.rangeDisc,
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    })
  );
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.visible = false;
  vfxRoot.add(rangeRing);

  const selectRing = new THREE.Mesh(
    new THREE.RingGeometry(1.12, 1.26, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  selectRing.rotation.x = -Math.PI / 2;
  selectRing.visible = false;
  vfxRoot.add(selectRing);

  // 8. Tier-4 Legendary Upgrade Reveal Radial Backdrop Disc (under vfxRoot)
  const legendaryBackdrop = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 48),
    new THREE.MeshBasicMaterial({
      map: tex.softGlow,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  legendaryBackdrop.rotation.x = -Math.PI / 2;
  legendaryBackdrop.visible = false;
  vfxRoot.add(legendaryBackdrop);

  // 9. Interactive 3D Victory Supply Chest (placed on stage-specific Beacon Plaza!)
  const supplyChest = buildSupplyChestRig();
  const chestPos = stage?.supplyChestPos ?? { x: 9.75, y: 0, z: 2.7 };
  supplyChest.group.position.set(chestPos.x, chestPos.y ?? 0, chestPos.z);
  supplyChest.group.rotation.y = -0.38;
  root.add(supplyChest.group);

  return {
    root,
    vfxRoot,
    stageConfig: stage,
    pads,
    mechanisms,
    speedZoneVisuals,
    craterRing,
    beacon,
    entrance,
    entrances,
    rangeRing,
    selectRing,
    legendaryBackdrop,
    supplyChest,
    dispose: () => {
      disposeObject3DTree(root);
      disposeObject3DTree(vfxRoot);
    },
  };
}
