# E2E Track Exploration Analysis — Opaque-Box Hooks, DOM Contracts & Playwright WebGL2 Harness (`explorer_e2e_r1_1`)

**Agent**: `explorer_e2e_r1_1`
**Target Deliverable Owned by E2E Track**: `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs` (plus `.agents/teamwork/e2e_orch/TEST_INFRA.md` & `TEST_READY.md`)
**Spec Baseline**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md`, `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/orchestrator_r1/plan.md` (`F1`–`F18`, Contracts 1–4), `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_spec_miner_survey_3/analysis.md`

---

## 1. Exact `window.__LUNAR_BEACON_GAME__` Contract & M1/M2 Stability Boundary

### 1.1 Bootstrap Wiring (`src/main.ts:5-9, 28-43`)
In `src/main.ts:42`, `window.__LUNAR_BEACON_GAME__ = engine;` exposes the live `GameEngine` instance directly on `window`:
- In both Vite ES-module production builds (`dist/assets/index-*.js`) and the standalone IIFE bundle (`starforge_ark_cradle.html`), Rollup/Vite minifies local identifiers **without** mangling class method/property names, and TypeScript `private` modifiers are erased at compile time.
- Thus `window.__LUNAR_BEACON_GAME__` exposes **all public `GameEngine` control/telemetry methods** (guaranteed by `plan.md` Contract 4) **and** unmangled runtime instance properties (`camera`, `canvas`, `renderer`, `composer`, `solidScene`, `vfxScene`, `env`, `towers`, `enemies`, `vfx`, `audio`).

### 1.2 CRITICAL API Discrepancies Between `plan.md` Contract 4 Prose vs Actual `GameEngine.ts`
| `plan.md` Contract 4 Reference (`plan.md:71`) | Actual `src/game/GameEngine.ts` Symbol | Critical Behavioral Reality for `tests/e2e_tiers.mjs` |
|---|---|---|
| `getState()` | **`getSnapshot(): UISnapshot`** (`GameEngine.ts:1509`) | **`getState()` DOES NOT EXIST!** Always call `window.__LUNAR_BEACON_GAME__.getSnapshot()`. (Defensive wrapper if desired: `const snap = g.getSnapshot ? g.getSnapshot() : g.getState();`). |
| `projectWorldToScreen(x, y, z)` | **`private projectWorldToScreen(worldPt: THREE.Vector3)`** (`GameEngine.ts:1617-1625`) | **Takes ONE `THREE.Vector3` object (calls `worldPt.clone().project(this.camera)`), NOT `(x, y, z)` numbers!** Calling `g.projectWorldToScreen(x, y, z)` throws `TypeError: worldPt.clone is not a function`, and `window.THREE` is `undefined` in bundles. Use public helpers (`getPadScreenCoordinates`, `getBeaconScreenCoordinates`, `getEntranceScreenCoordinates`) or clone `g.camera.position` (see Section 1.5). |

### 1.3 Guaranteed-Stable Public Methods & Getters on `window.__LUNAR_BEACON_GAME__`
| Method / Getter | Exact Signature & Line Ref | Return Value & Semantics |
|---|---|---|
| `getSnapshot()` | `(): UISnapshot` (`GameEngine.ts:1509-1597`) | Authoritative synchronous UI/simulation state snapshot (full schema in Section 1.4). |
| `getPadScreenCoordinates(padId)` | `(padId: string): { x: number; y: number } \| null` (`1603-1607`) | Projects `BUILD_PADS` (`'pad_01'`..`'pad_10'`) at `(pad.x, 0.16, pad.z)` to CSS client `{ x, y }` using `canvas.getBoundingClientRect()`. Returns `null` for unknown IDs. |
| `getBeaconScreenCoordinates()` | `(): { x: number; y: number }` (`1609-1611`) | Projects Return Beacon `(12.95, 1.2, 2.4)` to CSS client `{ x, y }`. |
| `getEntranceScreenCoordinates()` | `(): { x: number; y: number }` (`1613-1615`) | Projects Mine Entrance `(-13.35, 1.2, -3.2)` to CSS client `{ x, y }`. |
| `ghostPreviewActive` | `get ghostPreviewActive(): boolean` (`1647-1649`) | `true` iff a 3D hologram preview mesh is currently mounted on an empty pad (`currentGhostType !== null && ghostGroup.children.length > 0`). |
| `debugStepSimulation(seconds, renderFinal?)` | `(seconds: number, renderFinal = true): void` (`1630-1640`) | Advances `stepFrame(0.05, false)` deterministically `Math.max(1, Math.ceil(seconds / 0.05))` times, optionally renders 1 final WebGL frame (`renderFinal = true`), and calls `emitSnapshot()`. **Caveat**: Advances `GameEngine` simulation (`waveInProgress`, enemies, towers, mortar flight, slow/stun timers), **NOT** wall-clock `gsap.ticker` timelines (`opening`, `legendary_reveal`, `boss_intro`, `victory_cinematic`, `reward_claiming`). |
| `debugAddGold(amount)` | `(amount: number): void` (`1642-1645`) | Adds `amount` to `gold` and emits snapshot. Permitted ONLY in isolated Tier 1–3 setup tests; **strictly forbidden** in Tier 4 zero-cheat playthrough. |
| `startNewMission(playIntro?)` | `(playIntro = true): void` (`317-374`) | Cancels all GSAP cinematics, clears VFX/towers/enemies/ghosts, resets `beaconHp = 20`, `gold = 260`, `crystals = 0`, `kills = 0`, `waveIndex = 0`, `rewardClaimed = false`. When `playIntro = false`, skips Stage 1 fly-in and enters `mode = 'playing'` in `< 2ms`. |
| `selectPadOrTower(padId)` | `(padId: string \| null): void` (`376-418`) | Selects/deselects pad; if called during `mode === 'opening'`, gracefully skips intro into `'playing'`. Prefer genuine `page.mouse.click(pt.x, pt.y)` / `page.touchscreen.tap(pt.x, pt.y)` in opaque-box tests! |
| `previewOrBuildTower(type, confirmImmediately?)` | `(type: TowerType, confirmImmediately = false): boolean` (`424-490`) | First call (`confirmImmediately=false`) previews 3D ghost + range ring; second call or `confirmImmediately=true` deducts gold and builds T1 tower. **M2 Note**: M2 adds `if (this.mode !== 'playing') return false;` guard (`F7`). |
| `upgradeSelectedTower()` | `(): boolean` (`492-555`) | Upgrades selected tower (`T1->T2->T3` stays in `mode = 'playing'`; `T3->T4` enters `mode = 'legendary_reveal'`). |
| `sellSelectedTower()` | `(): boolean` (`557-580`) | Refunds `Math.round(totalInvestedGold * 0.75)`, removes 3D rig, frees pad. Allowed in `'playing'` and `'paused'`. |
| `startNextWave()` | `(): boolean` (`582-628`) | Starts current wave (`1..8`); if in `'opening'`, cancels intro and starts Wave 1. |
| `toggleSpeed()` | `(): 1 \| 2` (`630-635`) | Toggles `speedMultiplier` between `1` and `2`. |
| `togglePause()` | `(): boolean` (`637-651`) | Toggles `mode` between `'playing'` (`true`) and `'paused'` (`false`); no-op in other modes. |
| `toggleMute()` | `(): boolean` (`653-657`) | Toggles WebAudio master mute and persists `lunar_beacon_td_muted_v2` in `localStorage`. |
| `toggleFullscreen()` | `(): void` (`235-252`) | Calls `host.requestFullscreen()`, falling back on rejection (e.g. sandboxed iframe) to toggling `#app.expanded-embed` (`740px` height) + `handleResize()`. |
| `claimVictoryRewards()` | `(): boolean` (`662-686`) | Valid only when `mode === 'victory_panel' && !rewardClaimed`; transitions `victory_panel -> reward_claiming -> reward_claimed`, granting `+320` gold & `+8` crystals. |
| `computeBaseCameraPose()` | `(): { pos: THREE.Vector3; lookAt: THREE.Vector3 }` (`286-305`) | Returns stable 3/4 camera pose for current `camera.aspect`. |

