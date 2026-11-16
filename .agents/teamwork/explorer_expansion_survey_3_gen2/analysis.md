# Track 3 Technical Architecture Blueprint — Sector Command Hub UI, Engineer Tech Tree, Field Codex, Responsive Tactical HUD, Sandbox-Safe Persistence & Standalone Bundler Pipeline

**Core Summary**: This blueprint specifies a complete, zero-clutter tactile industrial-enamel UI expansion (`UIManager.ts`, `style.css`), a sandbox-safe versioned meta-progression save engine (`src/game/ProgressionManager.ts`), and a single-command standalone IIFE + `:5173` preview sync pipeline (`scripts/bundle_standalone.mjs`, `src/main.ts`, `package.json`). Every DOM container, pixel height budget (`1440×900` Desktop, `760×580` `<agent-embed>`, `360×800` / `390×844` Mobile Portrait), dirty-check signature, and `localStorage` fallback path is grounded in exact line references from the current codebase.

---

## 1. Empirical Baseline Audit of Existing UI, Persistence & Preview Pipeline

| Area | File & Line References | Current Observed Behavior & Constraints |
|---|---|---|
| **Bootstrap & Iframe Mode Detection** | `src/main.ts:11-21` `src/style.css:20-25, 54-76` | `isTopWindow = window.self === window.top` adds `html.is-top-window` (`height: 100%`). Default `#app` is `height: 580px` (`740px` with `.expanded-embed`). **Gap**: IDE Side-Pane Preview and `:5173` Bookmark Preview run inside host-sized `<iframe>` (`window.self !== window.top`, `innerHeight >= 600` or `http:` protocol), leaving `#app` stuck at `580px` instead of filling `100%` height. |
| **HUD Skeleton & Dirty-Signature Rendering** | `src/ui/UIManager.ts:81-156, 238-334` | `#ui-layer` (`z-index: 10`, `pointer-events: none`) contains `#hud-top-bar`, `#hud-alerts` (`top: 56px`), `#hud-bottom-dock` (`#onboarding-slot`, `#next-wave-slot`, `#tray-slot`), and `#modal-slot` (`z-index: 30`). Uses `lastTraySig` (`line 59`) and `lastModalSig` (`line 60`) so `updateSnapshot()` (`~7Hz` via `uiSyncTimer >= 0.14` at `GameEngine.ts:731-735`) never recreates active buttons mid-click. |
| **Enamel Design System & Touch-Scroll Trap** | `src/style.css:27-65, 139-235, 500-772` | Chunky `--outline-dark: #1a1033` borders (`2px–3px`), `--bevel-plate` / `--bevel-btn` top-left highlight + bottom-right shadow, zero external webfont URLs (`--font-heavy` uses local/system fallbacks, `lines 44-46`). **Critical Mobile Trap**: `#app` sets `touch-action: none` (`line 64`), which blocks vertical finger scrolling inside modals unless scrollable inner containers explicitly override `touch-action: pan-y`. |
| **Mobile Portrait (`360×800` / `390×844`) & Embed (`580px`) Budgets** | `src/style.css:930-1028` `src/game/GameEngine.ts:286-305` `tests/e2e.mjs:452-453` | On `<=720px` width, `.hud-top-bar` inner width on `360px` viewport is `344px`; existing 5 stat plates + 3 icon buttons consume `~328px` (`16px` slack). Also, `GameEngine.previewOrBuildTower(..., true)` (`lines 480-488`) keeps `selectedPadId` active after building, and `tests/e2e.mjs:452-453` taps `#btn-start-wave` immediately while `#tower-inspector` is open — so `#btn-start-wave` **must remain visible** even when `#tray-slot` is open. |
| **Scattered `localStorage` Calls** | `src/audio/AudioManager.ts:13, 26` `src/game/GameEngine.ts:117, 674` | Only `lunar_beacon_td_muted_v2` and `lunar_beacon_commendations_v1` are persisted via ad-hoc `try/catch`. `crystals` (`GameEngine.ts:80, 337`) resets to `0` on every `startNewMission()`. In `sandbox="allow-scripts"` (`<agent-embed>`), reading `window.localStorage` throws `SecurityError`. |
| **Standalone Bundler & `:5173` Server Status** | `scratch/bundle_standalone.mjs:1-74` `package.json:6-11` | `scratch/bundle_standalone.mjs` lies outside the repo, hardcodes `.../node_modules/vite/dist/node/index.js`, and bundles IIFE CSS+JS+base64 SVG into `starforge_ark_cradle.html` (`767.9 KB`, verified `0` external CDN URLs). **Operational Finding**: `ps aux` & `ss -tlnp` confirm **no `vite preview` process is currently listening on `:5173`** in this VM session, and `dist/` (`05:40Z`) is newer than `starforge_ark_cradle.html` (`04:40Z`). |

---

## 2. Tactile Industrial-Enamel UI Architecture (`界面清楚、有材质感，避免堆积小字和装饰`)

