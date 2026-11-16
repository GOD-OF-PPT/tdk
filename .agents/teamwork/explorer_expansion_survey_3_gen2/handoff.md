# Handoff Report — Track 3 Expansion Architecture Survey (`explorer_expansion_survey_3_gen2`)

**Executive Summary**: Designed an exact, line-referenced architectural blueprint (full spec in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/analysis.md`) for the **3-Tab Sector Command Hub (`星区战役` / `工程改装` / `战地档案`)**, **Non-Overlapping Responsive Tactical HUD (`1440×900`, `760×580` `<agent-embed>`, and `360×800` / `390×844` Mobile Portrait)**, **Sandbox-Safe Versioned `ProgressionManager`**, and **Atomic Standalone HTML (`starforge_ark_cradle.html`) + `:5173` Preview Bundler Pipeline**.

---

## 1. Observation

1. **Bootstrap & Preview Surface Sizing (`src/main.ts:11-21`, `src/style.css:20-25, 54-76`)**:
   - `src/main.ts:14` checks only `isTopWindow = window.self === window.top` to add `html.is-top-window` (`height: 100%`), while `#app` defaults to `height: 580px` (`src/style.css:57`) and `.expanded-embed` sets `height: 740px` (`line 75`).
   - In `<agent-embed>` (`srcdoc`, initial `innerHeight === 0`), `#app { height: 580px }` prevents `0px` collapse. However, in IDE Side-Pane Preview and `:5173` Bookmark Preview (`<iframe>` where `window.self !== window.top` and `innerHeight >= 600` or `protocol === 'http:'`), `#app` stays locked at `580px` instead of filling `100%` height.
2. **Existing HUD Structure, Touch-Action & Responsive Budgets (`src/ui/UIManager.ts:81-661`, `src/style.css:930-1028`, `tests/e2e.mjs:452-453`)**:
   - `UIManager` mounts `#hud-top-bar`, `#hud-alerts` (`top: 56px`), `#hud-bottom-dock` (`#onboarding-slot`, `#next-wave-slot`, `#tray-slot`), and `#modal-slot` (`z-index: 30`), using dirty-check signatures `lastTraySig` (`line 59`) and `lastModalSig` (`line 60`) against `~7Hz` snapshots (`GameEngine.ts:731-735`).
   - `src/style.css:64` sets `touch-action: none` on `#app` (blocking vertical touch scrolling inside scrollable modals unless inner containers override `touch-action: pan-y`).
   - At `360px` mobile width (`@media (max-width: 720px)`, `src/style.css:973-1014`), inner top-bar width is `344px` and existing 5 stat plates + 3 control buttons already consume `~328px` (`16px` slack).
   - After `GameEngine.previewOrBuildTower(type, true)` (`src/game/GameEngine.ts:480-488`), `selectedPadId` remains non-null (`#tower-inspector` stays open), and `tests/e2e.mjs:452-453` immediately taps `#btn-start-wave` on `390×844` mobile portrait.
3. **Current `localStorage` & Meta-Progression State (`src/audio/AudioManager.ts:13, 26`, `src/game/GameEngine.ts:80, 117, 337, 674`)**:
   - Only `lunar_beacon_td_muted_v2` and `lunar_beacon_commendations_v1` are stored via ad-hoc `try/catch`; `this.crystals` resets to `0` on every `startNewMission()` (`line 337`). Inside `sandbox="allow-scripts"` (`<agent-embed>`), reading `window.localStorage` throws `DOMException: SecurityError`.
4. **Standalone Bundler & `:5173` Server Liveness (`scratch/bundle_standalone.mjs:1-74`, `package.json:6-11`)**:
   - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/scratch/bundle_standalone.mjs` builds an IIFE bundle into `/tmp/lunar_iife_dist`, escapes `</script>`, and inlines CSS + JS + base64 `public/favicon.svg` into `starforge_ark_cradle.html` (`767,910` B, verified `0` external CDN `<script>`/`<link>`/`@import` URLs).
   - `ps aux | grep -E 'vite|5173'` and `ss -tlnp` confirm **no process is currently listening on port `:5173`** in this VM session, and `dist/` (`05:40Z`) is newer than `starforge_ark_cradle.html` (`04:40Z`).

---

## 2. Logic Chain

1. **Preventing Top-Bar Overflow on `360px` Mobile (`Observation 2` -> Top HUD Design)**:
   - Because `360px` mobile has only `16px` horizontal slack on `#hud-top-bar`, adding a Sector/Hub button directly would wrap or clip unless space is reclaimed. Hiding `#pill-kills` only below `440px` (`@media (max-width: 440px)`) frees `38px`, allowing a `32×30px` `#btn-open-hub` icon button (`🗺` + alert pip) on mobile (`320px <= 344px` total) while rendering the full `🗺 CH.01 曙光站` enamel plaque on `>720px` desktop/embed.
2. **Preventing Bottom HUD & Build-Pad Overlap on `580px` `<agent-embed>` and `360×800` Mobile (`Observation 2` -> Adaptive Bottom Action Bar)**:
   - On `760×580` `<agent-embed>`, southernmost build pads (`z = 6.4`) project to `y ≈ 395px` (`185px` above bottom). Stacking `#onboarding-slot` + `#btn-start-wave` + `#commander-skills-dock` + `#tray-slot` vertically would reach `~260px`, occluding pads.
   - Placing `#skills-slot` and `#next-wave-slot` side-by-side inside a single horizontal `.hud-action-bar` (`42px` tall) when `selectedPadId === null`, and hiding *only* `#skills-slot` + `#onboarding-slot` when `selectedPadId !== null` (via `.hud-bottom-dock.has-active-tray`), keeps total open-tray height at `152px` (`y = 420..572px` on `580px` embed; `166px` on `360×800` mobile) — guaranteeing zero pad overlap while keeping `#btn-start-wave` visible after building (`tests/e2e.mjs:452-453`).
3. **Zero-Clutter T3 → T4 Dual-Branch Selection (`Observation 2` -> `#tower-inspector` Layout)**:
   - At `tw.tier === 3`, condensing current tower stats into a 1-line header badge inside `.sheet-head` frees the full inspector width for a `1fr 1fr auto` `.t4-specialization-row` (`T4-A` card, `T4-B` card, compact Sell button) at `114px–132px` height, while keeping `id="btn-upgrade-tower"` on `T4-A` (`upgradeSelectedTower(branch = 'A')`) for backward-compatible smoke automation (`tests/e2e.mjs:200`).
4. **Boot-Once Viewport Promotion vs `.expanded-embed` (`Observation 1` -> `src/main.ts` Fix)**:
   - Promoting `html.is-top-window` once at `bootstrap()` when `isTopWindow || protocol.startsWith('http') || window.innerHeight >= 620` makes `:5173` and `920px` IDE Side-Pane iframes fill `100%` height, while `<agent-embed>` (`about:srcdoc`, initial `innerHeight === 0 -> 580`) stays at `height: 580px` and preserves `#btn-fullscreen`'s `.expanded-embed` (`740px`) toggle without resize race conditions.
5. **Eliminating Artifact Drift (`Observation 4` -> `package.json` Build Chain)**:
   - Moving `bundle_standalone.mjs` into `scripts/bundle_standalone.mjs` (with built-in zero-CDN and `#app` `580px` assertions) and setting `"build": "tsc && vite build && node scripts/bundle_standalone.mjs"` guarantees every milestone build updates `dist/` (`:5173`) and `starforge_ark_cradle.html` atomically.

---

## 3. Caveats

1. **Cross-Track Config Alignment**: Exact numerical tuning for the 4 campaign stages + Endless wave curves (Track 1) and Commander Skill / Synergy / T4-A & T4-B combat formulas (Track 2) are owned by sibling tracks; `UIManager` and `ProgressionManager` are designed to read stage metadata, skill costs/cooldowns, and branch titles/tags dynamically from `campaignConfig.ts` / `gameConfig.ts` via the additive `UISnapshot` contract (`analysis.md` §6).
2. **`:5173` Daemon Currently Offline**: Because this Explorer is strictly read-only, the stopped `:5173` preview server was not started during this survey and must be launched (`IsDaemon: true`) by the Milestone M2 Worker after `npm run build`.

---

## 4. Conclusion

Implement Track 3 across Milestones M2–M4 using the exact specifications in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/analysis.md`:

1. **`src/game/ProgressionManager.ts` (New Module — M2 Foundation, M4 Full UI)**:
   - Sandbox-safe KV store probing `window.localStorage` in `try/catch` with automatic in-memory `Map` fallback for `sandbox="allow-scripts"` `<agent-embed>` iframes.
   - Versioned `lunar_beacon_save_v2` schema migrating legacy `lunar_beacon_td_muted_v2` & `lunar_beacon_commendations_v1`, persisting `totalCrystals` (`💎`), `spentCrystals`, `unlockAllSandbox` (`"全战区演练解锁"`), per-stage stars/clears/Endless wave record, 6 Tech Tree module levels (`Lv.0–4`) with 100% free `"重置晶簇"` respec, Codex discovery, and 9 claimable Commendation Badges (`+6..15 💎` each).
2. **Sector Command Hub (`#sector-hub-modal` in `src/ui/UIManager.ts` & `src/style.css`)**:
   - Non-blocking boot into active stage (`opening -> playing`) with 4 Hub entry points (`#btn-open-hub` top-left plaque, clickable `#pill-crystal`, Pause/Defeat modals, and `#victory-screen` alongside a direct **`#btn-next-sector` `"▶ 下一战区"`** CTA).
   - 3 crisp enamel tabs (`>=11.5px` bold typography, `touch-action: pan-y` scroll body, max 3 data points per card):
     - **Tab 1 `星区战役`**: SVG+Enamel 5-node Lunar Star-Chart (`CH.01`–`CH.04` + `EX 星区无尽超载`), 1–3★ ratings, mechanic chips, first-clear/star `💎` rewards, `"全战区演练解锁"` toggle, and `"🚀 立即出击"` CTA.
     - **Tab 2 `工程改装`**: 6 `Lv.0–4` permanent upgrade cards (`超导弹芯`, `液压伺服`, `战前整备`, `信标装甲`, `战术反应堆`, `磁暴谐振器`), instant `💎` upgrade + `playTechUpgrade()` SFX, and free `"↺ 重置晶簇"` button.
     - **Tab 3 `战地档案`**: 4-pill sub-filter (`防御机甲` w/ T4-A/B branches, `失控敌械`, `战场机关`, `守护勋章` w/ 9 claimable `💎` badges).
3. **Non-Overlapping Tactical HUD (`src/ui/UIManager.ts` & `src/style.css`)**:
   - **Commander Skills Dock (`#commander-skills-dock`)**: `⚡` Energy Gauge + 3 buttons (`轨道离子炮` ground-reticle, `超载脉冲`, `纳米矩阵`) placed side-by-side with `#btn-start-wave` in `.hud-action-bar` (`42px` tall in `580px` embed), auto-tucking `#skills-slot` while `#tray-slot` is open while keeping `#btn-start-wave` visible.
   - **T3 → T4 Dual-Branch Cards**: Inline stats in `.sheet-head` + side-by-side `T4-A` (`#btn-upgrade-tower`) and `T4-B` (`#btn-upgrade-tower-b`) golden cards inside `#tower-inspector` (`<=132px` tall).
   - **Combo Callouts**: Rate-limited (`max 4` concurrent, `680ms`) world-projected floating tags in `#combo-float-layer`.
4. **Standalone Bundler & Preview Sync (`src/main.ts`, `scripts/bundle_standalone.mjs`, `package.json`)**:
   - Promote `html.is-top-window` once at `bootstrap()` for `isTopWindow || http(s): || innerHeight >= 620` (with `min-height: 480px`), keeping `<agent-embed>` at `580px` zero-collapse.
   - Add `scripts/bundle_standalone.mjs` with automated zero-CDN & `580px` CSS assertions, wire `"build": "tsc && vite build && node scripts/bundle_standalone.mjs"`, update `starforge_ark_cradle.html.metadata.json`, and restart `npx vite preview --host 0.0.0.0 --port 5173` daemon.

---

## 5. Verification Method

1. **Build, Standalone Bundle & Zero-CDN Gate**:
   ```bash
   npm run build
   ```
   - Must exit `0`, updating both `dist/` and `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` with `0` external `<script>`/`<link>`/`@import` URLs.
2. **`:5173` Daemon Liveness Check**:
   ```bash
   curl -sSfI http://localhost:5173
   ```
   - Must return `HTTP/1.1 200 OK`.
3. **Multi-Viewport & Sandbox Playability Smoke Check (Playwright Headless Chromium + SwiftShader WebGL2)**:
   - **`760×0` initial `<iframe sandbox="allow-scripts">` (`<agent-embed>`)**: Verify `docScrollHeight === 580`, `0` `SecurityError` / console errors when opening Hub, toggling `"全战区演练解锁"`, upgrading/respeccing Tech Tree, and launching any stage.
   - **`1200×920` Side-Pane `<iframe>` & `1440×900` Desktop**: Verify `#app` height fills `920px` / `900px`.
   - **`360×800` & `390×844` Mobile Portrait**: Verify `#hud-top-bar` fits on 1 row (`scrollWidth <= clientWidth`), `.hub-body-scroll` allows vertical touch pan (`touch-action: pan-y`), and `#build-tray` / `#tower-inspector` (including T3→T4 dual cards) + `#btn-start-wave` have zero bounding-box overlap with each other or active build pads.
   - **Invalidation Conditions**: Any uncaught `SecurityError` in `sandbox="allow-scripts"`, any external CDN request in `starforge_ark_cradle.html`, `#app` collapsing to `0px` in `<agent-embed>`, or HUD buttons overlapping `#build-tray` / `#btn-start-wave` on `580px` embed or `360×800` portrait invalidates the implementation.
