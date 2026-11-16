# Handoff Report — E2E Track Explorer (`explorer_e2e_r1_1`)

**Executive Summary**: Completed full read-only audit of `window.__LUNAR_BEACON_GAME__`, every DOM selector/state in `index.html` & `src/ui/UIManager.ts`, `tests/e2e.mjs`, `package.json`, `dist/`, and `starforge_ark_cradle.html`. Uncovered **12 critical API & DOM discrepancies** between `plan.md` Contract 4 prose and the actual codebase (including `getSnapshot()` vs non-existent `getState()`, `projectWorldToScreen(Vector3)` vs `(x,y,z)`, `#val-gold`/`#pill-gold` vs `#hud-gold`, `.tower-mini-card` vs `.build-card`, `#tower-inspector` vs `#tower-panel`, `#defeat-modal` vs `#defeat-screen`, and `#btn-upgrade-tower[data-affordable="0"].locked` without `disabled`), and designed a `< 90s` 6-context pooled Playwright + SwiftShader WebGL2 harness for `tests/e2e_tiers.mjs`. Full schemas, DOM catalog, and code blueprints are in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_e2e_r1_1/analysis.md`.

---

## 1. Observation

1. **`window.__LUNAR_BEACON_GAME__` Exposure & Method Signatures (`src/main.ts:42`, `src/game/GameEngine.ts`)**:
   - `window.__LUNAR_BEACON_GAME__` is the live `GameEngine` instance (`window.__LUNAR_BEACON_GAME__ = engine`). Class methods and fields are unmangled in both `dist/` and `starforge_ark_cradle.html`.
   - **API Discrepancies vs `plan.md:71`**:
     - State getter is **`getSnapshot(): UISnapshot`** (`GameEngine.ts:1509`), **NOT** `getState()` (`getState` does not exist!).
     - `projectWorldToScreen(worldPt)` (`GameEngine.ts:1617`) is a `private` helper taking **one `THREE.Vector3`** (calling `worldPt.clone().project(this.camera)`), **NOT** `(x, y, z)` numbers, and `window.THREE` is not global. Public screen-coordinate helpers are `getPadScreenCoordinates(padId)` (`'pad_01'`..`'pad_10'`), `getBeaconScreenCoordinates()`, and `getEntranceScreenCoordinates()` (`1603-1615`). Arbitrary world coordinates `(x, y, z)` can be projected safely via `g.camera.position.clone().set(x, y, z).project(g.camera)` + `g.canvas.getBoundingClientRect()`.
   - Other public hooks: `ghostPreviewActive` (getter), `debugStepSimulation(seconds, renderFinal = true)`, `debugAddGold(amount)` (forbidden in Tier 4 zero-cheat campaign), `startNewMission(playIntro = true)`, `selectPadOrTower(padId)`, `previewOrBuildTower(type, confirmImmediately)`, `upgradeSelectedTower()`, `sellSelectedTower()`, `startNextWave()`, `toggleSpeed()`, `togglePause()`, `toggleMute()`, `toggleFullscreen()`, `claimVictoryRewards()`.
2. **DOM Selector Discrepancy Audit (`plan.md:70` vs `src/ui/UIManager.ts`)**:
   - `#hud-hp` -> **`#pill-beacon` / `#val-beacon`** (`UIManager.ts:86-90`)
   - `#hud-gold` -> **`#pill-gold` / `#val-gold`** (`91-95`; `#pill-gold` gets `.shake-warn`, `#val-gold` rolls over `320ms`)
   - `#hud-crystals` -> **`#pill-crystal` / `#val-crystals`** (`96-100`; rolls over `320ms`)
   - `#hud-wave` -> **`#pill-wave` / `#val-wave`** (`101-104`)
   - `#hud-kills` -> **`#pill-kills` / `#val-kills`** (`105-108`)
   - `.build-card[data-tower="..."]` -> **`#btn-card-autocannon`**, **`#btn-card-mortar`**, **`#btn-card-magnetic`** or **`.tower-mini-card[data-tower="..."]`** (`480-490`), followed by 2nd-step CTA **`#btn-confirm-build`** (`501`, `disabled` when unaffordable)
   - `#tower-panel` -> **`#tower-inspector`** (`380`, with `#ins-dmg`, `#ins-rate`, `#ins-rng`, `#btn-close-sheet`, `#btn-sell-tower`)
   - `#btn-upgrade-tower` (`404`): **NOT `disabled` when unaffordable** — uses `.locked` + `data-affordable="0"` (clicking shows `#insufficient-toast` in `#toast-slot` for `1450ms`)
   - `#legendary-banner` -> **`#upgrade-stamp.legendary`** (`194`, during Stage 2C) and **`#legendary-max-badge`** (`418`, in `#tower-inspector` at Tier 4)
   - `#boss-alert` -> **`#banner-slot .wave-banner-card`** (`211`) and **`#boss-hud-bar`** (`271`, with `.boss-skill-warn` at `281`)
   - `#defeat-screen` -> **`#defeat-modal`** (`581`, with `#btn-retry-defeat`); Pause modal is `#pause-modal` (`561`, with `#btn-resume` and `#btn-restart-pause`); Victory screen is `#victory-screen` (`604`, with `#btn-claim-rewards` -> `#btn-play-again`).
3. **Environment, Server & Standalone Artifact State**:
   - `/usr/bin/chromium` (`Chromium 156.0.8078.79`) + `playwright-core@^1.65.1` with `--use-gl=angle --use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist --no-sandbox` provides full headless WebGL2.
   - `http://127.0.0.1:5173/` is actively serving `dist/` (`HTTP/1.1 200 OK`).
   - `starforge_ark_cradle.html` (`767,910` B) has zero external CDN dependencies (inline CSS, IIFE JS, `data:` SVG icon).