### 2.1 Strict Visual & Anti-Clutter Guardrails
1. **Material Language**: Reuse `--outline-dark: #1a1033`, `--panel-bg: rgba(25, 33, 56, 0.94)`, `--panel-inner: rgba(18, 24, 42, 0.92)`, `--bevel-plate`, and `--bevel-btn` (`src/style.css:28-53`). Every interactive surface has a `2px–2.5px` `#1A1033` stroke, rounded chamfer corners (`10px–18px`), specular top-left edge highlight, and `translateY(2px)` tactile press feedback.
2. **No Tiny-Text Walls (`>= 11.5px` Floor, Max 3 Data Points per Card)**:
   - Minimum font size anywhere in CSS: `11.5px` (`font-weight: 800`). Zero multi-sentence lore paragraphs (`REQ-010`, `REQ-028`).
   - Every card (Stage Node, Tech Module, Build Card, T4 Specialization Card, Codex Card) is capped at **Icon/Badge + Bold Title + 1 Crisp Metric/Tag + Action Pill**.
3. **2D SVG Hardware Icons Scoped Strictly to DOM UI**:
   - Crisp inline `<svg>` icons with `stroke="#1A1033" stroke-width="2.2"` are used strictly inside DOM enamel buttons/cards (matching `towerSvgIcon` at `UIManager.ts:5-26`), never in Three.js 3D space (`REQ-060`).
4. **DOM Dirty-Check Signatures (`UIManager.ts`)**:
   - Extend `UIManager` with `lastHubSig`, `lastSkillsSig`, and `lastTopSectorSig` alongside `lastTraySig` (`line 59`) and `lastModalSig` (`line 60`) so `updateSnapshot()` updates text/widths via `textContent`/`style.width` without re-mounting buttons during 60fps simulation.

---

### 2.2 Sector Command Hub Overlay (`星区作战指挥台`, `#sector-hub-modal`)

#### Boot Flow & Entry Points (Zero Friction, Smoke-Test Safe)
- **Non-Blocking Boot**: `GameEngine` continues to boot directly into the active mission (`stage_01` initially, `mode: 'opening' -> 'playing'`) so players immediately experience the Stage 1 3D Lunar Station fly-in and existing E2E selectors (`#onboarding-guide`, `#btn-start-wave`) work without a blocking title screen.
- **4 Seamless Entry Points to Open Hub (`ui.openHub(tab = 'campaign')`)**:
  1. **Top-Left HUD Sector Plaque (`#btn-open-hub`)**: `🗺 CH.01 曙光站` (shows pulsing cyan/amber notification pip `.hub-alert-pip` whenever `totalCrystals >= cheapestTechCost` or an unlocked Commendation is unclaimed).
  2. **Top HUD Crystal Plate (`#pill-crystal`, `UIManager.ts:97`)**: Make `#pill-crystal` clickable (`cursor: pointer`), opening the Hub directly to Tab 2 (`工程改装 Engineer Tech Tree`).
  3. **Pause & Defeat Modals (`#pause-modal`, `#defeat-modal`, `UIManager.ts:560-595`)**: Add secondary button `#btn-hub-from-modal` (`星区指挥台 · 科技改装`).
  4. **Victory Settlement Screen (`#victory-screen`, `UIManager.ts:603-650`)**: Once `isClaimed === true`, render:
     - Primary Gold-Cyan CTA **`#btn-next-sector`**: `▶ 下一战区 · {nextStageName}` (calls `engine.launchStage(nextStageId, true)` directly! For `stage_04`, launches `endless` `星区无尽超载`).
     - Side-by-side Secondary Row: **`#btn-hub-victory`** (`🛠 工程改装 / 星图`) + **`#btn-play-again`** (`再次挑战` — preserving exact `#btn-play-again` ID).
- **Auto-Pause Lifecycle**: Calling `ui.openHub(tab)` invokes `engine.setOverlayPause(true)` (freezes combat simulation while `mode === 'playing'` without triggering `#pause-modal`); closing Hub (`#btn-close-hub` or `Esc`) invokes `engine.setOverlayPause(false)`.

#### Modal Shell Layout (`#hub-slot`, `z-index: 35`)
- `.hub-modal-mask`: Full `#app` overlay (`background: rgba(12, 10, 26, 0.76); backdrop-filter: blur(5px); padding: 8px 12px; display: flex; align-items: center; justify-content: center; pointer-events: auto;`).
- `.hub-enamel-shell`: `width: min(860px, 100%); height: min(620px, calc(100% - 4px));` (`border: 3px solid #1a1033; border-radius: 18px; background: var(--panel-bg); box-shadow: var(--bevel-plate); display: flex; flex-direction: column; overflow: hidden;`).
  - On `580px` `<agent-embed>`, shell height is `560px`: `50px` fixed header + `510px` body.
  - On `360×800` mobile portrait, shell is `344×780px` with `.hub-body-scroll { flex: 1; overflow-y: auto; touch-action: pan-y; overscroll-behavior: contain; }`.
