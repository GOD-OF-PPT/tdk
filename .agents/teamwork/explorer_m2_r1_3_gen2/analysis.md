# M2 Fast Delta Analysis — UI (`UIManager.ts`, `style.css`), Standalone Bundler, `:5173` Preview Sync & Headless WebGL2 Smoke Setup

## 1. `src/ui/UIManager.ts` & `src/style.css` Exact Line-by-Line Delta Map

### 1.1 Removing Hardcoded `BUILD_PADS` from `UIManager.ts`
- **Current Import**: `src/ui/UIManager.ts:1`
  ```ts
  import { BUILD_PADS, TOWER_BLUEPRINTS, TOWER_ORDER } from '../config/gameConfig';
  ```
- **Current Single Call Site in UI**: `src/ui/UIManager.ts:464` & `line 496`
  ```ts
  // line 464:
  const padCfg = BUILD_PADS.find((p) => p.id === snap.selectedPadId);
  // line 496:
  <span class="pad-title-tag">${padCfg?.label ?? '检修基座'}</span>
  ```
- **Exact M2 Replacement**:
  1. Remove `BUILD_PADS` from `src/ui/UIManager.ts:1` (`import { TOWER_BLUEPRINTS, TOWER_ORDER } from '../config/gameConfig';`).
  2. Add to `UISnapshot` (`src/types.ts:235-236` & `src/game/GameEngine.ts:1578-1579`):
     - `selectedPadLabel: string | null;`
     - `selectedPadIsHighGround: boolean;`
     - (And on `selectedTower` at `src/types.ts:261`: `isHighGround?: boolean;` so built towers on elevated pads also display their high-ground buff chip in `#tower-inspector`.)
  3. Update `lastTraySig` at `src/ui/UIManager.ts:470` to include high-ground state:
     ```ts
     const sig = `build:${snap.selectedPadId}:hg_${snap.selectedPadIsHighGround ? 1 : 0}:prev_${snap.previewTowerType ?? 'none'}:af_${affordKey}`;
     ```
  4. Replace `line 496` with:
     ```html
     <span class="pad-title-tag">
       ${snap.selectedPadLabel ?? '检修基座'}
       ${snap.selectedPadIsHighGround ? '<em class="highground-chip">▲高地 +18%射程/+15%伤害</em>' : ''}
     </span>
     ```
  5. **Important Cross-Check in `GameEngine.ts`**: `BUILD_PADS.find(...)` is also called at `src/game/GameEngine.ts:452` (`previewOrBuildTower`) and `src/game/GameEngine.ts:1604` (`getPadScreenCoordinates`). Both must switch to active stage pad lookup (`this.activeStage.pads.find(...)`) so building and `getPadScreenCoordinates(padId)` work across Chapters 1–4 and Endless!

---

### 1.2 `#hud-top-bar` (`src/ui/UIManager.ts:83-117, 135-145, 239-265` & `src/style.css:120-236, 931-1028`)
- **DOM Insertion for `#btn-open-hub`**:
  - Insert as the first child of `.hud-stats-group` (`src/ui/UIManager.ts:85-86`, right before `#pill-beacon`):
    ```html
    <button class="stat-plate sector-hub-pill" id="btn-open-hub" type="button" title="星区作战指挥台" aria-label="打开星区作战指挥台">
      <span class="sector-map-glyph" aria-hidden="true">🗺</span>
      <span class="sector-code-text" id="val-sector-name">CH.01 曙光站</span>
      <span class="hub-alert-pip" id="hub-alert-pip" hidden></span>
    </button>
    ```
  - Also bind `#pill-crystal` (`src/ui/UIManager.ts:96-100`) click to `this.openHub('campaign')` in M2 (upgrading to `this.openHub('tech')` in M4).
- **`#pill-kills` `.hide-xs` for `<= 440px` Mobile Portrait**:
  - At `src/ui/UIManager.ts:105`: change `<div class="stat-plate kills" id="pill-kills"` → `<div class="stat-plate kills hide-xs" id="pill-kills"`.
  - In `src/style.css` (after `@media (max-width: 720px)` at `line 1028`):
    ```css
    @media (max-width: 720px) {
      .sector-code-text { display: none; }
      .sector-hub-pill { padding: 4px 6px; min-width: 32px; justify-content: center; }
    }
    @media (max-width: 440px) {
      .hide-xs { display: none !important; }
    }
    ```
  - Width budget check on `360px` viewport (`344px` inner width): `#btn-open-hub` (`32px`) + `#pill-beacon` (`52px`) + `#pill-gold` (`46px`) + `#pill-crystal` (`38px`) + `#pill-wave` (`42px`) + `.hud-ctrl-group` (`98px`) + `4px` gaps = **`324px <= 344px`**, zero wrap, zero overlap!
