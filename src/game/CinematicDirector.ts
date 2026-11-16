import gsap from 'gsap';
import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { TIER_META, TOWER_BLUEPRINTS } from '../config/gameConfig';
import { VfxManager } from '../fx/VfxManager';
import type { LunarStationEnvironment } from '../render/BeaconAndPropsFactory';
import { applyTowerTierVisuals, getTierPartObjects } from '../render/TowerFactory';
import type {
  EnemyInstance,
  HingedFlapUserData,
  StatDeltaPopup,
  TowerBranch,
  TowerInstance,
  TowerTier,
} from '../types';

export interface CameraPose {
  pos: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export interface CinematicDeps {
  camera: THREE.PerspectiveCamera;
  heroLight: THREE.SpotLight;
  env: LunarStationEnvironment;
  vfx: VfxManager;
  audio: AudioManager;
  getBaseCameraPose: () => CameraPose;
  setCameraOverride: (pose: CameraPose | null) => void;
  setSimTimeScale: (scale: number) => void;
  triggerHitStop: (durationSec: number, slowScale: number) => void;
  onUpgradeStampUI: (
    titleChars: string,
    tierHex: string,
    statDeltas: StatDeltaPopup[],
    isLegendary: boolean
  ) => void;
  onBannerUI: (title: string, subtitle: string, accentHex: string) => void;
  onHideBannerUI: () => void;
}

export class CinematicDirector {
  private deps: CinematicDeps;
  private activeTimelines: gsap.core.Timeline[] = [];
  private shakeIntensity = 0;

  constructor(deps: CinematicDeps) {
    this.deps = deps;
    gsap.ticker.lagSmoothing(0);
  }

  public setEnvironment(env: LunarStationEnvironment): void {
    this.deps.env = env;
  }

  public addCameraShake(amount: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, amount);
  }

