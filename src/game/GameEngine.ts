import gsap from 'gsap';
import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import {
  compileStageLanes,
  generateEndlessWave,
  getEndlessScaling,
  sampleLaneAtDistance,
  STAGE_CONFIGS,
  STAGE_ORDER,
} from '../config/campaignConfig';
import {
  COMMANDER_SKILL_ORDER,
  COMMANDER_SKILLS,
  ENEMY_BLUEPRINTS,
  GAME_CONSTANTS,
  TACTICAL_ENERGY_CONFIG,
  TIER_META,
  TOWER_BLUEPRINTS,
} from '../config/gameConfig';
import { VfxManager } from '../fx/VfxManager';
import {
  buildLunarStationEnvironment,
  disposeObject3DTree,
  type LunarStationEnvironment,
} from '../render/BeaconAndPropsFactory';
import { createEnemyRig } from '../render/EnemyFactory';
import { ToonOutlineComposer } from '../render/ToonOutlineComposer';
import {
  applyTowerTierVisuals,
  createGhostTowerPreview,
  createTowerRig,
} from '../render/TowerFactory';
import type {
  CommanderSkillId,
  CommanderSkillSnapshot,
  CompiledLane,
  EnemyInstance,
  EnemyType,
  GameMode,
  HingedFlapUserData,
  MapMechanismSnapshot,
  OnboardingStep,
  StageConfig,
  StageId,
  StagePaletteConfig,
  StatDeltaPopup,
  T4BranchOptionSnapshot,
  TowerBranch,
  TowerInstance,
  TowerTier,
  TowerType,
  UISnapshot,
  WaveConfig,
} from '../types';
import { type CameraPose, CinematicDirector } from './CinematicDirector';
import { ProgressionManager } from './ProgressionManager';

export interface EngineUICallbacks {
  onStateChange: (snapshot: UISnapshot) => void;
  onInsufficientGold: (missingAmount: number) => void;
  onInsufficientEnergy?: (missingEnergy: number) => void;
  onComboCallout?: (
    screenX: number,
    screenY: number,
    text: string,
    accentHex: string,
    comboCount: number
  ) => void;
  onUpgradeStamp: (
    titleChars: string,
    tierHex: string,
    statDeltas: StatDeltaPopup[],
    isLegendary: boolean
  ) => void;
  onBanner: (title: string, subtitle: string, accentHex: string) => void;
  onHideBanner: () => void;
}

export interface ComboCalloutPayloadPos {
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
  clientX: number;
  clientY: number;
  comboCount: number;
}

export type ComboCalloutHandler = (
  label: string,
  pos: ComboCalloutPayloadPos,
  color: string,
  comboCount: number
) => void;

interface PendingSpawn {
  enemyType: EnemyType;
  laneIndex: number;
  spawnAtWaveTime: number;
  spawned: boolean;
}