- **Endless Wave Display (`W{n} · ∞`)**:
  - Top HUD (`src/ui/UIManager.ts:259`):
    ```ts
    this.elWave.textContent = snap.isEndless
      ? `W${snap.waveNumber} · ∞`
      : `${snap.waveNumber}/${snap.totalWaves}`;
    ```
  - Bottom Start Wave CTA (`src/ui/UIManager.ts:309-323`):
    ```ts
    const nextBtnSig = `wave_${snap.stageId}_${snap.waveNumber}_${snap.isEndless ? 'inf' : snap.totalWaves}`;
    // ...
    const label =
      snap.waveNumber === 1
        ? '▶ 开始防守 · 第 1 波'
        : snap.isEndless
          ? `▶ 开始下一波 (W${snap.waveNumber} · ∞)`
          : `▶ 开始下一波 (${snap.waveNumber}/${snap.totalWaves})`;
    ```

---

### 1.3 `#pause-modal`, `#defeat-modal`, and `#victory-screen` (`src/ui/UIManager.ts:539-660`, `src/style.css:774-928`)
- **Dirty Signature (`src/ui/UIManager.ts:540-549`)**:
  Include `snap.stageId` in `modalSig` (`paused:${snap.stageId}:${snap.waveNumber}:${snap.beaconHp}`, `defeat:${snap.stageId}:${snap.waveNumber}:${snap.kills}`, `victory:${snap.stageId}:${snap.mode}:${snap.rewardSummary.claimed}`).
- **`#pause-modal` (`lines 559-577`)**:
  - Keep `#btn-resume` (`继续战斗`) and `#btn-restart-pause` (`重新挑战`).
  - Add `#btn-hub-from-modal` (`🗺 星区作战指挥台`): calls `this.engine.togglePause(); this.openHub('campaign');`.
  - Format wave text: `snap.isEndless ? `无尽第 ${snap.waveNumber} 波` : `第 ${snap.waveNumber} / ${snap.totalWaves} 波``.
- **`#defeat-modal` (`lines 579-596`)**:
  - Keep `id="defeat-modal"` and `#btn-retry-defeat` (`重整设备 · 重新挑战`, calling `this.engine.startNewMission(false)`).
  - Add `#btn-hub-from-modal` (`🗺 返回星区指挥台`, calling `this.openHub('campaign')`).
  - If `snap.isEndless`, adjust kicker/subtitle to celebrate Endless Wave record (`ENDLESS OVERDRIVE · 坚守至第 ${snap.waveNumber} 波`) while keeping `#defeat-modal` and `#btn-retry-defeat` intact.
- **`#victory-screen` (`lines 598-660`)**:
  - Before claim (`!isClaimed`, `lines 634-642`): Keep `#btn-claim-rewards` (`开启补给箱 · 领取奖励`, disabled while `isClaiming`). Show First-Clear / Star bonus `💎` pill in `.reward-loot-tags` when applicable.
  - After claim (`isClaimed`, `lines 643-646`):
    - Primary button: **`#btn-next-sector`** (`▶ 下一战区 · ${snap.nextStageName ?? '星区无尽超载'}`) → calls `this.engine.launchStage(snap.nextStageId ?? 'endless', true)`.
    - Secondary row (`.dialog-btn-row`):
      - **`#btn-hub-victory`** (`🗺 星区指挥台`) → calls `this.openHub('campaign')`.
      - **`#btn-play-again`** (`再次挑战`) → calls `this.engine.startNewMission(false)`. **CRITICAL**: Must preserve exact `id="btn-play-again"` and replay current stage (`stage_01` when testing Stage 1) for `tests/e2e.mjs:355, 371`!

---

### 1.4 Clean M2 Structure for `#sector-hub-modal` (M4-Ready Shell)
- **Host Slot in `buildStaticSkeleton()` (`src/ui/UIManager.ts:132-133`)**:
  Add `<div id="hub-slot" class="hub-slot"></div>` right after `<div id="modal-slot"></div>`.
  - CSS: `#hub-slot { position: absolute; inset: 0; z-index: 35; pointer-events: none; }`.
