# Handoff — `explorer_m2_r1_3_gen2` (M2 UI, Preview Sync & Smoke Delta)

## 1. Observation
- **`UIManager.ts` (`662` lines) & `style.css` (`1029` lines)**:
  - `BUILD_PADS` is imported at `src/ui/UIManager.ts:1` and used solely at `line 464` (`BUILD_PADS.find((p) => p.id === snap.selectedPadId)`) to render `.pad-title-tag` at `line 496`. (`GameEngine.ts:452` and `GameEngine.ts:1604` also call `BUILD_PADS.find(...)`.)
  - `#hud-top-bar` lives at `src/ui/UIManager.ts:83-117` (synced at `lines 239-265`; styled at `src/style.css:120-236, 935-947, 978-1014`). `#pill-kills` is at `line 105`; wave text is formatted at `line 259` (`${snap.waveNumber}/${snap.totalWaves}`) and `#btn-start-wave` at `lines 309-323`.
  - `#modal-slot` (`z-index: 30`, `src/style.css:775-780`) renders `#pause-modal` (`UIManager.ts:559-577`), `#defeat-modal` (`lines 579-596`), and `#victory-screen` (`lines 598-660`, with `#btn-claim-rewards` at `lines 635-642` and `#btn-play-again` at `lines 643-645`).
  - `#app` (`src/style.css:54-65`) sets `height: 580px` and `touch-action: none` (`line 64`), with `.expanded-embed` (`height: 740px`, `lines 74-76`) and `html.is-top-window #app` (`height: 100%`, `lines 67-72`).
- **`src/main.ts` (`54` lines), `package.json` (`23` lines), Bundler & Live `:5173` Status**:
  - `src/main.ts:12-20` only checks `window.self === window.top`, leaving `:5173` bookmark iframes and IDE side-pane previews stuck at `580px`.
  - `scratch/bundle_standalone.mjs` (`74` lines) builds Vite IIFE (`LunarBeaconBundle`) into `/tmp/lunar_iife_dist` and writes `starforge_ark_cradle.html`, but hardcodes `node_modules/vite/...` and does **not** update `starforge_ark_cradle.html.metadata.json` (`updatedAt: "2026-11-14T04:40:42.884669534Z"`).
  - `ss -tlnp` confirms **no server is currently listening on `:5173`** (`NO_5173_LISTENING`).
- **Playwright & WebGL2 Environment (`tests/e2e.mjs:1-25`)**:
  - `playwright-core` (`^1.65.1`) launches `/usr/bin/chromium` (`156.0.8078.79`) with `--use-gl=angle --use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist --no-sandbox`.

## 2. Logic Chain
1. **Stage-Agnostic Pad UI**: Removing `BUILD_PADS` from `UIManager.ts:1` and supplying `selectedPadLabel: string | null` + `selectedPadIsHighGround: boolean` on `UISnapshot` decouples `UIManager` from Stage 1's static pad table while surfacing high-ground range/damage bonuses (`▲高地 +18%射程/+15%伤害`) in `#build-tray` (`line 496`) and `#tower-inspector`.
2. **Zero-Wrap Top HUD & Endless Wave Formatting**: Inserting `#btn-open-hub` before `#pill-beacon` (`UIManager.ts:86`), collapsing its text label at `<=720px`, and adding `.hide-xs` (`@media (max-width: 440px) { display: none !important; }`) to `#pill-kills` (`line 105`) keeps the `360px` mobile top bar at `324px <= 344px` on a single `30px` row. Updating `line 259` and `line 314` to check `snap.isEndless` renders `W{n} · ∞` cleanly.
3. **M4-Ready `#sector-hub-modal` & Victory Progression**: Adding `<div id="hub-slot" class="hub-slot"></div>` (`z-index: 35`) after `#modal-slot` (`line 132`) with `engine.setOverlayPause(true/false)` and `.hub-body-scroll { touch-action: pan-y; overscroll-behavior: contain; }` delivers Chapters 1–4 + Endless Star-Chart selection, `1–3★` &首通 `💎` badges, `#btn-toggle-unlock-all` (`"全战区演练解锁"`), and `#btn-launch-stage` (`"🚀 立即出击"`), while isolating `renderHubTechTab()` / `renderHubCodexTab()` slots so M4 expands Tabs 2 & 3 with zero structural churn. On `#victory-screen` (`lines 643-646`), rendering `#btn-next-sector` (`"▶ 下一战区"`) alongside `#btn-hub-victory` and preserved `#btn-play-again` enables 1-click campaign progression without breaking replay E2E selectors.
4. **Atomic Dual-Preview Sync**: Adding `isHttpOrigin || isHostSizedIframe` (`innerHeight >= 620`) once in `bootstrap()` (`src/main.ts:12-20`) fixes `:5173` and side-pane `100%` height while preserving `580px` zero-collapse in `<agent-embed>` (`about:srcdoc`, initial `innerHeight === 0`). Moving the bundler to `scripts/bundle_standalone.mjs` (updating both `starforge_ark_cradle.html` and `starforge_ark_cradle.html.metadata.json`) and chaining it into `package.json` `"build"` guarantees `dist/` and `starforge_ark_cradle.html` never drift.