const HIGH_GROUND_RANGE_MULT = 1.18;
const HIGH_GROUND_DAMAGE_MULT = 1.15;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private callbacks: EngineUICallbacks;
  private comboCalloutHandler: ComboCalloutHandler | null = null;

  private renderer: THREE.WebGLRenderer;
  private composer: ToonOutlineComposer;
  private solidScene: THREE.Scene;
  private vfxScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private backRimLight: THREE.DirectionalLight;
  private heroLight: THREE.SpotLight;

  private progression: ProgressionManager;
  private currentStageId: StageId = 'stage_01';
  private currentStage: StageConfig = STAGE_CONFIGS.stage_01;
  private compiledLanes: CompiledLane[] = compileStageLanes(STAGE_CONFIGS.stage_01.lanes);

  private env: LunarStationEnvironment;
  private vfx: VfxManager;
  private audio: AudioManager;
  private cinematics: CinematicDirector;

  private towerGroup = new THREE.Group();
  private enemyGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private currentGhostType: TowerType | null = null;

  private mode: GameMode = 'opening';
  private overlayPaused = false;
  private maxBeaconHp: number = GAME_CONSTANTS.MAX_BEACON_HP;
  private beaconHp: number = GAME_CONSTANTS.MAX_BEACON_HP;
  private gold: number = GAME_CONSTANTS.INITIAL_GOLD;
  private crystals: number = GAME_CONSTANTS.INITIAL_CRYSTALS;
  private appliedBonusBeaconHp = 0;
  private appliedBonusInitialGold = 0;
  private appliedBonusInitialEnergy = 0;
  private kills = 0;
  private waveIndex = 0; // 0-based index
  private waveInProgress = false;
  private waveElapsed = 0;
  private endlessActiveWaveConfig: WaveConfig | null = null;
  private pendingSpawns: PendingSpawn[] = [];
  private bossIntroPlayedForWave = -1;
  private laserTickAccum = 0;
  private bannerHideTimer = 0;

  private tacticalEnergy: number = TACTICAL_ENERGY_CONFIG.INITIAL_ENERGY;
  private maxTacticalEnergy: number = TACTICAL_ENERGY_CONFIG.BASE_MAX_ENERGY;
  private armedSkillId: CommanderSkillId | null = null;
  private skillCooldowns: Record<CommanderSkillId, number> = {
    orbital_strike: 0,
    emp_overdrive: 0,
    nano_repair: 0,
  };
  private pendingOrbitalStrikes: Array<{ x: number; z: number; timer: number }> = [];
  private pendingRocketSalvos: Array<{
    tower: TowerInstance;
    muzzleIdx: number;
    tx: number;
    tz: number;
    damage: number;
    splashRadius: number;
    armorPierce: number;
    delay: number;
  }> = [];
  private plasmaZones: Array<{
    x: number;
    z: number;
    radius: number;
    remaining: number;
    tickAccum: number;
    tickDamage: number;
    armorPierce: number;
    sourceTower: TowerInstance | null;
  }> = [];
  private activeComboCount = 0;
  private comboResetTimer = 0;
  private combatSimElapsed = 0;
  private lastComboCalloutByLabel = new Map<string, number>();
  private lastAutocannonSynergySec = -10;
  private cleanupPointerListeners: (() => void) | null = null;

  private speedMultiplier: 1 | 2 = 1;
  private simTimeScale = 1.0;
  private hitStopTimer = 0;
  private hitStopScale = 1.0;
  private elapsedStationTime = 0;
  private uiSyncTimer = 0;

  private towers = new Map<string, TowerInstance>(); // keyed by padId
  private enemies: EnemyInstance[] = [];
  private nextEntityId = 1;

  private selectedPadId: string | null = null;
  private previewTowerType: TowerType | null = null;
  private onboardingStep: OnboardingStep = 'select_pad';

  private rewardClaimed = false;
  private lastFirstClearBonus = 0;
  private lastStarBonus = 0;

  private cameraOverride: CameraPose | null = null;
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineUICallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.progression = new ProgressionManager();
    this.audio = new AudioManager(this.progression.isMuted(), (muted) => {
      this.progression.setMuted(muted);
    });

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Handled by 1.5x Supersampling + MSAA RenderTarget in ToonOutlineComposer!
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;

    this.solidScene = new THREE.Scene();
    this.solidScene.background = new THREE.Color(0x16192b);
    this.solidScene.fog = new THREE.FogExp2(0x16192b, 0.0082);

    this.vfxScene = new THREE.Scene();

    const initialSize = this.getViewportSize();

    this.camera = new THREE.PerspectiveCamera(
      40,
      initialSize.width / initialSize.height,
      0.5,
      160
    );

    // 1. Key Light + Lunar Sky Light + Cool Rim Light (for clean 3-4 step MeshToonMaterial shading!)
    this.hemiLight = new THREE.HemisphereLight(0xa5b4fc, 0x26233a, 1.08);
    this.solidScene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 2.25);
    this.keyLight.position.set(11, 23, 15);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -20;
    this.keyLight.shadow.camera.right = 20;
    this.keyLight.shadow.camera.top = 14;
    this.keyLight.shadow.camera.bottom = -14;
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 54;
    this.keyLight.shadow.bias = -0.0007;
    this.solidScene.add(this.keyLight);

    this.backRimLight = new THREE.DirectionalLight(0x67e8f9, 0.75);
    this.backRimLight.position.set(-15, 11, -13);
    this.solidScene.add(this.backRimLight);

    this.heroLight = new THREE.SpotLight(0xffd166, 0, 28, Math.PI / 5, 0.5, 1.1);
    this.heroLight.position.set(0, 12, 4);
    this.solidScene.add(this.heroLight);
    this.solidScene.add(this.heroLight.target);

    this.applyStagePalette(this.currentStage.palette);
    this.env = buildLunarStationEnvironment(
      this.solidScene,
      this.vfxScene,
      this.currentStage,
      this.compiledLanes
    );
    this.solidScene.add(this.towerGroup);
    this.solidScene.add(this.enemyGroup);
    this.solidScene.add(this.ghostGroup);

    this.vfx = new VfxManager(this.solidScene, this.vfxScene);
    this.composer = new ToonOutlineComposer(
      this.renderer,
      initialSize.width,
      initialSize.height
    );

    this.cinematics = new CinematicDirector({
      camera: this.camera,
      heroLight: this.heroLight,
      env: this.env,
      vfx: this.vfx,
      audio: this.audio,
      getBaseCameraPose: () => this.computeBaseCameraPose(),
      setCameraOverride: (pose) => {
        this.cameraOverride = pose;
      },
      setSimTimeScale: (scale) => {
        this.simTimeScale = scale;
      },
      triggerHitStop: (durationSec, slowScale) => {
        this.hitStopTimer = Math.max(this.hitStopTimer, durationSec);
        this.hitStopScale = slowScale;
      },
      onUpgradeStampUI: (titleChars, tierHex, statDeltas, isLegendary) => {
        this.callbacks.onUpgradeStamp(titleChars, tierHex, statDeltas, isLegendary);
      },
      onBannerUI: (title, subtitle, accentHex) => {
        this.callbacks.onBanner(title, subtitle, accentHex);
      },
      onHideBannerUI: () => {
        this.callbacks.onHideBanner();
      },
    });

    this.bindPointerInput();
    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas.parentElement);
    }
    this.handleResize();
    this.startNewMission(true);
  }

  private applyStagePalette(p: StagePaletteConfig): void {
    this.solidScene.background = new THREE.Color(p.skyBgHex);
    this.solidScene.fog = new THREE.FogExp2(p.fogHex, p.fogDensity);
    this.hemiLight.color.setHex(p.hemiSkyHex);
    this.hemiLight.groundColor.setHex(p.hemiGroundHex);
    this.hemiLight.intensity = p.hemiIntensity;
    this.keyLight.color.setHex(p.keyLightHex);
    this.keyLight.intensity = p.keyLightIntensity;
    this.backRimLight.color.setHex(p.rimLightHex);
  }

  public getProgression(): ProgressionManager {
    return this.progression;
  }

  public getAudio(): AudioManager {
    return this.audio;
  }

  public getCurrentStageId(): StageId {
    return this.currentStageId;
  }

  private isEndlessMode(): boolean {
    return this.currentStageId === 'endless';
  }

  private getViewportSize(): { width: number; height: number } {
    const host = this.canvas.parentElement;
    const w = host && host.clientWidth > 0 ? host.clientWidth : window.innerWidth;
    const h = host && host.clientHeight > 0 ? host.clientHeight : window.innerHeight;
    return {
      width: Math.max(320, Math.round(w || 960)),
      height: Math.max(320, Math.round(h || 580)),
    };
  }

  public toggleFullscreen(): void {
    this.audio.playUiClick();
    const host = this.canvas.parentElement;
    if (!host) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    if (document.fullscreenEnabled && host.requestFullscreen) {
      try {
        host.requestFullscreen().catch(() => {
          host.classList.toggle('expanded-embed');
          this.handleResize();
        });
      } catch {
        host.classList.toggle('expanded-embed');
        this.handleResize();
      }
    } else {
      host.classList.toggle('expanded-embed');
      this.handleResize();
    }
  }

  public startLoop(): void {
    this.clock.getDelta();
    gsap.ticker.add(this.onTickerFrame);
  }

  private onTickerFrame = (): void => {
    const rawDt = Math.min(0.05, this.clock.getDelta());
    this.stepFrame(rawDt, true);
  };

  public dispose(): void {
    gsap.ticker.remove(this.onTickerFrame);
    window.clearTimeout(this.bannerHideTimer);
    window.removeEventListener('resize', this.handleResize);
    this.cleanupPointerListeners?.();
    this.cleanupPointerListeners = null;
    this.resizeObserver?.disconnect();
    this.cinematics.cancelAll();
    this.vfx.dispose();
    this.clearDynamicEntities();
    this.env.dispose();
    this.composer.dispose();
  }

  private computeCurrentDistScale(aspect = this.camera.aspect): number {
    const stageCam = this.currentStage.camera;
    const aspectFactor =
      aspect < 1.42
        ? THREE.MathUtils.clamp(1.42 / Math.max(0.42, aspect), 1.0, 3.04)
        : 1.0;
    return Math.min(3.25, stageCam.distScale * aspectFactor);
  }

  private syncFogDensityForCamera(): void {
    if (this.solidScene.fog instanceof THREE.FogExp2) {
      const distScale = this.computeCurrentDistScale();
      this.solidScene.fog.density =
        this.currentStage.palette.fogDensity / Math.max(1, distScale * 0.78);
    }
  }

  private handleResize = (): void => {
    const { width: w, height: h } = this.getViewportSize();
    const aspect = w / h;
    // Slight 3/4 overhead FOV tuned for both desktop widescreen & mobile portrait!
    this.camera.fov = aspect < 0.85 ? 48 : 38;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
    this.syncFogDensityForCamera();
    this.applyCameraPose(0);
  };

  /**
   * Computes stable 3/4 overhead camera framing per stage.
   * On portrait mobile (aspect < 0.85), pulls back cleanly (up to distScale 3.25) so Portals, full Roads, Mechanisms, and Return Beacon remain 100% legible!
   */
  public computeBaseCameraPose(): CameraPose {
    const aspect = this.camera.aspect;
    const stageCam = this.currentStage.camera;
    const distScale = this.computeCurrentDistScale(aspect);
    const zLookShift = aspect < 0.85 ? 2.0 : 0.65;

    const lookAt = new THREE.Vector3(stageCam.lookX, -0.15, zLookShift);
    const pos = new THREE.Vector3(
      stageCam.lookX,
      19.6 * distScale,
      zLookShift + 17.8 * distScale
    );
    return { pos, lookAt };
  }

  private applyCameraPose(realDt: number): void {
    const targetPose = this.cameraOverride ?? this.computeBaseCameraPose();
    const shake = this.cinematics.consumeShakeOffset(realDt);
    this.camera.position.copy(targetPose.pos).add(shake);
    this.camera.lookAt(targetPose.lookAt);
    this.camera.updateMatrixWorld();
  }

  private clearDynamicEntities(): void {
    for (const t of this.towers.values()) {
      disposeObject3DTree(t.rig.root);
    }
    this.towers.clear();

    for (const e of this.enemies) {
      disposeObject3DTree(e.rig.root);
    }
    this.enemies.length = 0;

    this.clearGhostPreview();
  }

  // ==================== PUBLIC STAGE & PLAYER COMMANDS ====================

  public loadStage(stageId: StageId, playIntro = false): void {
    const nextCfg = STAGE_CONFIGS[stageId];
    if (!nextCfg) return;

    this.cinematics.cancelAll();
    this.vfx.clearAll();
    this.clearDynamicEntities();
    this.env.dispose();

    this.currentStageId = stageId;
    this.currentStage = nextCfg;
    this.compiledLanes = compileStageLanes(nextCfg.lanes);
    this.progression.setActiveStageId(stageId);

    this.applyStagePalette(nextCfg.palette);
    this.syncFogDensityForCamera();
    this.env = buildLunarStationEnvironment(
      this.solidScene,
      this.vfxScene,
      this.currentStage,
      this.compiledLanes
    );
    this.cinematics.setEnvironment(this.env);
    this.applyCameraPose(0);
    this.startNewMission(playIntro);
  }

  public launchStage(stageId: StageId, playIntro = false): void {
    this.overlayPaused = false;
    this.loadStage(stageId, playIntro);
  }

  public setOverlayPause(paused: boolean): void {
    this.overlayPaused = paused;
    this.emitSnapshot();
  }

  public setComboCalloutHandler(cb: ComboCalloutHandler | null): void {
    this.comboCalloutHandler = cb;
  }

  public notifyProgressionUpdated(): void {
    if (this.audio.isMuted() !== this.progression.isMuted()) {
      this.audio.setMuted(this.progression.isMuted());
    }

    const mods = this.progression.getComputedTechModifiers();
    const hpDelta = mods.bonusMaxBeaconHp - this.appliedBonusBeaconHp;
    this.appliedBonusBeaconHp = mods.bonusMaxBeaconHp;
    this.maxBeaconHp = this.currentStage.maxBeaconHp + mods.bonusMaxBeaconHp;
    if (this.mode !== 'defeat' && this.beaconHp > 0) {
      this.beaconHp = THREE.MathUtils.clamp(this.beaconHp + hpDelta, 1, this.maxBeaconHp);
    } else {
      this.beaconHp = Math.min(this.beaconHp, this.maxBeaconHp);
    }

    const energyDelta = mods.bonusInitialEnergy - this.appliedBonusInitialEnergy;
    this.appliedBonusInitialEnergy = mods.bonusInitialEnergy;
    this.maxTacticalEnergy = TACTICAL_ENERGY_CONFIG.BASE_MAX_ENERGY + mods.bonusInitialEnergy;
    this.tacticalEnergy = THREE.MathUtils.clamp(
      this.tacticalEnergy + energyDelta,
      0,
      this.maxTacticalEnergy
    );

    const isFreshPreWave =
      !this.waveInProgress &&
      this.waveIndex === 0 &&
      this.towers.size === 0 &&
      this.kills === 0;
    if (isFreshPreWave) {
      const goldDelta = mods.bonusInitialGold - this.appliedBonusInitialGold;
      this.appliedBonusInitialGold = mods.bonusInitialGold;
      this.gold = Math.max(0, this.gold + goldDelta);
    }

    this.syncSelectionRings();
    this.emitSnapshot();
  }

  public startNewMission(playIntro = true): void {
    window.clearTimeout(this.bannerHideTimer);
    this.callbacks.onHideBanner();
    this.cinematics.cancelAll();
    this.vfx.clearAll();
    this.clearDynamicEntities();

    this.selectedPadId = null;
    this.previewTowerType = null;
    this.overlayPaused = false;

    const techMods = this.progression.getComputedTechModifiers();
    this.appliedBonusBeaconHp = techMods.bonusMaxBeaconHp;
    this.appliedBonusInitialGold = techMods.bonusInitialGold;
    this.appliedBonusInitialEnergy = techMods.bonusInitialEnergy;

    this.maxBeaconHp = this.currentStage.maxBeaconHp + techMods.bonusMaxBeaconHp;
    this.beaconHp = this.maxBeaconHp;
    this.gold = this.currentStage.initialGold + techMods.bonusInitialGold;
    this.crystals = GAME_CONSTANTS.INITIAL_CRYSTALS;
    this.maxTacticalEnergy = TACTICAL_ENERGY_CONFIG.BASE_MAX_ENERGY + techMods.bonusInitialEnergy;
    this.tacticalEnergy = Math.min(
      this.maxTacticalEnergy,
      TACTICAL_ENERGY_CONFIG.INITIAL_ENERGY + techMods.bonusInitialEnergy
    );
    this.armedSkillId = null;
    this.skillCooldowns = { orbital_strike: 0, emp_overdrive: 0, nano_repair: 0 };
    this.pendingOrbitalStrikes = [];
    this.pendingRocketSalvos = [];
    this.plasmaZones = [];
    this.activeComboCount = 0;
    this.comboResetTimer = 0;
    this.combatSimElapsed = 0;
    this.lastComboCalloutByLabel.clear();
    this.lastAutocannonSynergySec = -10;
    this.vfx.setTacticalReticle(false);

    if (this.currentStage.buildPads.some((p) => p.padType === 'high_ground')) {
      this.progression.discoverCodex('high_ground');
    }

    this.kills = 0;
    this.waveIndex = 0;
    this.waveInProgress = false;
    this.waveElapsed = 0;
    this.endlessActiveWaveConfig = null;
    this.pendingSpawns = [];
    this.bossIntroPlayedForWave = -1;
    this.laserTickAccum = 0;
    this.simTimeScale = 1.0;
    this.hitStopTimer = 0;
    this.hitStopScale = 1.0;
    this.rewardClaimed = false;
    this.lastFirstClearBonus = 0;
    this.lastStarBonus = 0;

    // Reset stage mechanisms cleanly
    for (const mech of this.env.mechanisms.values()) {
      mech.cooldownRemaining = 0;
      mech.activeRemaining = 0;
      mech.readyRingMat.opacity = 0.82;
      if (mech.config.type === 'crystal_vein') {
        for (const v of mech.activeVisuals) v.scale.setScalar(1);
      } else if (mech.config.type === 'laser_gate') {
        for (const v of mech.activeVisuals) v.visible = false;
      }
    }

    this.env.beacon.skyBeam.visible = false;
    (this.env.beacon.skyBeam.material as THREE.MeshBasicMaterial).opacity = 0;
    for (const fin of this.env.beacon.signalFins) {
      fin.rotation.z = 0;
    }
    this.env.supplyChest.group.visible = false;
    this.env.supplyChest.lidPivot.rotation.set(0, 0, 0);
    this.env.supplyChest.claspMesh.visible = true;
    this.env.supplyChest.claspMesh.position.set(0, 0.66, 0.51);
    this.env.supplyChest.claspMesh.rotation.set(0, 0, 0);
    (this.env.supplyChest.innerGlow.material as THREE.MeshBasicMaterial).opacity = 0;
    this.env.rangeRing.visible = false;
    this.env.selectRing.visible = false;

    if (this.currentStageId === 'stage_01' && this.onboardingStep !== 'done') {
      this.onboardingStep = 'select_pad';
    } else {
      this.onboardingStep = 'done';
    }

    if (playIntro) {
      this.mode = 'opening';
      this.emitSnapshot();
      this.cinematics.playOpeningStationIntro(() => {
        if (this.mode === 'opening') {
          this.mode = 'playing';
          this.emitSnapshot();
        }
      });
    } else {
      for (const m of this.env.beacon.statusLampMats) m.emissiveIntensity = 1.8;
      (this.env.beacon.coreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.35;
      this.mode = 'playing';
      this.emitSnapshot();
    }
  }

  public selectPadOrTower(padId: string | null): void {
    if (
      this.mode !== 'playing' &&
      this.mode !== 'paused' &&
      this.mode !== 'opening'
    ) {
      return;
    }
    if (this.mode === 'opening') {
      // Allow eager player tap to finish opening gracefully
      this.cinematics.cancelAll();
      for (const m of this.env.beacon.statusLampMats) m.emissiveIntensity = 1.8;
      this.mode = 'playing';
    }

    this.audio.unlock();
    if (!padId) {
      this.selectedPadId = null;
      this.previewTowerType = null;
      this.clearGhostPreview();
      this.syncSelectionRings();
      this.emitSnapshot();
      return;
    }

    if (!this.env.pads.has(padId)) return;

    if (this.armedSkillId !== null) {
      this.armedSkillId = null;
      this.vfx.setTacticalReticle(false);
    }

    this.audio.playUiClick();
    this.selectedPadId = padId;
    const existing = this.towers.get(padId);
    if (existing) {
      this.previewTowerType = null;
      this.clearGhostPreview();
    } else {
      if (this.onboardingStep === 'select_pad') {
        this.onboardingStep = 'build_tower';
      }
      // Do not auto-pick; wait for user to tap one of the 3 tower cards to show 3D model preview + range!
      this.previewTowerType = null;
      this.clearGhostPreview();
    }

    this.syncSelectionRings();
    this.emitSnapshot();
  }

  private computeTowerStatsForTier(
    type: TowerType,
    tier: TowerTier,
    isHighGround: boolean,
    branch: TowerBranch = 'A'
  ): {
    damage: number;
    fireInterval: number;
    range: number;
    splashRadius: number;
    slowRatio: number;
    slowDuration: number;
    armorPierce: number;
    cost: number;
    partHeadline: string;
  } {
    const bp = TOWER_BLUEPRINTS[type];
    const base = tier === 4 ? bp.branches[branch] : bp.tiers[tier - 1];
    const tech = this.progression.getComputedTechModifiers();
    const hgDmg = isHighGround ? HIGH_GROUND_DAMAGE_MULT : 1.0;
    const hgRng = isHighGround ? HIGH_GROUND_RANGE_MULT : 1.0;
    const costDiscount = tier === 4 ? tech.t4CostDiscount : 0;

    return {
      damage: Math.round(base.damage * hgDmg * tech.damageMultiplier),
      fireInterval: Number((base.fireInterval / tech.fireRateMultiplier).toFixed(3)),
      range: Number((base.range * hgRng * tech.rangeMultiplier).toFixed(2)),
      splashRadius: base.splashRadius,
      slowRatio: base.slowRatio,
      slowDuration: base.slowDuration,
      armorPierce: base.armorPierce,
      cost: Math.max(10, Math.round(base.cost * (1 - costDiscount))),
      partHeadline: base.partHeadline,
    };
  }

  /**
   * Selects a tower type on an empty pad: shows 3D hologram model preview + attack range ring!
   * If affordable and already previewing (or via explicit confirm button), builds it!
   */
  public previewOrBuildTower(type: TowerType, confirmImmediately = false): boolean {
    if (this.mode !== 'playing' || !this.selectedPadId || this.towers.has(this.selectedPadId)) {
      return false;
    }
    this.audio.unlock();

    const bp = TOWER_BLUEPRINTS[type];
    const cost = bp.tiers[0].cost;

    if (!confirmImmediately && this.previewTowerType !== type) {
      this.audio.playUiClick();
      this.previewTowerType = type;
      this.showGhostPreview(this.selectedPadId, type);
      this.syncSelectionRings();
      if (this.gold < cost) {
        this.callbacks.onInsufficientGold(cost - this.gold);
        this.audio.playInsufficientGold();
      }
      this.emitSnapshot();
      return false;
    }

    // Attempting to execute build!
    if (this.gold < cost) {
      this.audio.playInsufficientGold();
      this.callbacks.onInsufficientGold(cost - this.gold);
      this.emitSnapshot();
      return false;
    }

    const padVis = this.env.pads.get(this.selectedPadId);
    if (!padVis) return false;
    const padCfg = padVis.config;
    const isHighGround = padCfg.padType === 'high_ground';
    const padSurfaceY = (padCfg.y ?? 0) + 0.14;

    this.gold -= cost;
    this.clearGhostPreview();
    this.previewTowerType = null;

    const rig = createTowerRig(type, 1);
    rig.root.position.set(padCfg.x, padSurfaceY, padCfg.z);
    this.towerGroup.add(rig.root);

    const tower: TowerInstance = {
      id: `tower_${this.nextEntityId++}`,
      padId: padCfg.id,
      type,
      tier: 1,
      isHighGround,
      branch: null,
      overdriveTimer: 0,
      auraHasteBonus: 0,
      spinUpStacks: 0,
      spinUpDecayTimer: 0,
      pullPulseCounter: 0,
      flapCloseTimer: 0,
      totalInvestedGold: cost,
      cooldown: 0.15,
      shotToggle: 0,
      targetEnemyId: null,
      stunTimer: 0,
      upgradingTimer: 0.45,
      rig,
      worldPos: new THREE.Vector3(padCfg.x, padSurfaceY, padCfg.z),
      kills: 0,
      totalDamage: 0,
    };

    this.towers.set(padCfg.id, tower);
    this.progression.discoverCodex(type);
    this.cinematics.playTowerBuildAssembly(tower);

    if (this.onboardingStep === 'select_pad' || this.onboardingStep === 'build_tower') {
      this.onboardingStep = 'start_wave';
    }

    this.syncSelectionRings();
    this.emitSnapshot();
    return true;
  }

  public upgradeSelectedTower(branch: TowerBranch = 'A'): boolean {
    if (this.mode !== 'playing' || !this.selectedPadId) return false;
    const tower = this.towers.get(this.selectedPadId);
    if (!tower || tower.tier >= 4) return false;

    const isHG = Boolean(tower.isHighGround);
    const currStats = this.computeTowerStatsForTier(
      tower.type,
      tower.tier,
      isHG,
      tower.branch ?? 'A'
    );
    const nextTier = (tower.tier + 1) as TowerTier;
    const nextStats = this.computeTowerStatsForTier(tower.type, nextTier, isHG, branch);

    if (this.gold < nextStats.cost) {
      this.audio.playInsufficientGold();
      this.callbacks.onInsufficientGold(nextStats.cost - this.gold);
      return false;
    }

    this.gold -= nextStats.cost;
    tower.totalInvestedGold += nextStats.cost;
    tower.tier = nextTier;
    if (nextTier === 4) {
      tower.branch = branch;
      this.progression.discoverCodex(`${tower.type}_${branch}`);
    }

    const deltas: StatDeltaPopup[] = [];
    if (nextTier === 4) {
      deltas.push({
        label: '专精',
        deltaText: TOWER_BLUEPRINTS[tower.type].branches[branch].shortTitle,
      });
    }
    if (nextStats.damage > currStats.damage) {
      deltas.push({ label: '伤害', deltaText: `▲+${nextStats.damage - currStats.damage}` });
    }
    if (nextStats.range > currStats.range) {
      deltas.push({
        label: '射程',
        deltaText: `▲+${(nextStats.range - currStats.range).toFixed(1)}m`,
      });
    }
    if (nextStats.slowRatio > currStats.slowRatio) {
      deltas.push({
        label: '减速',
        deltaText: `▲+${Math.round((nextStats.slowRatio - currStats.slowRatio) * 100)}%`,
      });
    } else if (nextStats.fireInterval < currStats.fireInterval) {
      const rateNow = 1 / nextStats.fireInterval;
      const ratePrev = 1 / currStats.fireInterval;
      deltas.push({ label: '攻速', deltaText: `▲+${(rateNow - ratePrev).toFixed(1)}/s` });
    }

    if (nextTier === 4) {
      // Check if player now fields both A and B branches in the same battle
      let hasA = false;
      let hasB = false;
      for (const tw of this.towers.values()) {
        if (tw.tier === 4 && tw.branch === 'A') hasA = true;
        if (tw.tier === 4 && tw.branch === 'B') hasB = true;
      }
      if (hasA && hasB) {
        this.progression.markDualBranchCleared();
      }

      // STAGE 2C: Legendary Mecha Dedicated Reveal Stage — pauses combat simulation & clears stray flashes!
      applyTowerTierVisuals(tower.rig, 4, { visibilityOnly: true, branch });
      this.vfx.clearCombatTransients();
      this.mode = 'legendary_reveal';
      this.syncSelectionRings();
      this.emitSnapshot();
      this.cinematics.playLegendaryUpgradeReveal(
        tower,
        deltas,
        () => {
          applyTowerTierVisuals(tower.rig, 4, { branch });
          if (this.mode === 'legendary_reveal') {
            this.mode = 'playing';
            this.syncSelectionRings();
            this.emitSnapshot();
          }
        },
        branch
      );
    } else {
      // STAGE 2B: Short non-blocking arc-assembly upgrade!
      tower.upgradingTimer = 0.52;
      this.cinematics.playNormalUpgrade(tower, nextTier, deltas);
      this.syncSelectionRings();
      this.emitSnapshot();
    }

    return true;
  }

  public sellSelectedTower(): boolean {
    if ((this.mode !== 'playing' && this.mode !== 'paused') || !this.selectedPadId) return false;
    const tower = this.towers.get(this.selectedPadId);
    if (!tower) return false;

    const refund = Math.round(tower.totalInvestedGold * GAME_CONSTANTS.SELL_REFUND_RATIO);
    this.gold += refund;
    this.audio.playUiClick();
    this.vfx.spawnLunarDustRing(tower.worldPos, 8, 0.9);
    this.vfx.spawn3DLoot(
      tower.worldPos,
      3,
      0,
      tower.worldPos.clone().add(new THREE.Vector3(0, 3.2, 0)),
      () => this.audio.playLootChime(false)
    );

    disposeObject3DTree(tower.rig.root);
    this.towers.delete(this.selectedPadId);
    this.selectedPadId = null;
    this.syncSelectionRings();
    this.emitSnapshot();
    return true;
  }

  /**
   * Activates an interactive 3D battlefield mechanism (Crystal Vein, Lunar Capacitor Pylon, or Laser Gate)!
   */
  public activateMechanism(mechId: string): boolean {
    if (this.mode === 'opening') {
      this.cinematics.cancelAll();
      for (const m of this.env.beacon.statusLampMats) m.emissiveIntensity = 1.8;
      this.mode = 'playing';
    }
    if (this.mode !== 'playing') return false;

    const mech = this.env.mechanisms.get(mechId);
    if (!mech) return false;
    if (mech.cooldownRemaining > 0 || mech.activeRemaining > 0) return false;

    this.audio.unlock();
    const origin = new THREE.Vector3(mech.config.x, 0.25, mech.config.z);
    this.progression.incrementCounter('mechanismsUsed', 1);
    this.progression.discoverCodex(mech.config.type);

    if (mech.config.type === 'crystal_vein') {
      this.audio.playMechanismActivate('crystal_vein');
      mech.cooldownRemaining = mech.cooldownTotal;
      for (const v of mech.activeVisuals) {
        v.scale.setScalar(0.35);
      }

      this.gold += 45;
      this.crystals += 1;
      this.progression.addCrystals(1);
      this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.CRYSTAL_VEIN_HARVEST_BONUS, true);

      this.vfx.spawnGroundRing(
        new THREE.Vector3(mech.config.x, 0.08, mech.config.z),
        0x38bdf8,
        0.4,
        2.8,
        0.4
      );
      this.vfx.spawn3DLoot(
        origin,
        4,
        1,
        origin.clone().add(new THREE.Vector3(0, 3.6, 0)),
        (isCrystal) => this.audio.playLootChime(isCrystal)
      );
    } else if (mech.config.type === 'capacitor_pylon') {
      this.audio.playMechanismActivate('capacitor_pylon');
      mech.activeRemaining = mech.activeDuration;
      mech.cooldownRemaining = mech.cooldownTotal;
      this.cinematics.addCameraShake(0.14);

      this.vfx.spawnGroundRing(
        new THREE.Vector3(mech.config.x, 0.09, mech.config.z),
        0x22d3ee,
        0.6,
        9.2,
        0.45
      );
      this.vfx.spawnMagneticFieldPulse(origin, 4.6);

      const arcOrigin = new THREE.Vector3(mech.config.x, 1.88, mech.config.z);
      if (mech.activeVisuals[2]) {
        mech.group.updateMatrixWorld(true);
        mech.activeVisuals[2].getWorldPosition(arcOrigin);
      }

      let brokeAnyShield = false;
      for (const e of [...this.enemies]) {
        if (e.dead || e.hp <= 0) continue;
        const d = Math.hypot(e.worldPos.x - mech.config.x, e.worldPos.z - mech.config.z);
        if (d <= 4.6 + (e.isBoss ? 0.65 : 0.2)) {
          this.vfx.spawnChainLightningArc(
            arcOrigin,
            e.worldPos.clone().setY(e.isFlying ? 0.86 : 0.52),
            0x38bdf8,
            0.34
          );
          // Strip up to 220 shield HP immediately + deal 95 arc damage + apply Magnetic Flux!
          if (e.shieldHp > 0) {
            e.shieldHp = Math.max(0, e.shieldHp - 220);
            if (e.shieldHp === 0) {
              this.vfx.spawnShieldBreak(e.worldPos);
              brokeAnyShield = true;
            }
            this.syncEnemyShieldVisuals(e);
          }
          const slowAmt = e.isBoss ? 0.28 : 0.48;
          e.slowRatio = Math.max(e.slowRatio, slowAmt);
          e.slowTimer = Math.max(e.slowTimer, 2.4);
          e.fluxTimer = Math.max(e.fluxTimer, 4.0);
          e.rig.slowRing.visible = true;
          if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;
          this.applyDamageToEnemy(e, 95, 1.0, null);
        }
      }
      if (brokeAnyShield) {
        this.audio.playShieldBreak();
      }
    } else {
      // laser_gate: 6.0s active thermal plasma barrier!
      this.audio.playMechanismActivate('laser_gate');
      mech.activeRemaining = mech.activeDuration;
      mech.cooldownRemaining = mech.cooldownTotal;
      for (const v of mech.activeVisuals) {
        v.visible = true;
      }
      this.vfx.spawnGroundRing(
        new THREE.Vector3(mech.config.x, 0.08, mech.config.z),
        0xf97316,
        0.5,
        3.6,
        0.38
      );
    }

    this.emitSnapshot();
    return true;
  }

  private addTacticalEnergy(amount: number, applyRegenMult = true): void {
    if (amount <= 0) return;
    const mult = applyRegenMult
      ? this.progression.getComputedTechModifiers().energyRegenMultiplier
      : 1.0;
    this.tacticalEnergy = Math.min(this.maxTacticalEnergy, this.tacticalEnergy + amount * mult);
  }

  public activateCommanderSkill(skillId: CommanderSkillId): boolean {
    if (this.mode === 'opening') {
      this.cinematics.cancelAll();
      for (const m of this.env.beacon.statusLampMats) m.emissiveIntensity = 1.8;
      this.mode = 'playing';
    }
    if (this.mode !== 'playing' || this.overlayPaused) return false;

    this.audio.unlock();
    const cfg = COMMANDER_SKILLS[skillId];
    if (!cfg) return false;

    if (this.armedSkillId === skillId) {
      this.cancelSkillTargeting();
      return false;
    }

    if (this.skillCooldowns[skillId] > 0) {
      this.audio.playInsufficientGold();
      return false;
    }

    if (this.tacticalEnergy < cfg.energyCost) {
      this.audio.playInsufficientGold();
      this.callbacks.onInsufficientEnergy?.(Math.ceil(cfg.energyCost - this.tacticalEnergy));
      this.emitSnapshot();
      return false;
    }

    if (skillId === 'orbital_strike') {
      // Deselect any open pad/tower so bottom tray never occludes ground aiming!
      if (this.selectedPadId) {
        this.selectedPadId = null;
        this.previewTowerType = null;
        this.clearGhostPreview();
        this.syncSelectionRings();
      }
      this.armedSkillId = 'orbital_strike';
      const leadEnemy = this.acquireBestTarget(new THREE.Vector3(0, 0, 0), 999);
      const aimX = leadEnemy ? leadEnemy.worldPos.x : this.currentStage.camera.lookX;
      const aimZ = leadEnemy ? leadEnemy.worldPos.z : 0;
      this.vfx.setTacticalReticle(true, aimX, aimZ, cfg.radius);
      this.audio.playTacticalArm();
      this.emitSnapshot();
      return true;
    }

    if (skillId === 'emp_overdrive') {
      this.tacticalEnergy = Math.max(0, this.tacticalEnergy - cfg.energyCost);
      this.skillCooldowns.emp_overdrive = cfg.cooldownSec;
      if (this.armedSkillId !== null) {
        this.armedSkillId = null;
        this.vfx.setTacticalReticle(false);
      }
      this.progression.incrementCounter('skillsUsed', 1);

      for (const tw of this.towers.values()) {
        tw.stunTimer = 0;
        tw.overdriveTimer = Math.max(tw.overdriveTimer ?? 0, 6.0);
        tw.flapCloseTimer = Math.max(tw.flapCloseTimer ?? 0, 0.45);
        this.openTowerHingedFlaps(tw);
      }

      let brokeAnyShield = false;
      for (const e of this.enemies) {
        if (e.dead || e.hp <= 0) continue;
        if (e.shieldHp > 0) {
          e.shieldHp = 0;
          this.syncEnemyShieldVisuals(e);
          this.vfx.spawnShieldBreak(e.worldPos);
          brokeAnyShield = true;
        }
        e.fluxTimer = Math.max(e.fluxTimer, 5.5);
        if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;
        const slowAmt = e.isBoss ? 0.22 : 0.35;
        e.slowRatio = Math.max(e.slowRatio, slowAmt);
        e.slowTimer = Math.max(e.slowTimer, 2.0);
        e.rig.slowRing.visible = true;
      }

      if (brokeAnyShield) {
        this.audio.playShieldBreak();
      }
      this.vfx.spawnEmpOverdrivePulse(this.env.beacon.group.position);
      this.audio.playEmpOverdrive();
      this.cinematics.addCameraShake(0.18);
      this.emitSnapshot();
      return true;
    }

    if (skillId === 'nano_repair') {
      this.tacticalEnergy = Math.max(0, this.tacticalEnergy - cfg.energyCost);
      this.skillCooldowns.nano_repair = cfg.cooldownSec;
      if (this.armedSkillId !== null) {
        this.armedSkillId = null;
        this.vfx.setTacticalReticle(false);
      }
      this.progression.incrementCounter('skillsUsed', 1);

      this.beaconHp = Math.min(this.maxBeaconHp, this.beaconHp + 4);
      this.gold += 75;

      const beaconPos = this.env.beacon.group.position;
      this.vfx.spawnBeaconNanoRepair(beaconPos);
      this.audio.playNanoRepair();
      this.vfx.spawn3DLoot(
        beaconPos.clone().add(new THREE.Vector3(0, 0.7, 0)),
        6,
        0,
        beaconPos.clone().add(new THREE.Vector3(0, 3.8, 0)),
        () => this.audio.playLootChime(false)
      );
      this.emitSnapshot();
      return true;
    }

    return false;
  }

  public confirmOrbitalStrikeAt(worldX: number, worldZ: number): boolean {
    if (this.mode !== 'playing' || this.overlayPaused || this.armedSkillId !== 'orbital_strike') {
      return false;
    }
    const cfg = COMMANDER_SKILLS.orbital_strike;
    if (this.tacticalEnergy < cfg.energyCost || this.skillCooldowns.orbital_strike > 0) {
      this.cancelSkillTargeting();
      return false;
    }

    const cx = THREE.MathUtils.clamp(worldX, -14.5, 14.5);
    const cz = THREE.MathUtils.clamp(worldZ, -9.5, 9.5);

    this.tacticalEnergy = Math.max(0, this.tacticalEnergy - cfg.energyCost);
    this.skillCooldowns.orbital_strike = cfg.cooldownSec;
    this.armedSkillId = null;
    this.vfx.setTacticalReticle(false);
    this.progression.incrementCounter('skillsUsed', 1);

    this.vfx.spawnOrbitalLockOn(cx, cz, cfg.radius, 0.55);
    this.audio.playOrbitalLockOn();
    this.pendingOrbitalStrikes.push({ x: cx, z: cz, timer: 0.55 });
    this.emitSnapshot();
    return true;
  }

  public cancelSkillTargeting(): void {
    if (this.armedSkillId === null) return;
    this.armedSkillId = null;
    this.vfx.setTacticalReticle(false);
    this.audio.playUiClick();
    this.emitSnapshot();
  }

  private getActiveWaveConfig(): WaveConfig | null {
    if (this.isEndlessMode()) {
      if (!this.endlessActiveWaveConfig || this.endlessActiveWaveConfig.waveNumber !== this.waveIndex + 1) {
        this.endlessActiveWaveConfig = generateEndlessWave(
          this.waveIndex + 1,
          this.compiledLanes.length
        );
      }
      return this.endlessActiveWaveConfig;
    }
    return this.currentStage.waves[this.waveIndex] ?? null;
  }

  public startNextWave(): boolean {
    if (this.mode === 'opening') {
      this.cinematics.cancelAll();
      for (const m of this.env.beacon.statusLampMats) m.emissiveIntensity = 1.8;
      this.mode = 'playing';
    }
    if (this.mode !== 'playing' || this.waveInProgress) return false;
    if (!this.isEndlessMode() && this.waveIndex >= this.currentStage.waves.length) return false;

    const cfg = this.getActiveWaveConfig();
    if (!cfg) return false;

    this.audio.unlock();
    this.audio.playUiClick();
    this.onboardingStep = 'done';

    // Deselect empty preview so view is crisp
    if (this.selectedPadId && !this.towers.has(this.selectedPadId)) {
      this.selectedPadId = null;
      this.previewTowerType = null;
      this.clearGhostPreview();
      this.syncSelectionRings();
    }

    this.waveInProgress = true;
    this.waveElapsed = 0;
    this.pendingSpawns = [];
    const laneCount = Math.max(1, this.compiledLanes.length);

    let cursorTime = 0;
    for (const grp of cfg.groups) {
      cursorTime += grp.delayBefore;
      for (let i = 0; i < grp.count; i++) {
        const resolvedLane =
          grp.laneIndex === 'alternate'
            ? i % laneCount
            : typeof grp.laneIndex === 'number'
              ? ((grp.laneIndex % laneCount) + laneCount) % laneCount
              : 0;
        this.pendingSpawns.push({
          enemyType: grp.enemyType,
          laneIndex: resolvedLane,
          spawnAtWaveTime: cursorTime + i * grp.interval,
          spawned: false,
        });
      }
      cursorTime += grp.count * grp.interval * 0.45;
    }

    this.progression.recordWaveReached(this.currentStageId, cfg.waveNumber);

    this.callbacks.onBanner(
      cfg.title,
      cfg.subtitle,
      cfg.hasBoss ? '#FF4757' : cfg.hasElite ? '#A855F7' : '#38BDF8'
    );
    window.clearTimeout(this.bannerHideTimer);
    this.bannerHideTimer = window.setTimeout(() => {
      if (this.mode === 'playing') this.callbacks.onHideBanner();
    }, 2400);

    this.emitSnapshot();
    return true;
  }

  public toggleSpeed(): 1 | 2 {
    this.audio.playUiClick();
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    this.emitSnapshot();
    return this.speedMultiplier;
  }

  public togglePause(): boolean {
    if (this.mode === 'playing') {
      this.audio.playUiClick();
      this.mode = 'paused';
      this.emitSnapshot();
      return true;
    }
    if (this.mode === 'paused') {
      this.audio.playUiClick();
      this.mode = 'playing';
      this.emitSnapshot();
      return false;
    }
    return false;
  }

  public toggleMute(): boolean {
    const muted = this.audio.toggleMute();
    this.progression.setMuted(muted);
    this.emitSnapshot();
    return muted;
  }

  /**
   * STAGE 5B: Interactive Reward Claim! Called when player clicks "开启补给箱 · 领取奖励" or taps the 3D Supply Chest!
   */
  public claimVictoryRewards(): boolean {
    if (this.mode !== 'victory_panel' || this.rewardClaimed) return false;
    this.mode = 'reward_claiming';
    this.emitSnapshot();

    this.cinematics.playOpenRewardChest(
      () => {
        const chestGold = this.currentStage.victoryBonusGold;
        const chestCrystals = this.currentStage.victoryBonusCrystals;
        this.gold += chestGold;
        this.crystals += chestCrystals;
        this.progression.addCrystals(chestCrystals);

        const result = this.progression.recordStageVictory(
          this.currentStageId,
          this.beaconHp,
          this.maxBeaconHp,
          this.currentStage.waves.length,
          this.currentStage.firstClearCrystals,
          this.currentStage.perStarCrystals
        );
        this.lastFirstClearBonus = result.firstClearCrystals;
        this.lastStarBonus = result.newStarCrystals;
        this.rewardClaimed = true;
        this.emitSnapshot();
      },
      () => {
        this.mode = 'reward_claimed';
        this.emitSnapshot();
      }
    );
    return true;
  }

  // ==================== SIMULATION & RENDERING LOOP ====================

  private stepFrame(rawDt: number, doRender: boolean): void {
    if (this.mode === 'paused' || (this.overlayPaused && this.mode === 'playing')) {
      this.vfx.update(0, 0);
      this.applyCameraPose(0);
      if (doRender) {
        this.composer.render(this.solidScene, this.vfxScene, this.camera);
      }
      return;
    }

    this.elapsedStationTime += rawDt;

    // Ambient mechanical life (Beacon dish, hazard lamps, empty pad hop cues, speed rails)
    this.updateAmbientStationLife(rawDt);

    if (this.mode === 'playing') {
      let activeScale = this.simTimeScale;
      if (this.hitStopTimer > 0) {
        this.hitStopTimer = Math.max(0, this.hitStopTimer - rawDt);
        activeScale = Math.min(activeScale, this.hitStopScale);
      }
      const simDt = rawDt * this.speedMultiplier * activeScale;
      this.combatSimElapsed += simDt;
      if (this.waveInProgress) {
        this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.PASSIVE_REGEN_IN_WAVE_PER_SEC * simDt, true);
      }
      this.updateCommanderSkillsAndZones(simDt);
      this.updateMechanisms(simDt, rawDt);
      this.updateWaveSpawner(simDt);
      this.updateEnemies(simDt);
      this.updateTowers(simDt);
      this.checkWaveCompletion();
      this.vfx.update(simDt, rawDt);
    } else {
      // Still animate particles/coins/rings during reveals & victory chest claim!
      this.vfx.update(0, rawDt);
    }

    this.applyCameraPose(rawDt);

    // Keep damaged/elite HP bars facing the camera cleanly
    for (const e of this.enemies) {
      if (e.rig.hpBarGroup.visible) {
        e.rig.hpBarGroup.quaternion.copy(this.camera.quaternion);
      }
    }

    this.uiSyncTimer += rawDt;
    if (this.uiSyncTimer >= 0.14) {
      this.uiSyncTimer = 0;
      this.emitSnapshot();
    }

    if (doRender) {
      this.composer.render(this.solidScene, this.vfxScene, this.camera);
    }
  }

  private updateAmbientStationLife(dt: number): void {
    // Return Beacon standby rotation & core breathing
    this.env.beacon.dishGroup.rotation.y += dt * 0.65;
    this.env.beacon.coreMesh.rotation.y -= dt * 0.9;
    this.env.beacon.coreMesh.position.y = 1.98 + Math.sin(this.elapsedStationTime * 2.2) * 0.05;

    // Multi-portal Mine Entrance rotating warning reflectors
    const spinSpeed = this.mode === 'boss_intro' ? 14.0 : 2.8;
    for (const ent of this.env.entrances) {
      for (const r of ent.hazardRotors) {
        r.rotation.y += dt * spinSpeed;
      }
    }

    // Stage 2 central crater ring & Stage 3 accelerator rail chevrons
    if (this.env.craterRing) {
      this.env.craterRing.rotation.y += dt * 0.85;
    }
    if (this.env.speedZoneVisuals.length > 0) {
      this.env.speedZoneVisuals.forEach((chev, idx) => {
        const mat = chev.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.45 + 0.35 * Math.sin(this.elapsedStationTime * 6.5 - idx * 0.65);
      });
    }

    // Empty Build Pads gentle hop every ~4.2 seconds relative to padVis.baseY!
    for (const [padId, padVis] of this.env.pads.entries()) {
      if (this.towers.has(padId)) {
        padVis.group.position.y = padVis.baseY;
        padVis.ringMat.opacity = 0.22;
      } else {
        const cycle = (this.elapsedStationTime + padVis.hopPhaseOffset) % GAME_CONSTANTS.PAD_HOP_INTERVAL;
        if (cycle < 0.38) {
          const u = cycle / 0.38;
          padVis.group.position.y = padVis.baseY + Math.sin(u * Math.PI) * 0.14;
        } else {
          padVis.group.position.y = padVis.baseY;
        }
        padVis.ringMat.opacity =
          this.selectedPadId === padId
            ? 0.95
            : 0.48 + 0.22 * Math.sin(this.elapsedStationTime * 2.6 + padVis.hopPhaseOffset);
      }
    }

    if (this.env.selectRing.visible) {
      this.env.selectRing.rotation.z += dt * 1.1;
    }
  }

  private updateMechanisms(simDt: number, rawDt: number): void {
    this.laserTickAccum += simDt;
    const doLaserTick = this.laserTickAccum >= 0.2;
    if (doLaserTick) {
      this.laserTickAccum = 0;
    }

    for (const mech of this.env.mechanisms.values()) {
      if (mech.activeRemaining > 0) {
        mech.activeRemaining = Math.max(0, mech.activeRemaining - simDt);
        if (mech.config.type === 'laser_gate') {
          const beamGrp = mech.activeVisuals[0];
          if (beamGrp) {
            beamGrp.visible = mech.activeRemaining > 0;
          }
          if (doLaserTick && mech.activeRemaining > 0) {
            for (const e of [...this.enemies]) {
              if (e.dead || e.hp <= 0) continue;
              const d = Math.hypot(e.worldPos.x - mech.config.x, e.worldPos.z - mech.config.z);
              if (d <= 1.95 + (e.isBoss ? 0.75 : 0.2)) {
                const slowAmt = e.isBoss ? 0.24 : 0.4;
                e.slowRatio = Math.max(e.slowRatio, slowAmt);
                e.slowTimer = Math.max(e.slowTimer, 1.2);
                e.rig.slowRing.visible = true;
                this.applyDamageToEnemy(e, 11, 0.7, null);
              }
            }
          }
        }
      } else if (mech.cooldownRemaining > 0) {
        mech.cooldownRemaining = Math.max(0, mech.cooldownRemaining - simDt);
      }

      const isReady = mech.cooldownRemaining <= 0 && mech.activeRemaining <= 0;
      mech.readyRingMat.opacity = isReady
        ? 0.58 + 0.3 * Math.sin(this.elapsedStationTime * 4.2)
        : mech.activeRemaining > 0
          ? 0.95
          : 0.14;

      if (mech.config.type === 'crystal_vein') {
        const regrow =
          mech.cooldownRemaining <= 0
            ? 1.0
            : THREE.MathUtils.lerp(0.35, 0.92, 1 - mech.cooldownRemaining / mech.cooldownTotal);
        for (const v of mech.activeVisuals) {
          v.scale.setScalar(regrow);
        }
      } else if (mech.config.type === 'capacitor_pylon') {
        const spin = isReady ? 2.4 : mech.activeRemaining > 0 ? 14.0 : 0.6;
        if (mech.activeVisuals[0]) mech.activeVisuals[0].rotation.z += rawDt * spin;
        if (mech.activeVisuals[1]) mech.activeVisuals[1].rotation.y -= rawDt * spin * 1.2;
        if (mech.activeVisuals[2]) {
          mech.activeVisuals[2].rotation.y += rawDt * spin * 1.4;
          mech.activeVisuals[2].position.y =
            1.88 + Math.sin(this.elapsedStationTime * 3.5) * (isReady ? 0.06 : 0.015);
        }
      }
    }
  }

  private isBossEnemyType(type: EnemyType): boolean {
    return ENEMY_BLUEPRINTS[type].isBoss;
  }

  private updateWaveSpawner(dt: number): void {
    if (!this.waveInProgress) return;
    this.waveElapsed += dt;

    for (const item of this.pendingSpawns) {
      if (!item.spawned && this.waveElapsed >= item.spawnAtWaveTime) {
        if (this.isBossEnemyType(item.enemyType) && this.bossIntroPlayedForWave !== this.waveIndex) {
          // Trigger STAGE 3: Boss Charge-Up & Entrance Choreography!
          this.bossIntroPlayedForWave = this.waveIndex;
          item.spawned = true;
          this.mode = 'boss_intro';
          this.emitSnapshot();

          const bossBp = ENEMY_BLUEPRINTS[item.enemyType];
          const entIdx = Math.min(
            item.laneIndex,
            Math.max(0, this.env.entrances.length - 1)
          );
          const bannerTitle = this.isEndlessMode()
            ? `超载警报 · ${bossBp.name}`
            : this.waveIndex === this.currentStage.waves.length - 1
              ? this.currentStage.bossBanner.title
              : '先锋重装警报 · 首领突入';
          const bannerSub = this.isEndlessMode()
            ? `无尽第 ${this.waveIndex + 1} 波首领正在突破防线！`
            : this.waveIndex === this.currentStage.waves.length - 1
              ? this.currentStage.bossBanner.subtitle
              : `高能首领【${bossBp.name}】正在强攻矿口！`;

          this.cinematics.playBossEntranceSequence(
            () => {
              this.spawnEnemy(item.enemyType, item.laneIndex);
            },
            () => {
              if (this.mode === 'boss_intro') {
                this.mode = 'playing';
                this.emitSnapshot();
              }
            },
            {
              entranceIndex: entIdx,
              bannerTitle,
              bannerSubtitle: bannerSub,
            }
          );
          return;
        }

        item.spawned = true;
        this.spawnEnemy(item.enemyType, item.laneIndex);
      }
    }
  }

  private spawnEnemy(
    type: EnemyType,
    laneIndex = 0,
    overrideDistance = 0,
    overrideLateral?: number
  ): EnemyInstance {
    const bp = ENEMY_BLUEPRINTS[type];
    const rig = createEnemyRig(type);
    const resolvedLaneIdx = Math.min(laneIndex, Math.max(0, this.compiledLanes.length - 1));
    const lane = this.compiledLanes[resolvedLaneIdx];

    const lateral =
      overrideLateral !== undefined
        ? overrideLateral
        : type === 'swarm'
          ? (Math.random() - 0.5) * 0.65
          : (Math.random() - 0.5) * 0.26;

    const startDist = THREE.MathUtils.clamp(overrideDistance, 0, Math.max(0, lane.totalLength - 0.5));
    const startSample = sampleLaneAtDistance(lane, startDist);
    const nx = -startSample.tz;
    const nz = startSample.tx;

    const worldPos = new THREE.Vector3(
      startSample.x + nx * lateral,
      0,
      startSample.z + nz * lateral
    );
    rig.root.position.copy(worldPos);
    rig.root.rotation.y = Math.atan2(startSample.tx, startSample.tz);

    let maxHp = bp.maxHp;
    let maxShieldHp = bp.maxShield ?? 0;
    let baseSpeed = bp.speed;
    let goldReward = bp.goldReward;

    if (this.isEndlessMode()) {
      const sc = getEndlessScaling(this.waveIndex + 1);
      maxHp = Math.round(maxHp * sc.hpMultiplier);
      maxShieldHp = Math.round(maxShieldHp * sc.hpMultiplier);
      baseSpeed = Number((baseSpeed * sc.speedMultiplier).toFixed(2));
      goldReward = Math.max(2, Math.round(goldReward * sc.goldRewardScale));
    }

    // Show HP bar immediately ONLY for Elite/Boss; normal enemies keep clean battlefield until hit!
    rig.hpBarGroup.visible = bp.isElite || bp.isBoss;
    this.enemyGroup.add(rig.root);
    this.progression.discoverCodex(type);

    const armorLayers =
      type === 'boss_ark_overlord' ? 4 : bp.isBoss ? 3 : 0;

    const inst: EnemyInstance = {
      id: `enemy_${this.nextEntityId++}`,
      type,
      name: bp.name,
      hp: maxHp,
      maxHp,
      shieldHp: maxShieldHp,
      maxShieldHp,
      shieldRegenDelay: 0,
      baseSpeed,
      armor: bp.armor,
      goldReward,
      crystalReward: bp.crystalReward,
      beaconDamage: bp.beaconDamage,
      isFlying: bp.isFlying,
      isElite: bp.isElite,
      isBoss: bp.isBoss,
      laneIndex: resolvedLaneIdx,
      distanceTraveled: startDist,
      lateralOffset: lateral,
      slowRatio: 0,
      slowTimer: 0,
      supportCooldown: 2.2 + Math.random() * 0.6,
      fluxTimer: 0,
      speedBoostTimer: 0,
      hitFlashTimer: 0,
      hitRecoil: 0,
      walkPhase: Math.random() * Math.PI * 2,
      dead: false,
      dyingTimer: 0,
      skillCooldown: 6.2,
      skillTelegraphTimer: 0,
      armorLayersRemaining: armorLayers,
      worldPos,
      rig,
    };

    this.syncEnemyShieldVisuals(inst);
    this.enemies.push(inst);
    return inst;
  }

  private syncEnemyShieldVisuals(e: EnemyInstance): void {
    if (e.shieldHp > e.maxShieldHp) {
      e.maxShieldHp = e.shieldHp;
    }
    if (e.rig.shieldDome) {
      e.rig.shieldDome.visible = e.shieldHp > 0 && !e.dead;
      const mat = e.rig.shieldDome.material as THREE.MeshBasicMaterial;
      const ratio = e.maxShieldHp > 0 ? e.shieldHp / e.maxShieldHp : 0;
      mat.opacity = (e.isBoss ? 0.16 : 0.2) + 0.14 * ratio;
    }
    if (e.rig.shieldFillMesh) {
      e.rig.shieldFillMesh.visible = e.shieldHp > 0 && !e.dead;
      e.rig.shieldFillMesh.scale.x =
        e.maxShieldHp > 0 ? Math.max(0.001, e.shieldHp / e.maxShieldHp) : 0.001;
      if (e.shieldHp > 0 && !e.dead) {
        e.rig.hpBarGroup.visible = true;
      }
    }
  }

  private registerSynergyCombo(
    worldPos: THREE.Vector3,
    label: string,
    accentHex: string,
    countForAchievement: boolean
  ): void {
    this.activeComboCount++;
    this.comboResetTimer = 4.5;
    if (countForAchievement) {
      this.progression.incrementCounter('synergyTriggers', 1);
    }
    const prevSec = this.lastComboCalloutByLabel.get(label) ?? -10;
    if (this.combatSimElapsed - prevSec >= 0.24) {
      this.lastComboCalloutByLabel.set(label, this.combatSimElapsed);
      const pt = this.projectWorldToScreen(worldPos);
      const sy = pt.y - 24;
      if (this.comboCalloutHandler) {
        this.comboCalloutHandler(
          label,
          {
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z,
            screenX: pt.x,
            screenY: sy,
            clientX: pt.x,
            clientY: sy,
            comboCount: this.activeComboCount,
          },
          accentHex,
          this.activeComboCount
        );
      } else {
        this.callbacks.onComboCallout?.(pt.x, sy, label, accentHex, this.activeComboCount);
      }
    }
  }

  private openTowerHingedFlaps(tower: TowerInstance): void {
    const activeBranch = tower.branch ?? 'A';
    for (const flap of tower.rig.hingedFlaps) {
      const ud = flap.userData as Partial<HingedFlapUserData>;
      if ((ud.minTier ?? 3) > tower.tier) continue;
      if (ud.branchTag && ud.branchTag !== activeBranch) continue;
      const axis = ud.hingeAxis ?? 'y';
      const openAng = ud.openAngle ?? (flap.position.x > 0 ? 0.45 : -0.45);
      flap.rotation[axis] = openAng;
    }
  }

  private updateCommanderSkillsAndZones(simDt: number): void {
    for (const sid of COMMANDER_SKILL_ORDER) {
      if (this.skillCooldowns[sid] > 0) {
        this.skillCooldowns[sid] = Math.max(0, this.skillCooldowns[sid] - simDt);
      }
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - simDt);
      if (this.comboResetTimer <= 0) {
        this.activeComboCount = 0;
      }
    }

    // 1. Orbital Ion Strike 0.55s lock-on queue
    for (let i = this.pendingOrbitalStrikes.length - 1; i >= 0; i--) {
      const strike = this.pendingOrbitalStrikes[i];
      strike.timer -= simDt;
      if (strike.timer <= 0) {
        this.pendingOrbitalStrikes.splice(i, 1);
        const radius = COMMANDER_SKILLS.orbital_strike.radius;
        this.vfx.spawnOrbitalIonBeam(strike.x, strike.z, radius);
        this.audio.playOrbitalStrike();
        this.cinematics.addCameraShake(0.32);

        for (const e of [...this.enemies]) {
          if (e.dead || e.hp <= 0) continue;
          const d = Math.hypot(e.worldPos.x - strike.x, e.worldPos.z - strike.z);
          if (d <= radius + (e.isBoss ? 0.8 : 0.25)) {
            e.armorShredStacks = Math.max(e.armorShredStacks ?? 0, 3);
            e.armorShredTimer = Math.max(e.armorShredTimer ?? 0, 6.0);
            if (e.rig.shredBadgeGroup) e.rig.shredBadgeGroup.visible = true;
            e.rig.hpBarGroup.visible = true;

            const stunDur = e.isBoss ? 0.65 : 1.6;
            e.stunTimer = Math.max(e.stunTimer ?? 0, stunDur);
            if (e.isBoss && e.skillTelegraphTimer > 0) {
              e.skillTelegraphTimer = 0;
              this.vfx.setBossTelegraphZone(false);
            }

            this.applyDamageToEnemy(e, e.isBoss ? 220 : 260, 0.85, null);
          }
        }
      }
    }

    // 2. Mortar T4-B staggered 3-rocket salvos
    for (let i = this.pendingRocketSalvos.length - 1; i >= 0; i--) {
      const salvo = this.pendingRocketSalvos[i];
      salvo.delay -= simDt;
      if (salvo.delay <= 0) {
        this.pendingRocketSalvos.splice(i, 1);
        if (!this.towers.has(salvo.tower.padId)) continue;
        const muzzleObj =
          salvo.tower.rig.muzzlePoints[salvo.muzzleIdx] ?? salvo.tower.rig.weaponPitch;
        const muzzleWorld = new THREE.Vector3();
        muzzleObj.getWorldPosition(muzzleWorld);
        this.audio.playClusterSalvo();
        this.vfx.launchClusterRocket(
          muzzleWorld,
          salvo.tx,
          salvo.tz,
          salvo.splashRadius,
          (ix, iz) => {
            this.resolveMortarImpact(
              salvo.tower,
              ix,
              iz,
              salvo.damage,
              salvo.splashRadius,
              salvo.armorPierce,
              false
            );
          }
        );
      }
    }

    // 3. Mortar T4-A 3.0s Plasma Burn Zones (simDt-paused!)
    for (let i = this.plasmaZones.length - 1; i >= 0; i--) {
      const z = this.plasmaZones[i];
      z.remaining -= simDt;
      z.tickAccum += simDt;
      while (z.tickAccum >= 0.5) {
        z.tickAccum -= 0.5;
        for (const e of [...this.enemies]) {
          if (e.dead || e.hp <= 0) continue;
          const d = Math.hypot(e.worldPos.x - z.x, e.worldPos.z - z.z);
          if (d <= z.radius + (e.isBoss ? 0.75 : 0.2)) {
            this.applyDamageToEnemy(e, z.tickDamage, z.armorPierce, z.sourceTower);
          }
        }
      }
      if (z.remaining <= 0) {
        this.plasmaZones.splice(i, 1);
      }
    }
  }

  private getSpeedZoneMultiplier(laneIndex: number, dist: number): number {
    let mult = 1.0;
    for (const sz of this.currentStage.speedZones) {
      if (sz.laneIndex === laneIndex && dist >= sz.startDist && dist <= sz.endDist) {
        mult = Math.max(mult, sz.speedMultiplier);
      }
    }
    return mult;
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // 1. Handle distinct death animations for non-Boss enemies
      if (e.dead) {
        e.dyingTimer -= dt;
        const u = 1 - Math.max(0, e.dyingTimer) / 0.34;
        if (e.type === 'swarm' || e.type === 'repair_drone' || e.type === 'shield_skimmer') {
          const startH = e.type === 'shield_skimmer' ? 0.48 : 0.88;
          e.rig.bodyGroup.position.y = THREE.MathUtils.lerp(startH, 0.08, u);
          e.rig.bodyGroup.rotation.z += dt * 14;
          e.rig.bodyGroup.rotation.x += dt * 8;
        } else if (e.type === 'rover' || e.type === 'mini_scout' || e.type === 'splitter_rover') {
          e.rig.bodyGroup.rotation.x = u * 0.55;
          e.rig.bodyGroup.scale.set(
            e.rig.bodyGroup.scale.x * (1 + dt * 0.3),
            Math.max(0.25, (1 - u * 0.45) * ENEMY_BLUEPRINTS[e.type].scale),
            e.rig.bodyGroup.scale.z * (1 + dt * 0.3)
          );
        } else {
          e.rig.bodyGroup.rotation.z = u * 0.65;
          e.rig.bodyGroup.position.y = -u * 0.22;
        }

        if (e.dyingTimer <= 0) {
          disposeObject3DTree(e.rig.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // 2. Hit flash, debuff timers, synergy overlays & recoil recovery
      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        const flashOn = e.hitFlashTimer > 0;
        for (const m of e.rig.hitFlashMaterials) {
          const tm = m as THREE.MeshToonMaterial;
          tm.emissive.setHex(flashOn ? 0xffffff : 0x000000);
          tm.emissiveIntensity = flashOn ? 0.55 : 0;
        }
      }
      if (e.hitRecoil > 0) {
        e.hitRecoil = Math.max(0, e.hitRecoil - dt * 3.5);
      }
      if (e.fluxTimer > 0) {
        e.fluxTimer = Math.max(0, e.fluxTimer - dt);
      }
      if (e.rig.fluxRingGroup) {
        e.rig.fluxRingGroup.visible = e.fluxTimer > 0 && !e.dead;
        if (e.rig.fluxRingGroup.visible) {
          e.rig.fluxRingGroup.rotation.y -= dt * 4.2;
        }
      }
      if ((e.armorShredTimer ?? 0) > 0) {
        e.armorShredTimer = Math.max(0, (e.armorShredTimer ?? 0) - dt);
        if (e.armorShredTimer <= 0) {
          e.armorShredStacks = 0;
        }
      }
      if (e.rig.shredBadgeGroup) {
        const hasShred = (e.armorShredStacks ?? 0) > 0 && !e.dead;
        e.rig.shredBadgeGroup.visible = hasShred;
        if (hasShred) {
          e.rig.hpBarGroup.visible = true;
        }
      }
      if ((e.vulnTimer ?? 0) > 0) {
        e.vulnTimer = Math.max(0, (e.vulnTimer ?? 0) - dt);
        if (e.vulnTimer <= 0) {
          e.vulnMultiplier = 1.0;
        }
      }
      if ((e.comboIcdTimer ?? 0) > 0) {
        e.comboIcdTimer = Math.max(0, (e.comboIcdTimer ?? 0) - dt);
      }
      if ((e.stunTimer ?? 0) > 0) {
        e.stunTimer = Math.max(0, (e.stunTimer ?? 0) - dt);
      }
      if (e.speedBoostTimer && e.speedBoostTimer > 0) {
        e.speedBoostTimer = Math.max(0, e.speedBoostTimer - dt);
      }

      // Out-of-combat shield recharge for Shield Skimmers + per-frame shieldFillMesh sync
      if (e.maxShieldHp > 0 && !e.isBoss) {
        if (e.shieldRegenDelay > 0) {
          e.shieldRegenDelay = Math.max(0, e.shieldRegenDelay - dt);
        } else if (e.shieldHp < e.maxShieldHp) {
          e.shieldHp = Math.min(e.maxShieldHp, e.shieldHp + 18 * dt);
        }
      }
      this.syncEnemyShieldVisuals(e);

      // Repair Drone periodic AoE Nano-Repair pulse!
      if (e.type === 'repair_drone') {
        if (e.rig.supportHalo) {
          e.rig.supportHalo.rotation.y += dt * 4.2;
        }
        e.supportCooldown -= dt;
        if (e.supportCooldown <= 0) {
          e.supportCooldown = 2.6;
          let healedCount = 0;
          for (const ally of this.enemies) {
            if (ally.dead || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
            if (Math.hypot(ally.worldPos.x - e.worldPos.x, ally.worldPos.z - e.worldPos.z) <= 3.6) {
              const healAmt = ally.isBoss ? 55 : 30;
              ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
              ally.rig.hpFillMesh.scale.x = Math.max(0.001, ally.hp / ally.maxHp);
              healedCount++;
              if (healedCount >= 4) break;
            }
          }
          if (healedCount > 0) {
            this.vfx.spawnGroundRing(
              new THREE.Vector3(e.worldPos.x, 0.08, e.worldPos.z),
              0x34d399,
              0.35,
              3.5,
              0.38
            );
          }
        }
      }

      // 3. Refreshable non-stacking Magnetic Slow debuff
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        e.rig.slowRing.visible = true;
        e.rig.slowRing.rotation.z += dt * 3.2;
        if (e.slowTimer <= 0) {
          e.slowTimer = 0;
          e.slowRatio = 0;
          e.rig.slowRing.visible = false;
        }
      }

      const lane = this.compiledLanes[e.laneIndex] ?? this.compiledLanes[0];

      // 4. Differentiated Stage Boss Active Skills & Telegraphs!
      let bossHaltedForSkill = false;
      if (e.isBoss) {
        if (e.rig.weakPointCore) {
          e.rig.weakPointCore.rotation.y += dt * 2.8;
        }
        if (e.rig.secondaryDrillHead) {
          if (e.type === 'boss_ark_overlord') {
            e.rig.secondaryDrillHead.rotation.y -= dt * 2.2;
            e.rig.secondaryDrillHead.rotation.z += dt * 1.4;
          } else {
            e.rig.secondaryDrillHead.rotation.z -= dt * 12;
          }
        }

        const slamRadius =
          e.type === 'boss_ark_overlord'
            ? 5.8
            : e.type === 'boss_siege_driller'
              ? 5.5
              : 5.2;

        if (e.skillTelegraphTimer > 0) {
          bossHaltedForSkill = true;
          e.skillTelegraphTimer -= dt;
          const prog = 1 - Math.max(0, e.skillTelegraphTimer) / 1.25;

          if (e.rig.hydraulicArm && e.rig.forearm) {
            e.rig.hydraulicArm.rotation.x = -prog * 0.95;
            e.rig.forearm.rotation.x = -prog * 0.65;
          }
          if (e.rig.drillHead) e.rig.drillHead.rotation.z += dt * 24;
          this.vfx.setBossTelegraphZone(true, e.worldPos.x, e.worldPos.z, slamRadius, prog);

          if (e.skillTelegraphTimer <= 0) {
            // EXECUTE BOSS SIGNATURE SKILL!
            this.vfx.setBossTelegraphZone(false);
            if (e.rig.hydraulicArm && e.rig.forearm) {
              e.rig.hydraulicArm.rotation.x = 0.32;
              e.rig.forearm.rotation.x = 0.25;
            }
            this.audio.playBossSkillSlam();
            this.cinematics.addCameraShake(0.24);
            const ringColor =
              e.type === 'boss_mag_dreadnought'
                ? 0x38bdf8
                : e.type === 'boss_siege_driller'
                  ? 0xc084fc
                  : 0xff4757;
            this.vfx.spawnGroundRing(
              new THREE.Vector3(e.worldPos.x, 0.08, e.worldPos.z),
              ringColor,
              0.5,
              slamRadius * 2,
              0.48
            );
            this.vfx.spawnLunarDustRing(e.worldPos, 14, 1.6);

            const stunDur = e.type === 'boss_mag_dreadnought' ? 1.8 : 2.2;
            for (const tw of this.towers.values()) {
              if (Math.hypot(tw.worldPos.x - e.worldPos.x, tw.worldPos.z - e.worldPos.z) <= slamRadius) {
                tw.stunTimer = Math.max(tw.stunTimer, stunDur);
                tw.spinUpStacks = 0;
                tw.spinUpDecayTimer = 0;
              }
            }

            // Stage-specific Boss bonus effects!
            if (e.type === 'boss_siege_driller') {
              for (const ally of this.enemies) {
                if (!ally.dead && ally.id !== e.id && Math.hypot(ally.worldPos.x - e.worldPos.x, ally.worldPos.z - e.worldPos.z) <= 5.6) {
                  ally.maxShieldHp = Math.max(ally.maxShieldHp, 120);
                  ally.shieldHp = Math.min(ally.maxShieldHp, ally.shieldHp + 120);
                  this.syncEnemyShieldVisuals(ally);
                }
              }
            } else if (e.type === 'boss_mag_dreadnought') {
              e.shieldHp = Math.min(e.maxShieldHp, e.shieldHp + 320);
              this.syncEnemyShieldVisuals(e);
              for (const ally of this.enemies) {
                if (!ally.dead && Math.hypot(ally.worldPos.x - e.worldPos.x, ally.worldPos.z - e.worldPos.z) <= 6.0) {
                  ally.speedBoostTimer = 3.5;
                }
              }
            } else if (e.type === 'boss_ark_overlord') {
              for (const lat of [-0.36, 0.36]) {
                this.spawnEnemy(
                  'mini_scout',
                  e.laneIndex,
                  Math.min(lane.totalLength - 1.2, e.distanceTraveled + 1.1),
                  lat
                );
              }
            }

            e.skillCooldown = 8.8;
          }
        } else {
          if (e.rig.hydraulicArm && e.rig.forearm) {
            e.rig.hydraulicArm.rotation.x = THREE.MathUtils.lerp(e.rig.hydraulicArm.rotation.x, 0, dt * 4);
            e.rig.forearm.rotation.x = THREE.MathUtils.lerp(e.rig.forearm.rotation.x, 0, dt * 4);
          }
          e.skillCooldown -= dt;
          if (
            e.skillCooldown <= 0 &&
            e.distanceTraveled > 3.8 &&
            e.distanceTraveled < lane.totalLength - 3.8
          ) {
            e.skillTelegraphTimer = 1.25;
            this.audio.playBossSkillWarning();
          }
        }
      }

      // 5. Advance along assigned Haulage Lane (factoring Speed Zones, Stuns & Haste!)
      const railMult = this.getSpeedZoneMultiplier(e.laneIndex, e.distanceTraveled);
      const hasteMult = e.speedBoostTimer && e.speedBoostTimer > 0 ? 1.26 : 1.0;
      const isStunned = (e.stunTimer ?? 0) > 0;
      const effSpeed =
        bossHaltedForSkill || isStunned
          ? 0
          : e.baseSpeed * railMult * hasteMult * (1 - e.slowRatio);
      e.distanceTraveled += effSpeed * dt;
      e.walkPhase += effSpeed * dt * 3.8;

      if (e.distanceTraveled >= lane.totalLength) {
        // Reached Last Return Beacon!
        if (e.isBoss) {
          this.vfx.setBossTelegraphZone(false);
        }
        disposeObject3DTree(e.rig.root);
        this.enemies.splice(i, 1);

        const isFinalCampaignWave =
          !this.isEndlessMode() && this.waveIndex === this.currentStage.waves.length - 1;
        const dmg =
          isFinalCampaignWave && e.isBoss
            ? Math.max(e.beaconDamage, this.maxBeaconHp)
            : e.beaconDamage;
        this.beaconHp = Math.max(0, this.beaconHp - dmg);
        this.audio.playBeaconDamageAlarm();
        this.cinematics.addCameraShake(0.22);
        this.vfx.spawnClimaxBurst(this.env.beacon.group.position, 0xff4757, 0.7, false);

        if (this.beaconHp <= 0) {
          this.audio.playDefeatShutdown();
          this.progression.recordWaveReached(this.currentStageId, this.waveIndex + 1);
          this.mode = 'defeat';
          this.waveInProgress = false;
          this.armedSkillId = null;
          this.pendingOrbitalStrikes = [];
          this.pendingRocketSalvos = [];
          this.plasmaZones = [];
          this.vfx.setTacticalReticle(false);
          this.emitSnapshot();
          return;
        }
        continue;
      }

      const s = sampleLaneAtDistance(lane, e.distanceTraveled);
      const nx = -s.tz;
      const nz = s.tx;
      e.worldPos.set(s.x + nx * e.lateralOffset, 0, s.z + nz * e.lateralOffset);
      e.rig.root.position.copy(e.worldPos);
      e.rig.root.rotation.y = Math.atan2(s.tx, s.tz);

      // 6. Credible Locomotion Articulation + Height-Reactive Shadow!
      if (e.type === 'rover' || e.type === 'splitter_rover' || e.type === 'mini_scout') {
        const wheelSpin = e.type === 'mini_scout' ? 6.2 : 4.5;
        for (const w of e.rig.wheelsOrRotors) w.rotation.x += effSpeed * dt * wheelSpin;
        e.rig.bodyGroup.position.y = Math.abs(Math.sin(e.walkPhase * 1.4)) * 0.035;
        e.rig.bodyGroup.rotation.x = -e.hitRecoil * 0.22;
      } else if (e.type === 'swarm' || e.type === 'repair_drone') {
        for (const r of e.rig.wheelsOrRotors) r.rotation.y += dt * 26;
        const baseHover = e.type === 'repair_drone' ? 0.92 : 0.86;
        const hoverY = baseHover + Math.sin(this.elapsedStationTime * 6 + e.walkPhase) * 0.1;
        e.rig.bodyGroup.position.y = hoverY;
        e.rig.bodyGroup.rotation.x = 0.12 - e.hitRecoil * 0.25;
        const shadowScale = THREE.MathUtils.clamp(1.15 - (hoverY - 0.75) * 0.5, 0.72, 1.15);
        e.rig.shadowBlob.scale.setScalar(shadowScale);
        (e.rig.shadowBlob.material as THREE.MeshBasicMaterial).opacity = 0.28 * shadowScale;
      } else if (e.type === 'shield_skimmer' || e.type === 'boss_mag_dreadnought') {
        for (const r of e.rig.wheelsOrRotors) r.rotation.y += dt * 10;
        const baseHover = e.type === 'boss_mag_dreadnought' ? 0.52 : 0.48;
        e.rig.bodyGroup.position.y =
          baseHover + Math.sin(this.elapsedStationTime * 4.5 + e.walkPhase) * 0.07;
        e.rig.bodyGroup.rotation.x = -e.hitRecoil * 0.16;
      } else {
        for (const w of e.rig.wheelsOrRotors) w.rotation.z -= effSpeed * dt * 3.4;
        if (e.rig.drillHead) e.rig.drillHead.rotation.z += dt * 11;
        e.rig.bodyGroup.position.y = Math.abs(Math.sin(e.walkPhase)) * 0.025;
        e.rig.bodyGroup.rotation.x = -e.hitRecoil * 0.14;
      }
    }
  }

  private updateTowers(dt: number): void {
    // 1. Recompute Magnetic T4-B (+15% within 7.0m) neighbor haste auras & tick overdrive timers
    const arcMatrixOrigins: THREE.Vector3[] = [];
    for (const tw of this.towers.values()) {
      tw.auraHasteBonus = 0;
      if ((tw.overdriveTimer ?? 0) > 0) {
        tw.overdriveTimer = Math.max(0, (tw.overdriveTimer ?? 0) - dt);
      }
      if (tw.type === 'magnetic' && tw.tier === 4 && tw.branch === 'B' && tw.stunTimer <= 0) {
        arcMatrixOrigins.push(tw.worldPos);
      }
    }
    if (arcMatrixOrigins.length > 0) {
      for (const tw of this.towers.values()) {
        for (const origin of arcMatrixOrigins) {
          const d = Math.hypot(tw.worldPos.x - origin.x, tw.worldPos.z - origin.z);
          if (d > 0.05 && d <= 7.0) {
            tw.auraHasteBonus = 0.15;
            break;
          }
        }
      }
    }

    for (const tower of this.towers.values()) {
      const activeBranch = tower.branch ?? 'A';
      const stats = this.computeTowerStatsForTier(
        tower.type,
        tower.tier,
        Boolean(tower.isHighGround),
        activeBranch
      );
      const rig = tower.rig;

      // Pause-safe simDt closing of hinged reload/capacitor flaps!
      if ((tower.flapCloseTimer ?? 0) > 0) {
        tower.flapCloseTimer = Math.max(0, (tower.flapCloseTimer ?? 0) - dt);
      } else {
        for (const flap of rig.hingedFlaps) {
          const ud = flap.userData as Partial<HingedFlapUserData>;
          if ((ud.minTier ?? 3) > tower.tier) continue;
          if (ud.branchTag && ud.branchTag !== activeBranch) continue;
          const axis = ud.hingeAxis ?? 'y';
          const restAng = ud.restAngle ?? 0;
          if (Math.abs(flap.rotation[axis] - restAng) > 0.002) {
            flap.rotation[axis] = THREE.MathUtils.lerp(flap.rotation[axis], restAng, Math.min(1, dt * 16));
          } else {
            flap.rotation[axis] = restAng;
          }
        }
      }

      // Spin rotary barrels / singularity gimbals when active on T4-A
      if (rig.rotaryBarrels && tower.tier === 4 && activeBranch === 'A' && tower.stunTimer <= 0) {
        if (tower.type === 'autocannon') {
          const spinRate = 4.5 + (tower.spinUpStacks ?? 0) * 3.2;
          for (const rb of rig.rotaryBarrels) {
            rb.rotation.z += dt * spinRate;
          }
        } else if (tower.type === 'magnetic') {
          if (rig.rotaryBarrels[0]) {
            rig.rotaryBarrels[0].rotation.y += dt * 2.8;
            rig.rotaryBarrels[0].rotation.x += dt * 1.4;
          }
          if (rig.rotaryBarrels[1]) {
            rig.rotaryBarrels[1].rotation.z -= dt * 3.2;
            rig.rotaryBarrels[1].rotation.y -= dt * 1.9;
          }
        }
      }

      // Decay Autocannon T4-A spin-up stacks smoothly when out of combat
      if ((tower.spinUpStacks ?? 0) > 0) {
        tower.spinUpDecayTimer = (tower.spinUpDecayTimer ?? 0) - dt;
        if (tower.spinUpDecayTimer <= 0) {
          tower.spinUpStacks = Math.max(0, (tower.spinUpStacks ?? 0) - 1);
          tower.spinUpDecayTimer = 0.35;
        }
      }

      // Idle mechanical animations (including M1 T1+ idleCore pulse!)
      if (rig.specialGear) {
        rig.specialGear.rotation.z += dt * (tower.stunTimer > 0 ? 0 : 2.2);
      }
      if (rig.idleCore && tower.stunTimer <= 0) {
        if (tower.type !== 'magnetic') {
          rig.idleCore.rotation.y += dt * 1.8;
        }
        const restSc = rig.idleCore.userData.restScale as THREE.Vector3 | undefined;
        if (restSc) {
          const pulse = 1 + Math.sin(this.elapsedStationTime * 3.2 + tower.worldPos.x) * 0.06;
          rig.idleCore.scale.set(restSc.x * pulse, restSc.y * pulse, restSc.z * pulse);
        }
      }

      // Recover barrel/tube recoil smoothly
      if (rig.barrelL) rig.barrelL.position.z = THREE.MathUtils.lerp(rig.barrelL.position.z, 0.36, dt * 14);
      if (rig.barrelR) rig.barrelR.position.z = THREE.MathUtils.lerp(rig.barrelR.position.z, 0.36, dt * 14);
      if (rig.mortarTube) rig.mortarTube.position.z = THREE.MathUtils.lerp(rig.mortarTube.position.z, 0, dt * 8);

      if (tower.upgradingTimer > 0) {
        tower.upgradingTimer -= dt;
      }

      if (tower.stunTimer > 0) {
        tower.stunTimer = Math.max(0, tower.stunTimer - dt);
        rig.weaponPitch.rotation.x = 0.22; // Droop slightly while EMP-stunned
        continue;
      } else if (tower.type === 'autocannon') {
        rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8);
      } else if (tower.type === 'mortar') {
        rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, -0.58, dt * 8);
      } else {
        rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8);
      }

      const spinUpHaste =
        tower.type === 'autocannon' && tower.tier === 4 && activeBranch === 'A'
          ? (tower.spinUpStacks ?? 0) * 0.035
          : 0;
      const hasteMult =
        1 +
        ((tower.overdriveTimer ?? 0) > 0 ? 0.45 : 0) +
        (tower.auraHasteBonus ?? 0) +
        spinUpHaste;

      tower.cooldown -= dt * hasteMult;

      // Magnetic Restraint Tower continuous & pre-fire anticipation ring dynamics
      if (tower.type === 'magnetic') {
        const isCharging = tower.cooldown < 0.36 && this.hasLivingEnemyInRange(tower.worldPos, stats.range);
        const ringSpeed = isCharging ? 9.5 : 2.1;
        if (rig.magRingOuter) rig.magRingOuter.rotation.y += dt * ringSpeed;
        if (rig.magRingInner) rig.magRingInner.rotation.z -= dt * ringSpeed * 1.2;
        if (rig.magInnerCore) {
          rig.magInnerCore.rotation.y -= dt * (isCharging ? 14 : 2.5);
          rig.magInnerCore.rotation.x += dt * (isCharging ? 8 : 1.2);
        }
        const targetClampRot = isCharging ? 0.36 : 0;
        for (const c of rig.magClamps) {
          c.rotation.x = THREE.MathUtils.lerp(c.rotation.x, targetClampRot, dt * 12);
        }

        if (tower.cooldown <= 0 && this.hasLivingEnemyInRange(tower.worldPos, stats.range)) {
          tower.cooldown = stats.fireInterval;
          this.fireMagneticTower(tower, stats);
        }
        continue;
      }

      // Target acquisition: immediately drop dead or out-of-range enemies!
      let target = this.findValidTarget(tower.targetEnemyId, tower.worldPos, stats.range);
      if (!target) {
        target = this.acquireBestTarget(tower.worldPos, stats.range);
        tower.targetEnemyId = target ? target.id : null;
      }

      if (!target) {
        rig.turretYaw.rotation.y += Math.sin(this.elapsedStationTime * 0.8 + tower.worldPos.x) * dt * 0.25;
        continue;
      }

      // Smoothly yaw turret around turntable toward target
      const dx = target.worldPos.x - tower.worldPos.x;
      const dz = target.worldPos.z - tower.worldPos.z;
      const desiredYaw = Math.atan2(dx, dz);
      let diff = desiredYaw - rig.turretYaw.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rig.turretYaw.rotation.y += diff * Math.min(1, dt * 14);

      if (tower.cooldown <= 0 && Math.abs(diff) < 0.38) {
        tower.cooldown = stats.fireInterval;
        if (tower.type === 'autocannon') {
          this.fireAutocannon(tower, target, stats);
        } else if (tower.type === 'mortar') {
          this.fireMortar(tower, target, stats);
        }
      }
    }
  }

  private fireAutocannon(
    tower: TowerInstance,
    target: EnemyInstance,
    stats: ReturnType<GameEngine['computeTowerStatsForTier']>
  ): void {
    const rig = tower.rig;
    const isGatling = tower.tier === 4 && (tower.branch ?? 'A') === 'A';
    const isRailgun = tower.tier === 4 && tower.branch === 'B';

    const useLeft = tower.shotToggle % 2 === 0;
    tower.shotToggle++;

    if (isRailgun) {
      if (rig.barrelL) rig.barrelL.position.z = 0.1;
      if (rig.barrelR) rig.barrelR.position.z = 0.1;
      tower.flapCloseTimer = 0.24;
      this.openTowerHingedFlaps(tower);
    } else {
      const activeBarrel = useLeft ? rig.barrelL : rig.barrelR;
      if (activeBarrel) {
        activeBarrel.position.z = 0.14;
      }
      if (isGatling) {
        tower.spinUpStacks = Math.min(8, (tower.spinUpStacks ?? 0) + 1);
        tower.spinUpDecayTimer = 1.6;
        tower.flapCloseTimer = 0.16;
        this.openTowerHingedFlaps(tower);
      }
    }

    const muzzleObj = rig.muzzlePoints[useLeft ? 0 : 1] ?? rig.turretYaw;
    const muzzleWorld = new THREE.Vector3();
    muzzleObj.getWorldPosition(muzzleWorld);

    // Armor Shred stacks (-8% flat armor per stack, up to 3 stacks [-24%] or 4 stacks [-32%] on T4-A!)
    let appliedFirstShred = false;
    if (target.armor > 0 || target.fluxTimer > 0 || target.slowTimer > 0 || (target.stunTimer ?? 0) > 0) {
      const maxShred = isGatling ? 4 : 3;
      const prevStacks = target.armorShredStacks ?? 0;
      target.armorShredStacks = Math.min(maxShred, prevStacks + 1);
      target.armorShredTimer = 4.0;
      if (target.rig.shredBadgeGroup) {
        target.rig.shredBadgeGroup.visible = true;
      }
      if (prevStacks === 0 && (target.armor > 0 || target.fluxTimer > 0)) {
        appliedFirstShred = true;
      }
    }

    // Weak-Point Crit check against [Flux-Marked] / shredded / Boss exposed core
    const bossExposed =
      target.isBoss &&
      (target.armorLayersRemaining < target.rig.armorPlates.length ||
        target.skillTelegraphTimer > 0 ||
        target.fluxTimer > 0);
    const hasSynergyMark =
      target.fluxTimer > 0 || (target.armorShredStacks ?? 0) >= 2 || (target.stunTimer ?? 0) > 0;
    const isCrit =
      (hasSynergyMark && (isRailgun || tower.shotToggle % 3 === 0)) ||
      (bossExposed && (isRailgun || tower.shotToggle % 2 === 0)) ||
      (isRailgun && target.isElite);

    const hitPos = target.worldPos.clone().setY(target.isFlying ? 0.86 : 0.45);
    if (isCrit && target.rig.weakPointCore) {
      target.rig.root.updateMatrixWorld(true);
      target.rig.weakPointCore.getWorldPosition(hitPos);
    }

    let shotDamage = stats.damage;
    if (isCrit) {
      const baseCrit = isRailgun ? 1.55 : bossExposed ? 1.42 : 1.35;
      const comboMult = this.progression.getComputedTechModifiers().comboDamageMultiplier;
      const critMult = 1 + (baseCrit - 1) * comboMult;
      shotDamage = Math.round(shotDamage * critMult);
    }

    if (isRailgun) {
      const dx = target.worldPos.x - tower.worldPos.x;
      const dz = target.worldPos.z - tower.worldPos.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const endX = target.worldPos.x + ux * 2.8;
      const endZ = target.worldPos.z + uz * 2.8;
      const pierceEnd = new THREE.Vector3(endX, hitPos.y, endZ);

      this.audio.playRailgunShot();
      this.vfx.spawnRailgunSlug(muzzleWorld, pierceEnd);

      // Line-pierce up to 3 secondary enemies along the forward Gauss rail trajectory for 65% damage!
      const segDx = endX - tower.worldPos.x;
      const segDz = endZ - tower.worldPos.z;
      const segLenSq = segDx * segDx + segDz * segDz || 1;
      let piercedCount = 0;
      for (const other of [...this.enemies]) {
        if (other.id === target.id || other.dead || other.hp <= 0) continue;
        const px = other.worldPos.x - tower.worldPos.x;
        const pz = other.worldPos.z - tower.worldPos.z;
        const rawProj = (px * segDx + pz * segDz) / segLenSq;
        if (rawProj < 0.05 || rawProj > 1.05) continue;
        const t = THREE.MathUtils.clamp(rawProj, 0, 1);
        const perpDist = Math.hypot(px - segDx * t, pz - segDz * t);
        if (perpDist <= 0.78 + (other.isBoss ? 0.65 : 0.15)) {
          this.applyDamageToEnemy(other, Math.round(shotDamage * 0.65), stats.armorPierce, tower);
          if (++piercedCount >= 3) break;
        }
      }
    } else {
      this.audio.playAutocannonShot();
      this.vfx.spawnAutocannonShot(muzzleWorld, hitPos);
    }

    if (isCrit) {
      this.vfx.spawnWeakPointCrit(hitPos);
      const lastCritSec = this.lastComboCalloutByLabel.get('🎯弱点暴击') ?? -10;
      if (this.combatSimElapsed - lastCritSec >= 0.55) {
        this.audio.playArmorShred(true);
        this.registerSynergyCombo(hitPos, '🎯弱点暴击', '#FBBF24', true);
      }
    } else if (appliedFirstShred && this.combatSimElapsed - this.lastAutocannonSynergySec >= 0.65) {
      this.lastAutocannonSynergySec = this.combatSimElapsed;
      this.audio.playArmorShred(false);
      this.registerSynergyCombo(target.worldPos, '💥破甲裂隙', '#FB923C', true);
    }

    this.applyDamageToEnemy(target, shotDamage, stats.armorPierce, tower, {
      skipWeakPointPassive: isCrit,
    });
  }

  private fireMortar(
    tower: TowerInstance,
    target: EnemyInstance,
    stats: ReturnType<GameEngine['computeTowerStatsForTier']>
  ): void {
    const rig = tower.rig;
    const isFusion = tower.tier === 4 && (tower.branch ?? 'A') === 'A';
    const isCluster = tower.tier === 4 && tower.branch === 'B';

    if (rig.mortarTube && !isCluster) {
      rig.mortarTube.position.z = -0.26;
    }
    tower.flapCloseTimer = isCluster ? 0.34 : 0.24;
    this.openTowerHingedFlaps(tower);

    const lane = this.compiledLanes[target.laneIndex] ?? this.compiledLanes[0];
    const leadDist = Math.min(
      lane.totalLength,
      target.distanceTraveled + target.baseSpeed * (1 - target.slowRatio) * 0.35
    );

    if (isCluster) {
      // PM-04B: 3-rocket carpet salvo spaced along the target's path!
      const offsets = [-0.65, 0, 0.65];
      const muzzleIndices = [1, 2, 1];
      for (let r = 0; r < 3; r++) {
        const sample = sampleLaneAtDistance(
          lane,
          THREE.MathUtils.clamp(leadDist + offsets[r], 0, lane.totalLength)
        );
        if (r === 0) {
          const muzzleObj = rig.muzzlePoints[muzzleIndices[r]] ?? rig.weaponPitch;
          const muzzleWorld = new THREE.Vector3();
          muzzleObj.getWorldPosition(muzzleWorld);
          this.audio.playClusterSalvo();
          this.vfx.launchClusterRocket(
            muzzleWorld,
            sample.x,
            sample.z,
            stats.splashRadius,
            (ix, iz) => {
              this.resolveMortarImpact(
                tower,
                ix,
                iz,
                stats.damage,
                stats.splashRadius,
                stats.armorPierce,
                false
              );
            }
          );
        } else {
          this.pendingRocketSalvos.push({
            tower,
            muzzleIdx: muzzleIndices[r],
            tx: sample.x,
            tz: sample.z,
            damage: stats.damage,
            splashRadius: stats.splashRadius,
            armorPierce: stats.armorPierce,
            delay: r * 0.11,
          });
        }
      }
      return;
    }

    const muzzleObj = rig.muzzlePoints[0] ?? rig.weaponPitch;
    const muzzleWorld = new THREE.Vector3();
    muzzleObj.getWorldPosition(muzzleWorld);
    const predSample = sampleLaneAtDistance(lane, leadDist);

    this.audio.playMortarLaunch();
    this.vfx.launchMortarShell(
      muzzleWorld,
      predSample.x,
      predSample.z,
      stats.splashRadius,
      (ix, iz) => {
        this.resolveMortarImpact(
          tower,
          ix,
          iz,
          stats.damage,
          stats.splashRadius,
          stats.armorPierce,
          isFusion
        );
      }
    );
  }

  private resolveMortarImpact(
    tower: TowerInstance | null,
    ix: number,
    iz: number,
    baseDamage: number,
    splashRadius: number,
    armorPierce: number,
    spawnFusionBurn: boolean
  ): void {
    this.audio.playMortarImpact();

    if (spawnFusionBurn) {
      const tech = this.progression.getComputedTechModifiers();
      const hgDmg = tower?.isHighGround ? HIGH_GROUND_DAMAGE_MULT : 1.0;
      const tickDmg = Math.max(8, Math.round(22 * hgDmg * tech.damageMultiplier));
      this.vfx.spawnPlasmaBurnZone(ix, iz, 3.0, 3.0);
      this.plasmaZones.push({
        x: ix,
        z: iz,
        radius: 3.0,
        remaining: 3.0,
        tickAccum: 0.25,
        tickDamage: tickDmg,
        armorPierce: 0.72,
        sourceTower: tower,
      });
    }

    let detonationsThisImpact = 0;
    const comboMult = this.progression.getComputedTechModifiers().comboDamageMultiplier;

    for (const e of [...this.enemies]) {
      if (e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.worldPos.x - ix, e.worldPos.z - iz);
      if (d <= splashRadius + (e.isBoss ? 0.8 : 0.25)) {
        const canDetonateFlux =
          e.fluxTimer > 0 && (e.comboIcdTimer ?? 0) <= 0 && detonationsThisImpact < 2;
        const detCenter = e.worldPos.clone();

        const falloff = d <= splashRadius * 0.55 ? 1.0 : 0.78;
        this.applyDamageToEnemy(e, Math.round(baseDamage * falloff), armorPierce, tower);

        if (canDetonateFlux) {
          detonationsThisImpact++;
          e.fluxTimer = Math.max(0, e.fluxTimer - 1.25);
          e.comboIcdTimer = 0.08;
          if (e.fluxTimer <= 0 && e.rig.fluxRingGroup) {
            e.rig.fluxRingGroup.visible = false;
          }

          // 1) +35% Flux Resonance AoE shockwave
          const shockDmg = Math.max(6, Math.round(baseDamage * 0.35 * comboMult));
          const shockRadius = splashRadius * 1.35;
          for (const se of [...this.enemies]) {
            if (se.dead || se.hp <= 0) continue;
            if (
              Math.hypot(se.worldPos.x - detCenter.x, se.worldPos.z - detCenter.z) <=
              shockRadius + (se.isBoss ? 0.75 : 0.2)
            ) {
              this.applyDamageToEnemy(se, shockDmg, 0.75, tower);
            }
          }

          // 2) 2-target high-pierce Chain Lightning jump
          const chainCandidates = this.enemies
            .filter(
              (ce) =>
                !ce.dead &&
                ce.hp > 0 &&
                ce.id !== e.id &&
                Math.hypot(ce.worldPos.x - detCenter.x, ce.worldPos.z - detCenter.z) <= 3.6
            )
            .sort(
              (a, b) =>
                Math.hypot(a.worldPos.x - detCenter.x, a.worldPos.z - detCenter.z) -
                Math.hypot(b.worldPos.x - detCenter.x, b.worldPos.z - detCenter.z)
            )
            .slice(0, 2);

          const chainDmg = Math.max(5, Math.round(baseDamage * 0.28 * comboMult));
          const chainTargets: THREE.Vector3[] = [];
          for (const ce of chainCandidates) {
            chainTargets.push(ce.worldPos.clone().setY(ce.isFlying ? 0.86 : 0.5));
            this.applyDamageToEnemy(ce, chainDmg, 0.8, tower);
          }

          this.vfx.spawnFluxResonanceDetonation(detCenter, chainTargets);
          this.audio.playFluxCombo();
          this.registerSynergyCombo(detCenter, '⚡磁暴共振', '#38BDF8', true);
        }
      }
    }
  }

  private fireMagneticTower(
    tower: TowerInstance,
    stats: ReturnType<GameEngine['computeTowerStatsForTier']>
  ): void {
    for (const c of tower.rig.magClamps) c.rotation.x = -0.15;

    const isSingularity = tower.tier === 4 && (tower.branch ?? 'A') === 'A';
    const isArcMatrix = tower.tier === 4 && tower.branch === 'B';

    if (tower.tier >= 4) {
      tower.flapCloseTimer = 0.28;
      this.openTowerHingedFlaps(tower);
    }

    if (isArcMatrix) {
      // MR-04B: 5-target chain lightning (2.5x shield shred + 25% vulnerability) + 7.0m neighbor aura!
      const inRange = this.enemies
        .filter(
          (e) =>
            !e.dead &&
            e.hp > 0 &&
            Math.hypot(e.worldPos.x - tower.worldPos.x, e.worldPos.z - tower.worldPos.z) <=
              stats.range + (e.isBoss ? 0.65 : 0.15)
        )
        .sort((a, b) => b.distanceTraveled - a.distanceTraveled)
        .slice(0, 5);

      const chainPts: THREE.Vector3[] = [];
      for (const e of inRange) {
        chainPts.push(e.worldPos.clone().setY(e.isFlying ? 0.86 : 0.52));
        const effectiveSlow = e.isBoss ? stats.slowRatio * 0.55 : stats.slowRatio;
        e.slowRatio = Math.max(e.slowRatio, effectiveSlow);
        e.slowTimer = Math.max(e.slowTimer, stats.slowDuration);
        e.fluxTimer = Math.max(e.fluxTimer, stats.slowDuration + 0.85);
        e.vulnMultiplier = Math.max(e.vulnMultiplier ?? 1.0, 1.25);
        e.vulnTimer = Math.max(e.vulnTimer ?? 0, 2.6);
        e.rig.slowRing.visible = true;
        if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;

        this.applyDamageToEnemy(e, stats.damage, stats.armorPierce, tower, { shieldMult: 2.5 });
      }

      this.audio.playArcMatrix();
      this.vfx.spawnArcMatrixPulse(tower.worldPos, chainPts, 7.0);
      return;
    }

    let triggerSingularityPull = false;
    if (isSingularity) {
      tower.pullPulseCounter = (tower.pullPulseCounter ?? 0) + 1;
      triggerSingularityPull = tower.pullPulseCounter % 3 === 0;
    }

    if (triggerSingularityPull) {
      this.audio.playSingularityPull();
      this.vfx.spawnSingularityPullRing(tower.worldPos, stats.range);
    } else {
      this.audio.playMagneticPulse();
      this.vfx.spawnMagneticFieldPulse(tower.worldPos, stats.range);
    }

    for (const e of [...this.enemies]) {
      if (e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.worldPos.x - tower.worldPos.x, e.worldPos.z - tower.worldPos.z);
      if (d <= stats.range + (e.isBoss ? 0.6 : 0.15)) {
        const effectiveSlow = e.isBoss ? stats.slowRatio * 0.55 : stats.slowRatio;
        e.slowRatio = Math.max(e.slowRatio, effectiveSlow);
        e.slowTimer = Math.max(e.slowTimer, stats.slowDuration);
        e.fluxTimer = Math.max(e.fluxTimer, stats.slowDuration + 0.85);
        e.rig.slowRing.visible = true;
        if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;

        if (triggerSingularityPull) {
          const pullDist = e.isBoss
            ? 0.24
            : e.type === 'drill' || e.type === 'elite_drill'
              ? 0.78
              : 1.38;
          const lane = this.compiledLanes[e.laneIndex] ?? this.compiledLanes[0];
          e.distanceTraveled = Math.max(0, e.distanceTraveled - pullDist);
          const s = sampleLaneAtDistance(lane, e.distanceTraveled);
          const nx = -s.tz;
          const nz = s.tx;
          e.worldPos.set(s.x + nx * e.lateralOffset, 0, s.z + nz * e.lateralOffset);
          e.rig.root.position.copy(e.worldPos);
        }

        this.applyDamageToEnemy(e, stats.damage, stats.armorPierce, tower);
      }
    }
  }

  private applyDamageToEnemy(
    enemy: EnemyInstance,
    rawDamage: number,
    armorPierce: number,
    sourceTower: TowerInstance | null,
    opts?: { shieldMult?: number; skipWeakPointPassive?: boolean }
  ): void {
    if (enemy.dead || enemy.hp <= 0) return;

    let remainingRaw = rawDamage;
    enemy.shieldRegenDelay = 3.5;

    // 1. Energy Shield absorption (Magnetic towers & true arc damage deal 1.35x-2.5x to shields!)
    if (enemy.shieldHp > 0) {
      const shieldBonus =
        opts?.shieldMult ?? (sourceTower?.type === 'magnetic' || sourceTower === null ? 1.35 : 1.0);
      const shieldDmg = Math.round(remainingRaw * shieldBonus);
      if (enemy.shieldHp >= shieldDmg) {
        enemy.shieldHp -= shieldDmg;
        if (sourceTower) sourceTower.totalDamage += shieldDmg;
        enemy.rig.hpBarGroup.visible = true;
        this.syncEnemyShieldVisuals(enemy);
        enemy.hitFlashTimer = 0.065;
        this.vfx.spawnHitSparks(enemy.worldPos.clone().setY(0.65), false);
        return;
      } else {
        const absorbed = enemy.shieldHp;
        enemy.shieldHp = 0;
        remainingRaw = Math.max(2, Math.round((shieldDmg - absorbed) / shieldBonus));
        this.syncEnemyShieldVisuals(enemy);
        this.vfx.spawnShieldBreak(enemy.worldPos);
        this.audio.playShieldBreak();
      }
    }

    // Interactive Boss Weak-Point Core: 1.25x bonus damage on rear/flank reactor hits or once armor layers crack!
    if (!opts?.skipWeakPointPassive && enemy.isBoss && enemy.rig.weakPointCore) {
      let weakPointExposed = enemy.armorLayersRemaining < enemy.rig.armorPlates.length;
      if (!weakPointExposed && sourceTower) {
        const fwdX = Math.sin(enemy.rig.root.rotation.y);
        const fwdZ = Math.cos(enemy.rig.root.rotation.y);
        const toSrcX = sourceTower.worldPos.x - enemy.worldPos.x;
        const toSrcZ = sourceTower.worldPos.z - enemy.worldPos.z;
        const toSrcLen = Math.hypot(toSrcX, toSrcZ) || 1;
        const dot = (fwdX * toSrcX + fwdZ * toSrcZ) / toSrcLen;
        if (dot < 0.15) {
          weakPointExposed = true;
        }
      }
      if (weakPointExposed) {
        remainingRaw = Math.round(remainingRaw * 1.25);
      }
    }

    const shredFlat = (enemy.armorShredTimer ?? 0) > 0 ? (enemy.armorShredStacks ?? 0) * 0.08 : 0;
    const shreddedArmor = Math.max(0, enemy.armor - shredFlat);
    const effectiveArmor = Math.max(0, shreddedArmor * (1 - armorPierce));
    const vulnMult = (enemy.vulnTimer ?? 0) > 0 ? (enemy.vulnMultiplier ?? 1.0) : 1.0;
    const finalDamage = Math.max(2, Math.round(remainingRaw * (1 - effectiveArmor) * vulnMult));

    enemy.hp = Math.max(0, enemy.hp - finalDamage);
    if (sourceTower) {
      sourceTower.totalDamage += finalDamage;
    }

    // Reveal HP bar once damaged!
    enemy.rig.hpBarGroup.visible = true;
    enemy.rig.hpFillMesh.scale.x = Math.max(0.001, enemy.hp / enemy.maxHp);

    // Hit feedback: brief armor flash, subtle backward recoil, metallic sparks
    enemy.hitFlashTimer = 0.085;
    enemy.hitRecoil = 1.0;
    const hitPos = enemy.worldPos.clone().setY(enemy.isFlying ? 0.85 : 0.55);
    const isHeavyMetal = enemy.type === 'drill' || enemy.type === 'elite_drill' || enemy.isBoss;
    this.vfx.spawnHitSparks(hitPos, isHeavyMetal);
    if (isHeavyMetal) {
      this.audio.playMetallicArmorHit();
    }

    // Boss breakaway layered armor plates (3 layers on Ch.1-3 Bosses, 4 layers on Ch.4 Overlord!)
    if (enemy.isBoss && enemy.armorLayersRemaining > 0) {
      const hpRatio = enemy.hp / enemy.maxHp;
      const thresholds =
        enemy.type === 'boss_ark_overlord'
          ? [0.18, 0.35, 0.55, 0.75]
          : [0.25, 0.5, 0.75];
      const nextBreakThreshold = thresholds[enemy.armorLayersRemaining - 1];
      if (hpRatio <= nextBreakThreshold) {
        const plateIdx = enemy.rig.armorPlates.length - enemy.armorLayersRemaining;
        const plate = enemy.rig.armorPlates[plateIdx];
        if (plate) plate.visible = false;
        enemy.armorLayersRemaining--;
        enemy.armor = Math.max(0.12, enemy.armor - 0.09);
        this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.BOSS_PLATE_BREAK_BONUS, true);
        this.vfx.spawnArmorBreakDebris(enemy.worldPos.clone().setY(0.8), 6);
        this.cinematics.addCameraShake(0.16);
      }
    }

    // Death settlement (strictly once!)
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.rig.hpBarGroup.visible = false;
      enemy.rig.slowRing.visible = false;
      if (enemy.rig.shieldDome) enemy.rig.shieldDome.visible = false;
      if (enemy.rig.shieldFillMesh) enemy.rig.shieldFillMesh.visible = false;
      if (enemy.rig.fluxRingGroup) enemy.rig.fluxRingGroup.visible = false;
      if (enemy.rig.shredBadgeGroup) enemy.rig.shredBadgeGroup.visible = false;

      if (sourceTower) sourceTower.kills++;
      this.kills++;
      this.gold += enemy.goldReward;
      this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.KILL_ENERGY[enemy.type] ?? 2.0, true);
      if (enemy.crystalReward > 0) {
        this.crystals += enemy.crystalReward;
        this.progression.addCrystals(enemy.crystalReward);
      }

      // Immediately clear any tower locking onto this dead enemy!
      for (const tw of this.towers.values()) {
        if (tw.targetEnemyId === enemy.id) {
          tw.targetEnemyId = null;
        }
      }

      // Splitter Carrier Rover spawns 2 fast Mini-Scouts on death!
      if (enemy.type === 'splitter_rover') {
        this.vfx.spawnLunarDustRing(enemy.worldPos, 8, 1.0);
        this.spawnEnemy('mini_scout', enemy.laneIndex, Math.max(0, enemy.distanceTraveled - 0.32), -0.32);
        this.spawnEnemy('mini_scout', enemy.laneIndex, enemy.distanceTraveled + 0.32, 0.32);
      }

      if (enemy.isBoss) {
        this.vfx.setBossTelegraphZone(false);
        const isFinalCampaignWave =
          !this.isEndlessMode() && this.waveIndex === this.currentStage.waves.length - 1;
        const anyOtherBossAlive = this.enemies.some(
          (other) => other.id !== enemy.id && other.isBoss && !other.dead && other.hp > 0
        );
        const anyOtherBossPending = this.pendingSpawns.some(
          (p) => !p.spawned && this.isBossEnemyType(p.enemyType)
        );

        if (isFinalCampaignWave && !anyOtherBossAlive && !anyOtherBossPending) {
          // Award final-wave clear bonuses and immediately clear stragglers so zero corpses freeze mid-air!
          const finalWaveCfg = this.getActiveWaveConfig();
          if (finalWaveCfg) {
            this.gold += finalWaveCfg.clearGoldBonus;
            this.crystals += finalWaveCfg.clearCrystalBonus;
            this.progression.addCrystals(finalWaveCfg.clearCrystalBonus);
            this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.WAVE_CLEAR_BONUS, true);
            this.progression.recordWaveReached(this.currentStageId, finalWaveCfg.waveNumber);
          }
          for (const p of this.pendingSpawns) {
            p.spawned = true;
          }

          // STAGE 4B + STAGE 5A: Final Campaign Boss Defeat Climax -> Return Beacon Awakening!
          this.waveInProgress = false;
          this.armedSkillId = null;
          this.pendingOrbitalStrikes = [];
          this.pendingRocketSalvos = [];
          this.plasmaZones = [];
          this.vfx.setTacticalReticle(false);
          for (let k = this.enemies.length - 1; k >= 0; k--) {
            const other = this.enemies[k];
            if (other.id !== enemy.id) {
              if (!other.dead) {
                this.vfx.spawnLunarDustRing(other.worldPos, 6, 0.75);
              }
              disposeObject3DTree(other.rig.root);
              this.enemies.splice(k, 1);
            }
          }
          this.mode = 'victory_cinematic';
          this.selectedPadId = null;
          this.syncSelectionRings();
          this.emitSnapshot();

          this.cinematics.playBossDefeatAndBeaconVictory(
            enemy,
            () => {
              disposeObject3DTree(enemy.rig.root);
              const idx = this.enemies.indexOf(enemy);
              if (idx >= 0) this.enemies.splice(idx, 1);
            },
            () => {
              this.mode = 'victory_panel';
              this.emitSnapshot();
            }
          );
          return;
        }

        // Mid-stage Sub-Boss (Stage 4 Wave 8) or Endless Rotating Boss!
        this.cinematics.playEliteKillClimax(enemy.worldPos);
        this.audio.playClimaxKillBurst(true);
        const bossLootGoal = this.env.beacon.group.position.clone().add(new THREE.Vector3(0, 2.4, 0));
        this.vfx.spawn3DLoot(
          enemy.worldPos,
          8,
          Math.min(8, Math.max(3, enemy.crystalReward)),
          bossLootGoal,
          (isCrystal) => this.audio.playLootChime(isCrystal)
        );
        enemy.dyingTimer = 0.38;
        this.emitSnapshot();
        return;
      }

      const lootGoal = enemy.worldPos.clone().add(new THREE.Vector3(0, 3.8, -1.2));
      if (enemy.isElite) {
        this.cinematics.playEliteKillClimax(enemy.worldPos);
        this.vfx.spawn3DLoot(enemy.worldPos, 5, enemy.crystalReward, lootGoal, (isCrystal) =>
          this.audio.playLootChime(isCrystal)
        );
      } else {
        this.vfx.spawn3DLoot(enemy.worldPos, 1, 0, lootGoal, () => this.audio.playLootChime(false));
      }

      enemy.dyingTimer = 0.34;
      this.emitSnapshot();
    }
  }

  private checkWaveCompletion(): void {
    if (!this.waveInProgress || this.mode !== 'playing') return;
    const allSpawned = this.pendingSpawns.every((p) => p.spawned);
    if (!allSpawned) return;

    const anyAlive = this.enemies.some((e) => !e.dead && e.hp > 0);
    if (anyAlive) return;

    // Wave Cleared!
    const cfg = this.getActiveWaveConfig();
    if (!cfg) return;

    this.waveInProgress = false;
    this.gold += cfg.clearGoldBonus;
    this.crystals += cfg.clearCrystalBonus;
    this.progression.addCrystals(cfg.clearCrystalBonus);
    this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.WAVE_CLEAR_BONUS, true);

    const techMods = this.progression.getComputedTechModifiers();
    if (techMods.waveHealBeaconHp > 0 && this.beaconHp < this.maxBeaconHp) {
      this.beaconHp = Math.min(this.maxBeaconHp, this.beaconHp + techMods.waveHealBeaconHp);
    }

    const beaconPos = this.env.beacon.group.position;
    this.vfx.spawn3DLoot(
      beaconPos,
      3,
      cfg.clearCrystalBonus,
      beaconPos.clone().add(new THREE.Vector3(0, 3.8, 0)),
      (isCrystal) => this.audio.playLootChime(isCrystal)
    );

    if (this.isEndlessMode() || this.waveIndex < this.currentStage.waves.length - 1) {
      this.progression.recordWaveReached(this.currentStageId, cfg.waveNumber);
      this.waveIndex++;
      if (this.isEndlessMode()) {
        this.endlessActiveWaveConfig = generateEndlessWave(
          this.waveIndex + 1,
          this.compiledLanes.length
        );
      }
      this.callbacks.onBanner(
        `第 ${cfg.waveNumber} 波击退！`,
        `获得波次补给 +${cfg.clearGoldBonus} 金币 · +${cfg.clearCrystalBonus} 能源晶体`,
        '#2ECC71'
      );
      window.clearTimeout(this.bannerHideTimer);
      this.bannerHideTimer = window.setTimeout(() => {
        if (this.mode === 'playing' && !this.waveInProgress) this.callbacks.onHideBanner();
      }, 2100);
    } else {
      // Fallback if final wave finished via non-boss last unit: ensure skyBeam & supplyChest are visible!
      this.env.beacon.skyBeam.visible = true;
      (this.env.beacon.skyBeam.material as THREE.MeshBasicMaterial).opacity = 0.58;
      this.env.supplyChest.group.position.set(
        this.currentStage.supplyChestPos.x,
        this.currentStage.supplyChestPos.y,
        this.currentStage.supplyChestPos.z
      );
      this.env.supplyChest.group.scale.set(1, 1, 1);
      this.env.supplyChest.group.visible = true;
      this.mode = 'victory_panel';
    }

    this.emitSnapshot();
  }

  private findValidTarget(
    enemyId: string | null,
    origin: THREE.Vector3,
    range: number
  ): EnemyInstance | null {
    if (!enemyId) return null;
    const e = this.enemies.find((item) => item.id === enemyId);
    if (!e || e.dead || e.hp <= 0) return null;
    const d = Math.hypot(e.worldPos.x - origin.x, e.worldPos.z - origin.z);
    return d <= range + (e.isBoss ? 0.65 : 0.15) ? e : null;
  }

  private acquireBestTarget(origin: THREE.Vector3, range: number): EnemyInstance | null {
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
  }

  private hasLivingEnemyInRange(origin: THREE.Vector3, range: number): boolean {
    return this.enemies.some(
      (e) =>
        !e.dead &&
        e.hp > 0 &&
        Math.hypot(e.worldPos.x - origin.x, e.worldPos.z - origin.z) <= range + (e.isBoss ? 0.65 : 0.15)
    );
  }

  // ==================== GHOST PREVIEW, RANGE RINGS & POINTER INPUT ====================

  private showGhostPreview(padId: string, type: TowerType): void {
    this.clearGhostPreview();
    const padVis = this.env.pads.get(padId);
    if (!padVis) return;
    const pad = padVis.config;
    const ghost = createGhostTowerPreview(type);
    ghost.position.set(pad.x, (pad.y ?? 0) + 0.14, pad.z);
    this.ghostGroup.add(ghost);
    this.currentGhostType = type;
  }

  private clearGhostPreview(): void {
    while (this.ghostGroup.children.length > 0) {
      disposeObject3DTree(this.ghostGroup.children[0]);
    }
    this.currentGhostType = null;
  }

  private syncSelectionRings(): void {
    if (!this.selectedPadId || this.mode === 'legendary_reveal') {
      this.env.selectRing.visible = false;
      this.env.rangeRing.visible = false;
      return;
    }

    const padVis = this.env.pads.get(this.selectedPadId);
    if (!padVis) return;
    const pad = padVis.config;
    const isHG = pad.padType === 'high_ground';
    const baseY = pad.y ?? 0;

    this.env.selectRing.position.set(pad.x, baseY + 0.17, pad.z);
    this.env.selectRing.visible = true;

    const existing = this.towers.get(pad.id);
    if (existing) {
      const stats = this.computeTowerStatsForTier(
        existing.type,
        existing.tier,
        isHG,
        existing.branch ?? 'A'
      );
      this.env.rangeRing.position.set(pad.x, 0.11, pad.z);
      this.env.rangeRing.scale.setScalar(stats.range);
      (this.env.rangeRing.material as THREE.MeshBasicMaterial).color.setHex(
        TIER_META[existing.tier].color
      );
      this.env.rangeRing.visible = true;
    } else if (this.previewTowerType) {
      const stats = this.computeTowerStatsForTier(this.previewTowerType, 1, isHG);
      this.env.rangeRing.position.set(pad.x, 0.11, pad.z);
      this.env.rangeRing.scale.setScalar(stats.range);
      (this.env.rangeRing.material as THREE.MeshBasicMaterial).color.setHex(
        TOWER_BLUEPRINTS[this.previewTowerType].weaponColor
      );
      this.env.rangeRing.visible = true;
    } else {
      this.env.rangeRing.visible = false;
    }
  }

  private raycastGroundArena(clientX: number, clientY: number, out: THREE.Vector3): boolean {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, this.camera);
    if (!this.intersectHorizontalPlane(0.12, out)) return false;
    out.x = THREE.MathUtils.clamp(out.x, -14.5, 14.5);
    out.z = THREE.MathUtils.clamp(out.z, -9.5, 9.5);
    return true;
  }

  private bindPointerInput(): void {
    let downX = 0;
    let downY = 0;
    let pointerIsDown = false;
    const aimHit = new THREE.Vector3();

    const onPointerDown = (ev: PointerEvent): void => {
      if (ev.pointerType === 'mouse' && ev.button === 2) {
        if (this.armedSkillId !== null) {
          this.cancelSkillTargeting();
        }
        return;
      }
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      downX = ev.clientX;
      downY = ev.clientY;
      pointerIsDown = true;
      if (this.armedSkillId === 'orbital_strike' && this.raycastGroundArena(ev.clientX, ev.clientY, aimHit)) {
        this.vfx.setTacticalReticle(true, aimHit.x, aimHit.z, COMMANDER_SKILLS.orbital_strike.radius);
      }
    };

    const onPointerMove = (ev: PointerEvent): void => {
      if (this.armedSkillId !== 'orbital_strike') return;
      if (ev.pointerType === 'touch' && !pointerIsDown) return;
      if (this.raycastGroundArena(ev.clientX, ev.clientY, aimHit)) {
        this.vfx.setTacticalReticle(true, aimHit.x, aimHit.z, COMMANDER_SKILLS.orbital_strike.radius);
      }
    };

    const onPointerUp = (ev: PointerEvent): void => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      const wasDown = pointerIsDown;
      pointerIsDown = false;
      if (this.armedSkillId === 'orbital_strike') {
        if (!wasDown) return;
        if (this.raycastGroundArena(ev.clientX, ev.clientY, aimHit)) {
          this.confirmOrbitalStrikeAt(aimHit.x, aimHit.z);
        }
        return;
      }
      if (!wasDown) return;
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 14) return;
      this.handleCanvasTap(ev.clientX, ev.clientY);
    };

    const onPointerCancel = (): void => {
      pointerIsDown = false;
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('pointercancel', onPointerCancel);
    this.cleanupPointerListeners = () => {
      this.canvas.removeEventListener('pointerdown', onPointerDown);
      this.canvas.removeEventListener('pointermove', onPointerMove);
      this.canvas.removeEventListener('pointerup', onPointerUp);
      this.canvas.removeEventListener('pointercancel', onPointerCancel);
    };
  }

  private scratchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private scratchHit = new THREE.Vector3();

  private intersectHorizontalPlane(y: number, out: THREE.Vector3): boolean {
    this.scratchPlane.constant = -y;
    return this.raycaster.ray.intersectPlane(this.scratchPlane, out) !== null;
  }

  private getMechanismHitElevation(type: 'crystal_vein' | 'capacitor_pylon' | 'laser_gate'): number {
    return type === 'crystal_vein' ? 0.45 : type === 'capacitor_pylon' ? 0.65 : 0.85;
  }

  private handleCanvasTap(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, this.camera);

    // 1. Allow tapping the 3D Victory Supply Chest directly on the Beacon Plaza!
    if (this.mode === 'victory_panel' && !this.rewardClaimed) {
      const chestPos = this.env.supplyChest.group.position;
      if (
        this.intersectHorizontalPlane(chestPos.y + 0.35, this.scratchHit) &&
        Math.hypot(this.scratchHit.x - chestPos.x, this.scratchHit.z - chestPos.z) <= 2.05
      ) {
        this.claimVictoryRewards();
        return;
      }
    }

    // 2. Check 3D Build Pads first using exact pad elevation plane (y = (pad.y ?? 0) + 0.15)!
    let closestPad: string | null = null;
    let bestPadDist = 1.48;
    for (const pad of this.currentStage.buildPads) {
      const planeY = (pad.y ?? 0) + 0.15;
      if (this.intersectHorizontalPlane(planeY, this.scratchHit)) {
        const d = Math.hypot(this.scratchHit.x - pad.x, this.scratchHit.z - pad.z);
        if (d <= bestPadDist) {
          bestPadDist = d;
          closestPad = pad.id;
        }
      }
    }

    if (closestPad) {
      this.selectPadOrTower(closestPad);
      return;
    }

    // 3. Check Interactive 3D Map Mechanisms (Crystal Veins, Capacitor Pylons, Laser Gates)!
    let closestMechId: string | null = null;
    let bestMechDist = Infinity;
    for (const mech of this.env.mechanisms.values()) {
      const mechY = this.getMechanismHitElevation(mech.config.type);
      const hitRadius = mech.config.type === 'laser_gate' ? 1.85 : 1.62;
      if (this.intersectHorizontalPlane(mechY, this.scratchHit)) {
        const d = Math.hypot(this.scratchHit.x - mech.config.x, this.scratchHit.z - mech.config.z);
        if (d <= hitRadius && d < bestMechDist) {
          bestMechDist = d;
          closestMechId = mech.config.id;
        }
      }
    }

    if (closestMechId) {
      const mech = this.env.mechanisms.get(closestMechId);
      if (mech && mech.cooldownRemaining <= 0 && mech.activeRemaining <= 0) {
        this.activateMechanism(closestMechId);
        return;
      }
    }

    this.selectPadOrTower(null);
  }

  // ==================== UI SNAPSHOT & AUTOMATED TEST HOOKS ====================

  public getSnapshot(): UISnapshot {
    let selectedTower: UISnapshot['selectedTower'] = null;
    let selectedTowerBranchOptions: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null = null;
    let selectedPadLabel: string | null = null;
    let selectedPadIsHighGround = false;

    if (this.selectedPadId) {
      const padVis = this.env.pads.get(this.selectedPadId);
      if (padVis) {
        selectedPadLabel = padVis.config.label;
        selectedPadIsHighGround = padVis.config.padType === 'high_ground';
      }

      const tw = this.towers.get(this.selectedPadId);
      if (tw) {
        const bp = TOWER_BLUEPRINTS[tw.type];
        const isHG = Boolean(tw.isHighGround);
        const activeBr = tw.branch ?? 'A';
        const curr = this.computeTowerStatsForTier(tw.type, tw.tier, isHG, activeBr);
        const currMeta = TIER_META[tw.tier];
        const canUpgrade = tw.tier < 4;
        const nextTier = canUpgrade ? ((tw.tier + 1) as TowerTier) : null;
        const nextStats = nextTier
          ? this.computeTowerStatsForTier(tw.type, nextTier, isHG, 'A')
          : null;
        const nextMeta = nextTier ? TIER_META[nextTier] : null;

        let nextSpecialDelta: string | null = null;
        if (nextStats) {
          if (tw.type === 'mortar') {
            nextSpecialDelta = `爆炸半径 ${curr.splashRadius.toFixed(1)}m → ${nextStats.splashRadius.toFixed(1)}m`;
          } else if (tw.type === 'magnetic') {
            nextSpecialDelta = `减速 ${Math.round(curr.slowRatio * 100)}% → ${Math.round(nextStats.slowRatio * 100)}%`;
          } else {
            nextSpecialDelta = `破甲穿透 ${Math.round(curr.armorPierce * 100)}% → ${Math.round(nextStats.armorPierce * 100)}%`;
          }
        }

        if (tw.tier === 3) {
          const stA = this.computeTowerStatsForTier(tw.type, 4, isHG, 'A');
          const stB = this.computeTowerStatsForTier(tw.type, 4, isHG, 'B');
          const brA = bp.branches.A;
          const brB = bp.branches.B;
          selectedTowerBranchOptions = [
            {
              branch: 'A',
              name: brA.name,
              shortTitle: brA.shortTitle,
              mechanicTag: brA.mechanicTag,
              cost: stA.cost,
              affordable: this.gold >= stA.cost,
              damage: stA.damage,
              fireInterval: stA.fireInterval,
              range: stA.range,
              partHeadline: brA.partHeadline,
            },
            {
              branch: 'B',
              name: brB.name,
              shortTitle: brB.shortTitle,
              mechanicTag: brB.mechanicTag,
              cost: stB.cost,
              affordable: this.gold >= stB.cost,
              damage: stB.damage,
              fireInterval: stB.fireInterval,
              range: stB.range,
              partHeadline: brB.partHeadline,
            },
          ];
        }

        const t4BranchCfg = tw.tier === 4 ? bp.branches[activeBr] : null;

        selectedTower = {
          id: tw.id,
          padId: tw.padId,
          type: tw.type,
          name: t4BranchCfg ? t4BranchCfg.name : bp.name,
          tier: tw.tier,
          tierName: currMeta.name,
          tierHex: currMeta.hex,
          isHighGround: isHG,
          branch: tw.branch ?? null,
          damage: curr.damage,
          fireInterval: curr.fireInterval,
          range: curr.range,
          splashRadius: curr.splashRadius,
          slowRatio: curr.slowRatio,
          slowDuration: curr.slowDuration,
          sellRefund: Math.round(tw.totalInvestedGold * GAME_CONSTANTS.SELL_REFUND_RATIO),
          canUpgrade,
          upgradeCost: nextStats ? nextStats.cost : null,
          nextTierName: nextMeta ? nextMeta.name : null,
          nextTierHex: nextMeta ? nextMeta.hex : null,
          nextDamage: nextStats ? nextStats.damage : null,
          nextFireInterval: nextStats ? nextStats.fireInterval : null,
          nextRange: nextStats ? nextStats.range : null,
          nextSpecialDelta,
          partHeadline: nextStats ? nextStats.partHeadline : curr.partHeadline,
          isStunned: tw.stunTimer > 0,
          branchName: t4BranchCfg ? t4BranchCfg.name : null,
          mechanicTag: t4BranchCfg ? t4BranchCfg.mechanicTag : null,
          overdriven: (tw.overdriveTimer ?? 0) > 0,
          auraBoosted: (tw.auraHasteBonus ?? 0) > 0,
          t4BranchOptions: selectedTowerBranchOptions,
        };
      }
    }

    const activeBoss = this.enemies.find((e) => e.isBoss && !e.dead && e.hp > 0) ?? null;
    const stars = ProgressionManager.computeStars(this.beaconHp, this.maxBeaconHp);

    const stageIdx = STAGE_ORDER.indexOf(this.currentStageId);
    const nextStageId =
      stageIdx >= 0 && stageIdx + 1 < STAGE_ORDER.length ? STAGE_ORDER[stageIdx + 1] : null;
    const nextStageName = nextStageId ? STAGE_CONFIGS[nextStageId].name : null;

    const mechanisms: MapMechanismSnapshot[] = [];
    for (const m of this.env.mechanisms.values()) {
      mechanisms.push({
        id: m.config.id,
        type: m.config.type,
        label: m.config.label,
        ready: m.cooldownRemaining <= 0 && m.activeRemaining <= 0,
        active: m.activeRemaining > 0,
        cooldownRemaining: Number(m.cooldownRemaining.toFixed(1)),
        cooldownTotal: m.cooldownTotal,
        activeRemaining: Number(m.activeRemaining.toFixed(1)),
      });
    }

    const skills: CommanderSkillSnapshot[] = COMMANDER_SKILL_ORDER.map((sid) => {
      const cfg = COMMANDER_SKILLS[sid];
      const cdRem = Number(this.skillCooldowns[sid].toFixed(1));
      return {
        id: sid,
        hotkey: cfg.hotkey,
        name: cfg.name,
        shortName: cfg.shortName,
        accentHex: cfg.accentHex,
        summary: cfg.summary,
        energyCost: cfg.energyCost,
        cooldownRemaining: cdRem,
        cooldownTotal: cfg.cooldownSec,
        ready: cdRem <= 0 && this.tacticalEnergy >= cfg.energyCost,
        activeTargeting: this.armedSkillId === sid,
      };
    });

    const totalWaves = this.isEndlessMode() ? 0 : this.currentStage.waves.length;
    const waveNumber = this.isEndlessMode()
      ? this.waveIndex + 1
      : Math.min(totalWaves, this.waveIndex + 1);

    return {
      mode: this.mode,
      stageId: this.currentStageId,
      stageCode: this.currentStage.codeName,
      stageName: this.currentStage.name,
      isEndless: this.isEndlessMode(),
      bestEndlessWave: this.progression.getBestEndlessWave(),
      nextStageId,
      nextStageName,
      beaconHp: this.beaconHp,
      maxBeaconHp: this.maxBeaconHp,
      gold: this.gold,
      crystals: this.crystals,
      persistentCrystals: this.progression.getTotalCrystals(),
      hasHubAlert: this.progression.hasHubAlert(),
      waveNumber,
      totalWaves,
      waveInProgress: this.waveInProgress,
      kills: this.kills,
      speedMultiplier: this.speedMultiplier,
      muted: this.audio.isMuted(),
      onboardingStep: this.onboardingStep,
      selectedPadId: this.selectedPadId,
      selectedPadLabel,
      selectedPadIsHighGround,
      previewTowerType: this.previewTowerType,
      mechanisms,
      tacticalEnergy: Number(this.tacticalEnergy.toFixed(1)),
      maxTacticalEnergy: this.maxTacticalEnergy,
      armedSkillId: this.armedSkillId,
      skills,
      activeComboCount: this.activeComboCount,
      selectedTowerBranchOptions,
      progression: this.progression.getSnapshot(),
      selectedTower,
      bossStatus: activeBoss
        ? {
            name: activeBoss.name,
            hp: activeBoss.hp,
            maxHp: activeBoss.maxHp,
            telegraphing: activeBoss.skillTelegraphTimer > 0,
          }
        : null,
      rewardSummary: {
        stars,
        bonusGold: this.currentStage.victoryBonusGold,
        bonusCrystals: this.currentStage.victoryBonusCrystals,
        firstClearBonusCrystals: this.lastFirstClearBonus,
        starBonusCrystals: this.lastStarBonus,
        claimed: this.rewardClaimed,
        totalCommendations: this.progression.getTotalCommendations(),
      },
    };
  }

  private emitSnapshot(): void {
    this.callbacks.onStateChange(this.getSnapshot());
  }

  public getPadScreenCoordinates(padId: string): { x: number; y: number } | null {
    const padVis = this.env.pads.get(padId);
    if (!padVis) return null;
    const p = padVis.config;
    return this.projectWorldToScreen(new THREE.Vector3(p.x, (p.y ?? 0) + 0.15, p.z));
  }

  public getMechanismScreenCoordinates(mechId: string): { x: number; y: number } | null {
    const mech = this.env.mechanisms.get(mechId);
    if (!mech) return null;
    const y = this.getMechanismHitElevation(mech.config.type);
    return this.projectWorldToScreen(new THREE.Vector3(mech.config.x, y, mech.config.z));
  }

  public getBeaconScreenCoordinates(): { x: number; y: number } {
    return this.projectWorldToScreen(this.env.beacon.group.position.clone().setY(1.2));
  }

  public getEntranceScreenCoordinates(index = 0): { x: number; y: number } {
    const ent = this.env.entrances[index] ?? this.env.entrance;
    return this.projectWorldToScreen(ent.group.position.clone().setY(1.2));
  }

  public projectWorldToScreen(worldPt: THREE.Vector3): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const p = worldPt.clone().project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + ((p.x + 1) * 0.5) * rect.width,
      y: rect.top + ((-p.y + 1) * 0.5) * rect.height,
    };
  }

  /**
   * Deterministic simulation stepper for automated E2E verification.
   */
  public debugStepSimulation(seconds: number, renderFinal = true): void {
    const step = 0.05;
    const count = Math.max(1, Math.ceil(seconds / step));
    for (let i = 0; i < count; i++) {
      this.stepFrame(step, false);
    }
    if (renderFinal) {
      this.composer.render(this.solidScene, this.vfxScene, this.camera);
    }
    this.emitSnapshot();
  }

  public debugAddGold(amount: number): void {
    this.gold += amount;
    this.emitSnapshot();
  }

  public get ghostPreviewActive(): boolean {
    return this.currentGhostType !== null && this.ghostGroup.children.length > 0;
  }
}