- **Touch Scroll Fix Against `#app { touch-action: none }` (`src/style.css:64`)**:
  - `#app` at `src/style.css:64` sets `touch-action: none`. Any scrollable dialog/panel inside `#hub-slot` or `#modal-slot` (`.hub-body-scroll`, `.enamel-dialog`) **MUST** explicitly set:
    ```css
    .hub-body-scroll,
    .enamel-dialog {
      touch-action: pan-y;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    ```
- **Overlay Auto-Pause Contract**:
  - `openHub(tab = 'campaign')` sets `this.hubOpen = true; this.hubTab = tab; this.engine.setOverlayPause(true); this.renderHubModal(this.engine.getSnapshot());`.
  - `closeHub()` sets `this.hubOpen = false; this.engine.setOverlayPause(false); this.renderHubModal(this.engine.getSnapshot());`.
  - `GameEngine.setOverlayPause(paused: boolean)` freezes simulation stepping in `stepFrame()` while `paused === true` WITHOUT mutating `this.mode` to `'paused'` (so `#pause-modal` never collides with `#sector-hub-modal`).
- **M4-Ready Tab Architecture**:
  - Header `.hub-header` renders:
    - Title + persistent crystal reserve `#hub-crystals-val` (`💎 ${prog.totalCrystals}`)
    - 3 tab buttons (`role="tablist"`):
      1. `#hub-tab-btn-campaign` (`星区战役`) — Fully implemented in M2!
      2. `#hub-tab-btn-tech` (`工程改装`) — Clean modular method `renderHubTechTab()` so M4 drops in the 6-module Tech Tree + Respec with zero refactoring of the Hub shell!
      3. `#hub-tab-btn-codex` (`战地档案`) — Clean modular method `renderHubCodexTab()` so M4 drops in the 4-pill Codex + 9 Commendation Achievements seamlessly!
    - Close button `#btn-close-hub` (`✕`).
- **M2 Tab 1 (`#hub-panel-campaign`) Required DOM IDs & Controls**:
  1. Control strip:
     - Star counter `★ ${totalStars}/12` + Endless best `∞ 最高 W${endlessBestWave}`.
     - Sandbox Unlock-All switch **`#btn-toggle-unlock-all`**: `[ 🔓 全战区演练解锁: 已开启 / 已关闭 ]` (calls `progression.setUnlockAllSandbox(!current)` + re-renders Hub immediately so all 4 stages + `endless` become selectable and launchable).
  2. Interactive Star-Chart / Stage Cards (`grid-template-columns: 1.15fr 1fr` on `>680px`, stacked on `<=680px`):
     - 5 interactive stage nodes (`#stage-node-stage_01`, `#stage-node-stage_02`, `#stage-node-stage_03`, `#stage-node-stage_04`, `#stage-node-endless`) connected by inline SVG transit lines:
       - Shows `CH.01..CH.04` / `EX`, stage name, `★★★` gold stars (or `W{best}` for `endless`), and `💎` first-clear badge (`首通 +X 💎` or `✓ 已首通`) + lock state (`🔒` unless unlocked or `unlockAllSandbox === true`).
  3. Stage Briefing Card (`#stage-brief-card`):
     - Selected stage title, wave count (`8波` / `10波` / `10波` / `12波` / `∞ 无限波次`), route & mechanism chips (`高地增程`, `晶簇富矿`, `月面电容塔`, `激光阻断闸`), reward status pill, and primary CTA **`#btn-launch-stage`** (`🚀 立即出击` — calls `this.closeHub(); this.engine.launchStage(this.selectedHubStageId, true);`).

---

### 1.5 Existing `window.__LUNAR_BEACON_GAME__` Debug API & E2E Compatibility Contract
Assigned at `src/main.ts:42` (`window.__LUNAR_BEACON_GAME__ = engine`). Every symbol below is actively exercised by `tests/e2e.mjs` and MUST remain 100% compatible:

