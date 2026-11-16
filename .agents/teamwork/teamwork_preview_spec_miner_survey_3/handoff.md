# Handoff Report — Survey Track 3 (`teamwork_preview_spec_miner_survey_3`)

**Handoff Type**: Hard (Task Complete — Read-Only Specification Mining & Preview/Delivery/Environment Audit)
**Full Detailed Tables**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_spec_miner_survey_3/analysis.md`

---

## 1. Observation

### 1.1 Exhaustive Parsing of `ORIGINAL_REQUEST.md` (Lines 1–108)
Every line and sub-clause of `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md` was extracted into **69 atomic requirements (`REQ-001`–`REQ-069`)** (full 8-column Specification Miner table in `analysis.md` §1):

| Range | Source Section (`ORIGINAL_REQUEST.md`) | Atomic Requirement Summary |
|---|---|---|
| `REQ-001`–`REQ-004` | L4–13: Initial Request & Context Paths | Audit prior `/goal` completion, fix all defects, deliver `/home/antigravity/GOD-OF-PPT/tdk` + standalone HTML `starforge_ark_cradle.html` (`scratch/bundle_standalone.mjs`) + bookmark `Starforge Ark Cradle.url.json` (`http://localhost:5173`). |
| `REQ-005`–`REQ-016` | L15–30: Historical Request 1 (Product, Quality Baseline & Delivery) | Original 3D mecha TD mobile prototype (`REQ-005`), modular Web codebase (`REQ-006`), unobstructed combat readability (`REQ-007`), soft lighting/no screen overexposure (`REQ-008`), anticipation/impact/overshoot/settle mechanical weight (`REQ-009`), tactile enamel UI without tiny-text clutter (`REQ-010`), action-synced SFX + mute (`REQ-011`), Pause/Resume/Restart (`REQ-012`), real damage/CC/resources/upgrades/rewards (`REQ-013`), desktop + mobile layout & perf control (`REQ-014`), runnable build/docs (`REQ-015`), empirical full-loop + settlement + restart + mobile verification (`REQ-016`). |
| `REQ-017`–`REQ-019` | L32–34: Historical Request 2 & 4 (Preview & Sandbox) | Zero `0px` height collapse in `<agent-embed>` / adaptive sandboxed iframes (`REQ-017`), zero external CDN dependencies in `starforge_ark_cradle.html` (`REQ-018`), persistent `npx vite preview --host 0.0.0.0 --port 5173` daemon (`REQ-019`). |
| `REQ-020`–`REQ-021` | L36–40: Historical Request 3 (`/goal` Core Loop) | Interactive 7-step loop **Deploy → Build → Combat → Upgrade → Boss → Victory Settlement → Reward Claim** (`REQ-020`), commercial mobile-grade highlight moments on Upgrade, Boss Kill, and Final Reward Claim (`REQ-021`). |
| `REQ-022`–`REQ-028` | L42–49: Worldbuilding (`守护最后一座返航信标`) | Halted lunar mining station (`REQ-022`), maintenance engineer defending last Return Beacon (`REQ-023`), rogue mining machines (`REQ-024`), unified industrial design (`REQ-025`), 100% original IP (`REQ-026`), environmental storytelling via broken monorails/crates/platforms/hazard lamps/markings (`REQ-027`), zero long text story interruptions (`REQ-028`). |
| `REQ-029`–`REQ-034` | L51–59: Art Direction (`圆润厚重的卡通机甲`) | Chunky chamfered toy-mecha shapes + articulated parts (`REQ-029`), cream-white + deep-blue + orange-amber friendly palette (`REQ-030`), restrained blue-grey/purple-grey/cool-cyan lunar deck (`REQ-031`), dark-grey + rust-red + red-sensor enemies (`REQ-032`), unified `#1A1033` outline (`REQ-033`), high saturation restricted to weapons/cores/buttons/key VFX (`REQ-034`). |
| `REQ-035`–`REQ-038` | L61–67: Tier & Weapon Identification | 4 tiers `临时装配(绿) → 标准战备(蓝) → 精英模块(紫) → 传说机甲(金)` (`REQ-035`), tier color scoped to core/trim/nameplate/upgrade VFX/reveal backdrop (`REQ-036`), constant weapon signature color per tower type (`REQ-037`), real 4-stage 3D geometry growth (`单层底座 → 加固支撑 → 扩展武器模块 → 完整装甲与特殊机械组件`, never whole-tower recoloring, `REQ-038`). |
| `REQ-039`–`REQ-046` | L69–80: Complete Game Content & Balance | 1 map, 8 waves, Wave 4 Elite, Wave 8 Final Boss (`REQ-039`); entrance, road, Return Beacon, 10 fixed off-road pads, Beacon HP deduction (`REQ-040`); Gold, Energy Crystals, Beacon HP, Wave, Kills HUD + kill gold (`REQ-041`); Tower Sell with explicit refund (`REQ-042`); inter-wave prep + manual `开始下一波` (`REQ-043`); Pause, `1x`, `2x`, Retry (`REQ-044`); balanced economy where combo+upgrades win, 1 tower cannot solo, Wave 1 fair (`REQ-045`); real simulated stats (`REQ-046`). |
| `REQ-047`–`REQ-049` | L82–85: 3 Defense Tower Archetypes | **Twin Autocannon** (`联装机炮`: single-target rapid fire, low/wide, alternating dual-barrel recoil, ammo drums, cooling vents, rotating turret, `#FF9F1C` flash/tracers, `REQ-047`); **Pulse Mortar** (`脉冲迫击炮`: slow AoE, tall, thick barrel, stabilizers, glowing capacitor, parabolic shell, `#22D3EE` shockwave, `REQ-048`); **Magnetic Restraint Tower** (`磁场约束塔`: low dmg + slow, upright frame + rotating rings, pre-pulse ring expansion & rapid core spin, `#C084FC` field/ring, timed visual slow status **without infinite stacking**, `REQ-049`). |
| `REQ-050`–`REQ-056` | L87–92: Enemies & Final Boss | Patrol Rover (`REQ-050`), low-flying Transport Swarm (`REQ-051`), slow Heavy Armored Drill w/ metallic hit feedback (`REQ-052`), Final Boss Tracked Excavator w/ drill, arms, layered armor & glowing weak point (`REQ-053`), distinct silhouettes/gaits/deaths (`REQ-054`), conditional HP bars (`REQ-055`), immediate target cancel on death without double payout/infinite tracking (`REQ-056`). |
| `REQ-057`–`REQ-059` | L94–95: Map & Camera | Slight 3/4 overhead view + 3D slab thickness + road/deck contrast (`REQ-057`), non-occluding perimeter craters/wrecks/rocks (`REQ-058`), locked camera except Opening/Boss/Victory + mobile portrait full Entrance-Road-Beacon framing + event-only shake (`REQ-059`). |
| `REQ-060`–`REQ-063` | L97–100: Real 3D Modeling, Toon Shading & Post Outline | 100% real Three.js 3D meshes for towers, enemies, Boss, Beacon, Gold Coins, Energy Crystals & Supply Chest (no flat 2D sprites in 3D) w/ chamfers/rivets/gears/joints/gem facets/seams (`REQ-060`); true pivots, idle breathing/spin/fins/hover & altitude-scaled blob shadows (`REQ-061`); `THREE.MeshToonMaterial` + 3–4 step gradient + key/sky/rim lights (`REQ-062`); `#1A1033` Normal+Depth outline w/ thick outer / fine inner seams, grazing slope compensation, `1.5x` SS without stacking DPR + WebGL2 MSAA, zero outline on VFX/particles/rings/UI (`REQ-063`). |
| `REQ-064`–`REQ-069` | L102–107: 5 Mandatory Highlight Stages | **Stage 1** fly-in + sequential Beacon lamps + pad hop + 3-step guide (`REQ-064`); **Stage 2A/B** base-first squash/dust build + non-pausing arc-fly T2/T3 upgrade w/ char-slam & `▲+stat` (`REQ-065`); **Stage 2C** simulation-pausing golden T4 Legendary Reveal Stage (`REQ-066`); **Stage 3** Boss shake/lamps/fissures/inward particles/~1s rising pitch → silence contraction → shockwave + red-circle telegraph (`REQ-067`); **Stage 4** short hit sparks/flash/recoil vs Elite/T4/Boss-only slow-mo & debris (`REQ-068`); **Stage 5** Beacon beam + 3D Supply Chest drop + interactive clasp/hinge open fountaining 3D Coins & 3D Crystals + Play Again (`REQ-069`). |

