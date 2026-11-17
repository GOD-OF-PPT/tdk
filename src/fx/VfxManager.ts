import * as THREE from 'three';
import { create3DEnergyCrystalMesh, create3DGoldCoinMesh } from '../render/BeaconAndPropsFactory';
import { getToonTextures, makeToonMaterial } from '../render/ToonMaterials';

interface TracerBeam {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxOpacity: number;
  velY?: number;
}

interface MortarShell {
  group: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
  elapsed: number;
  duration: number;
  arcHeight: number;
  splashRadius: number;
  onImpact: (x: number, z: number) => void;
  orientAlongVelocity?: boolean;
}

interface ExpandingRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
  startScale: number;
  endScale: number;
  maxOpacity: number;
}

interface PlasmaBurnZone {
  group: THREE.Group;
  discMat: THREE.MeshBasicMaterial;
  rimMat: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
  radius: number;
  emberTimer: number;
}

interface ParticleSpark {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  gravity: number;
  life: number;
  maxLife: number;
  inwardTarget: THREE.Vector3 | null;
}

interface LootPickup3D {
  mesh: THREE.Group;
  vel: THREE.Vector3;
  age: number;
  flyDelay: number;
  flyDuration: number;
  flyStart: THREE.Vector3;
  flyGoal: THREE.Vector3;
  isCrystal: boolean;
  onArrive?: () => void;
}

interface DebrisChunk3D {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class VfxManager {
  private solidScene: THREE.Scene;
  private vfxScene: THREE.Scene;

  private tracers: TracerBeam[] = [];
  private mortarShells: MortarShell[] = [];
  private rings: ExpandingRing[] = [];
  private burnZones: PlasmaBurnZone[] = [];
  private sparks: ParticleSpark[] = [];
  private pickups3D: LootPickup3D[] = [];
  private debris3D: DebrisChunk3D[] = [];

  private bossWarningMesh: THREE.Mesh;
  private bossWarningMat: THREE.MeshBasicMaterial;

  private tacticalReticleGroup: THREE.Group;
  private tacticalReticleInner: THREE.Mesh;
  private tacticalReticleMats: THREE.MeshBasicMaterial[] = [];