| Method / Property | File & Lines | Compatibility Requirement in M2 |
|---|---|---|
| `getSnapshot()` | `GameEngine.ts:1503-1597` | Keep all existing `UISnapshot` fields (`mode`, `beaconHp`, `maxBeaconHp`, `gold`, `crystals`, `waveNumber`, `totalWaves`, `waveInProgress`, `kills`, `speedMultiplier`, `muted`, `onboardingStep`, `selectedPadId`, `previewTowerType`, `selectedTower`, `bossStatus`, `rewardSummary`); add new campaign fields additively. |
| `getPadScreenCoordinates(padId)` | `GameEngine.ts:1603-1607` | Lookup `padId` in `this.activeStage.pads` (not static `BUILD_PADS`). Keep `stage_01` pad IDs (`pad_01`..`pad_09`) unchanged! |
| `getBeaconScreenCoordinates()` | `GameEngine.ts:1609-1611` | Projects `this.env.beacon.group.position` (`y=1.2`). |
| `getEntranceScreenCoordinates()` | `GameEngine.ts:1613-1615` | Projects primary `this.env.entrance.group.position` (`y=1.2`). |
| `debugStepSimulation(seconds, renderFinal)` | `GameEngine.ts:1630-1640` | Steps `0.05s` ticks deterministically, renders final frame if `renderFinal`, calls `emitSnapshot()`. |
| `debugAddGold(amount)` | `GameEngine.ts:1642-1645` | Adds `amount` to `this.gold` and calls `emitSnapshot()`. |
| `ghostPreviewActive` (getter) | `GameEngine.ts:1647-1649` | Returns `this.currentGhostType !== null && this.ghostGroup.children.length > 0`. |
| `selectPadOrTower`, `previewOrBuildTower`, `upgradeSelectedTower`, `startNextWave` | `GameEngine.ts:376-628` | Signatures unchanged; default boot stage MUST remain `stage_01` (`260` Gold, `20` Beacon HP, `8` waves, `+320` Chest Gold, `+8` base Chest Crystals or clearly accounted first-clear bonus). **Note on `tests/e2e.mjs:358-367`**: E2E checks `snap.gold === preClaimSnap.gold + 320` and `snap.crystals === preClaimSnap.crystals + 8` on Stage 1 chest claim (or `snap.rewardSummary.bonusCrystals` match) — verify whether `snap.crystals` tracks in-run crystals (`+8` from chest) while `persistentCrystals` tracks bank + first-clear bonus so both campaign progression and legacy assertions stay harmonious! |
| **Add for M2 Smoke Convenience** | `GameEngine.ts` | Add `getMechanismScreenCoordinates(mechId: string)` and `launchStage(stageId: StageId, playIntro = true)` so M2 smoke script can deterministically click/verify 3D Stage Mechanisms and switch stages in `<30s`! |

---

## 2. `src/main.ts`, `scripts/bundle_standalone.mjs`, `package.json` & Headless Smoke Setup

### 2.1 `src/main.ts` Iframe Height Detection (`lines 11-21`) & `src/style.css` (`lines 20-25, 54-76`)
- **Current `src/main.ts:11-21`**:
  ```ts
  function bootstrap(): void {
    let isTopWindow = false;
    try {
      isTopWindow = window.self === window.top;
    } catch {
      isTopWindow = false;
    }
    if (isTopWindow) {
      document.documentElement.classList.add('is-top-window');
    }
  ```
- **Current `src/style.css`**:
  - `lines 20-25`: `html.is-top-window, html.is-top-window body { height: 100%; overflow: hidden; background: #16192b; }`
  - `lines 54-65`: `#app { position: relative; width: 100%; height: 580px; overflow: hidden; ... touch-action: none; }`
  - `lines 67-72`: `html.is-top-window #app, #app:fullscreen { height: 100%; border-radius: 0; border: none; }`
  - `lines 74-76`: `#app.expanded-embed { height: 740px; }`
- **Exact One-Shot Replacement in `src/main.ts:12-20`** (run once at `bootstrap()`, NEVER on `resize`):
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
  - Guarantees `<agent-embed>` (`about:srcdoc`, initial `innerHeight === 0 < 620`) keeps `#app { height: 580px }` (`scrollHeight === 580`, zero `0px` collapse!) and `.expanded-embed` (`740px`), while `http://localhost:5173` bookmark iframe and IDE side-pane preview (`innerHeight >= 620`) get `html.is-top-window` (`height: 100%`).