- **Fixed Header (`.hub-header`, `50px`)**:
  - Left: Emblem + `星区作战指挥台` (hidden `<480px` in favor of compact `指挥台`) + Crystal Reserve Pill `#hub-crystals-val` (`💎 {totalCrystals}`).
  - Center: 3 Chunky Tab Buttons (`role="tablist"`):
    1. `#hub-tab-btn-campaign`: `星区战役`
    2. `#hub-tab-btn-tech`: `工程改装` (+ `.pip-amber` when upgrade affordable)
    3. `#hub-tab-btn-codex`: `战地档案` (+ `.pip-green` when achievement claimable)
  - Right: `#btn-close-hub` (`✕`, `36×36px` enamel icon button).

#### Tab 1: `星区战役 (Sector Campaign)` (`#hub-panel-campaign`)
- **Control Strip (`36px`)**:
  - Left: Star tally `★ {totalStars}/12` · Endless Record `∞ 最高 W{endlessBestWave}`.
  - Right: **`"全战区演练解锁"` Toggle (`#btn-toggle-unlock-all`)**:
    - Chunky two-state industrial switch (`[ 🔓 全战区演练解锁: 已开启 / 已关闭 ]`).
    - Toggles `progression.setUnlockAllSandbox(!current)`. When ON, all 4 campaign stages + `Endless Overdrive` become immediately selectable and launchable regardless of prior clears, while still tracking genuine stars & first-clear `💎` rewards!
- **Interactive Lunar Star-Chart + Briefing Split**:
  - **Desktop & `<agent-embed>` (`> 680px`)**: `grid-template-columns: 1.15fr 1fr; gap: 12px;` (fits completely inside `460px` without scrolling).
  - **Mobile Portrait (`<= 680px`)**: Stacked (`156px` SVG+Node Lunar Route map above `stage-brief-card`).
  - **5 Interactive Sector Nodes** connected by SVG orbital transit lines (`stroke="#38bdf8"` unlocked, `stroke="#475569" stroke-dasharray="5 5"` locked):

    | `StageId` | Node Title | Waves | Mechanic Badge | First-Clear / 3★ Bonus `💎` |
    |---|---|---|---|---|
    | `stage_01` | `CH.01 曙光检修站` | `8 波` | `高地增程 · 晶簇矿脉` | 首通 `+10 💎` · 每星 `+2 💎` |
    | `stage_02` | `CH.02 双生裂谷矿井` | `10 波` | `双线汇流 · 月面电容塔` | 首通 `+14 💎` · 每星 `+3 💎` |
    | `stage_03` | `CH.03 磁轨发射回廊` | `10 波` | `加速磁轨 · 激光阻断闸` | 首通 `+18 💎` · 每星 `+3 💎` |
    | `stage_04` | `CH.04 终末方舟中枢` | `12 波` | `双门总攻 · 全域机关` | 首通 `+24 💎` · 每星 `+5 💎` |
    | `endless` | `EX 星区无尽超载` | `∞ 无限` | `动态狂潮 · 每5波首领` | 每5波结算 `+5 💎` |

  - **Selected Stage Briefing Card (`#stage-brief-card`)**:
    - Displays Stage Code + Name, `★ ★ ★` gold star plate (or `最高坚守: 第 N 波` for `endless`), 3 hardware chips (`波次`, `路线拓扑`, `专属机关`), First-Clear `💎` status pill, and chunky **`#btn-launch-stage` (`🚀 立即出击` / `🔄 重新部署`)** CTA!

#### Tab 2: `工程改装 (Engineer Tech Tree)` (`#hub-panel-tech`)
- **Top Strip (`36px`)**:
  - Left: `永久机甲工程强化 · 所有战区与无尽模式生效`
  - Right: **Free Respec Button `#btn-respec-tech`**: `↺ 重置晶簇` (enabled whenever `spentCrystals > 0`, displaying `全额返还 +${spentCrystals} 💎`; refunds 100% of spent crystals, resets levels to `0`, plays `audio.playTechRespec()`).
- **6 Permanent Upgrade Modules (`Lv.0–4`)** in a `3 × 2` Enamel Grid (`2 × 3` on `<=640px`, `1 × 6` on `<=400px`):

  | `TechUpgradeId` | Module Name | Level `0 → 4` Effect (Crisp 1-Line Stat) | Crystal Cost (`Lv.1..4`) |
  |---|---|---|---|
  | `kinetic_core` | **超导弹芯** | 全塔基础伤害 `+6% / +12% / +18% / +25%` | `4 / 7 / 11 / 16 💎` |
  | `servo_drive` | **液压伺服** | 全塔攻速 `+5%/Lv` · 射程 `+4%/Lv` | `4 / 7 / 11 / 16 💎` |
  | `requisition_pack` | **战前整备** | 开局初始金币 `+40 / +80 / +125 / +175` | `3 / 6 / 9 / 14 💎` |
  | `beacon_plating` | **信标装甲** | 信标耐久上限 `+4 / +8 / +12 / +16` (Lv.3+每波回1血) | `3 / 6 / 9 / 14 💎` |
  | `tactical_reactor` | **战术反应堆** | 初始战术能量 `+25/Lv` · 充能效率 `+10%/Lv` | `4 / 8 / 12 / 17 💎` |
  | `flux_resonator` | **磁暴谐振器** | 元素连携伤害 `+12%/Lv` · T4晋升费用 `-5%/Lv` | `5 / 8 / 12 / 18 💎` |