### 1.2 Direct Observations of Preview Artifacts, Bundler & Vite Server
- **Artifact Directory (`/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7`)**:
  - `starforge_ark_cradle.html`: `767,910` bytes, modified `2026-11-14 04:40:43.224Z` (with `.metadata.json`, `userFacing: true`).
  - `Starforge Ark Cradle.url.json`: `209` bytes, modified `2026-11-14 04:40:44.046Z` (`"url": "http://localhost:5173"`, `userFacing: true`).
  - `scratch/bundle_standalone.mjs`: `2,178` bytes, modified `2026-11-14 04:39:37.108Z` (programmatic Vite `format: 'iife'` bundler writing to `/tmp/lunar_iife_dist` and inlining CSS + JS + base64 `public/favicon.svg` into `starforge_ark_cradle.html`).
- **Freshness vs `src/` & `dist/`**:
  - Newest `src/` file is `src/style.css` (`04:39:01.671Z`); `dist/` was built at `04:39:15.873Z`; `starforge_ark_cradle.html` was bundled at `04:40:43.224Z`. Both `dist/` and `starforge_ark_cradle.html` are currently **up-to-date** with `src/`.
- **External URL Scan (`starforge_ark_cradle.html`)**:
  - Only `http(s)` substrings in the `767,910`-byte file are `'https://gsap.com'`, `'http://www.w3.org/1999/xhtml'`, and `'http://www.w3.org/2000/svg'`. Zero external `<script>`, `<link>`, `@import`, Google Fonts, images, or audio files.