### 2.2 `scratch/bundle_standalone.mjs` & `starforge_ark_cradle.html.metadata.json` -> `scripts/bundle_standalone.mjs`
- **Inspected `scratch/bundle_standalone.mjs` (`lines 1-74`)**:
  - Uses Vite programmatic `build()` with `configFile: false`, `publicDir: false`, `base: './'`, `outDir: '/tmp/lunar_iife_dist'`, `modulePreload: false`, `cssCodeSplit: false`, `rollupOptions.output: { format: 'iife', name: 'LunarBeaconBundle' }`.
  - Reads CSS + JS from `/tmp/lunar_iife_dist/assets`, escapes `</script>` → `<\/script>`, base64-encodes `public/favicon.svg`, and writes standalone HTML (`<div id="app"><canvas id="game-canvas" ...></canvas><div id="ui-layer"></div></div>`) to `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html`.
- **Inspected `starforge_ark_cradle.html.metadata.json` (`lines 1-5`)**:
  ```json
  {
    "summary": "《月海信标 · 终末检修站》LUNAR BEACON: LAST RELAY 独立单文件可玩版（IIFE 内联构建，支持聊天窗内联预览与侧边栏全高度交互，无需本地端口即可直接游玩完整 8 波机甲塔防闭环）。",
    "updatedAt": "2026-11-14T04:40:42.884669534Z",
    "userFacing": true
  }
  ```
- **Canonical `scripts/bundle_standalone.mjs` Implementation Details**:
  1. Resolve `projectRoot = fileURLToPath(new URL('..', import.meta.url))` and `import { build } from 'vite'` (no hardcoded absolute `node_modules` path).
  2. Set `assetsInlineLimit: 100_000_000` in `build` options.
  3. Write generated HTML to BOTH:
     - `path.join(projectRoot, 'dist/starforge_ark_cradle.html')` (if `dist/` exists)
     - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` (if parent artifact dir exists)
  4. Update `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html.metadata.json` with `updatedAt: new Date().toISOString()`, updated multi-sector campaign summary, and `userFacing: true`.
  5. Update `scratch/bundle_standalone.mjs` to `import '/home/antigravity/GOD-OF-PPT/tdk/scripts/bundle_standalone.mjs';` so legacy invocations stay synced.
  6. Self-verify inside `scripts/bundle_standalone.mjs`:
     - Zero external URLs (`!/<(?:script|link)\b[^>]*(?:src|href)=["']https?:/i.test(html)` and `!/url\(\s*["']?https?:/i.test(css)`).
     - `html.includes('id="app"')` and `/#app\{[^}]*height:\s*580px/i.test(css) || /#app\s*\{[\s\S]*?height:\s*580px/i.test(css)`.
- **`package.json` (`lines 6-11`) Update**:
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
- **`:5173` Preview Server Note**:
  `ss -tlnp` confirmed **no process is currently listening on `:5173`** (`NO_5173_LISTENING`). After `npm run build`, the M2 Worker must start `npx vite preview --host 0.0.0.0 --port 5173` with `IsDaemon: true` and verify `http://127.0.0.1:5173` responds `200 OK`.

### 2.3 Fast `<30s` Headless WebGL2 Smoke Script Setup (from `tests/e2e.mjs:1-25`)
- **Installed Browser & Driver**:
  - `playwright-core` (`^1.65.1` in `package.json:14`)
  - `/usr/bin/chromium` (`Chromium 156.0.8078.79` verified present)
- **Exact Chromium WebGL2 SwiftShader Launch Snippet**:
  ```js
  import { chromium } from 'playwright-core';

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
- **`<agent-embed>` Sandboxed Iframe Smoke Snippet (`0px` Collapse + `SecurityError` Verification)**:
  ```js
  const embedPage = await browser.newPage({ viewport: { width: 800, height: 700 } });
  const standaloneHtml = fs.readFileSync(
    '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html',
    'utf8'
  );
  await embedPage.setContent(
    `<!doctype html><html><body style="margin:0"><iframe id="agent-embed" sandbox="allow-scripts" style="width:760px;border:0;display:block"></iframe></body></html>`
  );
  await embedPage.$eval('#agent-embed', (el, src) => { el.srcdoc = src; }, standaloneHtml);
  const frame = embedPage.frames()[1];
  await frame.waitForFunction(() => window.__LUNAR_BEACON_GAME__?.getSnapshot()?.mode != null, null, { timeout: 10000 });
  const metrics = await frame.evaluate(() => ({
    appHeight: document.getElementById('app')?.getBoundingClientRect().height ?? 0,
    scrollHeight: document.documentElement.scrollHeight,
    isTopClass: document.documentElement.classList.contains('is-top-window'),
  }));
  // Assert metrics.appHeight === 580 && metrics.scrollHeight >= 580 && metrics.isTopClass === false!
  ```