### 1.4 Exact `UISnapshot` Return Schema (`src/types.ts:212-266`)
```ts
interface UISnapshot {
  mode:
    | 'opening'           // Stage 1 ~1.75s fly-in & sequential lamp boot
    | 'playing'           // Active build / prep / wave combat (including T2/T3 upgrades!)
    | 'paused'            // Pause modal open; simulation frozen
    | 'legendary_reveal'  // Stage 2C Tier-4 golden hero reveal (~2.6s; simulation paused!)
    | 'boss_intro'        // Stage 3 Wave 8 Boss fissure/suction/slam entrance (~2.8s; simulation paused!)
    | 'victory_cinematic' // Stage 4B/5A Boss chain-explosion -> Beacon beam -> 3D chest drop (~2.45s)
    | 'victory_panel'     // Victory screen shown; awaiting #btn-claim-rewards or 3D chest click
    | 'reward_claiming'   // Stage 5B clasp pop + lid swing + 3D coin/crystal fountain (~1.25s)
    | 'reward_claimed'    // Rewards credited; #btn-play-again shown
    | 'defeat';           // Beacon HP reached 0; #defeat-modal shown
  beaconHp: number;       // 0..20 (starts at 20)
  maxBeaconHp: number;    // 20
  gold: number;           // starts at 260
  crystals: number;       // starts at 0
  waveNumber: number;     // 1..8 (1-indexed!)
  totalWaves: number;     // 8
  waveInProgress: boolean;
  kills: number;
  speedMultiplier: 1 | 2;
  muted: boolean;
  onboardingStep: 'select_pad' | 'build_tower' | 'start_wave' | 'done';
  selectedPadId: string | null; // 'pad_01'..'pad_10' | null
  previewTowerType: 'autocannon' | 'mortar' | 'magnetic' | null;
  selectedTower: {
    id: string;           // 'tower_1', ...
    padId: string;        // 'pad_01'..'pad_10'
    type: 'autocannon' | 'mortar' | 'magnetic';
    name: string;         // '联装机炮' | '脉冲迫击炮' | '磁场约束塔'
    tier: 1 | 2 | 3 | 4;
    tierName: string;     // '临时装配' | '标准战备' | '精英模块' | '传说机甲'
    tierHex: string;      // '#2ECC71' | '#3B82F6' | '#A855F7' | '#F59E0B'
    damage: number;
    fireInterval: number;
    range: number;
    splashRadius: number;
    slowRatio: number;
    slowDuration: number;
    sellRefund: number;   // Math.round(totalInvestedGold * 0.75)
    canUpgrade: boolean;  // tier < 4
    upgradeCost: number | null;
    nextTierName: string | null;
    nextTierHex: string | null;
    nextDamage: number | null;
    nextFireInterval: number | null;
    nextRange: number | null;
    nextSpecialDelta: string | null;
    partHeadline: string | null;
    isStunned: boolean;   // true during 2.2s Boss ground-slam stun
  } | null;
  bossStatus: {
    name: string;         // '最终Boss·巨颚号履带采掘母机'
    hp: number;
    maxHp: number;
    telegraphing: boolean; // true during 1.25s Boss active skill wind-up + red circle
  } | null;
  rewardSummary: {
    stars: 1 | 2 | 3;     // beaconHp >= 18 -> 3, >= 10 -> 2, else 1
    bonusGold: number;    // 320
    bonusCrystals: number;// 8
    claimed: boolean;
    totalCommendations: number;
  };
}
```

