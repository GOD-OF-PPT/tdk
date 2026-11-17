import { STAGE_CONFIGS, STAGE_ORDER } from '../config/campaignConfig';
import { LeaderboardService, RANKING_CONFIG } from '../ranking/LeaderboardService';
import { promptPlayerName } from './PlayerNamePrompt';
import type { RankingEntry } from '../ranking/types';
import {
  ENEMY_BLUEPRINTS,
  ENEMY_CODEX_META,
  ENEMY_CODEX_ORDER,
  MECHANISM_CODEX_LIST,
  TOWER_BLUEPRINTS,
  TOWER_ORDER,
  TOWER_SYNERGY_CODEX,
} from '../config/gameConfig';
import type { GameEngine } from '../game/GameEngine';
import {
  ACHIEVEMENT_CONFIGS,
  APEX_MODULES,
  APEX_ORDER,
  MAX_CORE_TECH_LEVEL,
  TECH_MODULES,
  TECH_ORDER,
} from '../game/ProgressionManager';
import type {
  AchievementId,
  ApexTechId,
  CommanderSkillId,
  MechanismCodexEntry,
  ProgressionSnapshot,
  StageId,
  StatDeltaPopup,
  TechUpgradeId,
  TargetPriority,
  TowerType,
  UISnapshot,
} from '../types';

const PRIORITY_LABELS: Record<TargetPriority, string> = {
  first: '🎯最前',
  strongest: '🛡高血',
  weakest: '⚡残血',
  shielded: '💠破盾',
};

type CodexSubTab = 'towers' | 'enemies' | 'mechanisms' | 'badges';
type HubTab = 'campaign' | 'tech' | 'codex' | 'ranking';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function rankingNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 3 }) : '—';
}