- Each card renders: SVG hardware icon + Name + `4` illuminated level pips (`▮▮▯▯ Lv.2/4`), 1-line `当前 → 下一级` stat delta, and `#btn-upgrade-tech-<id>` (`强化 · 💎 {cost}` or gold `★ MAX`). Instant click applies upgrade, rolls `#hub-crystals-val`, flashes green `▲` delta, and plays `audio.playTechUpgrade(newLv)`.

#### Tab 3: `战地档案 (Field Codex & Commendations)` (`#hub-panel-codex`)
- **4-Pill Segmented Sub-Nav (`34px`)**: `[ 防御机甲 ]` · `[ 失控敌械 ]` · `[ 战场机关 ]` · `[ 守护勋章 ]` (keeps every view scannable without long scrolling):
  1. **Friendly Mechs (`防御机甲`)**: 3 wide cards (`联装机炮 AC-01`, `脉冲迫击炮 PM-02`, `磁场约束塔 MR-03`), each showcasing weapon color swatch, synergy role (`[破甲裂隙]` / `[⚡磁暴共振]` / `[磁化标记]`), and **both Golden T4 Branch Badges (`T4-A` & `T4-B`)** dynamically read from `TOWER_BLUEPRINTS`.
  2. **Hostile Mining Mechs & Bosses (`失控敌械`)**: Clean cards for `失控巡检机`, `运输蜂群机`, `重甲钻探机`, `护盾悬浮艇`, `工程维修机`, `裂变巡检簇`, `精英·裂岩重钻`, and Stage Bosses — each showing **Threat Chip** + **1-Line Counter Tag**.
  3. **Interactive Stage Mechanisms (`战场机关`)**: 4 cards (`高地增程基座`, `3D晶簇富矿脉`, `月面电容塔`, `激光阻断闸门`) with SVG icon + effect badge (`+18%射程/+15%伤害`, `采集金币+💎`, `连锁闪电震击`, `激光减速灼烧`).
  4. **Commendation Achievements (`守护勋章`, 9 Unlockable Badges Granting Bonus `💎`)**:
     - `ach_ch1_clear` (`初阵告捷`: 通关第1战区, `+6 💎`)
     - `ach_flawless_3star` (`毫发无伤`: 任意战区3★满状态通关, `+8 💎`)
     - `ach_dual_t4` (`双轨传说`: 单局同时部署 T4-A 与 T4-B 传说机甲, `+8 💎`)
     - `ach_synergy_25` (`磁暴交响`: 累计触发 25 次跨塔连携, `+6 💎`)
     - `ach_skill_12` (`轨道火力官`: 累计释放 12 次指挥官战术技能, `+6 💎`)
     - `ach_mech_15` (`战地工程学`: 激活或采集战场机关 15 次, `+6 💎`)
     - `ach_all_sectors` (`月海守望者`: 通关全部 4 个星区章节, `+15 💎`)
     - `ach_10_stars` (`璀璨信标`: 累计摘取 10 颗战役星章, `+12 💎`)
     - `ach_endless_15` (`超载不灭`: 无尽超载坚守至第 15 波, `+15 💎`)
     - Each unlocked badge renders a gold **`领取 +X 💎` button (`#btn-claim-ach-<id>`)** with `audio.playAchievementClaim()`, turning into a green `✓ 已授勋` stamp once claimed.

---

## 3. Non-Overlapping In-Battle Tactical HUD Blueprint (Exact Pixel Budgets)

### 3.1 Top HUD Bar (`#hud-top-bar`, `src/ui/UIManager.ts:83-117`, `src/style.css:120-236`)
- **Structure**:
  - Prepend `#btn-open-hub` (`class="sector-hub-pill"`) to `.hud-stats-group`:
    - Desktop / `<agent-embed>` (`> 720px`): `🗺 CH.1 曙光站` (`height: 38px`, `34px` in `<=640px` embed) + `.hub-alert-pip`.
    - Mobile Portrait (`<= 720px`): Compact `🗺` SVG map icon + `.hub-alert-pip` (`32×30px`), and add `.hide-xs` (`@media (max-width: 440px) { display: none; }`) to `#pill-kills` (`kills` remains visible in Victory/Defeat/Pause dialogs and `getSnapshot().kills`).
  - **Mobile `360px` Horizontal Width Proof (`344px` inner width)**:
    - `#btn-open-hub` (`32px`) + `#pill-beacon` (`52px`) + `#pill-gold` (`46px`) + `#pill-crystal` (`38px`) + `#pill-wave` (`38px`) + gaps (`16px`) + `.hud-ctrl-group` (`#btn-speed` `30px` + `#btn-mute` `30px` + `#btn-pause` `30px` + `8px` gaps = `98px`) = **`320px <= 344px`** (`24px` clean margin, single `30px` row, zero line-wrap, zero font `< 12.5px`!).