### 1.5 Safe Arbitrary World-to-Screen Projection Helper (No `window.THREE` Needed)
Because `g.projectWorldToScreen` expects a `THREE.Vector3` instance (and `window.THREE` is not global), any test needing to project arbitrary 3D points (such as outer bounding edges of Mine Entrance `(-14.13, 0.8, -3.2)` / Return Beacon `(+14.70, 0.8, 2.4)` for `F16`, or 3D Supply Chest `(g.env.supplyChest.group.position)` for `F14`) MUST use `g.camera.position.clone().set(x, y, z)`:
```js
function projectWorldPoint(page, x, y, z) {
  return page.evaluate(({ x, y, z }) => {
    const g = window.__LUNAR_BEACON_GAME__;
    g.camera.updateMatrixWorld();
    const v = g.camera.position.clone().set(x, y, z).project(g.camera);
    const rect = g.canvas.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) * 0.5) * rect.width,
      y: rect.top + ((-v.y + 1) * 0.5) * rect.height,
      ndcZ: v.z,
    };
  }, { x, y, z });
}
```

### 1.6 Scene Inspection Fields vs Concurrent M1/M2 Changes
When inspecting 3D/render internals via `page.evaluate(() => window.__LUNAR_BEACON_GAME__...)` for features `F1`–`F6` where pure DOM assertions cannot observe WebGL geometry/shaders:
- **Stable across M1 & M2**:
  - `g.renderer.getPixelRatio()` (`=== 1`), `g.renderer.capabilities.isWebGL2` (`=== true`).
  - `g.composer.supersampleScale` (`=== 1.5`), `g.composer.ssWidth`, `g.composer.ssHeight`, `g.composer.normalDepthRT`, `g.composer.msaaSceneRT`.
  - `g.solidScene` (Layer 0 outlined toon meshes; Layer 1 un-outlined `shadowBlob`, `slowRing`, `hpBarGroup`, `skyBeam`) & `g.vfxScene` (un-outlined `rangeRing`, `selectRing`, `tracers`, `mortarShells`, `rings`, `sparks`, `pickups3D`, `bossWarningMesh`).
  - `g.env` (`{ pads, beacon: { group, dishGroup, coreMesh, statusLampMats, signalFins, skyBeam }, entrance: { group, hazardRotors, hazardLampMats, fissureGroup, fissureMat }, rangeRing, selectRing, legendaryBackdrop, supplyChest: { group, lidPivot, claspMesh, innerGlow } }`).
  - `g.towers` (`Map<padId, TowerInstance>`) & `g.enemies` (`EnemyInstance[]`).
- **Changing in M1 & M2 (Design Tests Accordingly!)**:
  1. **M1 `ToonOutlineComposer.setSize` (Contract 3 / `F6`)**: Pre-M1 `canvas.width === cssWidth`; Post-M1 `canvas.width === ssWidth` (`1.5x` CSS width, capped at `3200`) while `canvas.clientWidth === cssWidth`. Always use `gl.drawingBufferWidth` / `gl.drawingBufferHeight` for `gl.readPixels`, and `canvas.getBoundingClientRect()` for pointer input.
  2. **M1 `#1A1033` Post-Tonemapping Outline (`F6`)**: Pre-M1 ACESFilmic crushes `#1A1033` (`rgb(26,16,51)`) to `#150628` (`rgb(21,6,40)`); Post-M1 outputs `#1A1033` (`rgb(26,16,51)` ± 4 per channel per Contract 3).
  3. **M1 `TowerRig` Additions (Contract 1 / `F2`, `F4`)**: Adds `rig.idleCore` on all 3 towers, T3 secondary sub-parts (`partHeadline`), Magnetic `weaponPitch.children.length > 0`, and `flap.userData.{hingeAxis, openAngle, restAngle}`.
  4. **M1/M2 Deferred Tier Color Ignition (`F3`)**: Tier color on `coreMaterial` / `tierTrimMat` switches at `lockEnd` (~`0.55s`) on T2/T3 and `climaxAt` (~`1.2s`) on T4 rather than `t = 0`. Wait `>= 0.7s` (or until `mode === 'playing'` for T4) before checking tier accent colors.
  5. **M2 Numerical Rebalance (`F9`)**: `autocannon` T3/T4 cost/DPS and Wave 6–8 enemy/Boss stats will be tuned so `1x T4` fails on ALL 10 pads while mixed defense wins. **Never hardcode T2–T4 tower damage/cost constants from pre-M2 `gameConfig.ts`!** Read `snap.selectedTower.upgradeCost`, `snap.selectedTower.damage`, and `snap.selectedTower.sellRefund` dynamically!
  6. **M2 Wave 8 Boss Settlement (`F8`)**: Killing Wave 8 Boss will award Wave 8's `+200G / +4💎` clear bonus in addition to Boss's `+260G / +5💎` and remove stragglers immediately. Snapshot `preClaim = g.getSnapshot()` AFTER `mode === 'victory_panel'` before clicking `#btn-claim-rewards` to assert `+320G` and `+8💎`!
  7. **M2 Preview Iframe Full-Height Sizing (`F17`)**: Pre-M2 clamps `1200x920` iframes to `580px`; Post-M2 promotes `http(s):` & `innerHeight > 600` preview iframes to `100%` (`920px`) while keeping `0px`-init `<agent-embed>` at `580px`.