  public consumeShakeOffset(dt: number): THREE.Vector3 {
    if (this.shakeIntensity <= 0.001) {
      this.shakeIntensity = 0;
      return new THREE.Vector3(0, 0, 0);
    }
    const amp = this.shakeIntensity;
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.4);
    return new THREE.Vector3(
      (Math.random() - 0.5) * amp,
      (Math.random() - 0.5) * amp * 0.7,
      (Math.random() - 0.5) * amp
    );
  }

  public cancelAll(): void {
    for (const tl of this.activeTimelines) tl.kill();
    this.activeTimelines.length = 0;
    this.shakeIntensity = 0;
    this.deps.setCameraOverride(null);
    this.deps.setSimTimeScale(1);
    this.deps.heroLight.intensity = 0;
    this.deps.env.legendaryBackdrop.visible = false;
    const allEntrances = this.deps.env.entrances ?? [this.deps.env.entrance];
    for (const ent of allEntrances) {
      ent.fissureGroup.visible = false;
      for (const m of ent.hazardLampMats) {
        m.emissiveIntensity = 0.45;
      }
    }
    this.deps.onHideBannerUI();
  }

  private registerTimeline(tl: gsap.core.Timeline): gsap.core.Timeline {
    this.activeTimelines.push(tl);
    tl.eventCallback('onComplete', () => {
      const idx = this.activeTimelines.indexOf(tl);
      if (idx >= 0) this.activeTimelines.splice(idx, 1);
    });
    return tl;
  }

  /**
   * STAGE 1: Preparation & Deployment
   * Sweeps camera from distant lunar vista into the mining station while Return Beacon lamps ignite sequentially!
   */
  public playOpeningStationIntro(onComplete: () => void): void {
    const basePose = this.deps.getBaseCameraPose();
    const beacon = this.deps.env.beacon;

    for (const m of beacon.statusLampMats) m.emissiveIntensity = 0.05;
    (beacon.coreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;

    const camProxy = {
      px: basePose.pos.x - 7.5,
      py: basePose.pos.y + 9.5,
      pz: basePose.pos.z + 12.0,
      lx: basePose.lookAt.x + 3.5,
      ly: basePose.lookAt.y + 0.8,
      lz: basePose.lookAt.z,
    };

    const syncCam = () => {
      this.deps.setCameraOverride({
        pos: new THREE.Vector3(camProxy.px, camProxy.py, camProxy.pz),
        lookAt: new THREE.Vector3(camProxy.lx, camProxy.ly, camProxy.lz),
      });
    };
    syncCam();

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    tl.to(
      camProxy,
      {
        px: basePose.pos.x,
        py: basePose.pos.y,
        pz: basePose.pos.z,
        lx: basePose.lookAt.x,
        ly: basePose.lookAt.y,
        lz: basePose.lookAt.z,
        duration: 1.75,
        ease: 'power3.out',
        onUpdate: syncCam,
      },
      0
    );

    // Sequential Return Beacon Lamp Ignition (1 -> 2 -> 3 -> 4)
    beacon.statusLampMats.forEach((mat, idx) => {
      const at = 0.28 + idx * 0.24;
      tl.call(() => this.deps.audio.playBeaconLampBoot(idx), [], at);
      tl.to(mat, { emissiveIntensity: 1.8, duration: 0.22, ease: 'back.out(2)' }, at);
    });

    tl.to(
      beacon.coreMesh.material as THREE.MeshStandardMaterial,
      { emissiveIntensity: 1.35, duration: 0.45, ease: 'power2.out' },
      1.15
    );

    tl.call(() => {
      this.deps.setCameraOverride(null);
      onComplete();
    });
  }

  /**
   * STAGE 2A: Tower Build Assembly
   * Base lands first with squash, rebound & lunar dust -> turret body rises -> barrels/arms snap in!
   */
  public playTowerBuildAssembly(tower: TowerInstance): void {
    const { baseGroup, turretYaw, weaponPitch } = tower.rig;
    this.deps.audio.playTowerBuildLand();

    baseGroup.position.y = 1.65;
    baseGroup.scale.set(0.88, 1.15, 0.88);
    turretYaw.scale.setScalar(0.01);
    const restTurretY = turretYaw.position.y;
    turretYaw.position.y = 0.05;

    const restWeaponZ = weaponPitch.position.z;
    weaponPitch.position.z = restWeaponZ - 0.26;

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    // 1. Base drops & slams down with squash + dust ring
    tl.to(baseGroup.position, { y: 0, duration: 0.16, ease: 'power3.in' }, 0);
    tl.call(
      () => {
        this.deps.vfx.spawnLunarDustRing(tower.worldPos, 10, 1.1);
      },
      [],
      0.16
    );
    tl.to(baseGroup.scale, { x: 1.18, y: 0.74, z: 1.18, duration: 0.07, ease: 'power2.out' }, 0.16);
    tl.to(baseGroup.scale, { x: 1, y: 1, z: 1, duration: 0.22, ease: 'elastic.out(1.1, 0.5)' }, 0.23);

    // 2. Turret body rises out of base
    tl.to(
      turretYaw.scale,
      { x: 1.08, y: 1.08, z: 1.08, duration: 0.18, ease: 'back.out(2.2)' },
      0.2
    );
    tl.to(turretYaw.position, { y: restTurretY, duration: 0.2, ease: 'back.out(1.8)' }, 0.2);
    tl.to(turretYaw.scale, { x: 1, y: 1, z: 1, duration: 0.14, ease: 'power2.out' }, 0.38);

    // 3. Weapon assembly snaps forward into lock
    tl.to(weaponPitch.position, { z: restWeaponZ, duration: 0.16, ease: 'back.out(2.6)' }, 0.34);
  }

  /**
   * STAGE 2B: Normal Upgrade (Tier 2 & Tier 3 — Non-blocking, does NOT pause battle!)
   * Tower lifts -> new 3D modular parts fly along curved arcs in staggered beats -> core ignites & switches tier color!
   */
  public playNormalUpgrade(
    tower: TowerInstance,
    newTier: TowerTier,
    statDeltas: StatDeltaPopup[]
  ): void {
    const rig = tower.rig;
    const tierMeta = TIER_META[newTier];
    const parts = getTierPartObjects(rig, newTier);

    // Make the new tier group visible immediately while deferring tier color/rim switch until snap-lock!
    applyTowerTierVisuals(rig, newTier, { visibilityOnly: true });

    const restTurretY = 0.34;
    gsap.killTweensOf(rig.turretYaw.position);
    gsap.killTweensOf(rig.root.scale);
    rig.turretYaw.position.y = restTurretY;
    rig.root.scale.set(1, 1, 1);

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    // Lift turret body & flare flaps
    tl.to(rig.turretYaw.position, { y: restTurretY + 0.3, duration: 0.16, ease: 'power2.out' }, 0);

    // Staggered curved arc fly-in for each new 3D module!
    parts.forEach((part, idx) => {
      const restPos = (part.userData.restPos as THREE.Vector3 | undefined)?.clone() ?? part.position.clone();
      const restScale =
        (part.userData.restScale as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3(1, 1, 1);
      const offset =
        (part.userData.flyOffset as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3(0, 1.6, 0);

      const startPos = restPos.clone().add(offset);
      part.position.copy(startPos);
      part.scale.setScalar(0.2);

      const tStart = 0.08 + idx * 0.075;
      const proxy = { u: 0 };
      tl.to(
        proxy,
        {
          u: 1,
          duration: 0.24,
          ease: 'power2.inOut',
          onUpdate: () => {
            const u = proxy.u;
            part.position.lerpVectors(startPos, restPos, u);
            // Parabolic arc height
            part.position.y += Math.sin(u * Math.PI) * 0.65;
            const sc = THREE.MathUtils.lerp(0.25, 1.0, u);
            part.scale.set(restScale.x * sc, restScale.y * sc, restScale.z * sc);
          },
          onComplete: () => {
            part.position.copy(restPos);
            part.scale.copy(restScale);
            this.deps.audio.playPartSnapLock(idx, newTier);
          },
        },
        tStart
      );
    });

    const lockEnd = 0.16 + parts.length * 0.075 + 0.18;

    // Settle down with squash/rebound & ignite core in new Tier Color!
    tl.to(
      rig.turretYaw.position,
      { y: restTurretY, duration: 0.18, ease: 'bounce.out' },
      lockEnd
    );
    tl.to(rig.root.scale, { x: 1.12, y: 0.88, z: 1.12, duration: 0.08 }, lockEnd);
    tl.to(rig.root.scale, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'elastic.out(1, 0.5)' }, lockEnd + 0.08);

    // Flex unlocked T2/T3 vents during normal upgrade settle
    for (const flap of rig.hingedFlaps) {
      const ud = flap.userData as Partial<HingedFlapUserData>;
      if ((ud.minTier ?? 1) <= newTier && !ud.branchTag) {
        const axis = ud.hingeAxis ?? 'x';
        const openAngle = ud.openAngle ?? -0.5;
        const restAngle = ud.restAngle ?? 0;
        tl.to(flap.rotation, { [axis]: openAngle, duration: 0.16, ease: 'power2.out' }, 0.06);
        tl.to(flap.rotation, { [axis]: restAngle, duration: 0.22, ease: 'power2.inOut' }, lockEnd + 0.06);
      }
    }

    tl.call(
      () => {
        applyTowerTierVisuals(rig, newTier);
        this.deps.audio.playTierIgnite(newTier);
        this.deps.vfx.spawnGroundRing(
          new THREE.Vector3(tower.worldPos.x, 0.09, tower.worldPos.z),
          tierMeta.color,
          0.4,
          2.9,
          0.42
        );
        this.deps.onUpgradeStampUI(tierMeta.name, tierMeta.hex, statDeltas, false);
      },
      [],
      lockEnd
    );
  }

  /**
   * STAGE 2C: Tier-4 Legendary Mecha Dedicated Reveal Stage (PAUSES battle simulation!)
   */
  public playLegendaryUpgradeReveal(
    tower: TowerInstance,
    statDeltas: StatDeltaPopup[],
    onComplete: () => void,
    branchOverride?: TowerBranch
  ): void {
    const rig = tower.rig;
    const bp = TOWER_BLUEPRINTS[tower.type];
    const branch: TowerBranch = branchOverride ?? tower.branch ?? 'A';
    const branchStats = bp.branches?.[branch];
    const goldMeta = TIER_META[4];
    const parts = getTierPartObjects(rig, 4, branch);
    const basePose = this.deps.getBaseCameraPose();

    applyTowerTierVisuals(rig, 4, { visibilityOnly: true, branch });

    const restTurretY = 0.34;
    gsap.killTweensOf(rig.turretYaw.position);
    gsap.killTweensOf(rig.root.scale);
    rig.turretYaw.position.y = restTurretY;
    rig.root.scale.set(1, 1, 1);

    // Position Golden Reveal Backdrop under protagonist tower
    const backdrop = this.deps.env.legendaryBackdrop;
    backdrop.position.set(tower.worldPos.x, 0.055, tower.worldPos.z);
    backdrop.scale.setScalar(0.35);
    (backdrop.material as THREE.MeshBasicMaterial).opacity = 0;
    backdrop.visible = true;

    this.deps.heroLight.color.setHex(0xffd166);
    this.deps.heroLight.position.set(tower.worldPos.x + 2.5, 11, tower.worldPos.z + 3.5);
    this.deps.heroLight.target.position.copy(tower.worldPos);
    this.deps.heroLight.intensity = 0;

    const camProxy = {
      px: basePose.pos.x,
      py: basePose.pos.y,
      pz: basePose.pos.z,
      lx: basePose.lookAt.x,
      ly: basePose.lookAt.y,
      lz: basePose.lookAt.z,
    };
    const syncCam = () => {
      this.deps.setCameraOverride({
        pos: new THREE.Vector3(camProxy.px, camProxy.py, camProxy.pz),
        lookAt: new THREE.Vector3(camProxy.lx, camProxy.ly, camProxy.lz),
      });
    };
    syncCam();

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    // 1. Focus Hero Camera & Golden Backdrop cleanly onto the protagonist Mecha!
    tl.to(
      camProxy,
      {
        px: tower.worldPos.x + 2.1,
        py: 4.35,
        pz: tower.worldPos.z + 5.15,
        lx: tower.worldPos.x,
        ly: 0.92,
        lz: tower.worldPos.z,
        duration: 0.42,
        ease: 'power3.out',
        onUpdate: syncCam,
      },
      0
    );
    tl.to(this.deps.heroLight, { intensity: 4.8, duration: 0.35 }, 0);
    tl.to(backdrop.scale, { x: 1.32, y: 1.32, z: 1.32, duration: 0.4, ease: 'back.out(1.6)' }, 0.05);
    tl.to(backdrop.material as THREE.MeshBasicMaterial, { opacity: 0.88, duration: 0.35 }, 0.05);

    // 2. Lift chassis & fly in heavy Legendary Mecha components along sweeping arcs!
    tl.to(rig.turretYaw.position, { y: restTurretY + 0.45, duration: 0.25, ease: 'power2.out' }, 0.22);

    parts.forEach((part, idx) => {
      const restPos = (part.userData.restPos as THREE.Vector3 | undefined)?.clone() ?? part.position.clone();
      const restScale =
        (part.userData.restScale as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3(1, 1, 1);
      const offset =
        (part.userData.flyOffset as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3(0, 2.0, 0);

      const startPos = restPos.clone().add(offset);
      part.position.copy(startPos);
      part.scale.setScalar(0.15);

      const tStart = 0.34 + idx * 0.13;
      const proxy = { u: 0 };
      tl.to(
        proxy,
        {
          u: 1,
          duration: 0.32,
          ease: 'power3.out',
          onUpdate: () => {
            const u = proxy.u;
            part.position.lerpVectors(startPos, restPos, u);
            part.position.y += Math.sin(u * Math.PI) * 0.95;
            const sc = THREE.MathUtils.lerp(0.2, 1.0, u);
            part.scale.set(restScale.x * sc, restScale.y * sc, restScale.z * sc);
          },
          onComplete: () => {
            part.position.copy(restPos);
            part.scale.copy(restScale);
            this.deps.audio.playPartSnapLock(idx, 4);
          },
        },
        tStart
      );
    });

    const climaxAt = 0.42 + parts.length * 0.13 + 0.24;

    // 3. Heavy Slam Lock, Golden Pillar Burst & Character-by-Character Branch Legendary Title!
    tl.to(rig.turretYaw.position, { y: restTurretY, duration: 0.16, ease: 'power4.in' }, climaxAt - 0.12);
    tl.call(
      () => {
        applyTowerTierVisuals(rig, 4, { branch });
        this.deps.audio.playTierIgnite(4);
        this.addCameraShake(0.24);
        this.deps.vfx.spawnClimaxBurst(tower.worldPos, goldMeta.color, 1.05, false);
        this.deps.vfx.spawnLunarDustRing(tower.worldPos, 14, 1.45);
        const revealTitle = branchStats ? `传说·${branchStats.name}` : `传说·${bp.name}`;
        this.deps.onUpgradeStampUI(revealTitle, goldMeta.hex, statDeltas, true);
      },
      [],
      climaxAt
    );

    tl.to(rig.root.scale, { x: 1.2, y: 0.82, z: 1.2, duration: 0.08 }, climaxAt);
    tl.to(rig.root.scale, { x: 1, y: 1, z: 1, duration: 0.28, ease: 'elastic.out(1.1, 0.45)' }, climaxAt + 0.08);

    // Open hinged vents/petals ONLY for shared T3 flaps or the chosen T4 branch!
    for (const flap of rig.hingedFlaps) {
      const ud = flap.userData as Partial<HingedFlapUserData>;
      const axis = ud.hingeAxis ?? 'x';
      const openAngle = ud.openAngle ?? -0.52;
      const restAngle = ud.restAngle ?? 0;
      if ((ud.minTier ?? 1) <= 4 && (!ud.branchTag || ud.branchTag === branch)) {
        tl.to(flap.rotation, { [axis]: openAngle, duration: 0.22, ease: 'power2.out' }, climaxAt + 0.12);
        tl.to(flap.rotation, { [axis]: restAngle, duration: 0.26, ease: 'power2.inOut' }, climaxAt + 0.36);
      }
    }

    // Gentle hero turntable orbit while holding the protagonist reveal!
    const returnAt = climaxAt + 1.55;
    tl.to(
      camProxy,
      {
        px: tower.worldPos.x + 1.5,
        pz: tower.worldPos.z + 5.35,
        duration: 1.45,
        ease: 'sine.inOut',
        onUpdate: syncCam,
      },
      climaxAt + 0.08
    );

    // 4. Clean return to battle camera
    tl.to(backdrop.material as THREE.MeshBasicMaterial, { opacity: 0, duration: 0.3 }, returnAt);
    tl.to(this.deps.heroLight, { intensity: 0, duration: 0.3 }, returnAt);
    tl.to(
      camProxy,
      {
        px: basePose.pos.x,
        py: basePose.pos.y,
        pz: basePose.pos.z,
        lx: basePose.lookAt.x,
        ly: basePose.lookAt.y,
        lz: basePose.lookAt.z,
        duration: 0.45,
        ease: 'power2.inOut',
        onUpdate: syncCam,
      },
      returnAt
    );

    tl.call(() => {
      backdrop.visible = false;
      this.deps.setCameraOverride(null);
      onComplete();
    });
  }

  /**
   * STAGE 3: Boss Charge-Up & Entrance (Wave 8)
   * Ground tremor + hazard beacons -> glowing fissures + inward suction particles + rising pitch (~1s) ->
   * sudden contraction -> shockwave Boss arrival!
   */
  public playBossEntranceSequence(
    onSpawnBoss: () => void,
    onComplete: () => void,
    options?: {
      entranceIndex?: number;
      bannerTitle?: string;
      bannerSubtitle?: string;
    }
  ): void {
    const basePose = this.deps.getBaseCameraPose();
    const entIdx = options?.entranceIndex ?? 0;
    const ent = this.deps.env.entrances?.[entIdx] ?? this.deps.env.entrance;
    ent.group.updateMatrixWorld(true);
    const entranceWorld = ent.group.localToWorld(new THREE.Vector3(1.2, 0, 0));

    ent.fissureGroup.visible = true;
    ent.fissureGroup.scale.setScalar(1);
    ent.fissureMat.opacity = 0;

    const camProxy = {
      px: basePose.pos.x,
      py: basePose.pos.y,
      pz: basePose.pos.z,
      lx: basePose.lookAt.x,
      ly: basePose.lookAt.y,
      lz: basePose.lookAt.z,
    };
    const syncCam = () => {
      this.deps.setCameraOverride({
        pos: new THREE.Vector3(camProxy.px, camProxy.py, camProxy.pz),
        lookAt: new THREE.Vector3(camProxy.lx, camProxy.ly, camProxy.lz),
      });
    };

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    this.deps.onBannerUI(
      options?.bannerTitle ?? '高能震源警报 · 矿道坍塌',
      options?.bannerSubtitle ?? '失控深层采掘母机正在冲破封闭闸门！',
      '#FF4757'
    );

    // Pan camera toward the breaching Mine Entrance (works for both West +X and North +Z portals!)
    tl.to(
      camProxy,
      {
        px: entranceWorld.x + 5.2,
        py: 9.4,
        pz: entranceWorld.z + 10.6,
        lx: entranceWorld.x + 0.3,
        ly: 1.0,
        lz: entranceWorld.z,
        duration: 0.45,
        ease: 'power2.out',
        onUpdate: syncCam,
      },
      0
    );

    // Hazard beacons flare & fissures glow while pitch rises over ~0.93s!
    tl.call(() => this.deps.audio.playBossChargeAndSlam(), [], 0.35);

    for (const m of ent.hazardLampMats) {
      tl.to(m, { emissiveIntensity: 3.2, duration: 0.3 }, 0.25);
    }
    tl.to(ent.fissureMat, { opacity: 0.95, duration: 0.85, ease: 'power2.in' }, 0.35);

    // Gradual intensifying tremor + inward suction particles
    for (let step = 0; step < 5; step++) {
      const at = 0.38 + step * 0.17;
      tl.call(
        () => {
          this.addCameraShake(0.06 + step * 0.045);
          this.deps.vfx.spawnBossInwardSuctionParticles(entranceWorld, 9);
        },
        [],
        at
      );
    }

    // Sudden vacuum contraction (1.29s -> 1.38s) + 110ms pure visual/audio silence (1.38s -> 1.49s)!
    tl.to(ent.fissureGroup.scale, { x: 0.18, y: 0.18, z: 0.18, duration: 0.09, ease: 'power3.in' }, 1.29);
    tl.call(
      () => {
        this.shakeIntensity = 0;
      },
      [],
      1.38
    );

    // 1.49s: MASSIVE SHOCKWAVE ERUPTION & BOSS SPAWN!
    tl.call(
      () => {
        ent.fissureGroup.scale.setScalar(1.3);
        this.addCameraShake(0.46);
        this.deps.vfx.spawnClimaxBurst(entranceWorld, 0xff4d29, 1.35, true);
        this.deps.vfx.spawnLunarDustRing(entranceWorld, 16, 1.8);
        onSpawnBoss();
      },
      [],
      1.49
    );

    tl.to(ent.fissureMat, { opacity: 0, duration: 0.5 }, 1.85);

    // Glide back to stable 3/4 battle camera
    tl.to(
      camProxy,
      {
        px: basePose.pos.x,
        py: basePose.pos.y,
        pz: basePose.pos.z,
        lx: basePose.lookAt.x,
        ly: basePose.lookAt.y,
        lz: basePose.lookAt.z,
        duration: 0.62,
        ease: 'power2.inOut',
        onUpdate: syncCam,
      },
      2.15
    );

    tl.call(() => {
      ent.fissureGroup.visible = false;
      for (const m of ent.hazardLampMats) m.emissiveIntensity = 0.65;
      this.deps.setCameraOverride(null);
      this.deps.onHideBannerUI();
      onComplete();
    });
  }

  /**
   * STAGE 4A: Elite Kill Burst (brief hit-stop slow-mo + burst, only for Elites!)
   */
  public playEliteKillClimax(pos: THREE.Vector3): void {
    this.deps.audio.playClimaxKillBurst(false);
    this.addCameraShake(0.2);
    this.deps.vfx.spawnClimaxBurst(pos, 0xff6b35, 0.95, true);
    this.deps.triggerHitStop(0.22, 0.24);
  }

  /**
   * STAGE 4B + STAGE 5A: Boss Kill Multi-Explosion -> Return Beacon Awakening -> 3D Supply Chest Landing!
   */
  public playBossDefeatAndBeaconVictory(
    boss: EnemyInstance,
    onBossRemoved: () => void,
    onShowVictoryPanel: () => void
  ): void {
    const basePose = this.deps.getBaseCameraPose();
    const bossPos = boss.worldPos.clone();
    const beacon = this.deps.env.beacon;
    const chest = this.deps.env.supplyChest;
    const beaconPos = beacon.group.position;

    const camProxy = {
      px: basePose.pos.x,
      py: basePose.pos.y,
      pz: basePose.pos.z,
      lx: basePose.lookAt.x,
      ly: basePose.lookAt.y,
      lz: basePose.lookAt.z,
    };
    const syncCam = () => {
      this.deps.setCameraOverride({
        pos: new THREE.Vector3(camProxy.px, camProxy.py, camProxy.pz),
        lookAt: new THREE.Vector3(camProxy.lx, camProxy.ly, camProxy.lz),
      });
    };

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    // 1. Focus on dying Boss Crawler & trigger chain explosions
    this.deps.setSimTimeScale(0.2);
    tl.to(
      camProxy,
      {
        px: bossPos.x + 3.2,
        py: 7.5,
        pz: bossPos.z + 8.5,
        lx: bossPos.x,
        ly: 0.9,
        lz: bossPos.z,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: syncCam,
      },
      0
    );

    // 4-Beat Escalating Boss Chain Explosion!
    const subOffsets: Array<[number, number, number, number]> = [
      [0.65, 0.6, 0.5, 0.14],
      [-0.68, 0.85, -0.35, 0.3],
      [0.25, 1.25, -0.55, 0.46],
    ];
    subOffsets.forEach(([ox, oy, oz, at], stepIdx) => {
      tl.call(
        () => {
          const subPos = bossPos.clone().add(new THREE.Vector3(ox, oy, oz));
          this.deps.audio.playBossSubExplosion(stepIdx);
          this.deps.vfx.spawnClimaxBurst(subPos, stepIdx % 2 === 0 ? 0xff9f1c : 0xff4d29, 0.78, true);
          this.deps.vfx.spawnArmorBreakDebris(subPos, 4);
          this.addCameraShake(0.16 + stepIdx * 0.05);
        },
        [],
        at
      );
    });

    // Beat 4: Final Reactor Core Detonation!
    tl.call(
      () => {
        this.deps.audio.playClimaxKillBurst(true);
        this.deps.vfx.spawnClimaxBurst(bossPos, 0xff4757, 1.5, true);
        this.deps.vfx.spawn3DLoot(
          bossPos,
          8,
          Math.min(8, Math.max(5, boss.crystalReward)),
          beaconPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          (isCrystal) => this.deps.audio.playLootChime(isCrystal)
        );
        this.addCameraShake(0.44);
        onBossRemoved();
        this.deps.setSimTimeScale(1);
      },
      [],
      0.66
    );

    // 2. Glide camera to Return Beacon Plaza & Supply Chest (portrait-aware framing!)
    const targetChestPos = this.deps.env.stageConfig?.supplyChestPos ?? {
      x: beaconPos.x - 3.2,
      y: 0,
      z: beaconPos.z + 0.3,
    };
    const isPortrait = this.deps.camera.aspect < 0.85;
    const midX = (beaconPos.x + targetChestPos.x) * 0.5;
    const midZ = (beaconPos.z + targetChestPos.z) * 0.5;

    tl.to(
      camProxy,
      {
        px: isPortrait ? midX - 1.2 : beaconPos.x - 4.2,
        py: isPortrait ? 9.8 : 6.4,
        pz: isPortrait ? midZ + 13.4 : beaconPos.z + 8.6,
        lx: isPortrait ? midX : beaconPos.x - 1.2,
        ly: isPortrait ? 0.65 : 1.35,
        lz: isPortrait ? midZ + 1.1 : beaconPos.z,
        duration: 0.85,
        ease: 'power2.inOut',
        onUpdate: syncCam,
      },
      1.12
    );

    tl.call(
      () => {
        beacon.skyBeam.visible = true;
        this.deps.audio.playBeaconBeamIgnite();
        this.deps.onBannerUI(
          '返航信标全功率激活！',
          '撤离飞船已锁定信标坐标，空投工程补给箱抵达！',
          '#38BDF8'
        );
      },
      [],
      1.6
    );

    tl.to(
      beacon.skyBeam.material as THREE.MeshBasicMaterial,
      { opacity: 0.58, duration: 0.45, ease: 'power2.out' },
      1.6
    );
    for (const fin of beacon.signalFins) {
      tl.to(fin.rotation, { z: -0.35, duration: 0.4, ease: 'back.out(2)' }, 1.6);
    }

    // 3. Drop the 3D Armored Supply Chest onto the stage's Beacon Plaza!
    tl.call(
      () => {
        chest.group.visible = true;
        chest.lidPivot.rotation.set(0, 0, 0);
        chest.claspMesh.visible = true;
        chest.claspMesh.position.set(0, 0.66, 0.51);
        chest.claspMesh.rotation.set(0, 0, 0);
        (chest.innerGlow.material as THREE.MeshBasicMaterial).opacity = 0;
        chest.group.position.set(targetChestPos.x, 5.5, targetChestPos.z);
        chest.group.scale.set(0.9, 1.15, 0.9);
      },
      [],
      1.76
    );

    tl.to(
      chest.group.position,
      { y: targetChestPos.y ?? 0, duration: 0.28, ease: 'power3.in' },
      1.78
    );
    tl.call(
      () => {
        this.deps.audio.playTowerBuildLand();
        this.addCameraShake(0.22);
        this.deps.vfx.spawnLunarDustRing(chest.group.position, 12, 1.3);
      },
      [],
      2.06
    );
    tl.to(chest.group.scale, { x: 1.2, y: 0.76, z: 1.2, duration: 0.08 }, 2.06);
    tl.to(chest.group.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'elastic.out(1.1, 0.5)' }, 2.14);

    tl.call(
      () => {
        this.deps.onHideBannerUI();
        onShowVictoryPanel();
      },
      [],
      2.45
    );
  }

  /**
   * STAGE 5B: Interactive Reward Claim Climax!
   * Unlatches the 3D Supply Chest with flying clasp arc, pops open hinged lid,
   * and fountains real 3D Gold Coins + 3D Faceted Energy Crystals without vertical pillar bleaching!
   */
  public playOpenRewardChest(
    onGrantRewards: () => void,
    onComplete: () => void
  ): void {
    const beacon = this.deps.env.beacon;
    const chest = this.deps.env.supplyChest;
    if (!beacon.skyBeam.visible) {
      beacon.skyBeam.visible = true;
      (beacon.skyBeam.material as THREE.MeshBasicMaterial).opacity = 0.58;
    }
    if (!chest.group.visible) {
      const fallbackPos = this.deps.env.stageConfig?.supplyChestPos ?? {
        x: beacon.group.position.x - 3.2,
        y: 0,
        z: beacon.group.position.z + 0.3,
      };
      chest.group.position.set(fallbackPos.x, fallbackPos.y ?? 0, fallbackPos.z);
      chest.group.scale.set(1, 1, 1);
      chest.lidPivot.rotation.set(0, 0, 0);
      chest.claspMesh.visible = true;
      chest.claspMesh.position.set(0, 0.66, 0.51);
      chest.claspMesh.rotation.set(0, 0, 0);
      chest.group.visible = true;
    }
    const chestPos = chest.group.position.clone();

    const tl = gsap.timeline();
    this.registerTimeline(tl);

    // 1. Anticipation shake on the 3D crate
    tl.to(chest.group.scale, { x: 1.12, y: 0.86, z: 1.12, duration: 0.18, ease: 'power2.in' }, 0);

    // 2. Clasp pops off along ballistic arc + Hinged lid swings open + clean radial celebration!
    tl.call(
      () => {
        this.deps.audio.playChestOpenFanfare();
        this.addCameraShake(0.2);
        this.deps.vfx.spawnChestOpenCelebration(chestPos);

        // Fountain real 3D Gold Coins & 3D Faceted Energy Crystals out of the open chest!
        const lootOrigin = chestPos.clone().add(new THREE.Vector3(0, 0.38, 0));
        const collectGoal = chestPos.clone().add(new THREE.Vector3(-1.5, 4.5, -1.5));
        this.deps.vfx.spawn3DLoot(lootOrigin, 8, 8, collectGoal, (isCrystal) => {
          this.deps.audio.playLootChime(isCrystal);
        });
        onGrantRewards();
      },
      [],
      0.19
    );

    // Ballistic clasp pop-open arc!
    const claspProxy = { u: 0 };
    tl.to(
      claspProxy,
      {
        u: 1,
        duration: 0.33,
        ease: 'power1.out',
        onUpdate: () => {
          const u = claspProxy.u;
          chest.claspMesh.position.set(
            0.22 * u,
            THREE.MathUtils.lerp(0.66, 0.14, u) + Math.sin(u * Math.PI) * 0.72,
            THREE.MathUtils.lerp(0.51, 1.25, u)
          );
          chest.claspMesh.rotation.x = u * 4.4;
          chest.claspMesh.rotation.z = u * 1.1;
        },
        onComplete: () => {
          chest.claspMesh.visible = false;
        },
      },
      0.19
    );

    tl.to(chest.group.scale, { x: 1, y: 1, z: 1, duration: 0.24, ease: 'elastic.out(1.2, 0.5)' }, 0.19);
    tl.to(chest.lidPivot.rotation, { x: -2.05, duration: 0.34, ease: 'back.out(2.2)' }, 0.19);
    tl.to(
      chest.innerGlow.material as THREE.MeshBasicMaterial,
      { opacity: 0.92, duration: 0.25 },
      0.2
    );

    tl.call(() => onComplete(), [], 1.15);
  }
}