- **Vite Preview Server (`:5173`)**:
  - OS process `PID 591 → 603 → 604` (`node .../vite preview --host 0.0.0.0 --port 5173`) is actively `LISTEN`ing on `0.0.0.0:5173`.
  - `curl -I http://localhost:5173/` and asset requests return `HTTP/1.1 200 OK` (`Cache-Control: no-cache`), serving `dist/index.html` (`968` B), `dist/assets/index-CjsPOqzO.js` (`751,986` B), and `dist/assets/index-7MgS_FIK.css` (`15,140` B).
- **Empirical 4-Surface Headless Chromium + WebGL2 Probe (`task-66` output)**:
  1. `SURFACE_1_TOP_5173` (`1440x900` top-level tab): `{"isTopClass":true,"scrollHeight":900,"appRect":{"w":1440,"h":900},"canvasAttr":{"w":1440,"h":900},"webgl2":true,"mode":"playing","entranceX":93.52,"beaconX":1421.27,"errs":[]}`
  2. `SURFACE_2_IFRAME_5173_920PX` (`1200x920` parent hosting `<iframe src="http://localhost:5173">` — identical to IDE Bookmark/Side-Pane Preview): `{"innerHeight":920,"isTopClass":false,"scrollHeight":920,"appRect":{"w":1200,"h":580},"mode":"opening"}`
  3. `SURFACE_3_AGENT_EMBED_0PX_START` (`760x0` initial `<iframe sandbox="allow-scripts">` with `srcdoc = starforge_ark_cradle.html`): `preResize: {"innerWidth":760,"innerHeight":0,"docScrollHeight":580,"appRect":{"width":760,"height":580},"canvasAttr":{"w":756,"h":576}}, errs: [], extRequests: []`
  4. `SURFACE_4_DIRECT_FILE_URL` (`1000x920` `file://` load): `{"isTopClass":true,"appRect":{"width":1000,"height":920},"errs":[]}`

### 1.3 Build, Test & Browser Tooling Observations
- **Tooling**: Node `v24.22.2`, npm `11.21.2`, TypeScript `7.0.2` (`npx tsc --noEmit` exits `0`), Vite `8.3.8`, `playwright-core@1.65.1`, `/usr/bin/chromium` (`156.0.8078.79`, WebGL2 active with `--use-gl=angle --use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist --no-sandbox`). No `vitest`/`jest` installed (Node 24 native `node --test` is built-in). Git repo has `0` commits (`main`, all files untracked).
- **E2E Script (`tests/e2e.mjs`)**: Lines `164` and `221` call `window.__LUNAR_BEACON_GAME__.debugAddGold(650)` and `debugAddGold(2200)` (`+2850` extra gold) during the Wave 2–8 run.