---

## 2. Complete DOM Selector Reference & Contract 4 Discrepancy Audit

### 2.1 Discrepancy Resolution Table (`plan.md:70` vs Actual `index.html` + `src/ui/UIManager.ts`)
> **WARNING FOR TEST WRITER**: `plan.md` line 70 contains 10 approximate/legacy selector names that **DO NOT MATCH** `src/ui/UIManager.ts` (and M2 is instructed NOT to rename existing DOM IDs!). Use **ONLY** the **Actual Selector** column below:

| Concept | `plan.md` Line 70 Name | Status in Code | **100% Real Selector(s) in `index.html` & `UIManager.ts`** | Line Ref |
|---|---|---|---|---|
| Beacon HP HUD | `#hud-hp` | **DOES NOT EXIST** | Plate: **`#pill-beacon`** · Value text (`20/20`): **`#val-beacon`** | `UIManager.ts:86-90` |
| Gold HUD | `#hud-gold` | **DOES NOT EXIST** | Plate: **`#pill-gold`** (shakes w/ `.shake-warn`) · Value (`260`): **`#val-gold`** | `UIManager.ts:91-95, 161` |
| Crystals HUD | `#hud-crystals` | **DOES NOT EXIST** | Plate: **`#pill-crystal`** · Value (`0`): **`#val-crystals`** | `UIManager.ts:96-100` |
| Wave HUD | `#hud-wave` | **DOES NOT EXIST** | Plate: **`#pill-wave`** · Value (`1/8`): **`#val-wave`** | `UIManager.ts:101-104` |
| Kills HUD | `#hud-kills` | **DOES NOT EXIST** | Plate: **`#pill-kills`** · Value (`0`): **`#val-kills`** | `UIManager.ts:105-108` |
| Build Cards | `.build-card[data-tower="..."]` | **WRONG CLASS** | **`#btn-card-autocannon`**, **`#btn-card-mortar`**, **`#btn-card-magnetic`** (or **`.tower-mini-card[data-tower="autocannon"\|"mortar"\|"magnetic"]`**) | `UIManager.ts:480-490` |
| Selected Tower Panel | `#tower-panel` | **DOES NOT EXIST** | **`#tower-inspector`** (`section.tactical-sheet#tower-inspector`) | `UIManager.ts:380` |
| T4 Legendary Banner | `#legendary-banner` | **DOES NOT EXIST** | Reveal slam title: **`#upgrade-stamp.legendary`** · Inspector T4 plaque: **`#legendary-max-badge`** | `UIManager.ts:194, 418` |
| Boss Alert / Bar | `#boss-alert` | **DOES NOT EXIST** | Intro/wave banner: **`#banner-slot .wave-banner-card`** · Active Boss HP bar: **`#boss-hud-bar`** · Telegraph warning: **`#boss-hud-bar .boss-skill-warn`** | `UIManager.ts:211, 271, 281` |
| Defeat Modal | `#defeat-screen` | **DOES NOT EXIST** | **`#defeat-modal`** (`div.modal-mask#defeat-modal`) | `UIManager.ts:581` |

### 2.2 Complete Verified DOM Catalog (`index.html` + `src/ui/UIManager.ts`)

#### A. Root & Top Bar (`index.html:17-20`, `UIManager.ts:83-117`)
- `html`: gets `.is-top-window` when `window.self === window.top` (`main.ts:19`; M2 may also add `.is-full-pane` or extend `.is-top-window` for host-sized preview iframes).
- `#app`: main game container (`580px` default height in `<agent-embed>`, `740px` with `.expanded-embed`, `100%` in top-window / full-pane).
- `#game-canvas`: WebGL2 `<canvas aria-label="月面采矿站3D机甲塔防战场">`.
- `#ui-layer`: HUD overlay flex container (`pointer-events: none` root; interactive children `pointer-events: auto`).
- `#hud-top-bar`: `<header class="hud-top-bar">`:
  - `.hud-stats-group`:
    - `#pill-beacon` > `#val-beacon` (`"20/20"`, inline `color: rgb(255, 90, 103)` when `beaconHp <= 6`).
    - `#pill-gold` (`.shake-warn` on insufficient gold) > `#val-gold` (`"260"` — **Note**: animates over `320ms` via `rollNumber()` on change!).
    - `#pill-crystal` > `#val-crystals` (`"0"` — animates over `320ms` via `rollNumber()`).
    - `#pill-wave` > `#val-wave` (`"1/8"`).
    - `#pill-kills` > `#val-kills` (`"0"`).
  - `.hud-ctrl-group`:
    - `#btn-speed`: text `"1x"` or `"2x"`, toggles `.active-toggle` when `2x`.
    - `#btn-mute`: toggles `.muted-toggle` and swaps speaker SVG when `muted === true`.
    - `#btn-fullscreen`: `.enamel-icon-btn.hide-narrow` (`display: none` at `@media (max-width: 720px)`).
    - `#btn-pause`: opens `#pause-modal` when `mode === 'playing'`.