### 3.2 Commander Tactical Skills Dock (`#commander-skills-dock`) + `#btn-start-wave` Coexistence
- **Placement inside `#hud-bottom-dock` (`UIManager.ts:126-130`)**:
  Replace lines `126-130` with:
  ```html
  <footer class="hud-bottom-dock" id="hud-bottom-dock">
    <div id="onboarding-slot"></div>
    <div class="hud-action-bar" id="hud-action-bar">
      <div id="skills-slot" class="skills-slot"></div>
      <div id="next-wave-slot" class="next-wave-slot"></div>
    </div>
    <div id="tray-slot" class="tray-slot"></div>
  </footer>
  ```
- **Anatomy of `#commander-skills-dock` (inside `#skills-slot`)**:
  - Compact brushed-enamel capsule (`height: 48px` desktop, `42px` on `<=640px` embed, `44px` on mobile):
    1. **Tactical Energy Gauge (`#tactical-energy-pill`)**: `⚡ {energy}/{maxEnergy}` with vertical/horizontal cyan-amber fill bar (`width: 64px`).
    2. **3 Tactile Skill Buttons** (with radial/linear cooldown sweep overlay + `[1]`/`[2]`/`[3]` keycap hint on desktop):
       - `#btn-skill-orbital_strike`: **轨道离子炮** (`⚡45` · CD `18s` — enters ground-reticle targeting mode; clicking map unleashes sky-beam AoE + stun; clicking again or `Esc` cancels).
       - `#btn-skill-emp_overdrive`: **超载脉冲** (`⚡35` · CD `16s` — instant cast: purges all tower EMP stuns, grants `+45%` tower attack speed for `6s`, strips enemy shields & applies `[磁化标记]`).
       - `#btn-skill-nano_repair`: **纳米矩阵** (`⚡40` · CD `22s` — instant cast: restores `+4` Beacon HP + drops emergency `+60` 3D Gold loot at Beacon).
- **Zero-Overlap Coexistence Rules Across All 3 Viewports**:
  1. **When NO Pad/Tower is Selected (`snap.selectedPadId === null` — 90% of active combat)**:
     - **Desktop `1440×900` & `<agent-embed>` `760×580`**: `.hud-action-bar` is `display: flex; flex-direction: row; align-items: center; gap: 10px;` — `#commander-skills-dock` and `#btn-start-wave` sit **side-by-side in a single `42px–48px` row**! Total bottom HUD height in `580px` `<agent-embed>` = **`42px`** (`7.2%` of screen height; southernmost pads at `y ≈ 395px` have **`>130px` clearance**!).
     - **Mobile Portrait `360×800` / `390×844`**: `.hud-action-bar` stacks `#next-wave-slot` (`38px`) above `#commander-skills-dock` (`44px`, full `344px` width with 3 roomy touch targets `>= 88×44px`). Total bottom height = `88px` (`y = 704px..792px`, **`>210px` below southernmost build pads** at `y ≈ 475px`!).
  2. **When a Build Pad or Tower IS Selected (`snap.selectedPadId !== null`)**:
     - `#hud-bottom-dock` gets class `.has-active-tray`.
     - CSS rule `.hud-bottom-dock.has-active-tray #skills-slot, .hud-bottom-dock.has-active-tray #onboarding-slot { display: none; }` hides ONLY the skills capsule and onboarding strip while the engineering sheet is open, **keeping `#btn-start-wave` (`36px` compact CTA) visible and clickable** right above `#tray-slot` (`112px`)!
     - Total bottom height while tray is open:
       - `580px` `<agent-embed>`: `36px + 6px + 110px = 152px` (`y = 420px..572px` — clears `z = 6.4` pads at `y ≈ 395px`!).
       - `360×800` / `390×844` Mobile Portrait: `38px + 6px + 122px = 166px` (`y = 626px..792px` — clears `z = 6.4` pads at `y ≈ 475px` by `150px` AND satisfies `tests/e2e.mjs:452-453`!).
  3. **Ground-Targeting Reticle Mode (`snap.targetingSkillId === 'orbital_strike'`)**:
     - Auto-deselects any open `#tray-slot` (`selectedPadId = null`), displays a crisp top-center prompt pill in `#hud-alerts` (`🎯 点选战场地面释放【轨道离子炮】 · [取消]`), renders a 3D cyan/gold targeting ring on `vfxScene` following pointer hover/tap, and intercepts the next `handleCanvasTap()` at `(hitPoint.x, hitPoint.z)`.