---

## 2. Logic Chain

1. **`<agent-embed>` `0px` Collapse Prevention (`SURFACE_3` + `src/style.css:11-65` + `src/main.ts:12-20`)**:
   - Because `<agent-embed>` initializes iframe height at `0px` and derives height from `scrollHeight` (`generative_ui` skill), using `height: 100%` or `100vh` on top-level containers collapses `scrollHeight` to `0px`.
   - `src/style.css:57` sets `#app { height: 580px }` by default without setting `height: 100%` on `html, body`, so `SURFACE_3` immediately reports `docScrollHeight: 580` even at `innerHeight: 0`, with `0` external requests and `0` console errors under `sandbox="allow-scripts"`.
2. **Side-Pane & `:5173` Bookmark Preview Clamping Defect (`SURFACE_2` + `src/main.ts:14`)**:
   - `src/main.ts:14` checks `isTopWindow = window.self === window.top` to decide whether to add `html.is-top-window` (`height: 100%`).
   - However, when a user opens **either** `Starforge Ark Cradle.url.json` (`http://localhost:5173`) **or** `starforge_ark_cradle.html` in the IDE's **Side-Pane Preview**, the IDE renders it inside a host-sized `<iframe>`, where `window.self === window.top` is `false`!
   - Therefore (`SURFACE_2`), `#app` stays locked at `580px` inside a `920px`-tall side pane (leaving `340px` empty space below, or clipping the bottom HUD if the pane is `< 580px` tall).
   - Because `<agent-embed>` starts at `innerHeight === 0` (and resizes to `580px`), whereas `:5173` uses `http:` protocol and side-pane preview iframes already have host-assigned `window.innerHeight > 600` at bootstrap, checking `isTopWindow || location.protocol.startsWith('http') || window.innerHeight > 600` (paired with `min-height: 500px` safety floor) will allow full-height side-pane/bookmark previews without reintroducing `0px` collapse in `<agent-embed>`.
3. **Desktop Widescreen Return Beacon Clipping (`SURFACE_1` + `src/game/GameEngine.ts:286-305` + `01_stage1_station_deploy.png`)**:
   - `computeBaseCameraPose()` only increases `distScale` when `aspect < 1.38` (`GameEngine.ts:291`). At `1440x900` (`aspect = 1.60`, `fov = 38`), `distScale = 1.0`, placing `beaconX` at `1421.3px` out of `1440px` (`18.7px` margin), visually slicing off the right half of the Return Beacon on both desktop (`01_stage1_station_deploy.png`) and inline embed (`14_sandboxed_embed_verified.png`). Pulling `distScale` slightly back (e.g., `~1.08–1.12` baseline or slight `x` lookAt centering) keeps both Entrance and Return Beacon fully inside widescreen frames (`REQ-057`/`REQ-059`).
4. **Unverified Natural Economy Balance (`tests/e2e.mjs:164,221` vs `REQ-045`)**:
   - Because `tests/e2e.mjs` injects `+2850` debug gold, a legitimate no-cheat playthrough from Wave 1 to Wave 8 has not been asserted by automated tests and must be verified/tuned.
5. **Artifact Re-Bundling Discipline (`scratch/bundle_standalone.mjs:72`)**:
   - Any code/CSS fix in `src/` requires running **both** `npm run build` (updating `dist/` served by PID `604` on `:5173`) **and** `node .../scratch/bundle_standalone.mjs` (plus refreshing `starforge_ark_cradle.html` metadata if needed) so `:5173` and `starforge_ark_cradle.html` stay 100% synchronized.

---

## 3. Caveats

- Deep line-by-line gameplay simulation math, 3D mesh/rig geometry anatomy (`TowerFactory.ts`, `EnemyFactory.ts`, `BeaconAndPropsFactory.ts`), and GSAP timeline choreography (`CinematicDirector.ts`, `VfxManager.ts`) were scoped to Survey Tracks 1 & 2; this Track 3 audit focused on exhaustive spec decomposition (`REQ-001`–`REQ-069`), preview/iframe/artifact/server behavior, and build/test/browser capabilities.
- Headless Chromium uses SwiftShader software WebGL2 (`--use-angle=swiftshader`), which accurately validates shaders, MSAA render targets, layout, and DOM/canvas coordinates, though frame-time profiling reflects CPU rasterization rather than hardware GPU speed.