  private sparkGeo = new THREE.SphereGeometry(0.085, 6, 6);
  private dustGeo = new THREE.SphereGeometry(0.14, 7, 6);
  private debrisGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);
  private brassCasingGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.11, 6);
  private brassCasingMat = makeToonMaterial(0xfbbf24, { emissive: 0xd97706, emissiveIntensity: 0.35, metallicStep: true });
  private shieldShardGeo = new THREE.OctahedronGeometry(0.09, 0);
  private shieldShardMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 });
  private rustDebrisMat = makeToonMaterial(0x9b392d);
  private greyDebrisMat = makeToonMaterial(0x353844, { metallicStep: true });

  constructor(solidScene: THREE.Scene, vfxScene: THREE.Scene) {
    this.solidScene = solidScene;
    this.vfxScene = vfxScene;

    const tex = getToonTextures();
    this.bossWarningMat = new THREE.MeshBasicMaterial({
      map: tex.hazardZone,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.bossWarningMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.bossWarningMat);
    this.bossWarningMesh.rotation.x = -Math.PI / 2;
    this.bossWarningMesh.visible = false;
    this.vfxScene.add(this.bossWarningMesh);

    // Persistent Orbital Ion Strike aiming reticle (vfxScene default Layer 0, hidden until armed)
    this.tacticalReticleGroup = new THREE.Group();
    this.tacticalReticleGroup.position.set(0, 0.085, 0);
    this.tacticalReticleGroup.visible = false;

    const retOuterMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const retOuter = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 48), retOuterMat);
    retOuter.rotation.x = -Math.PI / 2;
    this.tacticalReticleGroup.add(retOuter);

    const retFillMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const retFill = new THREE.Mesh(new THREE.CircleGeometry(0.94, 36), retFillMat);
    retFill.rotation.x = -Math.PI / 2;
    this.tacticalReticleGroup.add(retFill);

    const retInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.tacticalReticleInner = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.54, 4), retInnerMat);
    this.tacticalReticleInner.rotation.x = -Math.PI / 2;
    this.tacticalReticleGroup.add(this.tacticalReticleInner);

    this.tacticalReticleMats.push(retOuterMat, retFillMat, retInnerMat);
    this.vfxScene.add(this.tacticalReticleGroup);
  }

  /**
   * Short crisp orange-yellow muzzle flash + ballistic streak for Twin Autocannon.
   */
  public spawnAutocannonShot(from: THREE.Vector3, to: THREE.Vector3): void {
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;

    // Muzzle flash sprite
    this.spawnFlashBall(from, 0xffb703, 0.28, 0.07);

    // Short crisp streak
    const streakLen = Math.min(dist, 2.2);
    const geo = new THREE.CylinderGeometry(0.038, 0.018, streakLen, 6);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffbe3b,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const mid = from.clone().lerp(to, 0.65);
    mesh.position.copy(mid);
    mesh.lookAt(to);
    this.vfxScene.add(mesh);

    this.tracers.push({ mesh, mat, life: 0, maxLife: 0.085, maxOpacity: 0.95 });
    this.spawnFlashBall(to, 0xfef08a, 0.18, 0.065);
    this.spawnGroundRing(new THREE.Vector3(to.x, 0.09, to.z), 0xffbe3b, 0.12, 0.58, 0.14, 0.55);
    if (this.debris3D.length < 42) { const shell = new THREE.Mesh(this.brassCasingGeo, this.brassCasingMat); shell.position.copy(from); const dir = to.clone().sub(from).normalize(); const sideX = -dir.z * (Math.random() > 0.5 ? 1 : -1), sideZ = dir.x * (Math.random() > 0.5 ? 1 : -1); this.solidScene.add(shell); this.debris3D.push({ mesh: shell, vel: new THREE.Vector3(sideX * (1.8 + Math.random()), 2.4 + Math.random() * 1.1, sideZ * (1.8 + Math.random())), rotVel: new THREE.Vector3(14, 11, 18), life: 0, maxLife: 0.46 }); }
  }

  /**
   * Cyan-blue parabolic energy shell for Pulse Mortar (targets ground coordinate cleanly — never chases corpses!).
   */
  public launchMortarShell(
    from: THREE.Vector3,
    targetX: number,
    targetZ: number,
    splashRadius: number,
    onImpact: (x: number, z: number) => void
  ): void {
    this.spawnFlashBall(from, 0x22d3ee, 0.42, 0.12);

    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    group.add(core);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getToonTextures().softGlow,
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.setScalar(0.95);
    group.add(halo);

    group.position.copy(from);
    this.vfxScene.add(group);

    const end = new THREE.Vector3(targetX, 0.12, targetZ);
    const horizDist = Math.hypot(targetX - from.x, targetZ - from.z);
    const duration = THREE.MathUtils.clamp(0.42 + horizDist * 0.028, 0.44, 0.68);

    this.mortarShells.push({
      group,
      start: from.clone(),
      end,
      elapsed: 0,
      duration,
      arcHeight: 2.3 + horizDist * 0.18,
      splashRadius,
      onImpact,
    });
  }

  public spawnMortarImpact(x: number, z: number, radius: number): void {
    const pos = new THREE.Vector3(x, 0.08, z);
    this.spawnGroundRing(pos, 0x22d3ee, 0.35, radius * 2.15, 0.38); this.spawnGroundRing(pos, 0xe0f2fe, 0.2, radius * 1.35, 0.24, 0.85);
    this.spawnFlashBall(new THREE.Vector3(x, 0.35, z), 0x67e8f9, radius * 0.78, 0.2);
    const domeGeo = new THREE.SphereGeometry(radius * 0.76, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); const domeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); const dome = new THREE.Mesh(domeGeo, domeMat); dome.position.set(x, 0.06, z); this.vfxScene.add(dome); this.tracers.push({ mesh: dome, mat: domeMat, life: 0, maxLife: 0.24, maxOpacity: 0.62 });
    this.spawnLunarDustRing(new THREE.Vector3(x, 0.06, z), 8, radius * 0.7);

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 2.2 + Math.random() * 2.6;
      this.spawnSpark(
        new THREE.Vector3(x, 0.2, z),
        new THREE.Vector3(Math.cos(a) * spd, 2.2 + Math.random() * 2.0, Math.sin(a) * spd),
        0x38bdf8,
        0.32,
        9.5
      );
    }
  }

  /**
   * Purple magnetic field ground pulse for Magnetic Restraint Tower.
   */
  public spawnMagneticFieldPulse(center: THREE.Vector3, range: number): void {
    const groundPos = new THREE.Vector3(center.x, 0.07, center.z);
    this.spawnGroundRing(groundPos, 0xc084fc, 0.5, range * 2.0, 0.48);
    this.spawnGroundRing(groundPos, 0x9333ea, 0.3, range * 1.45, 0.36);
  }

  // ==================== M3 TACTICAL SKILLS, SYNERGY COMBOS & T4 BRANCH VFX ====================

  /**
   * Controls the ground aiming reticle for Commander Skill 1 (轨道离子轰炸).
   */
  public setTacticalReticle(visible: boolean, x = 0, z = 0, radius = 3.2): void {
    this.tacticalReticleGroup.visible = visible;
    if (!visible) return;
    this.tacticalReticleGroup.position.set(x, 0.085, z);
    this.tacticalReticleGroup.scale.setScalar(radius);
  }

  /**
   * 0.55s shrinking target lock-on telegraph before Orbital Ion Strike impacts.
   */
  public spawnOrbitalLockOn(x: number, z: number, radius = 3.2, duration = 0.55): void {
    this.spawnGroundRing(
      new THREE.Vector3(x, 0.09, z),
      0x38bdf8,
      radius * 2.05,
      radius * 0.28,
      duration,
      0.78
    );
    this.spawnGroundRing(
      new THREE.Vector3(x, 0.095, z),
      0xfbbf24,
      radius * 1.35,
      0.18,
      duration * 0.92,
      0.72
    );

    const target = new THREE.Vector3(x, 0.25, z);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const start = new THREE.Vector3(
        x + Math.cos(a) * radius * 0.95,
        0.3 + (i % 2) * 0.25,
        z + Math.sin(a) * radius * 0.95
      );
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x38bdf8 : 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(start);
      this.vfxScene.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vel: new THREE.Vector3(0, 0, 0),
        gravity: 0,
        life: 0,
        maxLife: duration * 0.85,
        inwardTarget: target.clone(),
      });
    }
  }

  /**
   * Sky-piercing Orbital Ion Beam + crisp shockwaves (non-bleaching peak opacity <= 0.84).
   */
  public spawnOrbitalIonBeam(x: number, z: number, radius = 3.2): void {
    const coreGeo = new THREE.CylinderGeometry(0.22, 0.28, 18, 12, 1, true);
    coreGeo.translate(0, 9, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coreBeam = new THREE.Mesh(coreGeo, coreMat);
    coreBeam.position.set(x, 0.05, z);
    this.vfxScene.add(coreBeam);
    this.tracers.push({ mesh: coreBeam, mat: coreMat, life: 0, maxLife: 0.36, maxOpacity: 0.82 });

    const sheathGeo = new THREE.CylinderGeometry(0.54, 0.76, 18, 14, 1, true);
    sheathGeo.translate(0, 9, 0);
    const sheathMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sheathBeam = new THREE.Mesh(sheathGeo, sheathMat);
    sheathBeam.position.set(x, 0.05, z);
    this.vfxScene.add(sheathBeam);
    this.tracers.push({
      mesh: sheathBeam,
      mat: sheathMat,
      life: 0,
      maxLife: 0.4,
      maxOpacity: 0.48,
    });

    this.spawnGroundRing(new THREE.Vector3(x, 0.09, z), 0x38bdf8, 0.5, radius * 2.15, 0.46, 0.8);
    this.spawnGroundRing(
      new THREE.Vector3(x, 0.095, z),
      0xfbbf24,
      0.35,
      radius * 1.45,
      0.34,
      0.72
    );
    this.spawnLunarDustRing(new THREE.Vector3(x, 0, z), 12, 1.45);

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 2.6 + Math.random() * 3.2;
      this.spawnSpark(
        new THREE.Vector3(x, 0.25, z),
        new THREE.Vector3(Math.cos(a) * spd, 2.8 + Math.random() * 2.6, Math.sin(a) * spd),
        i % 3 === 0 ? 0xfbbf24 : 0x38bdf8,
        0.4,
        10.0
      );
    }
  }

  /**
   * Station-wide non-bleaching EMP Overdrive wave (全域电磁超载).
   */
  public spawnEmpOverdrivePulse(origin: THREE.Vector3): void {
    this.spawnGroundRing(
      new THREE.Vector3(origin.x, 0.11, origin.z),
      0x38bdf8,
      0.8,
      26.0,
      0.62,
      0.54
    );
    this.spawnGroundRing(
      new THREE.Vector3(origin.x, 0.115, origin.z),
      0xc084fc,
      0.5,
      20.0,
      0.52,
      0.46
    );
  }

  public spawnStationEmpWave(origin: THREE.Vector3): void {
    this.spawnEmpOverdrivePulse(origin);
  }

  /**
   * Emerald-cyan harmonic repair rings + upward sparks around Return Beacon (纳米信标急修).
   */
  public spawnBeaconNanoRepair(beaconPos: THREE.Vector3): void {
    const base = new THREE.Vector3(beaconPos.x, 0.09, beaconPos.z);
    this.spawnGroundRing(base, 0x34d399, 0.55, 5.4, 0.54, 0.72);
    this.spawnGroundRing(
      new THREE.Vector3(beaconPos.x, 0.095, beaconPos.z),
      0x22d3ee,
      0.38,
      3.8,
      0.42,
      0.64
    );

    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(0.95 + r * 0.14, 0.042, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: r % 2 === 0 ? 0x34d399 : 0x22d3ee,
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(beaconPos.x, 0.35 + r * 0.45, beaconPos.z);
      this.vfxScene.add(ringMesh);
      this.tracers.push({
        mesh: ringMesh,
        mat: ringMat,
        life: 0,
        maxLife: 0.55,
        maxOpacity: 0.74,
        velY: 2.2,
      });
    }

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rad = 0.75 + (i % 3) * 0.25;
      this.spawnSpark(
        new THREE.Vector3(
          beaconPos.x + Math.cos(a) * rad,
          0.35 + Math.random() * 0.5,
          beaconPos.z + Math.sin(a) * rad
        ),
        new THREE.Vector3(Math.cos(a) * 0.65, 3.2 + Math.random() * 1.6, Math.sin(a) * 0.65),
        i % 3 === 0 ? 0x22d3ee : 0x34d399,
        0.52,
        2.4
      );
    }
  }

  /**
   * Crisp 3-segment oriented 3D cylinder lightning arc (visible across all WebGL2 drivers unlike 1px Line).
   */
  public spawnChainLightningArc(
    from: THREE.Vector3,
    to: THREE.Vector3,
    colorHex = 0x38bdf8,
    maxLife = 0.18
  ): void {
    const totalDist = from.distanceTo(to);
    if (totalDist < 0.05) return;

    const jScale = Math.min(0.28, totalDist * 0.14);
    const p0 = from.clone();
    const p1 = from
      .clone()
      .lerp(to, 0.33)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2 * jScale,
          (Math.random() - 0.35) * jScale,
          (Math.random() - 0.5) * 2 * jScale
        )
      );
    const p2 = from
      .clone()
      .lerp(to, 0.67)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2 * jScale,
          (Math.random() - 0.35) * jScale,
          (Math.random() - 0.5) * 2 * jScale
        )
      );
    const p3 = to.clone();

    const pts = [p0, p1, p2, p3];
    for (let s = 0; s < 3; s++) {
      const a = pts[s];
      const b = pts[s + 1];
      const segLen = a.distanceTo(b);
      if (segLen < 0.01) continue;

      const geo = new THREE.CylinderGeometry(0.036, 0.036, segLen, 5);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const seg = new THREE.Mesh(geo, mat);
      seg.position.copy(a).lerp(b, 0.5);
      seg.lookAt(b);
      this.vfxScene.add(seg);
      this.tracers.push({ mesh: seg, mat, life: 0, maxLife, maxOpacity: 0.84 });
    }
  }

  /**
   * Mortar + Magnetic ⚡磁暴共振 shockwave + 2-target chain lightning arcs.
   */
  public spawnFluxResonanceDetonation(
    center: THREE.Vector3,
    chainTargets: THREE.Vector3[]
  ): void {
    const cGround = new THREE.Vector3(center.x, 0.09, center.z);
    this.spawnGroundRing(cGround, 0x22d3ee, 0.35, 4.2, 0.28, 0.78);
    this.spawnGroundRing(cGround, 0xc084fc, 0.25, 2.8, 0.22, 0.68);

    const arcStart = center.clone().setY(0.58);
    for (const targetPos of chainTargets.slice(0, 2)) {
      const dst = targetPos.clone().setY(0.55);
      this.spawnChainLightningArc(arcStart, dst, 0x38bdf8, 0.18);
      this.spawnFlashBall(dst, 0x67e8f9, 0.22, 0.11);
    }
  }

  public spawnFluxDetonation(center: THREE.Vector3, chainTargets: THREE.Vector3[]): void {
    this.spawnFluxResonanceDetonation(center, chainTargets);
  }

  /**
   * Mortar T4-A (天穹聚变巨炮) 3.0s persistent plasma burn zone (ticked by combat dt; peak opacity <= 0.38).
   */
  public spawnPlasmaBurnZone(x: number, z: number, radius = 3.0, duration = 3.0): void {
    const group = new THREE.Group();
    group.position.set(x, 0.062, z);

    const discMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const discMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), discMat);
    discMesh.rotation.x = -Math.PI / 2;
    group.add(discMesh);

    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rimMesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.91, radius, 44), rimMat);
    rimMesh.rotation.x = -Math.PI / 2;
    group.add(rimMesh);

    this.vfxScene.add(group);
    this.burnZones.push({
      group,
      discMat,
      rimMat,
      elapsed: 0,
      duration,
      radius,
      emberTimer: 0,
    });
  }

  /**
   * Mortar T4-B (集束火箭弹巢) fast parabolic cluster rocket with orienting warhead.
   */
  public launchClusterRocket(
    from: THREE.Vector3,
    targetX: number,
    targetZ: number,
    splashRadius: number,
    onImpact: (x: number, z: number) => void
  ): void {
    this.spawnFlashBall(from, 0xfb923c, 0.28, 0.09);

    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.3, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(
      bodyGeo,
      new THREE.MeshBasicMaterial({ color: 0xfb923c })
    );
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.065, 0.14, 8);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.translate(0, 0, 0.22);
    const nose = new THREE.Mesh(
      noseGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    group.add(nose);

    const plume = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getToonTextures().softGlow,
        color: 0xfb923c,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    plume.position.set(0, 0, -0.2);
    plume.scale.setScalar(0.68);
    group.add(plume);

    group.position.copy(from);
    this.vfxScene.add(group);

    const end = new THREE.Vector3(targetX, 0.12, targetZ);
    const horizDist = Math.hypot(targetX - from.x, targetZ - from.z);
    const duration = THREE.MathUtils.clamp(0.32 + horizDist * 0.016, 0.34, 0.48);

    this.mortarShells.push({
      group,
      start: from.clone(),
      end,
      elapsed: 0,
      duration,
      arcHeight: 1.55 + horizDist * 0.12,
      splashRadius,
      onImpact,
      orientAlongVelocity: true,
    });
  }

  /**
   * Autocannon T4-B (双联电磁轨炮) hyper-velocity piercing Gauss slug beam.
   */
  public spawnRailgunSlug(from: THREE.Vector3, to: THREE.Vector3): void {
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;

    this.spawnFlashBall(from, 0x38bdf8, 0.3, 0.1);

    const beamGeo = new THREE.CylinderGeometry(0.052, 0.042, dist, 8);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(from).lerp(to, 0.5);
    beam.lookAt(to);
    this.vfxScene.add(beam);
    this.tracers.push({ mesh: beam, mat: beamMat, life: 0, maxLife: 0.14, maxOpacity: 0.85 });

    const ringGeo = new THREE.TorusGeometry(0.2, 0.032, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(from).lerp(to, Math.min(0.18, 0.8 / dist));
    ring.lookAt(to);
    this.vfxScene.add(ring);
    this.tracers.push({ mesh: ring, mat: ringMat, life: 0, maxLife: 0.14, maxOpacity: 0.82 });
    for (const frac of [0.42, 0.72]) { const mGeo = new THREE.TorusGeometry(0.28, 0.028, 6, 16); const mMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.78, depthWrite: false }); const mRing = new THREE.Mesh(mGeo, mMat); mRing.position.copy(from).lerp(to, frac); mRing.lookAt(to); this.vfxScene.add(mRing); this.tracers.push({ mesh: mRing, mat: mMat, life: 0, maxLife: 0.18, maxOpacity: 0.78 }); }
    this.spawnGroundRing(new THREE.Vector3(to.x, 0.1, to.z), 0x38bdf8, 0.25, 1.65, 0.22, 0.82);
  }

  /**
   * Crisp gold flash + sparks for 🎯弱点暴击.
   */
  public spawnWeakPointCrit(pos: THREE.Vector3): void {
    const hit = pos.clone();
    if (hit.y < 0.45) hit.y = 0.55;
    this.spawnFlashBall(hit, 0xfde047, 0.38, 0.14);
    this.spawnGroundRing(new THREE.Vector3(hit.x, 0.1, hit.z), 0xfde047, 0.2, 1.45, 0.2, 0.88);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
      this.spawnSpark(
        hit,
        new THREE.Vector3(Math.cos(a) * 3.1, 1.8 + Math.random() * 1.8, Math.sin(a) * 3.1),
        0xfbbf24,
        0.2,
        10.5
      );
    }
  }

  /**
   * Crisp cyan energy-shield shatter burst.
   */
  public spawnShieldBreak(pos: THREE.Vector3): void {
    this.spawnGroundRing(new THREE.Vector3(pos.x, 0.1, pos.z), 0x38bdf8, 0.35, 2.2, 0.24, 0.78);
    const center = pos.clone().setY(0.65);
    this.spawnFlashBall(center, 0x67e8f9, 0.42, 0.15);
    for (let sIdx = 0; sIdx < 5 && this.debris3D.length < 48; sIdx++) { const sa = (sIdx / 5) * Math.PI * 2; const shard = new THREE.Mesh(this.shieldShardGeo, this.shieldShardMat); shard.position.copy(center); this.solidScene.add(shard); this.debris3D.push({ mesh: shard, vel: new THREE.Vector3(Math.cos(sa) * 2.6, 2.2 + Math.random(), Math.sin(sa) * 2.6), rotVel: new THREE.Vector3(10, 14, 9), life: 0, maxLife: 0.38 }); }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.spawnSpark(
        center,
        new THREE.Vector3(Math.cos(a) * 3.4, 1.6 + Math.random() * 1.8, Math.sin(a) * 3.4),
        0x38bdf8,
        0.24,
        9.5
      );
    }
  }

  /**
   * Magnetic T4-A (奇点引力中枢) inward-collapsing singularity ring + suction particles.
   */
  public spawnSingularityPullRing(center: THREE.Vector3, range: number): void {
    this.spawnGroundRing(
      new THREE.Vector3(center.x, 0.08, center.z),
      0xa855f7,
      range * 1.95,
      0.35,
      0.38,
      0.76
    );
    this.spawnGroundRing(
      new THREE.Vector3(center.x, 0.085, center.z),
      0xf59e0b,
      range * 1.25,
      0.22,
      0.32,
      0.62
    );

    const pullGoal = center.clone().setY(0.65);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.25;
      const r = range * (0.65 + Math.random() * 0.3);
      const start = new THREE.Vector3(
        center.x + Math.cos(a) * r,
        0.28 + Math.random() * 0.6,
        center.z + Math.sin(a) * r
      );
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfbbf24 : 0xc084fc,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(start);
      this.vfxScene.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vel: new THREE.Vector3(0, 0, 0),
        gravity: 0,
        life: 0,
        maxLife: 0.36,
        inwardTarget: pullGoal.clone(),
      });
    }
  }

  public spawnSingularityPull(center: THREE.Vector3, range: number): void {
    this.spawnSingularityPullRing(center, range);
  }

  /**
   * Magnetic T4-B (高压电弧矩阵) 7.0m neighbor haste aura ring + up to 5-target chain lightning hops.
   */
  public spawnArcMatrixPulse(
    center: THREE.Vector3,
    chainTargets: THREE.Vector3[],
    auraRadius = 7.0
  ): void {
    this.spawnGroundRing(
      new THREE.Vector3(center.x, 0.075, center.z),
      0x38bdf8,
      0.6,
      auraRadius * 2.0,
      0.46,
      0.42
    );
    this.spawnGroundRing(
      new THREE.Vector3(center.x, 0.08, center.z),
      0xf59e0b,
      0.4,
      5.2,
      0.34,
      0.55
    );

    let prev = new THREE.Vector3(center.x, center.y + 1.68, center.z);
    for (const targetPos of chainTargets.slice(0, 5)) {
      const next = targetPos.clone().setY(0.6);
      this.spawnChainLightningArc(prev, next, 0x38bdf8, 0.16);
      this.spawnFlashBall(next, 0x67e8f9, 0.19, 0.1);
      prev = next;
    }
  }

  /**
   * Ring of grey-blue lunar dust when a tower slams onto a build pad!
   */
  public spawnLunarDustRing(center: THREE.Vector3, count = 10, spread = 1.15): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const mat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      const puff = new THREE.Mesh(this.dustGeo, mat);
      puff.position.set(center.x + Math.cos(a) * 0.65, 0.14, center.z + Math.sin(a) * 0.65);
      this.vfxScene.add(puff);

      this.sparks.push({
        mesh: puff,
        mat,
        vel: new THREE.Vector3(Math.cos(a) * spread * 1.9, 0.65 + Math.random() * 0.5, Math.sin(a) * spread * 1.9),
        gravity: 1.5,
        life: 0,
        maxLife: 0.42,
        inwardTarget: null,
      });
    }
  }

  /**
   * Short crisp hit sparks (brighter metallic sparks for armored Heavy Drills!).
   */
  public spawnHitSparks(pos: THREE.Vector3, armoredMetallic: boolean): void {
    const count = armoredMetallic ? 5 : 3;
    const col = armoredMetallic ? 0xfef08a : 0xff9f1c;
    for (let i = 0; i < count; i++) {
      this.spawnSpark(
        pos,
        new THREE.Vector3((Math.random() - 0.5) * 4.2, 1.5 + Math.random() * 2.4, (Math.random() - 0.5) * 4.2),
        col,
        0.18,
        12
      );
    }
  }

  /**
   * Reserved high-impact burst for Elite Kill, Tier-4 Legendary Upgrade, and Final Boss Kill!
   */
  public spawnClimaxBurst(pos: THREE.Vector3, colorHex: number, scale = 1.0, spawnArmorDebris = true): void {
    const groundPos = new THREE.Vector3(pos.x, 0.09, pos.z);
    this.spawnGroundRing(groundPos, colorHex, 0.5, 5.8 * scale, 0.58);
    this.spawnGroundRing(groundPos, 0xffffff, 0.3, 3.8 * scale, 0.38);

    // Vertical energy pillar (short-lived, clean, never lingers to obscure road!)
    const pillarGeo = new THREE.CylinderGeometry(0.45 * scale, 0.75 * scale, 5.5 * scale, 14, 1, true);
    pillarGeo.translate(0, 2.75 * scale, 0);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, 0.05, pos.z);
    this.vfxScene.add(pillar);
    this.tracers.push({ mesh: pillar, mat: pillarMat, life: 0, maxLife: 0.46, maxOpacity: 0.82 });

    for (let i = 0; i < Math.round(16 * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (2.8 + Math.random() * 4.2) * scale;
      this.spawnSpark(
        new THREE.Vector3(pos.x, 0.5, pos.z),
        new THREE.Vector3(Math.cos(a) * spd, 3.2 + Math.random() * 3.8, Math.sin(a) * spd),
        colorHex,
        0.48,
        10.5
      );
    }

    if (spawnArmorDebris) {
      this.spawnArmorBreakDebris(pos, Math.round(6 * scale));
    }
  }

  /**
   * Celebratory non-bleaching VFX for Stage 5B Supply Chest Reward Claim:
   * Expanding warm-gold & crystal-cyan ground shockwaves + radial outward rim sparkles,
   * with ZERO vertical AdditiveBlending pillar so 3D chest, coins & crystals stay crisp!
   */
  public spawnChestOpenCelebration(worldPos: THREE.Vector3): void {
    this.spawnGroundRing(new THREE.Vector3(worldPos.x, 0.085, worldPos.z), 0xfbbf24, 0.65, 5.2, 0.56);
    this.spawnGroundRing(new THREE.Vector3(worldPos.x, 0.092, worldPos.z), 0x22d3ee, 0.45, 3.8, 0.44);
    this.spawnGroundRing(new THREE.Vector3(worldPos.x, 0.098, worldPos.z), 0xfde68a, 0.35, 2.5, 0.3);

    const palette = [0xfbbf24, 0xfde68a, 0x22d3ee] as const;
    const count = 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      const rimRadius = 0.52;
      const startPos = new THREE.Vector3(
        worldPos.x + Math.cos(a) * rimRadius,
        worldPos.y + 0.68,
        worldPos.z + Math.sin(a) * rimRadius
      );
      const spd = 2.6 + Math.random() * 1.9;
      const vel = new THREE.Vector3(
        Math.cos(a) * spd,
        2.8 + Math.random() * 1.8,
        Math.sin(a) * spd
      );
      this.spawnSpark(startPos, vel, palette[i % palette.length], 0.52, 9.2);
    }

    // Crisp metallic sparks right at the front lock clasp pop-off point
    this.spawnHitSparks(new THREE.Vector3(worldPos.x, worldPos.y + 0.68, worldPos.z + 0.48), true);
  }

  /**
   * Spawns real 3D cel-shaded outlined armor chunks when Heavy Drill / Boss plates shatter!
   */
  public spawnArmorBreakDebris(pos: THREE.Vector3, count = 5): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        this.debrisGeo,
        i % 2 === 0 ? this.rustDebrisMat : this.greyDebrisMat
      );
      mesh.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y + 0.5, pos.z + (Math.random() - 0.5) * 0.6);
      mesh.castShadow = true;
      this.solidScene.add(mesh);

      const a = Math.random() * Math.PI * 2;
      const spd = 2.2 + Math.random() * 3.2;
      this.debris3D.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * spd, 3.8 + Math.random() * 2.8, Math.sin(a) * spd),
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0,
        maxLife: 0.72,
      });
    }
  }

  /**
   * Inward suction energy particles for Stage 3 Boss Charge-Up before entrance!
   */
  public spawnBossInwardSuctionParticles(center: THREE.Vector3, count = 8): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.4 + Math.random() * 1.8;
      const start = new THREE.Vector3(
        center.x + Math.cos(a) * r,
        0.25 + Math.random() * 1.4,
        center.z + Math.sin(a) * r
      );
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff4d29 : 0xfbbf24,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(start);
      this.vfxScene.add(mesh);

      this.sparks.push({
        mesh,
        mat,
        vel: new THREE.Vector3(0, 0, 0),
        gravity: 0,
        life: 0,
        maxLife: 0.45,
        inwardTarget: center.clone().setY(0.8),
      });
    }
  }

  /**
   * Controls the crimson-red ground telegraph zone for Boss active ground-slam skill!
   */
  public setBossTelegraphZone(visible: boolean, x = 0, z = 0, radius = 4.5, progress01 = 0): void {
    this.bossWarningMesh.visible = visible;
    if (!visible) return;
    this.bossWarningMesh.position.set(x, 0.065, z);
    const diameter = radius * 2;
    this.bossWarningMesh.scale.set(diameter, diameter, 1);
    this.bossWarningMesh.rotation.z = progress01 * 1.6;
    this.bossWarningMat.opacity = 0.45 + 0.45 * Math.sin(progress01 * Math.PI * 6) * 0.5 + progress01 * 0.35;
  }

  /**
   * Spawns genuine 3D Gold Coins and/or 3D Faceted Energy Crystals that bounce and zip upward!
   */
  public spawn3DLoot(
    origin: THREE.Vector3,
    coinCount: number,
    crystalCount: number,
    goalWorldPos: THREE.Vector3,
    onEachArrive?: (isCrystal: boolean) => void
  ): void {
    const total = Math.min(coinCount, 8) + Math.min(crystalCount, 8);
    let idx = 0;

    const createOne = (isCrystal: boolean) => {
      const mesh = isCrystal ? create3DEnergyCrystalMesh() : create3DGoldCoinMesh();
      mesh.position.copy(origin).add(new THREE.Vector3(0, 0.45, 0));
      const a = (idx / Math.max(1, total)) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 1.6 + Math.random() * 1.8;
      idx++;

      this.solidScene.add(mesh);
      this.pickups3D.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * spd, 4.2 + Math.random() * 1.8, Math.sin(a) * spd),
        age: 0,
        flyDelay: 0.48 + idx * 0.04,
        flyDuration: 0.46,
        flyStart: new THREE.Vector3(),
        flyGoal: goalWorldPos.clone(),
        isCrystal,
        onArrive: onEachArrive ? () => onEachArrive(isCrystal) : undefined,
      });
    };

    for (let c = 0; c < Math.min(coinCount, 8); c++) createOne(false);
    for (let k = 0; k < Math.min(crystalCount, 8); k++) createOne(true);
  }

  public spawnGroundRing(
    pos: THREE.Vector3,
    colorHex: number,
    startScale: number,
    endScale: number,
    duration: number,
    maxOpacity = 0.9
  ): void {
    const mat = new THREE.MeshBasicMaterial({
      map: getToonTextures().ringWave,
      color: colorHex,
      transparent: true,
      opacity: maxOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos);
    mesh.scale.setScalar(startScale);
    this.vfxScene.add(mesh);

    this.rings.push({ mesh, mat, elapsed: 0, duration, startScale, endScale, maxOpacity });
  }

  private spawnFlashBall(pos: THREE.Vector3, colorHex: number, radius: number, maxLife: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), mat);
    mesh.position.copy(pos);
    this.vfxScene.add(mesh);
    this.tracers.push({ mesh, mat, life: 0, maxLife, maxOpacity: 0.92 });
  }

  private spawnSpark(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    colorHex: number,
    maxLife: number,
    gravity: number
  ): void {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.sparkGeo, mat);
    mesh.position.copy(pos);
    this.vfxScene.add(mesh);
    this.sparks.push({ mesh, mat, vel, gravity, life: 0, maxLife, inwardTarget: null });
  }

  public clearCombatTransients(): void {
    for (const t of this.tracers) {
      this.vfxScene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mat.dispose();
    }
    this.tracers.length = 0;

    for (const p of this.sparks) {
      this.vfxScene.remove(p.mesh);
      p.mat.dispose();
    }
    this.sparks.length = 0;

    for (const z of this.burnZones) {
      this.disposeBurnZone(z);
    }
    this.burnZones.length = 0;

    this.tacticalReticleGroup.visible = false;
  }

  public update(dt: number, realDt = dt): void {
    if (dt === 0 && realDt === 0) return;

    if (this.tacticalReticleGroup.visible) {
      this.tacticalReticleInner.rotation.z += realDt * 1.9;
    }

    // 1. Tracers, short flashes & climax energy pillars (use realDt so hero reveals never freeze mid-flash)
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life += realDt;
      if (t.life >= t.maxLife) {
        this.vfxScene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mat.dispose();
        this.tracers.splice(i, 1);
      } else {
        if (t.velY) {
          t.mesh.position.y += t.velY * realDt;
        }
        t.mat.opacity = (1 - t.life / t.maxLife) * t.maxOpacity;
      }
    }

    // 2. Parabolic Mortar Shells, Cluster Rockets & 3.0s Plasma Burn Zones (paused when combat dt === 0)
    if (dt > 0) {
      for (let i = this.mortarShells.length - 1; i >= 0; i--) {
        const s = this.mortarShells[i];
        const prevPos = s.orientAlongVelocity ? s.group.position.clone() : null;
        s.elapsed += dt;
        const u = Math.min(1, s.elapsed / s.duration);
        s.group.position.lerpVectors(s.start, s.end, u); s.group.position.y += 4 * s.arcHeight * u * (1 - u);
        if (this.sparks.length < 90 && Math.random() < 0.65) this.spawnSpark(s.group.position.clone(), new THREE.Vector3((Math.random() - 0.5) * 0.5, -0.3, (Math.random() - 0.5) * 0.5), s.orientAlongVelocity ? 0xfbbf24 : 0x67e8f9, 0.18, 0.8);
        if (prevPos && s.group.position.distanceToSquared(prevPos) > 0.0001) {
          const lookTarget = s.group.position.clone().multiplyScalar(2).sub(prevPos);
          s.group.lookAt(lookTarget);
        }

        if (u >= 1) {
          this.disposeMortarShell(s);
          this.mortarShells.splice(i, 1);
          this.spawnMortarImpact(s.end.x, s.end.z, s.splashRadius);
          s.onImpact(s.end.x, s.end.z);
        }
      }

      for (let i = this.burnZones.length - 1; i >= 0; i--) {
        const z = this.burnZones[i];
        z.elapsed += dt;
        const u = Math.min(1, z.elapsed / z.duration);
        if (u >= 1) {
          this.disposeBurnZone(z);
          this.burnZones.splice(i, 1);
          continue;
        }
        const fade = u > 0.78 ? 1 - (u - 0.78) / 0.22 : 1;
        z.discMat.opacity = (0.18 + 0.05 * Math.sin(z.elapsed * 9)) * fade;
        z.rimMat.opacity = (0.31 + 0.06 * Math.cos(z.elapsed * 7)) * fade;

        z.emberTimer += dt;
        if (z.emberTimer >= 0.22) {
          z.emberTimer = 0;
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * z.radius * 0.88;
          this.spawnSpark(
            new THREE.Vector3(
              z.group.position.x + Math.cos(a) * rr,
              0.12,
              z.group.position.z + Math.sin(a) * rr
            ),
            new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.4 + Math.random() * 0.9, (Math.random() - 0.5) * 0.6),
            0x22d3ee,
            0.34,
            1.8
          );
        }
      }
    }

    // 3. Expanding / Collapsing Ground Rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.elapsed += realDt;
      const u = Math.min(1, r.elapsed / r.duration);
      const sc = THREE.MathUtils.lerp(r.startScale, r.endScale, 1 - Math.pow(1 - u, 2));
      r.mesh.scale.set(sc, sc, 1);
      r.mat.opacity = (1 - u) * r.maxOpacity;
      if (u >= 1) {
        this.vfxScene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mat.dispose();
        this.rings.splice(i, 1);
      }
    }

    // 4. Sparks, Dust & Inward Suction Particles
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life += realDt;
      if (p.life >= p.maxLife) {
        this.vfxScene.remove(p.mesh);
        p.mat.dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      const u = p.life / p.maxLife;
      if (p.inwardTarget) {
        p.mesh.position.lerp(p.inwardTarget, realDt * 7.5);
      } else {
        p.vel.y -= p.gravity * realDt;
        p.mesh.position.addScaledVector(p.vel, realDt);
        if (p.mesh.position.y < 0.06) {
          p.mesh.position.y = 0.06;
          p.vel.y *= -0.3;
        }
      }
      p.mat.opacity = 1 - u;
      p.mesh.scale.setScalar(1 - u * 0.45);
    }

    // 5. 3D Armor Debris Chunks
    for (let i = this.debris3D.length - 1; i >= 0; i--) {
      const d = this.debris3D[i];
      d.life += realDt;
      if (d.life >= d.maxLife) {
        this.solidScene.remove(d.mesh);
        this.debris3D.splice(i, 1);
        continue;
      }
      d.vel.y -= 14 * realDt;
      d.mesh.position.addScaledVector(d.vel, realDt);
      if (d.mesh.position.y < 0.08) {
        d.mesh.position.y = 0.08;
        d.vel.y *= -0.35;
      }
      d.mesh.rotation.x += d.rotVel.x * realDt;
      d.mesh.rotation.y += d.rotVel.y * realDt;
      d.mesh.scale.setScalar(1 - (d.life / d.maxLife) * 0.5);
    }

    // 6. Real 3D Gold Coins & 3D Faceted Energy Crystals
    for (let i = this.pickups3D.length - 1; i >= 0; i--) {
      const item = this.pickups3D[i];
      item.age += realDt;
      item.mesh.rotation.y += realDt * 6.5;

      if (item.age < item.flyDelay) {
        item.vel.y -= 13.5 * realDt;
        item.mesh.position.addScaledVector(item.vel, realDt);
        if (item.mesh.position.y < 0.26) {
          item.mesh.position.y = 0.26;
          item.vel.y = Math.abs(item.vel.y) * 0.45;
          item.vel.x *= 0.7;
          item.vel.z *= 0.7;
        }
        item.flyStart.copy(item.mesh.position);
      } else {
        const fu = Math.min(1, (item.age - item.flyDelay) / item.flyDuration);
        const ease = fu * fu;
        item.mesh.position.lerpVectors(item.flyStart, item.flyGoal, ease);
        item.mesh.position.y += Math.sin(fu * Math.PI) * 1.4;
        item.mesh.scale.setScalar(1 - fu * 0.45);
        if (fu >= 1) {
          this.disposePickupGroup(item.mesh);
          this.pickups3D.splice(i, 1);
          item.onArrive?.();
        }
      }
    }
  }

  private disposeBurnZone(z: PlasmaBurnZone): void {
    this.vfxScene.remove(z.group);
    for (const child of z.group.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    z.discMat.dispose();
    z.rimMat.dispose();
  }

  private disposeMortarShell(s: MortarShell): void {
    this.vfxScene.remove(s.group);
    for (const child of s.group.children) {
      if (child instanceof THREE.Sprite) {
        // NEVER dispose child.geometry on THREE.Sprite (Three.js global singleton geometry!)
        // and NEVER dispose child.material.map (shared getToonTextures().softGlow!)
        child.material.dispose();
      } else if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          for (const m of child.material) m.dispose();
        } else {
          child.material.dispose();
        }
      }
    }
  }

  private disposePickupGroup(group: THREE.Group): void {
    this.solidScene.remove(group);
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (!obj.geometry.userData?.shared) geos.add(obj.geometry);
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of list) {
          if (m && !m.userData?.shared) mats.add(m);
        }
      }
    });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }

  public clearAll(): void {
    for (const t of this.tracers) {
      this.vfxScene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mat.dispose();
    }
    this.tracers.length = 0;

    for (const s of this.mortarShells) this.disposeMortarShell(s);
    this.mortarShells.length = 0;

    for (const r of this.rings) {
      this.vfxScene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mat.dispose();
    }
    this.rings.length = 0;

    for (const z of this.burnZones) this.disposeBurnZone(z);
    this.burnZones.length = 0;

    for (const p of this.sparks) {
      this.vfxScene.remove(p.mesh);
      p.mat.dispose();
    }
    this.sparks.length = 0;

    for (const d of this.debris3D) this.solidScene.remove(d.mesh);
    this.debris3D.length = 0;

    for (const k of this.pickups3D) this.disposePickupGroup(k.mesh);
    this.pickups3D.length = 0;

    this.bossWarningMesh.visible = false;
    this.tacticalReticleGroup.visible = false;
  }

  public dispose(): void {
    this.clearAll();
    this.vfxScene.remove(this.bossWarningMesh);
    this.bossWarningMesh.geometry.dispose();
    this.bossWarningMat.dispose();

    this.vfxScene.remove(this.tacticalReticleGroup);
    for (const child of this.tacticalReticleGroup.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    for (const m of this.tacticalReticleMats) {
      m.dispose();
    }
    this.tacticalReticleMats.length = 0;

    this.sparkGeo.dispose();
    this.dustGeo.dispose();
    this.debrisGeo.dispose(); this.brassCasingGeo.dispose(); this.brassCasingMat.dispose(); this.shieldShardGeo.dispose(); this.shieldShardMat.dispose();
    this.rustDebrisMat.dispose();
    this.greyDebrisMat.dispose();
  }
}