## 3. Caveats
- **`#app { touch-action: none }` (`src/style.css:64`)**: Every scrollable modal container (`.hub-body-scroll`, `.enamel-dialog`) MUST explicitly override `touch-action: pan-y`, otherwise vertical touch-scrolling inside `#sector-hub-modal` on `360×800` / `390×844` mobile viewports is blocked by the root rule.
- **Keep `#btn-start-wave` Visible When `#tray-slot` Is Open**: `tests/e2e.mjs:452-453` taps `#btn-confirm-build` (which transitions `#build-tray` into `#tower-inspector`) and immediately taps `#btn-start-wave` without closing the sheet. Never hide `#next-wave-slot` when a pad/tower is selected.
- **Stage 1 Replay & Chest Crystal Assertions (`tests/e2e.mjs:355-375`)**: Keep `stage_01` as the initial boot stage (`260` Gold, `20` Beacon HP, `8` waves), keep `#btn-play-again` restarting the active stage (`startNewMission(false)`), and ensure `GameEngine.getPadScreenCoordinates(padId)` (`line 1603`) queries active stage pads rather than static `BUILD_PADS`.
- **`:5173` Daemon**: No Vite preview server is currently running (`NO_5173_LISTENING`); M2 Worker must start `npx vite preview --host 0.0.0.0 --port 5173` (`IsDaemon: true`) after `npm run build`.

## 4. Conclusion
All exact line numbers, DOM IDs, CSS selectors, debug API invariants, standalone bundler metadata paths, and Chromium SwiftShader WebGL2 flags are verified and ready for M2 Worker implementation. Full line-by-line code snippets and integration tables are in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m2_r1_3_gen2/analysis.md`.

## 5. Verification Method
1. Run `npm run build` (`tsc && vite build && node scripts/bundle_standalone.mjs`) — verify exit code `0`, `0` external `http(s)://` URLs in `starforge_ark_cradle.html`, `#app` `580px` rule intact, and `starforge_ark_cradle.html.metadata.json` `updatedAt` refreshed.
2. Start `npx vite preview --host 0.0.0.0 --port 5173` (`IsDaemon: true`) and verify `curl -sSfI http://127.0.0.1:5173` returns `200 OK`.
3. Run a `<30s` Playwright (`playwright-core` + `/usr/bin/chromium` with `--use-gl=angle --use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist --no-sandbox`) smoke script covering:
   - `:5173` boot (`stage_01`), `#btn-open-hub` → `#sector-hub-modal`, `#btn-toggle-unlock-all`, switching/launching Chapters 1–4 + `endless` (`W1 · ∞`), stage mechanism interaction, and `0` console/page errors;
   - Sandboxed `<iframe sandbox="allow-scripts">` loading `starforge_ark_cradle.html` via `srcdoc` asserting `appHeight === 580` (non-zero height) and `0` `SecurityError` crashes.