---

## 4. Conclusion

1. **Exhaustive Specification Baseline Ready**: All 108 lines of `ORIGINAL_REQUEST.md` have been decomposed into **69 atomic requirements (`REQ-001`–`REQ-069`)** and **10 edge cases (`EC-01`–`EC-10`)** in `analysis.md`.
2. **Current Preview & Build Status**:
   - `npx tsc --noEmit` passes with `0` errors; `dist/` and `starforge_ark_cradle.html` (`767,910` B) are currently in sync with `src/`.
   - `starforge_ark_cradle.html` has **zero external CDN/network URLs** and **zero `0px` collapse** in `<agent-embed>` (`580px` height, `0` errors under `sandbox="allow-scripts"`).
   - `npx vite preview --host 0.0.0.0 --port 5173` is actively running (`PID 604`) and serving `200 OK` at `http://localhost:5173`.
3. **Actionable Defects & Test Gaps Identified for Remediation**:
   - **[Preview Sizing Defect — `REQ-003`/`REQ-004`/`REQ-017`]**: Inside IDE Side-Pane Artifact Preview and `:5173` Bookmark Preview iframes (`window.self !== window.top`, `innerHeight = 920`), `#app` is stuck at `height: 580px` instead of filling the preview pane. Fix `src/main.ts` / `src/style.css` so `http(s):` pages and host-sized preview iframes (`initial innerHeight > 600`) fill `100%` height (with a `min-height: 480px` floor) while keeping `<agent-embed>` at `580px`.
   - **[Desktop Widescreen Camera Framing Defect — `REQ-057`/`REQ-059`]**: At `aspect >= 1.38` (`1440x900` / `960x580`), `computeBaseCameraPose()` clips the right half of the Return Beacon (`beaconX = 1421.3 / 1440`). Slightly increase desktop camera pullback so both Mine Entrance and Return Beacon have clean screen margins on desktop widescreen as well as mobile portrait.
   - **[Stage 5 Chest Spotlight Overexposure — `REQ-008`/`REQ-069`]**: Soften opacity/blending of the yellow spotlight cone over the open 3D Supply Chest (`09_stage5_3d_chest_open_loot_fountain.png`) so 3D Gold Coins & Crystals remain crisp and unwashed.
   - **[E2E Suite Enhancements — `REQ-016`/`REQ-045`/`REQ-049`]**: Add automated E2E assertions for (a) **zero-cheat natural economy** Wave 1–8 clear (no `debugAddGold`), (b) desktop widescreen Entrance & Beacon screen bounds, (c) multi-tower Magnetic non-stacking slow cap, and (d) standalone `starforge_ark_cradle.html` `<agent-embed>` (`0px`-init) + side-pane iframe sizing.
   - **[Post-Fix Delivery Sync — `REQ-003`/`REQ-019`]**: After any `src/` changes, run `npm run build` AND `node .../scratch/bundle_standalone.mjs` (and verify `:5173` `200 OK` + updated `starforge_ark_cradle.html`).

---

## 5. Verification Method

Run the following read-only / test commands from `/home/antigravity/GOD-OF-PPT/tdk` to independently verify every finding:

1. **Typecheck & Build**:
   - `npx tsc --noEmit` (expect exit code `0`)
   - `npm run build` (updates `dist/`)
2. **Vite Preview Server Liveness (`:5173`)**:
   - `ps -ef | grep '[v]ite preview'` and `curl -sS -I http://localhost:5173/` (expect `HTTP/1.1 200 OK`)
3. **Standalone Single-File HTML Rebuild & Zero-CDN Check**:
   - `node '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/scratch/bundle_standalone.mjs'`
   - Scan `starforge_ark_cradle.html` for `https?://` strings (expect only GSAP comment + W3C `xhtml`/`svg` namespaces).
4. **End-to-End Headless Browser + WebGL2 Verification**:
   - `npm run test:e2e` (launches `/usr/bin/chromium` via `playwright-core` with `--use-gl=angle --use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist --no-sandbox`).
5. **Invalidation Conditions**:
   - Any subsequent edit to `src/**` invalidates `dist/` and `starforge_ark_cradle.html` until both `npm run build` and `bundle_standalone.mjs` are re-run.