### 3.3 T3 → T4 Dual Specialization Branch Cards Inside `#tower-inspector` (`UIManager.ts:348-460`)
- **Tier 1 & Tier 2 (`tw.tier < 3`)**: Unchanged single `#btn-upgrade-tower` layout (`UIManager.ts:400-416`).
- **Tier 3 (`tw.tier === 3` — Ready for Legendary Promotion)**:
  - Move current tower stats into a crisp 1-line inline summary badge inside `.sheet-head` (`伤害 ${tw.damage} · 攻速 ${rateVal}/s · 射程 ${tw.range.toFixed(1)}m`) and replace the 2-column `.inspector-grid` with `.t4-specialization-row` (`display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px;`):
    - **Card A (`id="btn-upgrade-tower"` + `data-branch="A"`, class `enamel-t4-card branch-a`)**:
      - Header: `★ ${branchA.shortTitle}` + `<span class="cost-badge">● ${branchA.cost}</span>`
      - Tag (`11.5px` bold): `${branchA.mechanicTag}` (e.g. `高频穿甲 · 弱点暴击`)
    - **Card B (`id="btn-upgrade-tower-b"` + `data-branch="B"`, class `enamel-t4-card branch-b`)**:
      - Header: `★ ${branchB.shortTitle}` + `<span class="cost-badge">● ${branchB.cost}</span>`
      - Tag (`11.5px` bold): `${branchB.mechanicTag}` (e.g. `分裂弹幕 · 范围清群`)
    - **Sell Button (`#btn-sell-tower`)**: Compact vertical pill (`出售 +${tw.sellRefund}`).
  - **Why Keeping `id="btn-upgrade-tower"` on Branch A Matters**: `GameEngine.upgradeSelectedTower(branch: 'A' | 'B' = 'A')` defaults to `'A'`, and existing automated smoke scripts clicking `#btn-upgrade-tower` (`tests/e2e.mjs:200`) continue to trigger the Stage 2C Golden Legendary Reveal without breaking!
  - **Mobile `360px` Fit**: On `@media (max-width: 480px)`, `.t4-specialization-row` uses `grid-template-columns: 1fr 1fr` for the two T4 cards (`160px` wide each!) and places `#btn-sell-tower` as a compact `28px` pill next to `#btn-close-sheet` in `.sheet-head`, keeping total `#tower-inspector` height at **`118px`**!

### 3.4 Non-Occluding Floating Combo Callouts (`#combo-float-layer`)
- Add `<div id="combo-float-layer" class="combo-float-layer"></div>` inside `#ui-layer` (`position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 12;`).
- Expose `onComboPopup(worldPos: Vec3Like, text: string, colorHex: string)` on `EngineUICallbacks` (`GameEngine.ts:37-48`).
- Rate-limit to **at most 4 concurrent floating pills** (`min 320ms` cooldown per combo type), positioned at `engine.projectWorldToScreen(worldPos)` offset `-26px` Y, animating `translateY(-20px)` + fade out over `680ms` (`12px` `var(--font-heavy)`, `-webkit-text-stroke: 1.2px #1a1033`). Zero persistent screen clutter, zero enemy occlusion (`REQ-007`).

---

## 4. Sandbox-Safe Versioned Persistence (`src/game/ProgressionManager.ts`)

### 4.1 Sandbox `SecurityError` Failure Mode & Adapter Design
Inside `<agent-embed>`, the host iframe uses `sandbox="allow-scripts"` without `allow-same-origin` (opaque origin `'null'`). Accessing `window.localStorage` getter throws `DOMException: SecurityError` synchronously.

`src/game/ProgressionManager.ts` isolates ALL browser storage behind a safe probe + in-memory mirror:

```ts
const SAVE_STORAGE_KEY = 'lunar_beacon_save_v2';
const LEGACY_MUTE_KEY = 'lunar_beacon_td_muted_v2';
const LEGACY_COMMEND_KEY = 'lunar_beacon_commendations_v1';

interface SafeKVStore {
  readonly persistent: boolean;
  getItem(key: string): string | null;
  setItem(key: string, val: string): void;
}

function createSandboxSafeStore(): SafeKVStore {
  const mem = new Map<string, string>();
  try {
    const ls = window.localStorage;
    const probe = '__lunar_beacon_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      persistent: true,
      getItem: (k) => {
        try {
          return ls.getItem(k) ?? mem.get(k) ?? null;
        } catch {
          return mem.get(k) ?? null;
        }
      },
      setItem: (k, v) => {
        mem.set(k, v);
        try {
          ls.setItem(k, v);
        } catch {
          // QuotaExceededError or mid-session restriction: memory mirror stays intact
        }
      },
    };
  } catch {
    return {
      persistent: false,
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v);
      },
    };
  }
}
```

### 4.2 Versioned Save Schema & Legacy Migration
```ts
export type StageId = 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04' | 'endless';
export type TechUpgradeId =
  | 'kinetic_core'
  | 'servo_drive'
  | 'requisition_pack'
  | 'beacon_plating'
  | 'tactical_reactor'
  | 'flux_resonator';

export interface StageSaveEntry {
  unlocked: boolean;
  cleared: boolean;
  bestStars: 0 | 1 | 2 | 3;
  bestWave: number;
}

export interface CampaignSaveDataV2 {
  version: 2;
  totalCrystals: number;          // Persistent spendable 💎 bank
  spentCrystals: number;          // Exact 💎 invested in Tech Tree (for 100% lossless respec)
  totalCommendations: number;
  muted: boolean;
  unlockAllSandbox: boolean;      // "全战区演练解锁" switch
  activeStageId: StageId;
  stages: Record<StageId, StageSaveEntry>;
  techLevels: Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4>;
  seenCodexIds: string[];
  counters: {
    synergyTriggers: number;
    skillsUsed: number;
    mechanismsUsed: number;
    dualBranchCleared: boolean;
  };
  claimedAchievementIds: string[];
}
```