function towerSvgIcon(type: TowerType): string {
  if (type === 'autocannon') {
    return `<svg viewBox="0 0 44 44" class="tower-card-svg" aria-hidden="true">
      <rect x="6" y="20" width="32" height="16" rx="5" fill="#F3EFE6" stroke="#1A1033" stroke-width="2.5"/>
      <rect x="12" y="8" width="6" height="15" rx="2" fill="#FF9F1C" stroke="#1A1033" stroke-width="2.2"/>
      <rect x="26" y="8" width="6" height="15" rx="2" fill="#FF9F1C" stroke="#1A1033" stroke-width="2.2"/>
      <rect x="11" y="25" width="22" height="6" rx="2" fill="#223458"/>
    </svg>`;
  }
  if (type === 'mortar') {
    return `<svg viewBox="0 0 44 44" class="tower-card-svg" aria-hidden="true">
      <rect x="8" y="26" width="28" height="11" rx="4" fill="#223458" stroke="#1A1033" stroke-width="2.5"/>
      <path d="M14 27 L19 9 L31 12 L26 29 Z" fill="#F3EFE6" stroke="#1A1033" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="14" cy="24" r="5" fill="#22D3EE" stroke="#1A1033" stroke-width="2"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 44 44" class="tower-card-svg" aria-hidden="true">
    <ellipse cx="22" cy="18" rx="14" ry="6" fill="none" stroke="#C084FC" stroke-width="3.5"/>
    <polygon points="22,9 28,18 22,27 16,18" fill="#E879F9" stroke="#1A1033" stroke-width="2.2"/>
    <rect x="12" y="29" width="20" height="8" rx="3" fill="#F3EFE6" stroke="#1A1033" stroke-width="2.5"/>
  </svg>`;
}

function commanderSkillSvgIcon(id: CommanderSkillId): string {
  if (id === 'orbital_strike') {
    return `<svg viewBox="0 0 24 24" class="skill-svg-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="#38BDF8" stroke-width="2.2"/>
      <line x1="12" y1="2" x2="12" y2="7" stroke="#E0F2FE" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="12" y1="17" x2="12" y2="22" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="2" y1="12" x2="7" y2="12" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="17" y1="12" x2="22" y2="12" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="2.4" fill="#FDE047"/>
    </svg>`;
  }
  if (id === 'emp_overdrive') {
    return `<svg viewBox="0 0 24 24" class="skill-svg-icon" aria-hidden="true">
      <polygon points="13,2 5,13 11,13 10,22 19,10 13,10" fill="#C084FC" stroke="#1A1033" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" class="skill-svg-icon" aria-hidden="true">
    <rect x="9" y="4" width="6" height="16" rx="1.8" fill="#34D399" stroke="#1A1033" stroke-width="1.8"/>
    <rect x="4" y="9" width="16" height="6" rx="1.8" fill="#34D399" stroke="#1A1033" stroke-width="1.8"/>
  </svg>`;
}

function mechanismSvgIcon(id: MechanismCodexEntry['id']): string {
  if (id === 'high_ground') {
    return `<svg viewBox="0 0 36 36" class="mech-codex-svg" aria-hidden="true">
      <polygon points="5,29 10,15 26,15 31,29" fill="#223458" stroke="#1A1033" stroke-width="2.2"/>
      <rect x="9" y="11" width="18" height="5" rx="2" fill="#F3EFE6" stroke="#1A1033" stroke-width="2"/>
      <polygon points="18,4 23,9 13,9" fill="#FBBF24" stroke="#1A1033" stroke-width="1.6"/>
    </svg>`;
  }
  if (id === 'crystal_vein') {
    return `<svg viewBox="0 0 36 36" class="mech-codex-svg" aria-hidden="true">
      <polygon points="18,5 25,15 21,29 15,29 11,15" fill="#22D3EE" stroke="#1A1033" stroke-width="2.2"/>
      <polygon points="9,14 14,19 12,29 7,26" fill="#67E8F9" stroke="#1A1033" stroke-width="1.8"/>
      <polygon points="27,15 29,26 24,29 22,19" fill="#06B6D4" stroke="#1A1033" stroke-width="1.8"/>
    </svg>`;
  }
  if (id === 'capacitor_pylon') {
    return `<svg viewBox="0 0 36 36" class="mech-codex-svg" aria-hidden="true">
      <rect x="13" y="13" width="10" height="17" rx="3" fill="#F3EFE6" stroke="#1A1033" stroke-width="2.2"/>
      <ellipse cx="18" cy="14" rx="9" ry="3.5" fill="none" stroke="#38BDF8" stroke-width="2.2"/>
      <circle cx="18" cy="8" r="4" fill="#38BDF8" stroke="#1A1033" stroke-width="2"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 36 36" class="mech-codex-svg" aria-hidden="true">
    <rect x="4" y="9" width="6" height="20" rx="2" fill="#F3EFE6" stroke="#1A1033" stroke-width="2"/>
    <rect x="26" y="9" width="6" height="20" rx="2" fill="#F3EFE6" stroke="#1A1033" stroke-width="2"/>
    <line x1="10" y1="15" x2="26" y2="15" stroke="#F43F5E" stroke-width="3"/>
    <line x1="10" y1="22" x2="26" y2="22" stroke="#FB7185" stroke-width="3"/>
  </svg>`;
}

function getAchievementProgressText(id: AchievementId, prog: ProgressionSnapshot): string {
  switch (id) {
    case 'ach_ch1_clear':
      return `${prog.stages.stage_01.cleared ? 1 : 0}/1`;
    case 'ach_flawless_3star': {
      const has3 = (['stage_01', 'stage_02', 'stage_03', 'stage_04'] as const).some(
        (s) => prog.stages[s].bestStars >= 3
      );
      return `${has3 ? 1 : 0}/1`;
    }
    case 'ach_dual_t4':
      return `${prog.counters.dualBranchCleared ? 1 : 0}/1`;
    case 'ach_synergy_25':
      return `${Math.min(25, prog.counters.synergyTriggers)}/25`;
    case 'ach_skill_12':
      return `${Math.min(12, prog.counters.skillsUsed)}/12`;
    case 'ach_mech_15':
      return `${Math.min(15, prog.counters.mechanismsUsed)}/15`;
    case 'ach_all_sectors': {
      const clearedCount = (['stage_01', 'stage_02', 'stage_03', 'stage_04'] as const).filter(
        (s) => prog.stages[s].cleared
      ).length;
      return `${clearedCount}/4`;
    }
    case 'ach_10_stars':
      return `${Math.min(10, prog.totalStars)}/10`;
    case 'ach_endless_15':
      return `W${Math.min(15, prog.bestEndlessWave)}/15`;
    case 'ach_overclock_10':
      return `+${Math.min(10, prog.counters.maxOverclockReached ?? 0)}/10`;
    case 'ach_endless_40':
      return `W${Math.min(40, prog.bestEndlessWave)}/40`;
    case 'ach_endless_70':
      return `W${Math.min(70, prog.bestEndlessWave)}/70`;
  }
}

const MUSIC_ON_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
const MUSIC_OFF_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>`;

const BGM_MODE_OPTIONS: ReadonlyArray<{ id: string; shortLabel: string }> = [
  { id: 'auto', shortLabel: '🤖 战况自适应' },
  { id: 'hub', shortLabel: '🛰 I. 轨道静默' },
  { id: 'prep', shortLabel: '📡 II. 信标校准' },
  { id: 'combat', shortLabel: '⚔ III. 钢铁防线' },
  { id: 'overdrive', shortLabel: '🔥 IV. 超载狂潮' },
  { id: 'boss', shortLabel: '☠ V. 主宰降临' },
  { id: 'victory', shortLabel: '🌟 VI. 返航星光' },
];

const VOLUME_ON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;
const VOLUME_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
const PAUSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>`;
const EXPAND_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

export class UIManager {
  private host: HTMLElement;
  private engine!: GameEngine;
  private leaderboard: LeaderboardService;

  // Persistent HUD Elements
  private btnOpenHub!: HTMLButtonElement;
  private elSectorName!: HTMLElement;
  private elHubAlertPip!: HTMLElement;
  private elBeaconHp!: HTMLElement;
  private elGold!: HTMLElement;
  private elGoldPill!: HTMLElement;
  private elCrystalPill!: HTMLElement;
  private elCrystals!: HTMLElement;
  private elWave!: HTMLElement;
  private elKills!: HTMLElement;
  private btnSpeed!: HTMLButtonElement;
  private btnBgm!: HTMLButtonElement;
  private btnMute!: HTMLButtonElement;
  private bgmPopoverHost!: HTMLElement;
  private bgmPopoverOpen = false;
  private lastBgmPopSig = '';
  private btnFullscreen!: HTMLButtonElement;
  private btnPause!: HTMLButtonElement;

  private bossBarBox!: HTMLElement;
  private targetingBox!: HTMLElement;
  private bannerBox!: HTMLElement;
  private stampBox!: HTMLElement;
  private toastBox!: HTMLElement;
  private comboFloatLayer!: HTMLElement;

  private bottomDock!: HTMLElement;
  private onboardingBox!: HTMLElement;
  private skillsSlotHost!: HTMLElement;
  private nextWaveWrap!: HTMLElement;
  private trayHost!: HTMLElement;
  private modalHost!: HTMLElement;
  private hubHost!: HTMLElement;

  private hubOpen = false;
  private hubTab: HubTab = 'campaign';
  private codexFilter: CodexSubTab = 'towers';
  private selectedHubStageId: StageId = 'stage_01';

  private skillsMountKey = '';
  private lastTraySig = '';
  private lastModalSig = '';
  private lastHubSig = '';
  private lastComboTagAt: Record<string, number> = {};
  private lastTowerStats: { id: string; tier: number; dmg: number; rate: number; rng: number } | null = null;
  private displayedGold = -1;
  private displayedCrystals = -1;
  private toastTimer = 0;
  private stampTimer = 0;

  constructor(host: HTMLElement, leaderboard: LeaderboardService) {
    this.host = host;
    this.leaderboard = leaderboard;
    this.buildStaticSkeleton();
    this.leaderboard.subscribe(() => {
      if (!this.engine || !this.hubOpen || this.hubTab !== 'ranking') return;
      const focused = document.activeElement as HTMLElement | null;
      const focusId = focused && this.hubHost.contains(focused) ? focused.id : '';
      this.lastHubSig = '';
      this.renderHubModal(this.engine.getSnapshot());
      if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    });
  }

  public bindEngine(engine: GameEngine): void {
    this.engine = engine;
    this.btnOpenHub.addEventListener('click', () => this.openHub('campaign'));
    this.elCrystalPill.addEventListener('click', () => this.openHub('tech'));
    this.btnSpeed.addEventListener('click', () => this.engine.toggleSpeed());
    this.btnBgm.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.engine.getAudio().playUiClick();
      this.bgmPopoverOpen = !this.bgmPopoverOpen;
      this.lastBgmPopSig = '';
      this.renderBgmPopover(this.engine.getSnapshot());
    });
    this.btnMute.addEventListener('click', () => this.engine.toggleMute());

    const unlockOnce = () => {
      this.engine.getAudio().unlock();
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });
    window.addEventListener('pointerdown', (ev) => {
      if (!this.bgmPopoverOpen) return;
      const target = ev.target as Node | null;
      if (target && (this.bgmPopoverHost.contains(target) || this.btnBgm.contains(target))) return;
      this.bgmPopoverOpen = false;
      this.lastBgmPopSig = '';
      this.bgmPopoverHost.innerHTML = '';
    });
    this.btnFullscreen.addEventListener('click', () => this.engine.toggleFullscreen());
    this.btnPause.addEventListener('click', () => this.engine.togglePause());

    window.addEventListener('keydown', this.handleGlobalKeyDown);
    window.addEventListener('contextmenu', this.handleGlobalContextMenu);

    this.updateSnapshot(this.engine.getSnapshot());
  }

  private handleGlobalKeyDown = (ev: KeyboardEvent): void => {
    if (!this.engine || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (ev.code === 'Space' && tag === 'BUTTON') return;

    if (ev.key === 'Escape') {
      if (this.bgmPopoverOpen) {
        this.bgmPopoverOpen = false;
        this.lastBgmPopSig = '';
        this.bgmPopoverHost.innerHTML = '';
        return;
      }
      if (this.hubOpen) {
        this.closeHub();
        return;
      }
      const snap = this.engine.getSnapshot();
      if (snap.armedSkillId) {
        this.engine.cancelSkillTargeting();
      } else if (snap.selectedPadId) {
        this.engine.selectPadOrTower(null);
      }
      return;
    }

    if (this.hubOpen) {
      if (['1', '2', '3', '4'].includes(ev.key)) {
        const nextTab = (['campaign', 'tech', 'codex', 'ranking'] as const)[Number(ev.key) - 1];
        if (this.hubTab !== nextTab) {
          this.engine.getAudio().playUiClick();
          this.hubTab = nextTab;
          this.lastHubSig = '';
          this.renderHubModal(this.engine.getSnapshot());
          if (nextTab === 'ranking') void this.leaderboard.refresh();
        }
      }
      return;
    }

    const k = ev.key.toLowerCase();
    if (k === '1' || k === 'q') {
      this.engine.activateCommanderSkill('orbital_strike');
    } else if (k === '2' || k === 'w') {
      this.engine.activateCommanderSkill('emp_overdrive');
    } else if (k === '3' || k === 'e') {
      this.engine.activateCommanderSkill('nano_repair');
    } else if (k === '4') {
      this.engine.activateArsenalBoost();
    } else if (k === '5') {
      this.engine.activateCrystalOvercharge();
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
    } else if (k === 'm') {
      this.engine.toggleBgm();
    } else if (k === 'h') {
      if (this.hubOpen) this.closeHub();
      else this.openHub('campaign');
    }
  };

  private handleGlobalContextMenu = (ev: MouseEvent): void => {
    if (!this.engine) return;
    const snap = this.engine.getSnapshot();
    if (snap.armedSkillId) {
      ev.preventDefault();
      this.engine.cancelSkillTargeting();
    }
  };

  public openHub(tab: HubTab = 'campaign'): void {
    this.engine.getAudio().playUiClick();
    this.hubOpen = true;
    this.hubTab = tab;
    this.selectedHubStageId = this.engine.getCurrentStageId();
    this.lastHubSig = '';
    this.engine.setOverlayPause(true);
    if (tab === 'ranking') void this.leaderboard.refresh();
  }

  public closeHub(): void {
    if (!this.hubOpen) return;
    this.engine.getAudio().playUiClick();
    this.hubOpen = false;
    this.lastHubSig = '';
    this.hubHost.innerHTML = '';
    this.engine.setOverlayPause(false);
  }

  private buildStaticSkeleton(): void {
    this.host.innerHTML = `
      <header class="hud-top-bar" id="hud-top-bar">
        <h1 class="sr-only">月海信标 · 星区中继战役 3D机甲塔防</h1>
        <div class="hud-stats-group">
          <button class="stat-plate sector-hub-pill" id="btn-open-hub" type="button" title="星区作战指挥台" aria-label="打开星区作战指挥台">
            <span class="sector-map-glyph" aria-hidden="true">🗺</span>
            <span class="sector-code-text" id="val-sector-name">CH.01 曙光检修站</span>
            <span class="hub-alert-pip" id="hub-alert-pip" hidden></span>
          </button>
          <div class="stat-plate beacon" id="pill-beacon" title="返航信标耐久">
            <span class="stat-dot beacon-dot"></span>
            <span class="stat-label">信标</span>
            <span class="stat-num" id="val-beacon">20/20</span>
          </div>
          <div class="stat-plate gold" id="pill-gold" title="工程金币">
            <span class="stat-dot gold-dot"></span>
            <span class="stat-label">金币</span>
            <span class="stat-num" id="val-gold">260</span>
          </div>
          <div class="stat-plate crystal clickable-pill" id="pill-crystal" title="星区晶体储备（裂变与工程改装共用，点击打开科技树）">
            <span class="stat-dot crystal-dot"></span>
            <span class="stat-label">晶体</span>
            <span class="stat-num" id="val-crystals">0</span>
          </div>
          <div class="stat-plate wave" id="pill-wave" title="当前波次">
            <span class="stat-label">波次</span>
            <span class="stat-num" id="val-wave">1/8</span>
          </div>
          <div class="stat-plate kills hide-xs" id="pill-kills" title="累计击毁失控机械">
            <span class="stat-label">击杀</span>
            <span class="stat-num" id="val-kills">0</span>
          </div>
        </div>

        <div class="hud-ctrl-group">
          <button class="enamel-icon-btn" id="btn-speed" type="button" aria-label="切换战斗倍速">1x</button>
          <button class="enamel-icon-btn bgm-active" id="btn-bgm" type="button" title="原声配乐混音台 [快捷键 M]" aria-label="原声配乐控制台">${MUSIC_ON_SVG}</button>
          <button class="enamel-icon-btn" id="btn-mute" type="button" aria-label="静音开关">${VOLUME_ON_SVG}</button>
          <button class="enamel-icon-btn hide-narrow" id="btn-fullscreen" type="button" title="展开/全屏视图" aria-label="展开或全屏">${EXPAND_SVG}</button>
          <button class="enamel-icon-btn" id="btn-pause" type="button" aria-label="暂停菜单">${PAUSE_SVG}</button>
        </div>
      </header>

      <div id="bgm-popover-slot" class="bgm-popover-slot"></div>
      <div id="combo-float-layer" class="combo-float-layer" aria-hidden="true"></div>

      <div class="hud-center-Overlay" id="hud-alerts">
        <div id="boss-bar-slot"></div>
        <div id="targeting-slot"></div>
        <div id="banner-slot"></div>
        <div id="stamp-slot"></div>
        <div id="toast-slot"></div>
      </div>

      <footer class="hud-bottom-dock" id="hud-bottom-dock">
        <div id="onboarding-slot"></div>
        <div class="hud-action-bar" id="hud-action-bar">
          <div id="skills-slot" class="skills-slot"></div>
          <div id="next-wave-slot" class="next-wave-slot"></div>
        </div>
        <div id="tray-slot" class="tray-slot"></div>
      </footer>

      <div id="modal-slot"></div>
      <div id="hub-slot" class="hub-slot"></div>
    `;

    this.btnOpenHub = this.host.querySelector('#btn-open-hub')!;
    this.elSectorName = this.host.querySelector('#val-sector-name')!;
    this.elHubAlertPip = this.host.querySelector('#hub-alert-pip')!;
    this.elBeaconHp = this.host.querySelector('#val-beacon')!;
    this.elGold = this.host.querySelector('#val-gold')!;
    this.elGoldPill = this.host.querySelector('#pill-gold')!;
    this.elCrystalPill = this.host.querySelector('#pill-crystal')!;
    this.elCrystals = this.host.querySelector('#val-crystals')!;
    this.elWave = this.host.querySelector('#val-wave')!;
    this.elKills = this.host.querySelector('#val-kills')!;

    this.btnSpeed = this.host.querySelector('#btn-speed')!;
    this.btnBgm = this.host.querySelector('#btn-bgm')!;
    this.btnMute = this.host.querySelector('#btn-mute')!;
    this.bgmPopoverHost = this.host.querySelector('#bgm-popover-slot')!;
    this.btnFullscreen = this.host.querySelector('#btn-fullscreen')!;
    this.btnPause = this.host.querySelector('#btn-pause')!;

    this.bossBarBox = this.host.querySelector('#boss-bar-slot')!;
    this.targetingBox = this.host.querySelector('#targeting-slot')!;
    this.bannerBox = this.host.querySelector('#banner-slot')!;
    this.stampBox = this.host.querySelector('#stamp-slot')!;
    this.toastBox = this.host.querySelector('#toast-slot')!;
    this.comboFloatLayer = this.host.querySelector('#combo-float-layer')!;

    this.bottomDock = this.host.querySelector('#hud-bottom-dock')!;
    this.onboardingBox = this.host.querySelector('#onboarding-slot')!;
    this.skillsSlotHost = this.host.querySelector('#skills-slot')!;
    this.nextWaveWrap = this.host.querySelector('#next-wave-slot')!;
    this.trayHost = this.host.querySelector('#tray-slot')!;
    this.modalHost = this.host.querySelector('#modal-slot')!;
    this.hubHost = this.host.querySelector('#hub-slot')!;
  }

  public showInsufficientGoldFeedback(missing: number): void {
    this.elGoldPill.classList.remove('shake-warn');
    void this.elGoldPill.offsetWidth;
    this.elGoldPill.classList.add('shake-warn');

    this.toastBox.innerHTML = `<div class="short-feedback-pill warn" id="insufficient-toast">金币不足 · 还差 ${missing}</div>`;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastBox.innerHTML = '';
    }, 1450);
  }

  public showInsufficientEnergyFeedback(missing: number): void {
    const energyEl = this.skillsSlotHost.querySelector('#tactical-energy-pill') as HTMLElement | null;
    if (energyEl) {
      energyEl.classList.remove('shake-warn');
      void energyEl.offsetWidth;
      energyEl.classList.add('shake-warn');
    }

    this.toastBox.innerHTML = `<div class="short-feedback-pill warn" id="insufficient-energy-toast">⚡ 战术能量不足 · 还差 ${missing}⚡</div>`;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastBox.innerHTML = '';
    }, 1450);
  }

  public showComboCallout(
    screenX: number,
    screenY: number,
    text: string,
    accentHex: string,
    comboCount: number
  ): void {
    const now = performance.now();
    const prevAt = this.lastComboTagAt[text] ?? -1000;
    if (now - prevAt < 280) return;
    this.lastComboTagAt[text] = now;

    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    while (this.comboFloatLayer.childElementCount >= 4) {
      this.comboFloatLayer.firstElementChild?.remove();
    }

    const relX = Math.max(54, Math.min(rect.width - 54, screenX - rect.left));
    const relY = Math.max(54, Math.min(rect.height - 108, screenY - rect.top));

    const chip = document.createElement('div');
    chip.className = 'combo-float-tag';
    chip.style.left = `${relX.toFixed(0)}px`;
    chip.style.top = `${relY.toFixed(0)}px`;
    chip.style.borderColor = accentHex;
    chip.style.color = accentHex;
    chip.textContent = comboCount > 1 ? `${text} ×${comboCount}` : text;
    while (this.comboFloatLayer.children.length >= 16) {
      this.comboFloatLayer.firstElementChild?.remove();
    }
    if (text.startsWith('-') || text.startsWith('💥-')) {
      chip.classList.add('dmg-num-tag');
    }
    this.comboFloatLayer.appendChild(chip);

    window.setTimeout(() => {
      chip.remove();
    }, 700);
  }

  /**
   * Character-by-character slam title + floating ▲+stat deltas on upgrade!
   */
  public showUpgradeStamp(
    titleChars: string,
    tierHex: string,
    deltas: StatDeltaPopup[],
    isLegendary: boolean
  ): void {
    const charsHtml = [...titleChars]
      .map(
        (ch, idx) =>
          `<span class="stamp-char" style="animation-delay:${idx * 58}ms; color:${tierHex}">${ch}</span>`
      )
      .join('');

    const deltasHtml = deltas
      .map(
        (d, idx) =>
          `<span class="delta-chip" style="animation-delay:${160 + idx * 70}ms">${d.label} ${d.deltaText}</span>`
      )
      .join('');

    this.stampBox.innerHTML = `
      <div class="upgrade-stamp-wrap ${isLegendary ? 'legendary' : ''}" id="upgrade-stamp">
        <div class="stamp-title-row">${charsHtml}</div>
        <div class="stamp-deltas-row">${deltasHtml}</div>
      </div>
    `;

    window.clearTimeout(this.stampTimer);
    this.stampTimer = window.setTimeout(
      () => {
        this.stampBox.innerHTML = '';
      },
      isLegendary ? 2600 : 1550
    );
  }

  public showBanner(title: string, subtitle: string, accentHex: string): void {
    this.bannerBox.innerHTML = `
      <div class="wave-banner-card" style="border-left-color:${accentHex}">
        <div class="wave-banner-title" style="color:${accentHex}">${title}</div>
        <div class="wave-banner-sub">${subtitle}</div>
      </div>
    `;
  }

  public hideBanner(): void {
    this.bannerBox.innerHTML = '';
  }

  private rollNumber(el: HTMLElement, fromVal: number, toVal: number, suffix = ''): void {
    if (fromVal === toVal) {
      el.textContent = `${toVal}${suffix}`;
      return;
    }
    const start = performance.now();
    const dur = 320;
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / dur);
      const cur = Math.round(fromVal + (toVal - fromVal) * (1 - Math.pow(1 - u, 3)));
      el.textContent = `${cur}${suffix}`;
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  public updateSnapshot(snap: UISnapshot): void {
    // 1. Top HUD Numbers (smooth roll on reward/upgrade changes!)
    this.elSectorName.textContent = `${snap.stageCode} ${snap.stageName}`;
    this.elHubAlertPip.hidden = !snap.hasHubAlert;

    this.elBeaconHp.textContent = `${snap.beaconHp}/${snap.maxBeaconHp}`;
    this.elBeaconHp.style.color = snap.beaconHp <= 6 ? '#FF5A67' : '';

    if (this.displayedGold < 0) {
      this.displayedGold = snap.gold;
      this.elGold.textContent = String(snap.gold);
    } else if (this.displayedGold !== snap.gold) {
      this.rollNumber(this.elGold, this.displayedGold, snap.gold);
      this.displayedGold = snap.gold;
    }

    const crystalBank = snap.persistentCrystals;
    if (this.displayedCrystals !== crystalBank) {
      this.elCrystals.textContent = String(crystalBank);
      this.displayedCrystals = crystalBank;
    }

    this.elWave.textContent = snap.isEndless
      ? `W${snap.waveNumber}·∞`
      : `${snap.waveNumber}/${snap.totalWaves}`;
    this.elKills.textContent = String(snap.kills);

    this.btnSpeed.textContent = `${snap.speedMultiplier}x`;
    this.btnSpeed.classList.toggle('active-toggle', snap.speedMultiplier === 2);
    const bgmOn = (snap.bgmEnabled ?? true) && !snap.muted;
    this.btnBgm.innerHTML = bgmOn ? MUSIC_ON_SVG : MUSIC_OFF_SVG;
    this.btnBgm.classList.toggle('bgm-active', bgmOn);
    this.btnBgm.classList.toggle('muted-toggle', !bgmOn);
    this.btnBgm.title = `星区配乐台：${snap.bgmTrackLabel ?? '自适应配乐'} [点击展开混音台 / M键开关]`;
    this.btnMute.innerHTML = snap.muted ? VOLUME_OFF_SVG : VOLUME_ON_SVG;
    this.btnMute.classList.toggle('muted-toggle', snap.muted);
    this.renderBgmPopover(snap);

    this.bottomDock.classList.toggle(
      'has-active-tray',
      snap.mode === 'playing' && snap.selectedPadId !== null
    );

    // 2. Boss Top Health Bar (whenever an active Boss is on field)
    if (snap.bossStatus) {
      const pct = Math.max(0, Math.min(100, (snap.bossStatus.hp / snap.bossStatus.maxHp) * 100));
      this.bossBarBox.innerHTML = `
        <div class="boss-hud-card" id="boss-hud-bar">
          <div class="boss-hud-top">
            <span>${snap.bossStatus.name}</span>
            <span>${snap.bossStatus.hp} / ${snap.bossStatus.maxHp}</span>
          </div>
          <div class="boss-hp-track">
            <div class="boss-hp-fill" style="width:${pct.toFixed(1)}%"></div>
          </div>
          ${
            snap.bossStatus.telegraphing
              ? `<div class="boss-skill-warn">⚠ 首领高能蓄力中 · 注意地面震击预警圈！</div>`
              : ''
          }
        </div>
      `;
    } else if (this.bossBarBox.innerHTML !== '') {
      this.bossBarBox.innerHTML = '';
    }

    // 3. First-Play Compact Non-Blocking Onboarding Guide
    if (snap.mode === 'playing' && snap.onboardingStep !== 'done' && !snap.waveInProgress && !snap.armedSkillId) {
      const s1 = snap.onboardingStep === 'select_pad' ? 'active' : 'done';
      const s2 = snap.onboardingStep === 'build_tower' ? 'active' : snap.onboardingStep === 'start_wave' ? 'done' : '';
      const s3 = snap.onboardingStep === 'start_wave' ? 'active' : '';
      this.onboardingBox.innerHTML = `
        <div class="onboarding-strip" id="onboarding-guide">
          <span class="ob-step ${s1}">① 选择基座</span>
          <span class="ob-arrow">›</span>
          <span class="ob-step ${s2}">② 建造防御塔</span>
          <span class="ob-arrow">›</span>
          <span class="ob-step ${s3}">③ 开始防守</span>
        </div>
      `;
    } else if (this.onboardingBox.innerHTML !== '') {
      this.onboardingBox.innerHTML = '';
    }

    // 3B. Armed Tactical Skill Targeting Banner (#skill-targeting-banner)
    if (snap.mode === 'playing' && snap.armedSkillId !== null) {
      if (this.targetingBox.dataset.armed !== snap.armedSkillId) {
        this.targetingBox.dataset.armed = snap.armedSkillId;
        this.targetingBox.innerHTML = `
          <div class="skill-targeting-banner" id="skill-targeting-banner">
            <span>🎯 点击或拖拽地面锁定【轨道离子轰炸】落点</span>
            <button class="aim-cancel-btn" id="btn-cancel-skill" type="button">取消 [Esc]</button>
          </div>
        `;
        this.targetingBox
          .querySelector('#btn-cancel-skill')!
          .addEventListener('click', () => this.engine.cancelSkillTargeting());
      }
    } else if (this.targetingBox.innerHTML !== '') {
      this.targetingBox.dataset.armed = '';
      this.targetingBox.innerHTML = '';
    }

    // 4. Commander Tactical Skills Dock & Energy Readout (in-place update without innerHTML replacement!)
    this.renderCommanderSkills(snap);

    // 5. Wave controls; keep the endless toggle reachable during combat and reveals.
    const showStartWave = snap.mode === 'playing' && !snap.waveInProgress;
    const showAutoBattle = snap.isEndless &&
      ['playing', 'paused', 'boss_intro', 'legendary_reveal'].includes(snap.mode);
    if (showStartWave || showAutoBattle) {
      const intelSummary = snap.nextWaveIntel?.summary ?? '';
      const nextBtnSig = `wave_${snap.stageId}_${snap.waveNumber}_${snap.isEndless ? 'inf' : snap.totalWaves}_${showStartWave}_${snap.autoBattleEnabled}_${intelSummary}`;
      if (this.nextWaveWrap.dataset.sig !== nextBtnSig) {
        const restoreAutoFocus = this.nextWaveWrap.querySelector('#btn-auto-battle') === document.activeElement;
        this.nextWaveWrap.dataset.sig = nextBtnSig;
        const label =
          snap.waveNumber === 1
            ? '▶ 开始防守 · 第 1 波'
            : snap.isEndless
              ? `▶ 开始下一波 (W${snap.waveNumber}·∞)`
              : `▶ 开始下一波 (${snap.waveNumber}/${snap.totalWaves})`;
        const intel = snap.nextWaveIntel;
        const intelTagsHtml = intel && intel.tags.length > 0
          ? intel.tags.map((tg) => `<em class="wave-intel-tag">${tg}</em>`).join('')
          : '';
        const intelHtml = showStartWave && intel
          ? `<div class="wave-intel-bar ${intel.hasBoss ? 'boss-warn' : ''}" id="wave-intel-bar" title="下一波来袭敌械情报（快捷键 Space 出击）"><span class="wave-intel-text">📡 下波：${intel.summary}</span>${intelTagsHtml}</div>`
          : '';
        this.nextWaveWrap.innerHTML = `
          <div class="next-wave-pack ${showAutoBattle ? 'endless-wave-controls' : ''}">
            ${intelHtml}
            ${showAutoBattle ? `
              <button class="enamel-cta-btn auto-battle-btn" id="btn-auto-battle" type="button"
                aria-pressed="${snap.autoBattleEnabled}"
                title="自动开始下一波；关闭后本波继续，结束后等待手动开始">
                自动战斗：${snap.autoBattleEnabled ? '开' : '关'}
              </button>
            ` : ''}
            ${showStartWave ? `
              <button class="enamel-cta-btn wave-start" id="btn-start-wave" type="button" title="快捷键 [Space] 开始波次">
                ${label}
              </button>
            ` : ''}
          </div>
        `;
        this.nextWaveWrap
          .querySelector('#btn-start-wave')
          ?.addEventListener('click', () => this.engine.startNextWave());
        this.nextWaveWrap
          .querySelector('#btn-auto-battle')
          ?.addEventListener('click', () => this.engine.toggleAutoBattle());
        if (restoreAutoFocus) {
          this.nextWaveWrap.querySelector<HTMLButtonElement>('#btn-auto-battle')?.focus({ preventScroll: true });
        }
      }
    } else if (this.nextWaveWrap.innerHTML !== '') {
      this.nextWaveWrap.dataset.sig = '';
      this.nextWaveWrap.innerHTML = '';
    }

    // 6. Bottom Build Tray or Tower Inspector Panel
    this.renderBottomTray(snap);

    // 7. Modals (Pause, Defeat, Victory Settlement & Reward Claim)
    this.renderModals(snap);

    // 8. Sector Command Hub Overlay
    this.renderHubModal(snap);
  }

  private renderCommanderSkills(snap: UISnapshot): void {
    if (snap.mode !== 'playing' || snap.skills.length === 0) {
      if (this.skillsMountKey !== '') {
        this.skillsMountKey = '';
        this.skillsSlotHost.innerHTML = '';
      }
      return;
    }

    const showSupply = snap.onboardingStep === 'done';
    const mountKey = `${snap.skills.map((s) => s.id).join('|')}_sup${showSupply ? 1 : 0}`;
    if (this.skillsMountKey !== mountKey) {
      this.skillsMountKey = mountKey;
      const btnsHtml = snap.skills
        .map((sk, idx) => {
          const hk = sk.hotkey ?? String(idx + 1);
          const shortLabel = sk.shortName ?? sk.name;
          return `
            <button
              class="skill-dock-btn"
              id="btn-skill-${sk.id}"
              data-skill-id="${sk.id}"
              type="button"
              title="${sk.name} [${hk}]：${sk.summary ?? ''}"
            >
              <span class="skill-cd-overlay" data-role="cd-overlay"></span>
              <span class="skill-key-hint">${hk}</span>
              ${commanderSkillSvgIcon(sk.id)}
              <span class="skill-btn-meta">
                <strong class="skill-short-name">${shortLabel}</strong>
                <em class="skill-cost-label" data-role="cost-label">⚡${sk.energyCost}</em>
              </span>
              <span class="skill-cd-text" data-role="cd-text"></span>
            </button>
          `;
        })
        .join('');

      this.skillsSlotHost.innerHTML = `
        <div class="commander-skills-dock" id="commander-skills-dock">
          <div class="tactical-energy-pill" id="tactical-energy-pill" title="指挥官战术能量（波次战斗与击杀充能）">
            <div class="energy-top-line">
              <span class="energy-bolt">⚡</span>
              <strong id="val-tac-energy">0</strong>
              <small class="energy-max-cap" id="cap-tac-energy">/100</small>
            </div>
            <div class="tac-energy-bar">
              <div class="tac-energy-fill" id="tac-energy-fill"></div>
            </div>
          </div>
          <div class="skills-btn-row">
            ${btnsHtml}
          </div>
          ${
            showSupply
              ? `<div class="supply-protocol-pair hide-xs" id="supply-protocol-group">
                  <button class="supply-dock-btn gold-sup" id="btn-supply-gold" type="button" title="战地军工增幅 [4]：消耗工程金币，全军机甲永久 +12% 伤害并触发 4.5s 超载狂飙">
                    <span class="skill-key-hint">4</span>
                    <strong id="lbl-supply-gold">💰军工</strong>
                    <em id="cost-supply-gold">●360</em>
                  </button>
                  <button class="supply-dock-btn crys-sup" id="btn-supply-crystal" type="button" title="晶簇裂变协议 [5]：消耗 5💎 储备能源晶体，全军永久 +15% 伤害 + 满战术能量 + 刷新全部技能冷却 + 修复信标">
                    <span class="skill-key-hint">5</span>
                    <strong id="lbl-supply-crys">💎裂变</strong>
                    <em id="cost-supply-crys">5💎</em>
                  </button>
                </div>`
              : ''
          }
          <span class="combo-live-pill" id="combo-live-pill" title="跨塔战术连携计数" hidden></span>
        </div>
      `;

      this.skillsSlotHost
        .querySelector('#btn-supply-gold')
        ?.addEventListener('click', () => this.engine.activateArsenalBoost());
      this.skillsSlotHost
        .querySelector('#btn-supply-crystal')
        ?.addEventListener('click', () => this.engine.activateCrystalOvercharge());

      this.skillsSlotHost.querySelectorAll<HTMLButtonElement>('[data-skill-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sid = btn.dataset.skillId as CommanderSkillId | undefined;
          if (sid) {
            this.engine.activateCommanderSkill(sid);
          }
        });
      });
    }

    // In-place DOM updates (~7Hz snapshots, zero innerHTML rebuilds -> zero dropped clicks!)
    const energyInt = Math.floor(snap.tacticalEnergy);
    const energyPct = Math.max(
      0,
      Math.min(100, (snap.tacticalEnergy / Math.max(1, snap.maxTacticalEnergy)) * 100)
    );
    const valEl = this.skillsSlotHost.querySelector('#val-tac-energy');
    if (valEl) valEl.textContent = String(energyInt);
    const capEl = this.skillsSlotHost.querySelector('#cap-tac-energy');
    if (capEl) capEl.textContent = `/${snap.maxTacticalEnergy}`;
    const fillEl = this.skillsSlotHost.querySelector('#tac-energy-fill') as HTMLElement | null;
    if (fillEl) fillEl.style.width = `${energyPct.toFixed(1)}%`;

    for (const sk of snap.skills) {
      const btn = this.skillsSlotHost.querySelector<HTMLButtonElement>(`#btn-skill-${sk.id}`);
      if (!btn) continue;
      const isArmed = sk.activeTargeting || snap.armedSkillId === sk.id;
      const onCd = sk.cooldownRemaining > 0.05;
      const unready = !sk.ready && !isArmed;
      const cdPct =
        onCd && sk.cooldownTotal > 0
          ? Math.min(100, (sk.cooldownRemaining / sk.cooldownTotal) * 100)
          : 0;

      btn.classList.toggle('ready', sk.ready);
      btn.classList.toggle('is-armed', isArmed);
      btn.classList.toggle('on-cd', onCd);
      btn.classList.toggle('unready', unready);

      const overlay = btn.querySelector<HTMLElement>('[data-role="cd-overlay"]');
      if (overlay) overlay.style.height = onCd ? `${cdPct.toFixed(1)}%` : '0%';

      const cdText = btn.querySelector<HTMLElement>('[data-role="cd-text"]');
      if (cdText) cdText.textContent = onCd ? `${sk.cooldownRemaining.toFixed(1)}s` : '';

      const costLbl = btn.querySelector<HTMLElement>('[data-role="cost-label"]');
      if (costLbl) {
        costLbl.textContent = isArmed ? '瞄准中' : `⚡${sk.energyCost}`;
      }
    }

    const supGoldBtn = this.skillsSlotHost.querySelector<HTMLButtonElement>('#btn-supply-gold');
    if (supGoldBtn) {
      const gCost = snap.nextArsenalCost ?? 360;
      const gLv = snap.runArsenalLevel ?? 0;
      const gAfford = snap.gold >= gCost;
      supGoldBtn.classList.toggle('unready', !gAfford);
      const lbl = supGoldBtn.querySelector('#lbl-supply-gold');
      const cst = supGoldBtn.querySelector('#cost-supply-gold');
      if (lbl) lbl.textContent = gLv > 0 ? `💰军工+${gLv}` : '💰军工';
      if (cst) cst.textContent = `●${gCost}`;
    }

    const supCrysBtn = this.skillsSlotHost.querySelector<HTMLButtonElement>('#btn-supply-crystal');
    if (supCrysBtn) {
      const cCost = snap.crystalProtocolCost ?? 5;
      const cLv = snap.runCrystalProtocolLevel ?? 0;
      const cAfford = snap.persistentCrystals >= cCost;
      supCrysBtn.classList.toggle('unready', !cAfford);
      const lbl = supCrysBtn.querySelector('#lbl-supply-crys');
      const cst = supCrysBtn.querySelector('#cost-supply-crys');
      if (lbl) lbl.textContent = cLv > 0 ? `💎裂变+${cLv}` : '💎裂变';
      if (cst) cst.textContent = `${cCost}💎`;
    }

    const comboPill = this.skillsSlotHost.querySelector<HTMLElement>('#combo-live-pill');
    if (comboPill) {
      comboPill.hidden = snap.activeComboCount <= 0;
      if (snap.activeComboCount > 0) {
        comboPill.textContent = `连携 ×${snap.activeComboCount}`;
      }
    }
  }

  private renderBgmPopover(snap: UISnapshot): void {
    if (!this.bgmPopoverOpen) {
      if (this.lastBgmPopSig !== '') {
        this.lastBgmPopSig = '';
        this.bgmPopoverHost.innerHTML = '';
      }
      return;
    }

    const bgmOn = snap.bgmEnabled ?? true;
    const bgmVolPct = Math.round((snap.bgmVolume ?? 0.72) * 100);
    const sfxVolPct = Math.round((snap.sfxVolume ?? 0.92) * 100);
    const curMode = snap.bgmOverrideMode ?? 'auto';
    const trackLabel = snap.bgmTrackLabel ?? 'II. 信标校准 · Cradle Calibration';
    const modeTag = snap.bgmModeTag ?? '104 BPM';
    const sig = `${bgmOn ? 1 : 0}:${snap.muted ? 1 : 0}:${curMode}:${trackLabel}:${bgmVolPct}:${sfxVolPct}`;
    if (this.lastBgmPopSig === sig) return;
    this.lastBgmPopSig = sig;

    const pillsHtml = BGM_MODE_OPTIONS.map((opt) => {
      const active = curMode === opt.id;
      return `<button class="bgm-mode-pill ${active ? 'active' : ''}" data-bgm-mode="${opt.id}" type="button">${opt.shortLabel}</button>`;
    }).join('');

    this.bgmPopoverHost.innerHTML = `
      <aside class="bgm-console-card" id="bgm-console-popover" role="dialog" aria-label="星区原声配乐混音台">
        <div class="bgm-console-head">
          <div class="bgm-title-wrap">
            <span class="bgm-live-dot ${bgmOn && !snap.muted ? 'playing' : ''}"></span>
            <strong>星区原声配乐台</strong>
          </div>
          <div class="bgm-head-actions">
            <button class="bgm-power-btn ${bgmOn ? 'on' : 'off'}" id="btn-bgm-power" type="button">
              ${bgmOn ? '🎵 音乐开启' : '🔇 音乐关闭'}
            </button>
            <button class="sheet-close-btn bgm-close" id="btn-close-bgm-pop" type="button" aria-label="关闭配乐台">✕</button>
          </div>
        </div>

        <div class="bgm-now-playing">
          <div class="bgm-track-name" id="bgm-now-track">${trackLabel}</div>
          <div class="bgm-track-meta">${modeTag} · Web Audio 实时合成器</div>
        </div>

        <div class="bgm-mode-grid" id="bgm-mode-grid">
          ${pillsHtml}
        </div>

        <div class="bgm-sliders-box">
          <label class="bgm-slider-row">
            <span>音乐音量</span>
            <input type="range" id="slider-bgm-vol" min="0" max="100" value="${bgmVolPct}" />
            <strong id="val-bgm-vol">${bgmVolPct}%</strong>
          </label>
          <label class="bgm-slider-row">
            <span>战斗音效</span>
            <input type="range" id="slider-sfx-vol" min="0" max="100" value="${sfxVolPct}" />
            <strong id="val-sfx-vol">${sfxVolPct}%</strong>
          </label>
        </div>
      </aside>
    `;

    this.bgmPopoverHost.querySelector('#btn-close-bgm-pop')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.bgmPopoverOpen = false;
      this.lastBgmPopSig = '';
      this.bgmPopoverHost.innerHTML = '';
    });

    this.bgmPopoverHost.querySelector('#btn-bgm-power')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.engine.toggleBgm();
    });

    this.bgmPopoverHost.querySelectorAll<HTMLButtonElement>('[data-bgm-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bgmMode;
        if (!mode) return;
        this.engine.getAudio().playUiClick();
        this.engine.setBgmOverrideMode(mode as Parameters<GameEngine['setBgmOverrideMode']>[0]);
      });
    });

    const bgmSlider = this.bgmPopoverHost.querySelector<HTMLInputElement>('#slider-bgm-vol');
    const bgmVal = this.bgmPopoverHost.querySelector<HTMLElement>('#val-bgm-vol');
    if (bgmSlider) {
      bgmSlider.addEventListener('input', () => {
        const v = Number(bgmSlider.value);
        if (bgmVal) bgmVal.textContent = `${v}%`;
        this.engine.getAudio().setBgmVolume(v / 100);
      });
      bgmSlider.addEventListener('change', () => {
        this.engine.setBgmVolume(Number(bgmSlider.value) / 100);
      });
    }

    const sfxSlider = this.bgmPopoverHost.querySelector<HTMLInputElement>('#slider-sfx-vol');
    const sfxVal = this.bgmPopoverHost.querySelector<HTMLElement>('#val-sfx-vol');
    if (sfxSlider) {
      sfxSlider.addEventListener('input', () => {
        const v = Number(sfxSlider.value);
        if (sfxVal) sfxVal.textContent = `${v}%`;
        this.engine.getAudio().setSfxVolume(v / 100);
      });
      sfxSlider.addEventListener('change', () => {
        this.engine.setSfxVolume(Number(sfxSlider.value) / 100);
      });
    }
  }

  private renderBottomTray(snap: UISnapshot): void {
    if (snap.mode !== 'playing' || !snap.selectedPadId) {
      if (this.lastTraySig !== 'none') {
        this.lastTraySig = 'none';
        this.trayHost.innerHTML = '';
      }
      return;
    }

    const wasHidden = this.lastTraySig === 'none' || this.lastTraySig === '';

    // CASE A: Selected an EXISTING Built Tower -> Detailed Inspector Panel!
    if (snap.selectedTower) {
      const tw = snap.selectedTower;
      const canAffordUpgrade = tw.canUpgrade && tw.upgradeCost !== null && snap.gold >= tw.upgradeCost;
      const brOpts =
        tw.tier === 3 ? (tw.t4BranchOptions ?? snap.selectedTowerBranchOptions) : null;
      const brAffordKey = brOpts
        ? `${brOpts[0].affordable ? 1 : 0}${brOpts[1].affordable ? 1 : 0}_${brOpts[0].cost}_${brOpts[1].cost}`
        : 'none';
      const prioKey = tw.targetPriority ?? 'first';
      const kCount = tw.kills ?? 0;
      const dTotal = tw.totalDamage ?? 0;
      const dCompact = dTotal >= 1000 ? `${(dTotal / 1000).toFixed(1)}k` : String(dTotal);
      const ocLv = tw.overclockLevel ?? 0;
      const ocCost = tw.overclockCost ?? null;
      const canAffordOc = tw.tier === 4 && ocCost !== null && snap.gold >= ocCost;
      const bulkOcN = tw.maxBulkOverclockCount ?? 0;
      const formPct = tw.formationBonusPct ?? 0;
      const syncLv = tw.gridSyncLevel ?? 0;
      const depCnt = tw.deployedTowerCount ?? 1;
      const sig = `inspect:${tw.id}:t${tw.tier}:oc${ocLv}:fm${formPct}:sy${syncLv}:dp${depCnt}:br${tw.branch ?? '0'}:pr${prioKey}:k${kCount}:d${Math.floor(dTotal / 25)}:dmg${tw.damage}:rng${tw.range.toFixed(1)}:hg${Boolean(tw.isHighGround)}:afford${canAffordUpgrade}:ocAf${canAffordOc}:ocBulk${bulkOcN}:cost${tw.upgradeCost}:brAf${brAffordKey}:stun${tw.isStunned}:od${Boolean(tw.overdriven)}:au${Boolean(tw.auraBoosted)}`;
      if (this.lastTraySig === sig) return;
      this.lastTraySig = sig;

      const prev = this.lastTowerStats && this.lastTowerStats.id === tw.id ? this.lastTowerStats : null;
      const didJustUpgrade = prev !== null && tw.tier > prev.tier;
      const rateVal = Number((1 / tw.fireInterval).toFixed(1));

      // Tier 3 Compact Dual T4-A / T4-B Specialization Choice Layout (<= 132px across all viewports!)
      if (tw.tier === 3 && brOpts) {
        const [optA, optB] = brOpts;
        this.trayHost.innerHTML = `
          <section class="tactical-sheet t3-branch-mode ${wasHidden ? 'sheet-enter' : ''}" id="tower-inspector">
            <div class="sheet-head compact-t3-head">
              <div class="sheet-title-row compact-title-row">
                <span class="tier-pill" style="background:${tw.tierHex}; color:#120d22">${tw.tierName}</span>
                <strong class="sheet-tower-name">${tw.name}</strong>
                <span class="inline-stats-pill">⚔<b id="ins-dmg">${tw.damage}</b> · ⚡<b id="ins-rate">${rateVal}/s</b> · ◎<b id="ins-rng">${tw.range.toFixed(1)}m</b></span>
                ${tw.isHighGround ? `<span class="highground-chip">▲高地</span>` : ''}
                ${tw.overdriven ? `<span class="overdrive-chip">⚡超载</span>` : ''}
                ${tw.auraBoosted ? `<span class="aura-chip">◈矩阵</span>` : ''}
                ${tw.isStunned ? `<span class="stun-chip">停机</span>` : ''}
              </div>
            <div class="sheet-head-actions">
              <span class="tower-record-chip" title="本塔累计战绩">⚔${kCount} · 💥${dCompact}</span>
              ${tw.type !== 'magnetic' ? `<button class="prio-cycle-btn" id="btn-target-priority" type="button" title="切换索敌策略 [T]">${PRIORITY_LABELS[prioKey]}</button>` : ''}
              <button class="enamel-sell-btn compact-sell-pill" id="btn-sell-tower" type="button">
                  <span>出售</span><strong>+${tw.sellRefund}</strong>
                </button>
                <button class="sheet-close-btn" id="btn-close-sheet" type="button" aria-label="关闭面板">✕</button>
              </div>
            </div>

            <div class="t4-specialization-row" id="t4-branch-choice-grid">
              <button
                class="enamel-t4-card branch-a ${optA.affordable ? '' : 'locked'}"
                id="btn-upgrade-tower"
                data-branch="A"
                data-affordable="${optA.affordable ? '1' : '0'}"
                type="button"
              >
                <div class="t4-card-top">
                  <span class="t4-branch-badge"><em>T4-A</em> ${optA.name}</span>
                  <span class="cost-badge">● ${optA.cost}</span>
                </div>
                <div class="t4-card-tag">${optA.mechanicTag}</div>
              </button>

              <button
                class="enamel-t4-card branch-b ${optB.affordable ? '' : 'locked'}"
                id="btn-upgrade-tower-b"
                data-branch="B"
                data-affordable="${optB.affordable ? '1' : '0'}"
                type="button"
              >
                <div class="t4-card-top">
                  <span class="t4-branch-badge"><em>T4-B</em> ${optB.name}</span>
                  <span class="cost-badge">● ${optB.cost}</span>
                </div>
                <div class="t4-card-tag">${optB.mechanicTag}</div>
              </button>
            </div>
          </section>
        `;

        if (didJustUpgrade && prev) {
          const elDmg = this.trayHost.querySelector('#ins-dmg') as HTMLElement | null;
          if (elDmg) this.rollNumber(elDmg, prev.dmg, tw.damage);
        }
        this.lastTowerStats = {
          id: tw.id,
          tier: tw.tier,
          dmg: tw.damage,
          rate: rateVal,
          rng: tw.range,
        };

        this.trayHost
          .querySelector('#btn-close-sheet')!
          .addEventListener('click', () => this.engine.selectPadOrTower(null));
        this.trayHost
          .querySelector('#btn-sell-tower')!
          .addEventListener('click', () => this.engine.sellSelectedTower());
        this.trayHost
          .querySelector('#btn-target-priority')
          ?.addEventListener('click', () => this.engine.cycleSelectedTowerPriority());
        this.trayHost
          .querySelector('#btn-upgrade-tower')!
          .addEventListener('click', () => this.engine.upgradeSelectedTower('A'));
        this.trayHost
          .querySelector('#btn-upgrade-tower-b')!
          .addEventListener('click', () => this.engine.upgradeSelectedTower('B'));
        return;
      }

      const dmgDeltaBadge =
        didJustUpgrade && tw.damage > prev.dmg
          ? `<em class="inline-up-pop">▲+${tw.damage - prev.dmg}</em>`
          : '';
      const rateDeltaBadge =
        didJustUpgrade && rateVal > prev.rate
          ? `<em class="inline-up-pop">▲+${(rateVal - prev.rate).toFixed(1)}</em>`
          : '';
      const rngDeltaBadge =
        didJustUpgrade && tw.range > prev.rng
          ? `<em class="inline-up-pop">▲+${(tw.range - prev.rng).toFixed(1)}</em>`
          : '';

      const specialLabel = tw.mechanicTag
        ? `<strong>${tw.mechanicTag}</strong>`
        : tw.type === 'mortar'
          ? `冲击范围 <strong>${tw.splashRadius.toFixed(1)}m</strong> · 引爆磁暴共振`
          : tw.type === 'magnetic'
            ? `磁场减速 <strong>${Math.round(tw.slowRatio * 100)}%</strong> · 挂磁化标记`
            : `单体速射 · 叠破甲裂隙`;

      let upgradeActionHtml = '';
      if (tw.canUpgrade && tw.upgradeCost !== null) {
        upgradeActionHtml = `
          <button
            class="enamel-upgrade-btn ${canAffordUpgrade ? '' : 'locked'}"
            id="btn-upgrade-tower"
            type="button"
            data-affordable="${canAffordUpgrade ? '1' : '0'}"
          >
            <div class="up-btn-top">
              <span>晋升【${tw.nextTierName}】</span>
              <span class="cost-badge">● ${tw.upgradeCost}</span>
            </div>
            <div class="up-btn-gain">
              伤害 +${(tw.nextDamage ?? tw.damage) - tw.damage} · 射程 +${((tw.nextRange ?? tw.range) - tw.range).toFixed(1)}m · ${tw.nextSpecialDelta ?? ''}
            </div>
          </button>
        `;
      } else {
        const nextOc = ocLv + 1;
        const costVal = ocCost ?? 220;
        const dmgGain = Math.max(1, (tw.nextOverclockDamage ?? tw.damage) - tw.damage);
        const bulkHtml =
          bulkOcN >= 2
            ? `<button
                class="enamel-overclock-bulk-btn"
                id="btn-overclock-bulk"
                type="button"
                title="一键连续超频 +${bulkOcN} 级（共消耗 ${tw.bulkOverclockCost ?? 0} 金币）"
              >
                <span>⚡×${bulkOcN}</span>
                <strong>●${tw.bulkOverclockCost ?? 0}</strong>
              </button>`
            : '';
        upgradeActionHtml = `
          <button
            class="enamel-upgrade-btn overclock-mode ${canAffordOc ? '' : 'locked'}"
            id="btn-upgrade-tower"
            type="button"
            data-affordable="${canAffordOc ? '1' : '0'}"
            title="无限超频突破 [快捷键 U]：指数级强化伤害，同步提高攻速、射程与护甲穿透"
          >
            <div class="up-btn-top">
              <span id="legendary-max-badge">⚡ 超频突破 +${nextOc}</span>
              <span class="cost-badge">● ${costVal}</span>
            </div>
            <div class="up-btn-gain">
              ${
                depCnt < 4 && ocLv >= 6
                  ? `伤害 +${dmgGain} · ⚠单塔过热衰减（部署三系6塔同步超频可激活阵列谐振）`
                  : `伤害 +${dmgGain} · 6塔同步 Lv.${syncLv}（阵列谐振 +${formPct}%）`
              }
            </div>
          </button>
          ${bulkHtml}
        `;
      }

      this.trayHost.innerHTML = `
        <section class="tactical-sheet ${wasHidden ? 'sheet-enter' : ''}" id="tower-inspector">
          <div class="sheet-head">
            <div class="sheet-title-row">
              <span class="tier-pill" style="background:${tw.tierHex}; color:#120d22">${tw.branch ? `${tw.tierName}·${tw.branch}` : tw.tierName}${ocLv > 0 ? ` +${ocLv}` : ''}</span>
              <strong class="sheet-tower-name">${tw.branchName || tw.name}</strong>
              ${tw.isHighGround ? `<span class="highground-chip">▲高地增程</span>` : ''}
              ${tw.overdriven ? `<span class="overdrive-chip">⚡超载+45%攻速</span>` : ''}
              ${tw.auraBoosted ? `<span class="aura-chip">◈矩阵+15%攻速</span>` : ''}
              ${formPct > 0 ? `<span class="aura-chip" title="三系协同与多塔同步超频谐振加成">◈阵列谐振+${formPct}%</span>` : ''}
              ${tw.isStunned ? `<span class="stun-chip">震荡停机中</span>` : ''}
            </div>
            <div class="sheet-head-actions">
              <span class="tower-record-chip" title="本塔累计击杀与总伤害">击杀 ${kCount} · 总伤 ${dCompact}</span>
              ${tw.type !== 'magnetic' ? `<button class="prio-cycle-btn" id="btn-target-priority" type="button" title="切换索敌策略 [快捷键 T]">${PRIORITY_LABELS[prioKey]}</button>` : ''}
              <button class="sheet-close-btn" id="btn-close-sheet" type="button" aria-label="关闭面板">✕</button>
            </div>
          </div>

          <div class="inspector-grid">
            <div class="inspector-stats-box">
              <div class="stat-kv"><span>伤害</span><strong id="ins-dmg">${tw.damage}</strong>${dmgDeltaBadge}</div>
              <div class="stat-kv"><span>攻速</span><strong id="ins-rate">${rateVal}/s</strong>${rateDeltaBadge}</div>
              <div class="stat-kv"><span>射程</span><strong id="ins-rng">${tw.range.toFixed(1)}m</strong>${rngDeltaBadge}</div>
              <div class="stat-kv wide"><span>特性</span><span>${specialLabel}</span></div>
            </div>

            <div class="inspector-actions-box">
              ${upgradeActionHtml}

              <button class="enamel-sell-btn" id="btn-sell-tower" type="button">
                <span>出售</span>
                <strong>+${tw.sellRefund}</strong>
              </button>
            </div>
          </div>
        </section>
      `;

      // Animate rolling numbers if this tower just upgraded!
      if (didJustUpgrade && prev) {
        const elDmg = this.trayHost.querySelector('#ins-dmg') as HTMLElement | null;
        if (elDmg) this.rollNumber(elDmg, prev.dmg, tw.damage);
      }
      this.lastTowerStats = {
        id: tw.id,
        tier: tw.tier,
        dmg: tw.damage,
        rate: rateVal,
        rng: tw.range,
      };

      this.trayHost
        .querySelector('#btn-close-sheet')!
        .addEventListener('click', () => this.engine.selectPadOrTower(null));
      this.trayHost
        .querySelector('#btn-sell-tower')!
        .addEventListener('click', () => this.engine.sellSelectedTower());

      this.trayHost
        .querySelector('#btn-target-priority')
        ?.addEventListener('click', () => this.engine.cycleSelectedTowerPriority());
      const upBtn = this.trayHost.querySelector('#btn-upgrade-tower');
      if (upBtn) {
        upBtn.addEventListener('click', () => {
          this.engine.upgradeSelectedTower('A');
        });
      }
      const bulkOcBtn = this.trayHost.querySelector('#btn-overclock-bulk');
      if (bulkOcBtn) {
        bulkOcBtn.addEventListener('click', () => {
          this.engine.overclockSelectedTower(5);
        });
      }
      return;
    }

    // CASE B: Selected an EMPTY Build Pad -> 3 Compact Build Cards (ONLY Tower Type, Icon & Cost!)
    // + Confirm Build CTA once a tower type is selected for model/range preview!
    const previewBp = snap.previewTowerType ? TOWER_BLUEPRINTS[snap.previewTowerType] : null;
    const previewCost = previewBp ? previewBp.tiers[0].cost : 0;
    const previewAffordable = previewBp ? snap.gold >= previewCost : false;

    const affordKey = TOWER_ORDER.map((t) => (snap.gold >= TOWER_BLUEPRINTS[t].tiers[0].cost ? '1' : '0')).join('');
    const sig = `build:${snap.selectedPadId}:hg${snap.selectedPadIsHighGround}:prev_${snap.previewTowerType ?? 'none'}:af_${affordKey}`;
    if (this.lastTraySig === sig) return;
    this.lastTraySig = sig;

    const cardsHtml = TOWER_ORDER.map((tId) => {
      const bp = TOWER_BLUEPRINTS[tId];
      const cost = bp.tiers[0].cost;
      const affordable = snap.gold >= cost;
      const isSelected = snap.previewTowerType === tId;
      return `
        <button
          class="tower-mini-card ${isSelected ? 'selected' : ''} ${affordable ? '' : 'unaffordable'}"
          id="btn-card-${tId}"
          type="button"
          data-tower="${tId}"
        >
          ${towerSvgIcon(tId)}
          <span class="mini-card-name">${bp.name}</span>
          <span class="mini-card-cost">● ${cost}</span>
        </button>
      `;
    }).join('');

    this.trayHost.innerHTML = `
      <section class="tactical-sheet build-mode ${wasHidden ? 'sheet-enter' : ''}" id="build-tray">
        <div class="sheet-head compact">
          <span class="pad-title-tag">
            ${snap.selectedPadLabel ?? '检修基座'}
            ${snap.selectedPadIsHighGround ? '<em class="highground-chip">▲高地 +18%射程/+15%伤害</em>' : ''}
          </span>
          ${
            previewBp
              ? `<button
                  class="enamel-confirm-build-btn"
                  id="btn-confirm-build"
                  type="button"
                  ${previewAffordable ? '' : 'disabled'}
                >
                  ${previewAffordable ? `建造 ${previewBp.name} (-${previewCost})` : `金币不足 (${previewCost})`}
                </button>`
              : `<span class="pad-sub-hint">点选塔型预览3D模型与射程</span>`
          }
          <button class="sheet-close-btn" id="btn-close-build" type="button" aria-label="取消选择">✕</button>
        </div>
        <div class="mini-cards-row">
          ${cardsHtml}
        </div>
      </section>
    `;

    this.trayHost
      .querySelector('#btn-close-build')!
      .addEventListener('click', () => this.engine.selectPadOrTower(null));

    const confirmBtn = this.trayHost.querySelector('#btn-confirm-build');
    if (confirmBtn && snap.previewTowerType) {
      const chosen = snap.previewTowerType;
      confirmBtn.addEventListener('click', () => {
        this.engine.previewOrBuildTower(chosen, true);
      });
    }

    TOWER_ORDER.forEach((tId) => {
      const cardEl = this.trayHost.querySelector(`#btn-card-${tId}`);
      if (cardEl) {
        cardEl.addEventListener('click', () => {
          this.engine.previewOrBuildTower(tId, false);
        });
      }
    });
  }

  private renderModals(snap: UISnapshot): void {
    let modalSig = 'none';
    if (snap.mode === 'paused') {
      modalSig = `paused:${snap.stageId}:${snap.waveNumber}:${snap.beaconHp}`;
    } else if (snap.mode === 'defeat') {
      modalSig = `defeat:${snap.stageId}:${snap.waveNumber}:${snap.kills}`;
    } else if (
      snap.mode === 'victory_panel' ||
      snap.mode === 'reward_claiming' ||
      snap.mode === 'reward_claimed'
    ) {
      modalSig = `victory:${snap.stageId}:${snap.mode}:${snap.rewardSummary.claimed}:${snap.gold}:${snap.crystals}`;
    }

    if (this.lastModalSig === modalSig) return;
    this.lastModalSig = modalSig;

    if (modalSig === 'none') {
      this.modalHost.innerHTML = '';
      return;
    }

    if (snap.mode === 'paused') {
      const waveSummary = snap.isEndless
        ? `无尽超载第 ${snap.waveNumber} 波`
        : `第 ${snap.waveNumber} / ${snap.totalWaves} 波`;
      this.modalHost.innerHTML = `
        <div class="modal-mask" id="pause-modal">
          <div class="enamel-dialog">
            <h2 class="dialog-title">工程防线已暂停</h2>
            <p class="dialog-desc">当前驻守【${snap.stageCode} ${snap.stageName}】${waveSummary} · 信标耐久 ${snap.beaconHp}/${snap.maxBeaconHp}</p>
            <div class="dialog-btn-stack">
              <button class="enamel-cta-btn primary" id="btn-resume" type="button">继续战斗</button>
              <button class="enamel-cta-btn secondary" id="btn-hub-from-modal" type="button">🗺 星区作战指挥台</button>
              <button class="enamel-cta-btn secondary" id="btn-restart-pause" type="button">重新挑战</button>
            </div>
          </div>
        </div>
      `;
      this.modalHost.querySelector('#btn-resume')!.addEventListener('click', () => this.engine.togglePause());
      this.modalHost.querySelector('#btn-hub-from-modal')!.addEventListener('click', () => {
        this.engine.togglePause();
        this.openHub('campaign');
      });
      this.modalHost
        .querySelector('#btn-restart-pause')!
        .addEventListener('click', () => this.engine.startNewMission(false));
      return;
    }

    if (snap.mode === 'defeat') {
      const bestWave = Math.max(snap.waveNumber, snap.bestEndlessWave);
      const defeatDesc = snap.isEndless
        ? `星区无尽超载坚守至第 ${snap.waveNumber} 波（历史最高纪录 W${bestWave}），累计击毁 ${snap.kills} 台失控机械！可前往工程改装台强化科技再次冲击更高波次。`
        : `【${snap.stageName}】防线坚守至第 ${snap.waveNumber} 波，累计击毁 ${snap.kills} 台失控采矿机械。合理搭配【磁场减速 + 脉冲迫击炮 + 联装机炮】并善用战场机关即可稳固防线！`;

      this.modalHost.innerHTML = `
        <div class="modal-mask" id="defeat-modal">
          <div class="enamel-dialog danger">
            <div class="dialog-kicker">${snap.isEndless ? 'ENDLESS OVERDRIVE SETTLEMENT' : 'BEACON OFFLINE'}</div>
            <h2 class="dialog-title">${snap.isEndless ? `无尽超载定格 · 第 ${snap.waveNumber} 波` : '返航信标受损停机'}</h2>
            <p class="dialog-desc">${defeatDesc}</p>
            <div class="dialog-btn-stack">
              <button class="enamel-cta-btn primary" id="btn-retry-defeat" type="button">重整设备 · 重新挑战</button>
              <button class="enamel-cta-btn secondary" id="btn-hub-from-modal" type="button">🗺 返回星区指挥台</button>
            </div>
          </div>
        </div>
      `;
      this.modalHost
        .querySelector('#btn-retry-defeat')!
        .addEventListener('click', () => this.engine.startNewMission(false));
      this.modalHost
        .querySelector('#btn-hub-from-modal')!
        .addEventListener('click', () => this.openHub('campaign'));
      return;
    }

    // STAGE 5: Victory Settlement & Interactive 3D Supply Chest Reward Claim!
    const starsStr = '★'.repeat(snap.rewardSummary.stars) + '☆'.repeat(3 - snap.rewardSummary.stars);
    const isClaiming = snap.mode === 'reward_claiming';
    const isClaimed = snap.mode === 'reward_claimed' || snap.rewardSummary.claimed;
    const extraBankCrystals =
      (snap.rewardSummary.firstClearBonusCrystals ?? 0) +
      (snap.rewardSummary.starBonusCrystals ?? 0);
    const nextTargetId: StageId = snap.nextStageId ?? 'endless';
    const nextTargetLabel = snap.nextStageName ?? '星区无尽超载';

    this.modalHost.innerHTML = `
      <div class="victory-side-wrap" id="victory-screen">
        <div class="enamel-dialog victory-panel-card">
          <div class="dialog-kicker gold">EVACUATION SIGNAL LOCKED · ${snap.stageCode}</div>
          <h2 class="dialog-title">【${snap.stageName}】守护成功！</h2>
          <div class="victory-stars">${starsStr}</div>

          ${snap.mvpTowerSummary ? `<div class="mvp-tower-banner">🏆 王牌机甲：<strong>${snap.mvpTowerSummary}</strong></div>` : ''}
          <div class="victory-stats-grid">
            <div class="v-stat"><span>信标耐久</span><strong>${snap.beaconHp}/${snap.maxBeaconHp}</strong></div>
            <div class="v-stat"><span>击毁机械</span><strong>${snap.kills}</strong></div>
            <div class="v-stat"><span>结算金币</span><strong>${snap.gold}</strong></div>
            <div class="v-stat"><span>本局获得晶体</span><strong>${snap.crystals}</strong></div>
          </div>

          <div class="reward-chest-box ${isClaimed ? 'claimed' : ''}">
            <div class="reward-box-title">
              ${isClaimed ? '✓ 撤离空投补给已领取' : '撤离飞船空投补给箱已就位'}
            </div>
            <div class="reward-loot-tags">
              <span class="loot-pill gold-loot">+${snap.rewardSummary.bonusGold} 3D金币</span>
              <span class="loot-pill crystal-loot">+${snap.rewardSummary.bonusCrystals} 能源晶体</span>
              ${
                isClaimed && extraBankCrystals > 0
                  ? `<span class="loot-pill bonus-loot">首通/星章 +${extraBankCrystals} 💎入库</span>`
                  : ''
              }
            </div>
            ${
              isClaimed
                ? `<div class="commendation-note">累计守护勋章：${snap.rewardSummary.totalCommendations} 枚 · 星区晶体储备：${snap.persistentCrystals} 💎</div>`
                : ''
            }
          </div>

          <div class="dialog-btn-stack">
            ${
              !isClaimed
                ? `<button
                    class="enamel-cta-btn gold-claim"
                    id="btn-claim-rewards"
                    type="button"
                    ${isClaiming ? 'disabled' : ''}
                  >
                    ${isClaiming ? '正在开启3D补给箱...' : '开启补给箱 · 领取奖励'}
                  </button>`
                : `
                  <button class="enamel-cta-btn primary" id="btn-next-sector" type="button">
                    ▶ 下一战区 · ${nextTargetLabel}
                  </button>
                  <div class="dialog-btn-row">
                    <button class="enamel-cta-btn secondary" id="btn-hub-victory" type="button">
                      🗺 星区指挥台
                    </button>
                    <button class="enamel-cta-btn secondary" id="btn-play-again" type="button">
                      再次挑战
                    </button>
                  </div>
                `
            }
          </div>
        </div>
      </div>
    `;

    const claimBtn = this.modalHost.querySelector('#btn-claim-rewards');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => this.engine.claimVictoryRewards());
    }
    const nextSectorBtn = this.modalHost.querySelector('#btn-next-sector');
    if (nextSectorBtn) {
      nextSectorBtn.addEventListener('click', () => this.engine.launchStage(nextTargetId, false));
    }
    const hubVictoryBtn = this.modalHost.querySelector('#btn-hub-victory');
    if (hubVictoryBtn) {
      hubVictoryBtn.addEventListener('click', () => this.openHub('campaign'));
    }
    const replayBtn = this.modalHost.querySelector('#btn-play-again');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => this.engine.startNewMission(false));
    }
  }

  // ==================== SECTOR COMMAND HUB OVERLAY ====================

  private renderHubModal(snap: UISnapshot): void {
    if (!this.hubOpen) {
      if (this.lastHubSig !== '') {
        this.lastHubSig = '';
        this.hubHost.innerHTML = '';
      }
      return;
    }

    const prog = snap.progression;
    const progMgr = this.engine.getProgression();
    const stagesSig = STAGE_ORDER.map((sid) => {
      const s = prog.stages[sid];
      return `${sid}:${s.unlocked ? 1 : 0}${s.cleared ? 1 : 0}${s.bestStars}_${s.bestWave}`;
    }).join('|');
    const techSig = TECH_ORDER.map((tid) => prog.techLevels[tid]).join('');
    const apexSig = APEX_ORDER.map((aid) => prog.apexLevels?.[aid] ?? 0).join('_');
    const countersSig = `${prog.counters.synergyTriggers}_${prog.counters.skillsUsed}_${prog.counters.mechanismsUsed}_${prog.counters.dualBranchCleared ? 1 : 0}_${prog.counters.maxOverclockReached ?? 0}`;
    const ranking = this.leaderboard.getState();
    const hubSig = `${this.hubTab}:${this.codexFilter}:${this.selectedHubStageId}:${snap.stageId}:${prog.totalCrystals}:${prog.spentCrystals}:${prog.unlockAllSandbox ? 1 : 0}:${stagesSig}:${techSig}:${apexSig}:${countersSig}:${prog.claimedAchievementIds.length}:${prog.seenCodexIds.length}:${ranking.revision}`;

    if (this.lastHubSig === hubSig) return;
    this.lastHubSig = hubSig;

    const hasAffordableTech =
      TECH_ORDER.some((tid) => progMgr.canUpgradeTech(tid)) ||
      APEX_ORDER.some((aid) => progMgr.canUpgradeApex(aid, 1));
    const hasClaimableAch = ACHIEVEMENT_CONFIGS.some(
      (ach) => progMgr.isAchievementUnlocked(ach.id) && !progMgr.isAchievementClaimed(ach.id)
    );

    const tabBodyHtml =
      this.hubTab === 'campaign'
        ? this.renderHubCampaignTab(snap)
        : this.hubTab === 'tech'
          ? this.renderHubTechTab(snap)
          : this.hubTab === 'codex' ? this.renderHubCodexTab(snap) : this.renderLeaderboardTab();

    this.hubHost.innerHTML = `
      <div class="modal-mask hub-mask" id="sector-hub-modal">
        <div class="hub-dialog">
          <div class="hub-header">
            <div class="hub-brand">
              <span class="hub-title">🗺 星区作战指挥台</span>
              <span class="hub-crystal-bank" id="hub-crystals-val">💎 ${snap.persistentCrystals}</span>
            </div>
            <div class="hub-tabs" role="tablist">
              <button
                class="hub-tab-btn ${this.hubTab === 'campaign' ? 'active' : ''}"
                id="hub-tab-btn-campaign"
                type="button"
              >
                <span>星区战役</span>
              </button>
              <button
                class="hub-tab-btn ${this.hubTab === 'tech' ? 'active' : ''}"
                id="hub-tab-btn-tech"
                type="button"
              >
                <span>工程改装</span>
                ${hasAffordableTech ? `<span class="hub-tab-pip amber" aria-hidden="true"></span>` : ''}
              </button>
              <button
                class="hub-tab-btn ${this.hubTab === 'codex' ? 'active' : ''}"
                id="hub-tab-btn-codex"
                type="button"
              >
                <span>战地档案</span>
                ${hasClaimableAch ? `<span class="hub-tab-pip green" aria-hidden="true"></span>` : ''}
              </button>
              <button class="hub-tab-btn ${this.hubTab === 'ranking' ? 'active' : ''}" id="hub-tab-btn-ranking" type="button">
                <span>${ranking.unlocked ? '排行榜' : '🔒 排行榜'}</span>${ranking.unlocked && ranking.pending ? '<span class="hub-tab-pip amber" aria-hidden="true"></span>' : ''}
              </button>
            </div>
            <button class="sheet-close-btn hub-close" id="btn-close-hub" type="button" aria-label="关闭星区指挥台">✕</button>
          </div>

          <div class="hub-body-scroll">
            ${tabBodyHtml}
          </div>
        </div>
      </div>
    `;

    this.hubHost.querySelector('#btn-close-hub')!.addEventListener('click', () => this.closeHub());
    this.hubHost.querySelector('#hub-tab-btn-campaign')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.hubTab = 'campaign';
      this.lastHubSig = '';
      this.renderHubModal(this.engine.getSnapshot());
    });
    this.hubHost.querySelector('#hub-tab-btn-tech')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.hubTab = 'tech';
      this.lastHubSig = '';
      this.renderHubModal(this.engine.getSnapshot());
    });
    this.hubHost.querySelector('#hub-tab-btn-codex')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.hubTab = 'codex';
      this.lastHubSig = '';
      this.renderHubModal(this.engine.getSnapshot());
    });
    this.hubHost.querySelector('#hub-tab-btn-ranking')!.addEventListener('click', () => {
      this.engine.getAudio().playUiClick();
      this.hubTab = 'ranking';
      this.lastHubSig = '';
      this.renderHubModal(this.engine.getSnapshot());
      void this.leaderboard.refresh();
    });

    this.bindHubBodyEvents();
    if (this.hubTab === 'ranking') this.bindLeaderboardEvents();
  }

  private renderLeaderboardTab(): string {
    const state = this.leaderboard.getState();
    if (!state.unlocked) return `<section id="hub-panel-ranking" class="leaderboard-panel ranking-locked">
      <h3>无尽战绩榜待解锁</h3><p>第一次在无尽模式挑战失败后，填写指挥官名字即可解锁排行榜。</p>
      <p>首次进入可直接游玩，登记后会自动上传本局战绩，并在当前浏览器记住名字。</p>
    </section>`;
    const metricCells = (entry: RankingEntry) => `
      <td class="ranking-rank">${rankingNumber(entry.rank)}</td>
      <td class="ranking-name">${escapeHtml(entry.username)}</td>
      <td>${rankingNumber(entry.metrics?.score)}</td>
      <td>${rankingNumber(entry.metrics?.kills)}</td>
      <td>${rankingNumber(entry.metrics?.duration)} 秒</td>`;
    const rows = state.entries.map(entry => `<tr ${entry.playerId === state.myEntry?.playerId ? 'class="ranking-self"' : ''}>${metricCells(entry)}</tr>`).join('');
    return `<section id="hub-panel-ranking" class="leaderboard-panel" aria-labelledby="leaderboard-title">
      <div class="leaderboard-toolbar">
        <div><h3 id="leaderboard-title">无尽最高战绩榜</h3><p>完成波次 ↓ · 击杀数 ↓ · 战斗用时 ↑，保留个人最好战绩。</p></div>
        <button class="sandbox-unlock-btn" id="btn-refresh-ranking" type="button" ${state.loading ? 'disabled' : ''}>${state.loading ? '正在刷新…' : '刷新榜单'}</button>
      </div>
      <div class="ranking-profile"><span>指挥官：<strong id="ranking-player-name">${escapeHtml(state.username)}</strong></span><button class="sandbox-unlock-btn" id="btn-edit-player-name" type="button">修改名字</button></div>
      ${!state.persistent ? '<p class="ranking-notice">当前浏览器无法保存资料，名字和待上传成绩仅在本次打开期间保留。</p>' : ''}
      <div class="ranking-my-entry" id="ranking-my-entry">${state.myError ? escapeHtml(state.myError) : state.myEntry ? `我的名次：第 <strong>${rankingNumber(state.myEntry.rank)}</strong> 名 · 完成 ${rankingNumber(state.myEntry.metrics?.score)} 波 · 击杀 ${rankingNumber(state.myEntry.metrics?.kills)}` : '尚未上榜，完成一局无尽挑战后会自动上传成绩。'}</div>
      <div class="ranking-submission" role="status" aria-live="polite"><span id="ranking-submission-status">${escapeHtml(state.submitting ? '正在上传本局成绩…' : state.submissionMessage)}</span>
        ${state.pending ? `<button class="sandbox-unlock-btn" id="btn-retry-ranking" type="button" ${state.submitting ? 'disabled' : ''}>重试上传</button>` : ''}
      </div>
      ${state.error ? `<p class="ranking-notice" id="ranking-error" role="alert">${escapeHtml(state.error)}</p>` : ''}
      <div class="ranking-table-wrap"><table class="ranking-table" aria-label="无尽模式排行榜"><thead><tr><th>名次</th><th>指挥官</th><th>完成波次</th><th>击杀</th><th>用时</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="ranking-empty">${state.loading ? '正在读取战绩…' : state.error ? '暂时无法读取榜单，请稍后刷新。' : '暂无战绩，来成为第一位上榜的指挥官吧。'}</td></tr>`}</tbody></table></div>
      <div class="ranking-pagination"><button class="sandbox-unlock-btn" id="btn-ranking-prev" type="button" ${state.loading || state.offset <= 0 ? 'disabled' : ''}>上一页</button>
        <span id="ranking-page-status">共 ${rankingNumber(state.total)} 位指挥官 · 第 ${Math.floor(state.offset / RANKING_CONFIG.pageSize) + 1} 页</span>
        <button class="sandbox-unlock-btn" id="btn-ranking-next" type="button" ${state.loading || state.offset + RANKING_CONFIG.pageSize >= state.total || state.offset >= 10000 ? 'disabled' : ''}>下一页</button></div>
      <p class="ranking-footnote">战斗用时按游戏内秒数计算，暂停、指挥台和演出时间不计。名字可以重复；更换浏览器或清除存储会使用新的玩家身份。</p>
    </section>`;
  }

  private bindLeaderboardEvents(): void {
    this.hubHost.querySelector('#btn-refresh-ranking')?.addEventListener('click', () => { void this.leaderboard.refresh(this.leaderboard.getState().offset); });
    this.hubHost.querySelector('#btn-ranking-prev')?.addEventListener('click', () => { void this.leaderboard.refresh(this.leaderboard.getState().offset - RANKING_CONFIG.pageSize); });
    this.hubHost.querySelector('#btn-ranking-next')?.addEventListener('click', () => { void this.leaderboard.refresh(this.leaderboard.getState().offset + RANKING_CONFIG.pageSize); });
    this.hubHost.querySelector('#btn-retry-ranking')?.addEventListener('click', () => { void this.leaderboard.submitPending(); });
    this.hubHost.querySelector('#btn-edit-player-name')?.addEventListener('click', () => { void promptPlayerName(this.leaderboard); });
  }

  private renderHubCampaignTab(snap: UISnapshot): string {
    const prog = snap.progression;
    const selectedCfg = STAGE_CONFIGS[this.selectedHubStageId] ?? STAGE_CONFIGS.stage_01;
    const selectedSave = prog.stages[selectedCfg.id];
    const isSelectedUnlocked =
      selectedCfg.id === 'stage_01' || prog.unlockAllSandbox || selectedSave.unlocked;

    const chartNodes: Array<{ id: StageId; x: number; y: number; color: string }> = [
      { id: 'stage_01', x: 54, y: 84, color: '#4ADE80' },
      { id: 'stage_02', x: 162, y: 36, color: '#C084FC' },
      { id: 'stage_03', x: 272, y: 88, color: '#38BDF8' },
      { id: 'stage_04', x: 382, y: 34, color: '#F59E0B' },
      { id: 'endless', x: 486, y: 66, color: '#FB7185' },
    ];
    const isStageOpen = (sid: StageId): boolean =>
      sid === 'stage_01' || prog.unlockAllSandbox || prog.stages[sid].unlocked;

    const svgSegmentsHtml = chartNodes
      .slice(0, -1)
      .map((fromPt, i) => {
        const toPt = chartNodes[i + 1];
        const open = isStageOpen(toPt.id);
        return open
          ? `<line x1="${fromPt.x}" y1="${fromPt.y}" x2="${toPt.x}" y2="${toPt.y}" class="hyperlane-flow" stroke="#7DD3FC" stroke-width="2.6" stroke-dasharray="7 5" opacity="0.95" />`
          : `<line x1="${fromPt.x}" y1="${fromPt.y}" x2="${toPt.x}" y2="${toPt.y}" stroke="#475569" stroke-width="2.2" stroke-dasharray="6 5" opacity="0.6" />`;
      })
      .join('');

    const svgCirclesHtml = chartNodes
      .map((pt) => {
        const open = isStageOpen(pt.id);
        const selRing =
          pt.id === selectedCfg.id
            ? `<circle cx="${pt.x}" cy="${pt.y}" r="9.5" fill="none" stroke="#FDE047" stroke-width="2.2" />`
            : '';
        return `<g class="svg-stage-node" data-stage-id="${pt.id}">${selRing}<circle cx="${pt.x}" cy="${pt.y}" r="${pt.id === 'endless' ? 11 : 9.5}" fill="${open ? pt.color : '#64748B'}" opacity="0.22" /><circle cx="${pt.x}" cy="${pt.y}" r="${pt.id === 'endless' ? 7.2 : 6.2}" fill="${open ? pt.color : '#64748B'}" stroke="#1A1033" stroke-width="1.8" /><circle cx="${pt.x - 1.8}" cy="${pt.y - 1.8}" r="1.8" fill="#FFFFFF" opacity="0.65" /></g>`;
      })
      .join('');

    const nodesHtml = STAGE_ORDER.map((sid) => {
      const cfg = STAGE_CONFIGS[sid];
      const save = prog.stages[sid];
      const unlocked = isStageOpen(sid);
      const isSelected = sid === this.selectedHubStageId;
      const isCurrent = sid === snap.stageId;
      const isEndless = sid === 'endless';

      const starsOrRecord = isEndless
        ? `<span class="node-record">最高 W${save.bestWave}</span>`
        : `<span class="node-stars">${'★'.repeat(save.bestStars)}${'☆'.repeat(3 - save.bestStars)}</span>`;

      const bountyTag = isEndless
        ? `<span class="node-bounty endless-tag">每5波首领</span>`
        : save.cleared
          ? `<span class="node-bounty cleared-tag">✓ 已通关</span>`
          : `<span class="node-bounty">首通 +${cfg.firstClearCrystals}💎</span>`;

      return `
        <button
          class="stage-node-card ${isSelected ? 'selected' : ''} ${unlocked ? 'unlocked' : 'locked'}"
          id="stage-node-${sid}"
          data-stage-id="${sid}"
          type="button"
        >
          <div class="node-top-row">
            <span class="node-code">${cfg.codeName}</span>
            ${isCurrent ? `<span class="node-active-tag">驻守中</span>` : ''}
            ${!unlocked ? `<span class="node-lock">🔒</span>` : ''}
          </div>
          <div class="node-name">${cfg.name}</div>
          <div class="node-bottom-row">
            ${starsOrRecord}
            ${bountyTag}
          </div>
        </button>
      `;
    }).join('');

    const mechBadges =
      selectedCfg.mechanisms.length > 0
        ? selectedCfg.mechanisms
            .map((m) => `<span class="brief-chip">${m.label}</span>`)
            .join('')
        : '<span class="brief-chip">标准防线</span>';

    const waveCountText =
      selectedCfg.id === 'endless' ? '∞ 无限波次' : `${selectedCfg.waves.length} 波战役`;

    const briefRecordBadge =
      selectedCfg.id === 'endless'
        ? `<span class="brief-record-badge endless">最高纪录 W${selectedSave.bestWave}</span>`
        : `<span class="brief-record-badge stars">${'★'.repeat(selectedSave.bestStars)}${'☆'.repeat(3 - selectedSave.bestStars)}</span>`;

    const rewardInfo =
      selectedCfg.id === 'endless'
        ? '波次结算晶体 · 冲击星区最高波次纪录'
        : `首通 +${selectedCfg.firstClearCrystals}💎 · 每星 +${selectedCfg.perStarCrystals}💎 · 补给箱 +${selectedCfg.victoryBonusCrystals}💎`;

    return `
      <div class="hub-campaign-wrap" id="hub-panel-campaign">
        <div class="hub-campaign-toolbar">
          <div class="campaign-progress-pills">
            <span class="hub-stat-chip">★ 战役星章 <strong>${prog.totalStars}/12</strong></span>
            <span class="hub-stat-chip">∞ 无尽纪录 <strong>W${prog.bestEndlessWave}</strong></span>
          </div>
          <button
            class="sandbox-unlock-btn ${prog.unlockAllSandbox ? 'enabled' : ''}"
            id="btn-toggle-unlock-all"
            type="button"
          >
            ${prog.unlockAllSandbox ? '🔓 全战区演练解锁：已开启' : '🔒 全战区演练解锁：点击开启'}
          </button>
        </div>

        <div class="hub-campaign-grid">
          <div class="star-chart-box">
            <svg class="constellation-svg" viewBox="0 0 540 120" preserveAspectRatio="xMidYMid meet" role="img" aria-label="星区战略星图"><defs><radialGradient id="nebA" cx="28%" cy="40%" r="58%"><stop offset="0%" stop-color="#38BDF8" stop-opacity="0.22"/><stop offset="100%" stop-color="#0F172A" stop-opacity="0"/></radialGradient><radialGradient id="nebB" cx="86%" cy="54%" r="42%"><stop offset="0%" stop-color="#FB7185" stop-opacity="0.24"/><stop offset="100%" stop-color="#0F172A" stop-opacity="0"/></radialGradient></defs><rect width="540" height="120" rx="10" fill="#0D1326"/><rect width="540" height="120" rx="10" fill="url(#nebA)"/><rect width="540" height="120" rx="10" fill="url(#nebB)"/><circle cx="-16" cy="62" r="50" fill="#1E293B" stroke="#38BDF8" stroke-opacity="0.35"/><ellipse cx="270" cy="62" rx="224" ry="44" fill="none" stroke="#334155" stroke-dasharray="4 6" opacity="0.5"/><circle cx="486" cy="66" r="20" fill="none" stroke="#FB7185" stroke-dasharray="3 4" opacity="0.5"/>
              ${svgSegmentsHtml}
              ${svgCirclesHtml}
            </svg>
            <div class="stage-nodes-list">
              ${nodesHtml}
            </div>
          </div>

          <aside class="stage-brief-card" id="stage-brief-card">
            <div class="brief-head-row">
              <div class="brief-kicker">${selectedCfg.codeName} · ${selectedCfg.mechanicSummary}</div>
              ${briefRecordBadge}
            </div>
            <h3 class="brief-title">${selectedCfg.name}</h3>
            <p class="brief-sub">${selectedCfg.subtitle}</p>

            <div class="brief-metrics-row">
              <div class="brief-metric"><span>波次规模</span><strong>${waveCountText}</strong></div>
              <div class="brief-metric"><span>开局金币</span><strong>${selectedCfg.initialGold}</strong></div>
              <div class="brief-metric"><span>信标耐久</span><strong>${selectedCfg.maxBeaconHp}</strong></div>
            </div>

            <div class="brief-section-label">战场地形与可交互机关</div>
            <div class="brief-chips-row">
              <span class="brief-chip gold">▲ 高地增程台 ×${selectedCfg.buildPads.filter((p) => p.padType === 'high_ground').length}</span>
              ${mechBadges}
            </div>

            <div class="brief-reward-line">${rewardInfo}</div>

            <button
              class="enamel-cta-btn primary launch-cta"
              id="btn-launch-stage"
              type="button"
              ${isSelectedUnlocked ? '' : 'disabled'}
            >
              ${
                isSelectedUnlocked
                  ? selectedCfg.id === snap.stageId
                    ? `🚀 重新部署 · ${selectedCfg.name}`
                    : `🚀 立即出击 · ${selectedCfg.name}`
                  : '🔒 通关前置战区或开启演练解锁'
              }
            </button>
          </aside>
        </div>
      </div>
    `;
  }

  private renderHubTechTab(snap: UISnapshot): string {
    const prog = snap.progression;
    const progMgr = this.engine.getProgression();
    const cards = TECH_ORDER.map((tid) => {
      const mod = TECH_MODULES[tid];
      const lv = prog.techLevels[tid];
      const nextCost = lv >= MAX_CORE_TECH_LEVEL ? null : (mod.costs[lv] ?? null);
      const canAfford = nextCost !== null && prog.totalCrystals >= nextCost;
      const pipsHtml = Array.from({ length: MAX_CORE_TECH_LEVEL }, (_, idx) => {
        const litClass = idx < lv ? (idx >= 4 ? 'lit master-pip' : 'lit') : '';
        return `<span class="tech-pip ${litClass}">${idx < lv ? '▮' : '▯'}</span>`;
      }).join('');
      const transitionText =
        lv < MAX_CORE_TECH_LEVEL
          ? `<span class="tech-cur-dim">${mod.levelDescriptions[lv]}</span> <span class="tech-arrow">→</span> <strong>${mod.levelDescriptions[lv + 1]}</strong>`
          : `<strong>${mod.levelDescriptions[MAX_CORE_TECH_LEVEL]}（宗师满级）</strong>`;

      return `
        <div class="tech-card ${lv >= 5 ? 'master-tier' : ''}">
          <div class="tech-card-head">
            <strong>${mod.name}</strong>
            <div class="tech-lv-group">
              <span class="tech-pips" aria-label="等级 ${lv}/${MAX_CORE_TECH_LEVEL}">${pipsHtml}</span>
              <span class="tech-lv-pill">${lv >= 5 ? '★' : ''}Lv.${lv}/${MAX_CORE_TECH_LEVEL}</span>
            </div>
          </div>
          <div class="tech-summary">${mod.summary}</div>
          <div class="tech-cur-effect">${transitionText}</div>
          ${
            nextCost !== null
              ? `<button
                  class="enamel-cta-btn tech-up-btn ${canAfford ? 'primary' : 'secondary'}"
                  id="btn-upgrade-tech-${tid}"
                  data-tech-upgrade="${tid}"
                  type="button"
                  ${canAfford ? '' : 'disabled'}
                >
                  ${lv >= 4 ? '宗师突破' : '升级'} Lv.${lv + 1} · 💎 ${nextCost}
                </button>`
              : `<div class="tech-max-tag">★ 宗师满级 (Lv.8)</div>`
          }
        </div>
      `;
    }).join('');

    const apexCards = APEX_ORDER.map((aid) => {
      const cfg = APEX_MODULES[aid];
      const lv = prog.apexLevels?.[aid] ?? 0;
      const cost1 = progMgr.getApexCost(aid, 1);
      const cost5 = progMgr.getApexCost(aid, 5);
      const afford1 = prog.totalCrystals >= cost1;
      const afford5 = prog.totalCrystals >= cost5;
      return `
        <div class="tech-card apex-infinite-card" id="apex-card-${aid}">
          <div class="tech-card-head">
            <strong>${cfg.name}</strong>
            <span class="apex-lv-badge">♾ Lv.${lv}</span>
          </div>
          <div class="tech-summary">${cfg.summary}</div>
          <div class="tech-cur-effect"><strong>${cfg.formatEffect(lv)}</strong></div>
          <div class="apex-btn-row">
            <button
              class="enamel-cta-btn tech-up-btn ${afford1 ? 'primary' : 'secondary'}"
              id="btn-apex-${aid}-1"
              data-apex-upgrade="${aid}"
              data-apex-count="1"
              type="button"
              ${afford1 ? '' : 'disabled'}
            >
              +1 谐振 · 💎 ${cost1}
            </button>
            <button
              class="enamel-cta-btn tech-up-btn apex-bulk-btn ${afford5 ? 'primary' : 'secondary'}"
              id="btn-apex-${aid}-5"
              data-apex-upgrade="${aid}"
              data-apex-count="5"
              type="button"
              ${afford5 ? '' : 'disabled'}
            >
              ×5 连升 · 💎 ${cost5}
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="hub-tech-wrap" id="hub-panel-tech">
        <div class="hub-campaign-toolbar">
          <span class="hub-stat-chip">已投入能源晶体 <strong>💎 ${prog.spentCrystals}</strong> · 战地快捷键 <strong>[4]军工 [5]裂变</strong></span>
          <button
            class="sandbox-unlock-btn"
            id="btn-respec-tech"
            type="button"
            ${prog.spentCrystals > 0 ? '' : 'disabled'}
          >
            ↺ 重置全部改装与巅峰晶簇（100%返还）
          </button>
        </div>
        <div class="tech-grid">
          ${cards}
        </div>
        <div class="apex-section-divider">
          <span>♾ 终末方舟 · 无限巅峰晶簇协议（无等级上限 · 突破无尽深层防线）</span>
        </div>
        <div class="tech-grid apex-grid">
          ${apexCards}
        </div>
      </div>
    `;
  }

  private renderHubCodexTab(snap: UISnapshot): string {
    const prog = snap.progression;
    const progMgr = this.engine.getProgression();
    const claimableCount = ACHIEVEMENT_CONFIGS.filter(
      (ach) => progMgr.isAchievementUnlocked(ach.id) && !progMgr.isAchievementClaimed(ach.id)
    ).length;

    const subNavHtml = `
      <div class="codex-subnav" role="tablist" aria-label="战地档案分类">
        <button
          class="codex-sub-btn ${this.codexFilter === 'towers' ? 'active' : ''}"
          id="codex-sub-towers"
          data-codex-sub="towers"
          type="button"
        >
          🛡 防御机甲
        </button>
        <button
          class="codex-sub-btn ${this.codexFilter === 'enemies' ? 'active' : ''}"
          id="codex-sub-enemies"
          data-codex-sub="enemies"
          type="button"
        >
          🤖 失控敌械 (12)
        </button>
        <button
          class="codex-sub-btn ${this.codexFilter === 'mechanisms' ? 'active' : ''}"
          id="codex-sub-mechanisms"
          data-codex-sub="mechanisms"
          type="button"
        >
          ⚙ 战场机关 (4)
        </button>
        <button
          class="codex-sub-btn ${this.codexFilter === 'badges' ? 'active' : ''}"
          id="codex-sub-badges"
          data-codex-sub="badges"
          type="button"
        >
          🏅 守护勋章 (${prog.claimedAchievementIds.length}/${ACHIEVEMENT_CONFIGS.length})
          ${claimableCount > 0 ? `<span class="hub-tab-pip green" aria-hidden="true"></span>` : ''}
        </button>
      </div>
    `;

    let bodyHtml = '';

    if (this.codexFilter === 'towers') {
      const towerCards = TOWER_ORDER.map((tId) => {
        const bp = TOWER_BLUEPRINTS[tId];
        const syn = TOWER_SYNERGY_CODEX[tId];
        const brA = bp.branches.A;
        const brB = bp.branches.B;
        const seenA = prog.seenCodexIds.includes(`${tId}_A`) || prog.unlockAllSandbox;
        const seenB = prog.seenCodexIds.includes(`${tId}_B`) || prog.unlockAllSandbox;

        return `
          <article class="codex-tower-card" id="codex-tower-${tId}">
            <div class="codex-tower-head">
              <div class="codex-tower-title">
                ${towerSvgIcon(tId)}
                <div>
                  <div class="codex-tower-name-row">
                    <strong>${bp.name}</strong>
                    <span class="codex-code-chip" style="border-color:${bp.weaponColorHex};color:${bp.weaponColorHex}">${bp.code}</span>
                  </div>
                  <div class="codex-role-sub">${bp.roleSummary}</div>
                </div>
              </div>
              <span class="codex-synergy-badge" style="border-color:${bp.weaponColorHex};color:${bp.weaponColorHex}">${syn.roleBadge}</span>
            </div>
            <p class="codex-synergy-desc">${syn.synergySummary}</p>
            <div class="codex-t4-pair">
              <div class="codex-t4-plaque branch-a">
                <div class="codex-t4-head">
                  <span><em>T4-A</em> ${brA.name}</span>
                  <span class="codex-t4-cost">${seenA ? '✓ ' : ''}● ${brA.cost}</span>
                </div>
                <div class="codex-t4-tag">${brA.mechanicTag}</div>
                <div class="codex-t4-note">${brA.upgradeNote}</div>
              </div>
              <div class="codex-t4-plaque branch-b">
                <div class="codex-t4-head">
                  <span><em>T4-B</em> ${brB.name}</span>
                  <span class="codex-t4-cost">${seenB ? '✓ ' : ''}● ${brB.cost}</span>
                </div>
                <div class="codex-t4-tag">${brB.mechanicTag}</div>
                <div class="codex-t4-note">${brB.upgradeNote}</div>
              </div>
            </div>
          </article>
        `;
      }).join('');

      bodyHtml = `
        <div class="combo-triangle-banner">
          <strong>⚡ 跨塔三角连携回路：</strong>
          <span>【磁场约束塔 · 磁化标记】➔【脉冲迫击炮 · ⚡磁暴共振群爆】+【联装机炮 · 💥破甲裂隙 & 🎯弱点暴击】</span>
        </div>
        <div class="codex-tower-list">${towerCards}</div>
      `;
    } else if (this.codexFilter === 'enemies') {
      const enemyCards = ENEMY_CODEX_ORDER.map((eId) => {
        const bp = ENEMY_BLUEPRINTS[eId];
        const meta = ENEMY_CODEX_META[eId];
        const seen = prog.seenCodexIds.includes(eId) || prog.unlockAllSandbox;
        const shieldStr = bp.maxShield ? ` · 护盾 ${bp.maxShield}` : '';
        return `
          <article class="codex-enemy-card ${seen ? 'seen' : ''}" id="codex-enemy-${eId}">
            <div class="codex-enemy-top">
              <div class="codex-enemy-name-group">
                <span class="threat-tag" style="background:${meta.threatHex}24;border-color:${meta.threatHex};color:${meta.threatHex}">${meta.threatTag}</span>
                <strong>${bp.name}</strong>
              </div>
              <span class="codex-seen-pill ${seen ? 'active' : ''}">${seen ? '✓ 已交战' : '侦测档案'}</span>
            </div>
            <div class="codex-enemy-stats">
              耐久 <b>${bp.maxHp}</b>${shieldStr} · 护甲 <b>${Math.round(bp.armor * 100)}%</b> · 移速 <b>${bp.speed}</b>
            </div>
            <div class="codex-enemy-desc">${meta.description}</div>
            <div class="codex-counter-tip">🎯 ${meta.counterTip}</div>
          </article>
        `;
      }).join('');

      bodyHtml = `<div class="codex-grid enemies-codex-grid">${enemyCards}</div>`;
    } else if (this.codexFilter === 'mechanisms') {
      const mechCards = MECHANISM_CODEX_LIST.map((m) => {
        const seen = prog.seenCodexIds.includes(m.id) || prog.unlockAllSandbox;
        return `
          <article class="codex-mech-card" id="codex-mech-${m.id}">
            <div class="codex-mech-head">
              ${mechanismSvgIcon(m.id)}
              <div class="codex-mech-meta">
                <div class="codex-mech-title-row">
                  <strong>${m.name}</strong>
                  <span class="codex-seen-pill ${seen ? 'active' : ''}">${seen ? '✓ 已激活' : '战区设施'}</span>
                </div>
                <span class="mech-effect-tag" style="border-color:${m.accentHex};color:${m.accentHex}">${m.tag}</span>
              </div>
            </div>
            <p class="codex-mech-desc">${m.summary}</p>
          </article>
        `;
      }).join('');

      bodyHtml = `<div class="codex-grid mech-codex-grid">${mechCards}</div>`;
    } else {
      const achHtml = ACHIEVEMENT_CONFIGS.map((ach) => {
        const unlocked = progMgr.isAchievementUnlocked(ach.id);
        const claimed = progMgr.isAchievementClaimed(ach.id);
        const progText = getAchievementProgressText(ach.id, prog);
        return `
          <div class="ach-row ${unlocked ? 'unlocked' : ''} ${claimed ? 'claimed' : ''}">
            <div class="ach-info">
              <div class="ach-title-line">
                <strong>${ach.name}</strong>
                <span class="ach-prog-pill ${unlocked ? 'done' : ''}">${progText}</span>
              </div>
              <span>${ach.description}</span>
            </div>
            ${
              claimed
                ? `<span class="ach-claimed-tag">✓ 已领 +${ach.rewardCrystals}💎</span>`
                : unlocked
                  ? `<button class="enamel-confirm-build-btn" id="btn-claim-ach-${ach.id}" data-claim-ach="${ach.id}" type="button">领取 +${ach.rewardCrystals}💎</button>`
                  : `<span class="ach-reward-tag">+${ach.rewardCrystals}💎</span>`
            }
          </div>
        `;
      }).join('');

      bodyHtml = `<div class="ach-list">${achHtml}</div>`;
    }

    return `
      <div class="hub-codex-wrap" id="hub-panel-codex">
        ${subNavHtml}
        ${bodyHtml}
      </div>
    `;
  }

  private bindHubBodyEvents(): void {
    const unlockBtn = this.hubHost.querySelector('#btn-toggle-unlock-all');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => {
        const progMgr = this.engine.getProgression();
        progMgr.setUnlockAllSandbox(!progMgr.isUnlockAllSandbox());
        this.engine.getAudio().playUiClick();
        this.lastHubSig = '';
        this.engine.notifyProgressionUpdated();
      });
    }

    this.hubHost.querySelectorAll<HTMLElement>('[data-stage-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const sid = el.dataset.stageId as StageId | undefined;
        if (!sid) return;
        this.engine.getAudio().playUiClick();
        this.selectedHubStageId = sid;
        this.lastHubSig = '';
        this.renderHubModal(this.engine.getSnapshot());
      });
    });

    const launchBtn = this.hubHost.querySelector('#btn-launch-stage');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        const targetStage = this.selectedHubStageId;
        this.hubOpen = false;
        this.lastHubSig = '';
        this.hubHost.innerHTML = '';
        this.engine.launchStage(targetStage, false);
      });
    }

    this.hubHost.querySelectorAll<HTMLElement>('[data-tech-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tid = btn.dataset.techUpgrade as TechUpgradeId | undefined;
        if (!tid) return;
        const progMgr = this.engine.getProgression();
        if (progMgr.upgradeTech(tid)) {
          this.engine.getAudio().playTechUpgrade(progMgr.getTechLevel(tid));
          this.lastHubSig = '';
          this.engine.notifyProgressionUpdated();
        }
      });
    });

    this.hubHost.querySelectorAll<HTMLElement>('[data-apex-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const aid = btn.dataset.apexUpgrade as ApexTechId | undefined;
        const cnt = Math.max(1, Number(btn.dataset.apexCount) || 1);
        if (!aid) return;
        const progMgr = this.engine.getProgression();
        const gained = progMgr.upgradeApexTech(aid, cnt);
        if (gained > 0) {
          this.engine.getAudio().playTechUpgrade(Math.min(8, progMgr.getApexLevel(aid)));
          this.lastHubSig = '';
          this.engine.notifyProgressionUpdated();
        }
      });
    });

    const respecBtn = this.hubHost.querySelector('#btn-respec-tech');
    if (respecBtn) {
      respecBtn.addEventListener('click', () => {
        const progMgr = this.engine.getProgression();
        if (progMgr.respecTech() > 0) {
          this.engine.getAudio().playTechRespec();
          this.lastHubSig = '';
          this.engine.notifyProgressionUpdated();
        }
      });
    }

    this.hubHost.querySelectorAll<HTMLElement>('[data-codex-sub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sub = btn.dataset.codexSub as CodexSubTab | undefined;
        if (!sub || sub === this.codexFilter) return;
        this.engine.getAudio().playUiClick();
        this.codexFilter = sub;
        this.lastHubSig = '';
        this.renderHubModal(this.engine.getSnapshot());
      });
    });

    this.hubHost.querySelectorAll<HTMLElement>('[data-claim-ach]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const aid = btn.dataset.claimAch as AchievementId | undefined;
        if (!aid) return;
        const progMgr = this.engine.getProgression();
        if (progMgr.claimAchievement(aid) > 0) {
          this.engine.getAudio().playAchievementClaim();
          this.lastHubSig = '';
          this.engine.notifyProgressionUpdated();
        }
      });
    });
  }
}