#### B. Center Alerts, Boss Bar, Upgrade Stamp & Toast (`UIManager.ts:119-220, 268-288`)
- `#hud-alerts` (`.hud-center-Overlay`):
  - `#boss-bar-slot`: empty unless `snap.bossStatus !== null`; renders `#boss-hud-bar` (`.boss-hud-card`) with `.boss-hud-top` (`name` + `hp / maxHp`), `.boss-hp-fill` (`style="width:XX.X%"`), and conditional `.boss-skill-warn` (`⚠ 液压重锤蓄力中 · 注意地面红圈范围震击！`).
  - `#banner-slot`: renders `.wave-banner-card` > `.wave-banner-title` + `.wave-banner-sub` on wave start (`2400ms`), wave clear (`2100ms`), Stage 3 Boss intro, and Stage 5A Beacon activation.
  - `#stamp-slot`: renders `#upgrade-stamp` (`.upgrade-stamp-wrap`, plus `.legendary` on T4) > `.stamp-title-row` (`.stamp-char` spans) + `.stamp-deltas-row` (`.delta-chip` spans like `伤害 ▲+10`). Auto-clears after `1550ms` (normal T2/T3) or `2600ms` (T4 legendary).
  - `#toast-slot`: renders `#insufficient-toast` (`.short-feedback-pill.warn`, text `"金币不足 · 还差 ${missing}"`) for `1450ms`.

#### C. Bottom Dock: Onboarding, Start Wave, Build Tray & Tower Inspector (`UIManager.ts:126-130, 290-537`)
- `#hud-bottom-dock`:
  - `#onboarding-slot` > `#onboarding-guide` (`.onboarding-strip`): visible ONLY when `mode === 'playing' && onboardingStep !== 'done' && !waveInProgress`. Contains 3 `.ob-step` spans (`① 选择基座`, `② 建造防御塔`, `③ 开始防守`) with `.active` / `.done` classes.
  - `#next-wave-slot` > `#btn-start-wave` (`.enamel-cta-btn.wave-start`): visible ONLY when `mode === 'playing' && !waveInProgress`. Text: `"▶ 开始防守 · 第 1 波"` on Wave 1, `"▶ 开始下一波 (N/8)"` on Waves 2–8.
  - `#tray-slot`:
    - **Empty Pad Selected (`#build-tray`)**:
      - `.pad-title-tag` (e.g. `"3号西湾内座"`).
      - Before card click: `.pad-sub-hint` (`"点选塔型预览3D模型与射程"`), **NO `#btn-confirm-build` yet!**
      - After clicking `#btn-card-autocannon` / `#btn-card-mortar` / `#btn-card-magnetic` (`.tower-mini-card[data-tower="..."]`, adds `.selected`, `.unaffordable` if `gold < cost`):
        - **`#btn-confirm-build`** appears! If affordable: enabled, text `"建造 脉冲迫击炮 (-120)"`. If unaffordable: **`disabled` attribute is `true`**, text `"金币不足 (90)"`, AND clicking the unaffordable card already triggered `#insufficient-toast` + `#pill-gold.shake-warn`!
      - `#btn-close-build`: closes `#build-tray` (`selectPadOrTower(null)`).
    - **Built Tower Selected (`#tower-inspector`)**:
      - `.tier-pill` (tier name + `background: ${tierHex}`), `.sheet-tower-name`, conditional `.stun-chip` (`"震荡停机中"`).
      - `#btn-close-sheet`: closes `#tower-inspector`.
      - Stats: `#ins-dmg`, `#ins-rate` (`X.X/s`), `#ins-rng` (`X.Xm`), `em.inline-up-pop` (`▲+...` right after upgrade), `.stat-kv.wide` (special trait text).
      - Upgrade action:
        - Tiers 1–3: **`#btn-upgrade-tower`** (`.enamel-upgrade-btn`). **SUBTLETY**: Does **NOT** use HTML `disabled` when unaffordable! Instead sets class **`.locked`** and attribute **`data-affordable="0"`** (vs `data-affordable="1"` when affordable). Clicking `#btn-upgrade-tower` when `data-affordable="0"` triggers `#insufficient-toast` + `#pill-gold.shake-warn` without upgrading!
        - Tier 4: `#btn-upgrade-tower` is replaced by **`#legendary-max-badge`** (`.max-tier-plaque`, text `"★ 传说机甲形态已完全解锁"`).
      - Sell action: **`#btn-sell-tower`** (`.enamel-sell-btn`, text `"出售"` + `<strong>+${sellRefund}</strong>`).