- **Key Integrity Rules**:
  1. **Dual Crystal Accounting (`runCrystals` vs `totalCrystals`)**:
     - During a mission, `GameEngine` tracks `runCrystalsEarned` (from elite/wave/vein/chest drops) AND immediately credits earned crystals into `ProgressionManager.addCrystals(delta)` (or displays `snap.crystals` during combat and banks first-clear + star bonus into `ProgressionManager` on wave clear / victory claim) so players NEVER lose earned `💎` even if they open the Hub mid-run or lose on Wave 7!
     - **Anti-Farm Balance Guard**: First-clear bonus (`+10..24 💎`) and per-new-star bonuses (`bestStars` delta) are awarded strictly once per stage/star threshold, while replays still grant `2–4 💎` chest completion crystals so replaying for Tech Tree upgrades feels rewarding without infinite instant farming.
  2. **Legacy Migration**: If `lunar_beacon_save_v2` is absent, `ProgressionManager` reads `lunar_beacon_td_muted_v2` (`AudioManager.ts:3`) and `lunar_beacon_commendations_v1` (`GameEngine.ts:35`) via `store.getItem(...)`, preserving mute state and converting prior commendations into starting `totalCommendations` (`+8 💎` per prior commendation).
  3. **`AudioManager` Consolidation**: `AudioManager` accepts optional initial `muted` boolean + `onMuteChange` callback from `ProgressionManager` (removing duplicate raw `localStorage` calls in `AudioManager.ts:13, 26` and `GameEngine.ts:117, 674`).

---

## 5. Standalone HTML Bundler (`scripts/bundle_standalone.mjs`) & Dual Preview Sync

### 5.1 Fixing Side-Pane / `:5173` `100%` Height vs `<agent-embed>` `580px` Zero-Collapse
- **Root Cause (`src/main.ts:12-20`)**:
  - `window.self === window.top` is `false` both in `<agent-embed>` (`srcdoc`, initial `innerHeight === 0`) AND in IDE Side-Pane / `:5173` Bookmark `<iframe>` (`http://localhost:5173` or host-sized `innerHeight >= 620`).
- **Exact Fix in `src/main.ts:11-21` (Run Once at `bootstrap()`)**:
  ```ts
  let isTopWindow = false;
  try {
    isTopWindow = window.self === window.top;
  } catch {
    isTopWindow = false;
  }
  const isHttpOrigin =
    window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const isHostSizedIframe = window.innerHeight >= 620;
  if (isTopWindow || isHttpOrigin || isHostSizedIframe) {
    document.documentElement.classList.add('is-top-window');
  }
  ```
  - **Why Run Strictly Once at `bootstrap()` (Do NOT Re-Run on `resize`)**:
    - In `<agent-embed>`, `protocol` is `'about:'` (`srcdoc`) and initial `innerHeight` is `0` (then resized by host to `580px`, `< 620`). Thus `is-top-window` stays `false`, `#app` stays `height: 580px` (`docScrollHeight = 580`, **zero `0px` collapse**), and clicking `#btn-fullscreen` (`GameEngine.ts:245`) toggles `.expanded-embed` (`740px`) cleanly without accidentally promoting `html.is-top-window` when `innerHeight` reaches `740`!
    - In `:5173` Bookmark Preview (`http:`), `isHttpOrigin` is `true` → fills `100%` viewport height!
    - In IDE Side-Pane Preview of `starforge_ark_cradle.html` (`innerHeight = 920 >= 620`), `isHostSizedIframe` is `true` → fills `100%` pane height!
- **CSS Safety Floor (`src/style.css:67-76 & 973`)**:
  ```css
  html.is-top-window #app,
  #app:fullscreen {
    height: 100%;
    min-height: 480px;
    border-radius: 0;
    border: none;
  }
  .hub-body-scroll,
  .enamel-dialog {
    touch-action: pan-y;
    overscroll-behavior: contain;
  }
  ```

### 5.2 Repo-Resident `scripts/bundle_standalone.mjs` & `package.json` Integration
Move and harden `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/scratch/bundle_standalone.mjs` into `/home/antigravity/GOD-OF-PPT/tdk/scripts/bundle_standalone.mjs`:

1. **Portable Resolution + Dual Target Output**:
   - Resolve `projectRoot = fileURLToPath(new URL('..', import.meta.url))` and `import { build } from 'vite'`.
   - Build IIFE bundle into `os.tmpdir() + '/lunar_iife_dist'` (`format: 'iife'`, `name: 'LunarBeaconBundle'`, `cssCodeSplit: false`, `modulePreload: false`, `assetsInlineLimit: 100000000` so any SVG/small asset is always base64-inlined).
   - Escape `</script>` (`js.replace(/<\/script>/gi, '<\\/script>')`) and inline CSS + JS + base64 `public/favicon.svg`.
   - Write output to:
     - Conversation Artifact target (if parent directory exists, or overridden via `STANDALONE_HTML_OUT`): `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` (and update `starforge_ark_cradle.html.metadata.json` `updatedAt` timestamp!).
     - Local portable fallback: `path.join(projectRoot, 'dist/starforge_ark_cradle.html')` (when `dist/` exists).
   - Replace `scratch/bundle_standalone.mjs` with a thin 2-line forwarder (`import '/home/antigravity/GOD-OF-PPT/tdk/scripts/bundle_standalone.mjs';`) so existing documentation/commands calling `scratch/bundle_standalone.mjs` always invoke the canonical repo script.