---

## 2. Logic Chain

1. **Contract 4 Selector & Method Translation Prevents False E2E Failures**: Because M2 is explicitly instructed NOT to rename existing DOM IDs (`plan.md:69`), any test using `plan.md`'s shorthand `#hud-gold`, `.build-card`, `#tower-panel`, `#defeat-screen`, `getState()`, or `projectWorldToScreen(x, y, z)` would immediately time out or throw `TypeError`. Using the verified `UIManager.ts` / `GameEngine.ts` symbols guarantees 100% selector accuracy both now and after M1/M2.
2. **`debugStepSimulation` vs GSAP Ticker Separation**: `debugStepSimulation` steps `GameEngine.stepFrame(0.05)` synchronously (`playing` combat/waves/VFX), whereas Stage 1 (`opening`), Stage 2C (`legendary_reveal`), Stage 3 (`boss_intro`), Stage 4B/5A (`victory_cinematic`), and Stage 5B (`reward_claiming`) are driven by real-time `gsap.ticker`. Therefore, tests fast-forward combat via `debugStepSimulation` while awaiting cinematic mode transitions via `page.waitForFunction(...)` (or skipping `opening` via `startNewMission(false)` / pad click).
3. **Warm Context Pooling Meets `< 90s` Budget Without State Pollution**: Fresh WebGL2 shader compilation in SwiftShader costs `~1.1s` per page (`120 pages > 130s`), whereas `startNewMission(false)` resets entities in `< 2ms` (leaving only `speedMultiplier`, `muted`, `onboardingStep`, `localStorage`, `#app.expanded-embed`, and UI slots to be scrubbed by `resetGamePage()`). Pooling 1 warm desktop context for Tier 1–3 tests + 5 dedicated contexts (Tier 4 zero-cheat campaign, `390x844` mobile, `0px` `<agent-embed>`, `1200x920` preview iframe, offline `file://` standalone) keeps all 4 tiers within `~35–48s`.
4. **M1/M2 Concurrent Mutation Resilience**: Reading tower upgrade/build costs dynamically from `getSnapshot()` rather than hardcoding pre-M2 `gameConfig.ts` numbers ensures Tier 1–4 tests remain valid across M2's balance tuning.

---

## 3. Caveats

1. **`320ms` HUD Number Roll (`UIManager.ts:222-257`)**: `getSnapshot().gold` and `.crystals` update synchronously (`0ms`), whereas `#val-gold.textContent` and `#val-crystals.textContent` animate via `requestAnimationFrame` over `320ms`. DOM text assertions on `#val-gold`/`#val-crystals` must use `waitForFunction` or wait `>= 360ms`.
2. **WebGL `readPixels` Buffer Preservation (`ToonOutlineComposer.ts:280`)**: Because `preserveDrawingBuffer` is `false`, `gl.readPixels` must be called synchronously inside the **same** `page.evaluate()` immediately after `g.composer.render(g.solidScene, g.vfxScene, g.camera)` using `gl.drawingBufferWidth` / `gl.drawingBufferHeight` (which changes from `1.0x` to `1.5x` CSS size in M1).
3. **5 Genuine Pre-M1/M2 Bugs Expected to Fail Today & Pass in M3**: Running `tests/e2e_tiers.mjs` against unpatched `dist/` before M1/M2 rebuild will legitimately flag: (a) `#150628` crushed outline & `1.0x` canvas buffer (`F6`), (b) `pad_03`/`pad_06` `1x T4` solo win (`F9`), (c) Wave 8 Boss clear bonus skip & frozen stragglers (`F8`), (d) `1440x900` & `390x844` outer Beacon mesh clipping (`F16`), and (e) `580px` height clamp inside `1200x920` preview iframes (`F17`).

---

## 4. Conclusion

The E2E Test Writer has a complete, ambiguity-free technical specification in `analysis.md` to implement `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs`:
- Use **only** verified selectors (`#val-beacon`, `#val-gold`, `#pill-gold`, `#val-crystals`, `#val-wave`, `#val-kills`, `#btn-card-*` / `.tower-mini-card`, `#btn-confirm-build`, `#tower-inspector`, `#btn-upgrade-tower[data-affordable]`, `#btn-sell-tower`, `#upgrade-stamp.legendary`, `#legendary-max-badge`, `#boss-hud-bar`, `#defeat-modal`, `#pause-modal`, `#btn-restart-pause`, `#victory-screen`, `#btn-claim-rewards`, `#btn-play-again`).
- Probe `process.env.E2E_URL || 'http://127.0.0.1:5173'` via HTTP GET, falling back to an ephemeral `127.0.0.1:0` `node:http` static server over `dist/` only if unreachable, and never touching `:5173`.
- Support `--tier=1|2|3|4|all`, save shots to `/tmp/tdk_e2e_tiers_shots`, pool contexts with `resetGamePage()` for `< 90s` runtime, and execute the dynamic zero-cheat 8-wave playthrough + mobile touch + `<agent-embed>` `0px` sandbox + `1200x920` iframe + offline `starforge_ark_cradle.html` loops.

---

## 5. Verification Method

```bash
# Run individual tiers or full 4-tier suite (must finish < 90s and never touch PID on :5173)
node /home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs --tier=1
node /home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs --tier=all

# Verify ephemeral fallback server works when E2E_URL points to an unused port
E2E_URL=http://127.0.0.1:59999 node /home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs --tier=1
```
- **Invalidation Conditions**: Any modification to `src/**` or `package.json` during Milestone `E2E`, killing `:5173`, using `debugAddGold` in Tier 4's campaign clear, or ignoring `console.error`/`pageerror` invalidates the suite.