#### D. Modals (`#modal-slot`, `UIManager.ts:539-660`)
- **Pause (`mode === 'paused'`)**: `#pause-modal` > `#btn-resume` (`"继续战斗"`) + `#btn-restart-pause` (`"重新挑战"`).
- **Defeat (`mode === 'defeat'`)**: `#defeat-modal` > `.dialog-kicker` (`"BEACON OFFLINE"`) + `#btn-retry-defeat` (`"重整设备 · 重新挑战"`).
- **Victory & Reward Claim (`mode === 'victory_panel' | 'reward_claiming' | 'reward_claimed'`)**:
  - `#victory-screen` (`.victory-side-wrap`) > `.victory-stars` (`★★★` / `★★☆` / `★☆☆`), `.victory-stats-grid`, `.reward-chest-box` (adds `.claimed` after claim, plus `.commendation-note`).
  - Before/during claim: **`#btn-claim-rewards`** (`disabled` while `mode === 'reward_claiming'`, text `"开启补给箱 · 领取奖励"` -> `"正在开启3D补给箱..."`). Note: Player can ALSO claim by clicking the 3D Supply Chest mesh on `#game-canvas`!
  - After claim (`mode === 'reward_claimed'`): `#btn-claim-rewards` is replaced by **`#btn-play-again`** (`"完成领奖 · 再次挑战"`).

---

## 3. Playwright + Chromium WebGL2 Harness Architecture (`tests/e2e_tiers.mjs`)

### 3.1 Chromium Binary & Headless WebGL2 Launch Configuration
- **Binary**: `/usr/bin/chromium` (`Chromium 156.0.8078.79`, verified present & working with `playwright-core@^1.65.1`).
- **Mandatory Launch Args**:
  ```js
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
    ],
  });
  ```

### 3.2 Server / URL Resolution & Safe Ephemeral Fallback Server
`tests/e2e_tiers.mjs` MUST NEVER kill, restart, or bind port `5173` (preserving the persistent `vite preview --host 0.0.0.0 --port 5173` daemon):
1. Resolve candidate URL: `const requestedUrl = process.env.E2E_URL || process.env.GAME_URL || 'http://127.0.0.1:5173';`.
2. Probe `requestedUrl` with an HTTP `GET` (`fetch(requestedUrl, { signal: AbortSignal.timeout(2500) })`), checking `res.ok` (`200`) and body containing `id="game-canvas"`.
3. **If reachable**: use `requestedUrl` directly (`ephemeralServer = null`).
4. **ONLY if unreachable**: start an in-process Node `node:http` static file server rooted at `/home/antigravity/GOD-OF-PPT/tdk/dist` bound to `server.listen(0, '127.0.0.1')` (ephemeral OS-assigned port):
   - Serve `/` -> `dist/index.html`, resolve path safely (`path.resolve(DIST_DIR, '.' + pathname)` starting with `DIST_DIR`), and set accurate `Content-Type` headers (`.html`, `.js`, `.mjs`, `.css`, `.svg`, `.json`, `.png`).
   - Set `activeUrl = http://127.0.0.1:${server.address().port}`.
   - In the top-level `finally` block: `if (ephemeralServer) await new Promise((resolve) => ephemeralServer.close(resolve));`.

### 3.3 CLI Flag Parser, Screenshot Directory & Structured Reporter
- **CLI Flag**: Parse `process.argv.slice(2)` for `--tier=1|2|3|4|all` (and `--tier <val>`). Default to `'all'`. Reject unknown values with exit code `2`.
- **Screenshots**: Write diagnostic & milestone PNGs to `/tmp/tdk_e2e_tiers_shots` (`fs.mkdirSync('/tmp/tdk_e2e_tiers_shots', { recursive: true })`), plus auto-capture `FAIL_<testId>.png` on any assertion failure.
- **Structured Per-Tier Reporter**:
  - Group tests by `tier` (`1`, `2`, `3`, `4`).
  - Print `[PASS] [Tier X] <id> (<duration>ms) — <title>` / `[FAIL] [Tier X] <id> — <error>`.
  - Print per-tier pass/fail/duration summary table at exit and fail (`process.exit(1)`) if **any** test fails OR if **any** uncaught `pageerror` / unexpected `console.error` occurs across any context.

### 3.4 Context Pooling & Clean Reset Strategy (`< 90s` Total Runtime Guarantee)
- **Why Context Pooling Matters**: SwiftShader WebGL2 shader compilation (`MeshToonMaterial` + `onBeforeCompile` Fresnel rim + 5-pass `ToonOutlineComposer`) takes `~1.1s` per fresh `newPage()`. Spawning 120 separate pages would take `>130s` and risk SwiftShader memory exhaustion.
- **Fast Warm-Page Reset (`< 10ms` per test, zero state pollution)**:
  Note that `g.startNewMission(false)` resets towers, enemies, gold (`260`), HP (`20`), crystals (`0`), kills (`0`), and waves (`1`), **but does NOT reset** `speedMultiplier`, `muted`, `onboardingStep`, `localStorage`, `#app.expanded-embed`, or active UI toast/stamp timers! Therefore, `resetGamePage(page)` MUST run:
  ```js
  async function resetGamePage(page) {
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      const app = document.getElementById('app');
      app?.classList.remove('expanded-embed');
      const g = window.__LUNAR_BEACON_GAME__;
      if (g.getSnapshot().speedMultiplier === 2) g.toggleSpeed();
      if (g.getSnapshot().muted) g.toggleMute();
      g.onboardingStep = 'select_pad';
      g.startNewMission(false);
      for (const sel of ['#stamp-slot', '#toast-slot', '#banner-slot']) {
        const el = document.querySelector(sel);
        if (el) el.innerHTML = '';
      }
    });
  }
  ```