2. **Automated Post-Bundle Self-Verification Gate inside `scripts/bundle_standalone.mjs`**:
   - Assert zero `<script src="http...">`, `<link href="http...">`, or `@import url("http...")` patterns in the generated HTML.
   - Assert `html.includes('id="app"')` and `/#app\{[^}]*height:\s*580px/.test(css)` (or unminified equivalent) so `<agent-embed>` `580px` zero-collapse can never be accidentally regressed.
3. **`package.json` Scripts (`lines 6-11`)**:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "tsc && vite build && node scripts/bundle_standalone.mjs",
     "build:web": "tsc && vite build",
     "build:standalone": "node scripts/bundle_standalone.mjs",
     "preview": "vite preview --host 0.0.0.0 --port 5173",
     "test:e2e": "node tests/e2e.mjs"
   }
   ```
   - **Why Chaining `node scripts/bundle_standalone.mjs` Directly Into `npm run build` Is Ideal**:
     - Every Worker running `npm run build` at the end of M2, M3, and M4 **automatically** typechecks (`tsc`), builds `dist/` (instantly served by `:5173`), AND regenerates + verifies `starforge_ark_cradle.html` in a single atomic step — making `dist/` vs `starforge_ark_cradle.html` drift impossible!
4. **`:5173` Preview Daemon Recovery**:
   - Since `:5173` is currently stopped in this VM session, the M2 Worker must launch `npx vite preview --host 0.0.0.0 --port 5173` with `IsDaemon: true` after `npm run build` and verify `curl -sSfI http://localhost:5173` returns `HTTP/1.1 200 OK`. Because `vite preview` reads `dist/` from disk on each request with `Cache-Control: no-cache`, it does not need to be restarted when M3/M4 re-run `npm run build`.

---

## 6. Cross-Track TypeScript Interface Contract (`src/types.ts` ↔ `GameEngine.ts` ↔ `UIManager.ts`)

To let Milestone M2 (Campaign Engine & Mechanisms), M3 (Commander Skills, Combos & T4 Branches), and M4 (Sector Hub, Tech Tree & Codex) integrate without merge friction, extend `UISnapshot` (`src/types.ts:222-276`) with optional/additive fields:

```ts
export type TowerBranch = 'A' | 'B';
export type CommanderSkillId = 'orbital_strike' | 'emp_overdrive' | 'nano_repair';

export interface CommanderSkillSnapshot {
  id: CommanderSkillId;
  name: string;
  energyCost: number;
  cooldownRemaining: number;
  cooldownTotal: number;
  ready: boolean;
  activeTargeting: boolean;
}

export interface T4BranchOptionSnapshot {
  branch: TowerBranch;
  name: string;
  shortTitle: string;
  mechanicTag: string;
  cost: number;
  affordable: boolean;
}

// Additive fields on UISnapshot (preserving 100% of existing lines 222-276):
export interface UISnapshotExpansion {
  stageId: StageId;
  stageCode: string;            // e.g. 'CH.01', 'CH.02', 'EX'
  stageName: string;            // e.g. '曙光检修站'
  isEndless: boolean;
  nextStageId: StageId | null;
  nextStageName: string | null;
  persistentCrystals: number;   //ProgressionManager.totalCrystals
  hasHubAlert: boolean;         // true if tech affordable or achievement claimable
  tacticalEnergy: number;       // 0..maxTacticalEnergy
  maxTacticalEnergy: number;
  targetingSkillId: CommanderSkillId | null;
  commanderSkills: CommanderSkillSnapshot[];
  // On selectedTower when tier === 3:
  t4BranchOptions?: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;
  selectedBranch?: TowerBranch | null;
  // On rewardSummary:
  firstClearBonusCrystals?: number;
  starBonusCrystals?: number;
}
```

### Public `GameEngine` Methods Consumed by `UIManager`
- `engine.launchStage(stageId: StageId, playIntro?: boolean): void`
- `engine.setOverlayPause(paused: boolean): void`
- `engine.activateCommanderSkill(skillId: CommanderSkillId): boolean`
- `engine.cancelSkillTargeting(): void`
- `engine.upgradeSelectedTower(branch?: TowerBranch): boolean` (defaults `branch = 'A'`)
- `engine.getProgression(): ProgressionManager` (for Hub Tab 1/2/3 reads, Tech upgrades, Respec, Unlock-All toggle, and Achievement `💎` claims, each triggering `this.emitSnapshot()` + `AudioManager` SFX).