- **6-Context Pool Allocation (~35–48s total across all 4 tiers)**:
  1. `desktopPoolCtx` (`1440x900`, `dpr: 1`): Verifies Stage 1 fresh boot (`opening -> playing`), then serves warm `resetGamePage(page)` for all Tier 1–3 desktop mechanic/UI/shader tests (~100 tests in ~15s!).
  2. `tier4CampaignCtx` (`1440x900`, `dpr: 1`): Dedicated fresh boot for Tier 4 full zero-cheat 8-wave campaign victory -> reward claim -> play again -> 1-tower solo balance defeat -> defeat retry (~15s).
  3. `mobilePortraitCtx` (`390x844`, `dpr: 2, isMobile: true, hasTouch: true`) + resize check at `360x800`: Verifies `F16` portrait framing, `.hud-top-bar` non-overflow, Stage 2C/5 portrait camera framing, and real `touchscreen.tap` loop (~5s).
  4. `agentEmbedCtx` (`1024x768`): Hosts `<iframe sandbox="allow-scripts" style="width:100%;height:0px">` with `srcdoc = starforge_ark_cradle.html` (`F17` zero-collapse & zero-CDN check, ~3s).
  5. `sidePaneIframeCtx` (`1280x960`): Hosts `<iframe style="width:1200px;height:920px;border:0">` testing both `:5173` bookmark preview and `starforge_ark_cradle.html` full-height fill (`>= 900px`, NOT `580px`, ~3s).
  6. `offlineStandaloneCtx` (`1280x800`, `route(/^https?:/i, r => r.abort())`): Opens `file:///.../starforge_ark_cradle.html` with all HTTP/HTTPS aborted and plays through build + Wave 1 clear (`F17`/`F18`, ~3s).

---

## 4. Exact Mechanics for Preview, Pixel & Playthrough Verification (`F6`, `F9`, `F17`, `F18`)

### 4.1 `F17` & `F18`: Four Mandatory Preview / Artifact Checks
1. **Persistent `:5173` & `.url.json` Bookmark Check**:
   - Read `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/Starforge Ark Cradle.url.json`, assert `url === 'http://localhost:5173'`.
   - Perform `fetch('http://127.0.0.1:5173/')`, assert `status === 200` and HTML includes `game-canvas`.
2. **`<agent-embed>` `0px`-Initial-Height `sandbox="allow-scripts"` Iframe Check**:
   - Read `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html`.
   - Assert zero external URLs in `<script src>`, `<link href>`, or CSS `url(http...)`; assert `data:image/svg+xml;base64,` favicon.
   - Intercept `agentEmbedCtx.route('**/*', ...)` to record & abort any `http:`/`https:` request.
   - Mount `<iframe id="embed" sandbox="allow-scripts" style="width:100%;height:0px;border:0"></iframe>` on `about:blank` and assign `iframe.srcdoc = htmlString`.
   - Access the sandboxed child frame via Playwright CDP (`const childFrame = page.frames().find(f => f !== page.mainFrame())`) — works cleanly even with `null` origin where `iframe.contentDocument` is blocked!
   - Wait for `window.__LUNAR_BEACON_GAME__` inside `childFrame`, then assert **before resizing the host iframe**:
     - `document.documentElement.scrollHeight >= 580` (zero `0px` collapse!).
     - `#app.getBoundingClientRect().height >= 580`.
     - `externalRequests.length === 0` and `0` console/page errors (verifying `localStorage` `SecurityError` is caught).
   - Sync `iframe.style.height = scrollHeight + 'px'`, click `#btn-fullscreen` inside `childFrame`, and verify `#app.expanded-embed` expands `scrollHeight` to `740px`.
3. **`1200x920` Host-Sized Side-Pane & Bookmark `<iframe>` Full-Height Check**:
   - Mount `<iframe id="pane" style="width:1200px;height:920px;border:0;display:block"></iframe>` in a `1280x960` host page.
   - Test both `src="${activeUrl}"` (`:5173` bookmark preview) and `srcdoc = htmlString` (IDE side-pane HTML artifact preview).
   - In `childFrame`, assert `#app.getBoundingClientRect().height >= 900` (specifically `920`, NOT clamped at `580px`!).
4. **Offline `file://` Standalone Playable Loop**:
   - Block all `http:`/`https:` via `offlineCtx.route(/^https?:/i, route => route.abort())`.
   - `await page.goto('file:///home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html')`.
   - Skip/finish opening, click `pad_03` -> `#btn-card-mortar` -> `#btn-confirm-build` -> `#btn-start-wave`, step Wave 1 to completion, assert `waveNumber === 2 && kills === 7` with `0` blocked network calls and `0` errors.

### 4.2 `F6`: Deterministic WebGL2 `#1A1033` Outline Pixel Readback
Because Three.js defaults to `preserveDrawingBuffer: false`, read WebGL pixels **immediately after a synchronous `g.composer.render(...)` call inside the same `page.evaluate()`**:
```js
const outlineSample = await page.evaluate(() => {
  const g = window.__LUNAR_BEACON_GAME__;
  g.composer.render(g.solidScene, g.vfxScene, g.camera);
  const gl = g.renderer.getContext();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  // Sample a horizontal/vertical patch over a built tower on pad_03 to detect #1A1033 (rgb(26, 16, 51) ± 4)
  const pt = g.getPadScreenCoordinates('pad_03');
  const rect = g.canvas.getBoundingClientRect();
  const cx = Math.round(((pt.x - rect.left) / rect.width) * w);
  const cy = Math.round(((rect.bottom - pt.y) / rect.height) * h); // WebGL Y is bottom-up!
  const patchR = 45;
  const x0 = Math.max(0, cx - patchR), y0 = Math.max(0, cy - patchR);
  const pw = Math.min(w - x0, patchR * 2), ph = Math.min(h - y0, patchR * 2);
  const buf = new Uint8Array(pw * ph * 4);
  gl.readPixels(x0, y0, pw, ph, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let exact1A1033Count = 0;
  for (let i = 0; i < buf.length; i += 4) {
    if (Math.abs(buf[i] - 26) <= 4 && Math.abs(buf[i + 1] - 16) <= 4 && Math.abs(buf[i + 2] - 51) <= 4) {
      exact1A1033Count++;
    }
  }
  return { w, h, cssW: rect.width, cssH: rect.height, dpr: g.renderer.getPixelRatio(), exact1A1033Count };
});
```

### 4.3 `F9` & `F18`: Adaptive Zero-Cheat 8-Wave Campaign Blueprint (Tier 4)
To guarantee Tier 4's zero-cheat playthrough succeeds cleanly both before and after M2's `15–25%` cost/HP rebalance without EVER calling `debugAddGold`:
1. Drive **all** builds, upgrades, wave starts, reward claims, and replays via genuine Playwright clicks (`page.mouse.click(padPt.x, padPt.y)`, `page.click('#btn-card-...')`, `page.click('#btn-confirm-build')`, `page.click('#btn-upgrade-tower')`, `page.click('#btn-start-wave')`).
2. Use an **ordered tactical build/upgrade wish-list** executed between waves (and mid-wave when gold accumulates) whenever `snap.gold >= requiredCost` (read dynamically from `getSnapshot()` / UI cards, never hardcoded):
   - Step 1 (Wave 1 prep, `260G`): Build `mortar` on `pad_03` + `autocannon` on `pad_01`.
   - Step 2 (Wave 2 prep): Build `magnetic` on `pad_06` (central hairpin slow coverage).
   - Step 3 (Waves 3–4): Build `mortar` on `pad_08`, build `autocannon` on `pad_05`, upgrade `pad_03` (`mortar` -> T2), `pad_06` (`magnetic` -> T2), `pad_01` (`autocannon` -> T2).
   - Step 4 (Waves 5–6): Upgrade `pad_03` (`mortar` -> T3), `pad_06` (`magnetic` -> T3), `pad_05` (`autocannon` -> T2 -> T3), `pad_08` (`mortar` -> T2 -> T3), build `magnetic` on `pad_09` (-> T2).
   - Step 5 (Waves 7–8): Upgrade `pad_03` (`mortar` -> **T4 Legendary**, awaiting `legendary_reveal -> playing`), upgrade `pad_06` or `pad_05` (-> **T4 Legendary**, awaiting `legendary_reveal -> playing`), build `autocannon` on `pad_10` (-> T2/T3).
3. During Wave 8, step until `mode === 'boss_intro'` (capture Stage 3), wait for `mode === 'playing'`, step in `0.2s` increments to observe `bossStatus.telegraphing === true`, then step until `mode === 'victory_cinematic'` / `'victory_panel'`, snapshot `preClaim = getSnapshot()`, click `#btn-claim-rewards`, wait for `mode === 'reward_claimed'`, assert `gold === preClaim.gold + 320` and `crystals === preClaim.crystals + 8`, and click `#btn-play-again`!

### 4.4 Expected Pre-M1/M2 Failures When Running Against Current Unpatched `dist/`
Because the `E2E` track runs in parallel with `M1`/`M2` against the pre-remediation `dist/` and `starforge_ark_cradle.html`, **5 genuine requirement assertions SHOULD fail today against unpatched `dist/`** (proving the opaque-box suite catches real defects rather than tautologies) and pass 100% in Milestone `M3`:
1. **`F6` `#1A1033` Post-Tonemapping Outline Color & `1.5x` Canvas Buffer**: Currently `canvas.width === 1.0x` CSS and `#1A1033` is crushed to `#150628` (`rgb(21,6,40)`).
2. **`F9` Single-Tower T4 Solo Prevention Across Pads (`pad_03` / `pad_06`)**: Currently `1x Autocannon T4` on `pad_06` solos Wave 8 (`16/20` HP) until M2 rebalances `gameConfig.ts`.
3. **`F8` Wave 8 Boss Kill Bonus & Straggler Cleanup**: Currently Boss death skips Wave 8's `+200G / +4💎` bonus and leaves `dyingTimer > 0` stragglers frozen on the road.
4. **`F16` Desktop (`1440x900`) & Mobile (`390x844`) Outer Mesh Bounds Framing**: Currently Return Beacon outer edge (`x = +14.70m`) clips on both `1440x900` and `390x844`.
5. **`F17` `1200x920` Host-Sized Preview `<iframe>` Full-Height Fill**: Currently `#app` stays clamped at `580px` inside `1200x920` iframes until M2 updates `main.ts` / `style.css`.
