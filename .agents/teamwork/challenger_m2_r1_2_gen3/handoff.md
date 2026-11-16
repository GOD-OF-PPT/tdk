# Empirical Challenge & Handoff Report — Milestone M2 (`challenger_m2_r1_2_gen3`)

**Verdict**: **`APPROVE`** *(with 2 non-blocking Low-severity polish items documented below to fold into Milestone M3's scheduled `GameEngine.ts` / `UIManager.ts` / `style.css` pass)*

---

## Challenge Summary

**Overall risk assessment**: **LOW**

### Challenges

#### [Low] Challenge 1 — Native Browser Permissions-Policy Console Error When Clicking `#btn-fullscreen` Inside `<iframe sandbox="allow-scripts">`
- **Assumption challenged**: Calling `host.requestFullscreen().catch(...)` in `src/game/GameEngine.ts:302–306` silently falls back to `.expanded-embed` inside sandboxed `<agent-embed>` iframes without browser console errors.
- **Attack scenario**: When `starforge_ark_cradle.html` runs inside `<iframe sandbox="allow-scripts" srcdoc="...">` (no `allowfullscreen` attribute, so `document.fullscreenEnabled === false`), clicking `#btn-fullscreen` invokes `host.requestFullscreen()`. Although the `.catch()` fallback executes properly and toggles `#app.expanded-embed` (`580px` ↔ `740px`) with `0` uncaught `pageerror`, Chromium itself emits a native `console.error`:
  `"Permissions policy violation: fullscreen is not allowed in this document."` on each click (`consoleErrorCount: 2` across expand + collapse clicks).
- **Blast radius**: Cosmetic DevTools console noise only — zero uncaught exceptions, zero layout breakage, and `.expanded-embed` (`740px` expand / `580px` collapse) functions properly.
- **Mitigation (for M3)**: Change `src/game/GameEngine.ts:302` from `if (host.requestFullscreen)` to `if (document.fullscreenEnabled && host.requestFullscreen)` so sandboxed iframes toggle `.expanded-embed` directly without triggering a blocked Fullscreen API request.

#### [Low] Challenge 2 — Internal 2-Line Text Wrap Inside `#pill-wave` (`"W1 · ∞"`) on `360×800` Narrow Portrait in Endless Mode
- **Assumption challenged**: `#hud-top-bar` remains single-row (`<= 46px` height) across **all** stages and modes at `360×800` without `white-space: nowrap` on `.stat-plate`.
- **Attack scenario**: On `360×800` (`clientWidth: 344`), Campaign stages `stage_01`..`stage_04` (even with 4-digit gold `9960` and `22/22` Beacon HP) keep `#hud-top-bar` at `offsetHeight: 31px` (`singleRow: true`, `scrollWidth: 344 <= clientWidth: 344`). However, launching `endless` sets `#val-wave` to `"W1 · ∞"` (`src/ui/UIManager.ts:317`) containing spaces, while `.stat-plate` (`src/style.css:139–148`) lacks `white-space: nowrap`. Under tight flex compression (`statsRightVsCtrlLeftGap: 4px`), `"W1 · ∞"` wraps onto two lines inside `#pill-wave`, increasing `#hud-top-bar.offsetHeight` from `31px` to `50px` (`rowSpanPx: 50`), though horizontal overflow remains zero (`scrollWidth: 344 <= clientWidth: 344`).
- **Blast radius**: Minor `19px` extra vertical height on `#hud-top-bar` only in Endless mode on `<= 360px` narrow portrait; zero horizontal scroll/clipping, and `#btn-start-wave` / playfield remain fully usable.
- **Mitigation (for M3 `360×800` responsive polish)**: Add `white-space: nowrap;` to `.stat-plate` in `src/style.css:140` and format compact Endless wave badge as `` `W${snap.waveNumber}·∞` `` in `src/ui/UIManager.ts:317` (or tighten `@media (max-width: 440px) .stat-plate { padding: 3px 4px; }`).

### Stress Test Results

- **Zero-CDN & SHA-256 Parity (`dist/` vs Brain Artifact + `.metadata.json`)** → `0` external URLs & identical SHA-256 → `0` `<script>`/`<link>`/`<img>`/`@import`/`url(http)` matches; `881,591 bytes` identical `SHA-256: 0b1ff64cdd95b1006684b86532ca5c33c0eb11aa086f342eece468451f719a42`; `.metadata.json` valid (`userFacing: true`); `:5173` `200 OK` → **PASS**
- **`<iframe sandbox="allow-scripts" srcdoc="...">` at `0px` Initial Parent Height** → `#app` `580px` (`0` collapse), `is-top-window: false` → `innerHeightAtZeroHost: 0`, `appOffsetHeight: 580`, `docScrollHeight: 580`, `isTopWindowClass: false`, native `localStorage` confirmed throwing `SecurityError` (`lsThrowsSecurityError: true`) while `ProgressionManager` threw **`0` `SecurityError`** → **PASS**
- **Sandbox `#btn-fullscreen` Toggle (`580px` → `740px` → `580px`)** → `.expanded-embed` toggles cleanly without sticky `100%` lock → `expandedCheck: { hasExpandedClass: true, appOffsetHeight: 740 }` → `collapsedBackCheck: { hasExpandedClass: false, isTopWindowClass: false, appOffsetHeight: 580 }` (`0` `pageerror`; 2 native Chromium Permissions-Policy console logs noted in Challenge 1) → **PASS (w/ Low note)**
- **Sandbox `#sector-hub-modal` + `#btn-toggle-unlock-all` + Tech/Codex Tabs + Launch `stage_02`..`endless` + Mute Toggle** → `0` `SecurityError`, `0` network errors, `0` outbound HTTP requests, `0` `pageerror` → All 4 stages launched (`stage_02` `1/10`, `stage_03` `1/10`, `stage_04` `1/12`, `endless` `W1 · ∞`), `securityErrorCount: 0`, `networkErrorCount: 0`, `externalRequestCount: 0`, `pageErrorCount: 0` → **PASS**
- **`:5173` on `1440×900` (`DPR=2`) & `1200×920` Side-Pane Iframe** → `100%` height, `1.5x` supersampling without DPR compounding → `1440×900` (`supersampled: 2160×1350`, `rendererPixelRatio: 1`, `0` console errors) & `1200×920` (`appW: 1200, appH: 920, isTopWindow: true`) → **PASS**
- **`:5173` on `390×844` Mobile Portrait Across Stages 1–4** → Entrances, Return Beacon & all 45 Build Pads framed inside viewport, `FogExp2` washout guard active → `beaconInBounds: true`, `outOfBoundsEntrances: []`, `outOfBoundsPads: []` on all 4 stages (`fogDensity: 0.003156–0.003235 < 0.005`, `rendererPixelRatio: 1`) → **PASS**
- **`:5173` on `360×800` Narrow Portrait (`#hud-top-bar`, `.hub-body-scroll`, `#tray-slot` + `#btn-start-wave`)** → `scrollWidth <= clientWidth`, `touch-action: pan-y`, `#btn-start-wave` visible & hit-testable when tray open → `scrollWidth: 344 <= clientWidth: 344` across all stages (`31px` single-row on Stages 1–4; `50px` wrapped `#pill-wave` on Endless noted in Challenge 2); `.hub-body-scroll` `touchAction: "pan-y"` (`scrolled: true`, `975 > 651`); `#btn-start-wave` `inViewport: true, overlapsTray: false, hitStartBtn: true` with both High-Ground `#build-tray` (`top: 547..593` above tray `600..792`) and `#tower-inspector` (`top: 507..553` above tray `560..792`) → **PASS (w/ Low note)**
- **M1 Visual & Closed-Manifold Layer-0/1 Audit Across All 5 Stages + All 12 Enemies + T1–T4 Towers + GPU Leak Cycle** → `0` `openEnded` Layer-0 meshes, `#1A1033` outline intact, Layer-1 translucent shields/auras/beams un-outlined, `0` GPU leaks → Return Beacon `66` Layer-0 meshes (`0` `openEnded`, `skyBeam` on Layer 1); `stage_01..endless` (`198 / 222 / 241 / 1074 / 236` Layer-0 meshes, `20..83` Layer-1-only meshes, **`0` `openEnded`**, **`0` suspicious translucent Layer-0 meshes**, **`0` wrong-layer `vfxScene` objects**); `geometries: 1 -> 1, textures: 8 -> 8` across 5 `loadStage()` switches → **PASS**

### Unchallenged Areas
- Full multi-wave combat balance across Waves 1–12 and Milestone M3 features (3 Active Commander Skills, Combo Triangle, T4-A/B dual 3D branches) — out of M2 preview/viewport scope and scheduled for M3.

---

## 1. Observation

1. **Artifact & Zero-CDN Static Inspection (`scripts/bundle_standalone.mjs`, `dist/starforge_ark_cradle.html`, Brain Artifact)**:
   - Executed parallelized Playwright + Node empirical harness (`/tmp/challenger_m2_2_gen3.mjs`, completed in **`14,031 ms`** `< 30s` with `exit 0`, then removed via `rm -f /tmp/challenger_m2_2_gen3.mjs`).
   - Direct measurement from `staticAudit`:
     - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` (`881,591` bytes) and `/home/antigravity/GOD-OF-PPT/tdk/dist/starforge_ark_cradle.html` (`881,591` bytes) share exact SHA-256 `0b1ff64cdd95b1006684b86532ca5c33c0eb11aa086f342eece468451f719a42`.
     - `starforge_ark_cradle.html.metadata.json` (`lines 1–5`) parses cleanly with `"userFacing": true` and `"updatedAt": "2026-11-14T13:33:37.133Z"`.
     - `extScriptCount: 0`, `extLinkCount: 0`, `extMediaCount: 0`, `cssUrlHttpCount: 0`, `cssImportCount: 0`, `hasApp580Rule: true`, `hasExpanded740Rule: true`, and `http://127.0.0.1:5173/` returned `HTTP/1.1 200 OK`.

2. **Sandboxed `<agent-embed>` (`<iframe sandbox="allow-scripts" srcdoc="...">`, `0px` Initial Parent Height)**:
   - With `iframe.style.height = '0px'` at boot (`src/main.ts:12–23`): `origin: "null"`, `innerHeightAtZeroHost: 0`, `isTopWindowClass: false`, `#app.offsetHeight: 580`, `docScrollHeight: 580`, and native `window.localStorage` threw `SecurityError` (`lsThrowsSecurityError: true`).
   - Clicking `#btn-fullscreen` (`src/game/GameEngine.ts:294–311`) toggled `.expanded-embed` ON (`appOffsetHeight: 740`) and a second click toggled it OFF (`appOffsetHeight: 580`, `isTopWindowClass: false`), emitting 2 native Chromium Permissions-Policy console messages (`"Permissions policy violation: fullscreen is not allowed in this document."`) because `GameEngine.ts:302` checks `if (host.requestFullscreen)` without `document.fullscreenEnabled`.
   - Opening `#sector-hub-modal`, clicking `#btn-toggle-unlock-all` (`unlockEnabled: true`), switching to `#hub-tab-btn-tech` and `#hub-tab-btn-codex`, launching `stage_02`, `stage_03`, `stage_04`, and `endless` (`#val-wave === "W1 · ∞"`), stepping WebGL2 simulation, and toggling `#btn-mute` produced `securityErrorCount: 0`, `networkErrorCount: 0`, `externalRequestCount: 0`, and `pageErrorCount: 0`.

3. **Multi-Viewport & M1 3D/Outline Non-Regression (`1440×900`, `1200×920` iframe, `390×844`, `360×800`)**:
   - `1440×900` (`deviceScaleFactor: 2`): `isTopWindow: true`, `appW: 1440, appH: 900`, `supersampled: { width: 2160, height: 1350 }`, `rendererPixelRatio: 1`, `outlineLinearVec3: [0.02546, 0.01522, 0.05353]` (`src/render/ToonOutlineComposer.ts:22–80`), `consoleErrors: []`.
   - `1200×920` `<iframe>`: `isTopWindow: true`, `appW: 1200, appH: 920, canvasClientH: 920`.
   - `390×844` mobile portrait across `stage_01`..`stage_04`: `stage_01` (`entrance: (49.6, 371.1)`, `beacon: (340.1, 415.2)`), `stage_02` (`entrance: (49.3, 395.8)`, `beacon: (334.2, 395.8)`), `stage_03` (`entrance: (57.9, 430.2)`, `beacon: (332.1, 413.5)`), `stage_04` (`entrances: (54.8, 375.7) & (172.2, 338.7)`, `beacon: (331.2, 402.2)`), with `outOfBoundsPads: []` across all 45 pads and `fogDensity: 0.003156–0.003235`.
   - `360×800` narrow portrait: `#hud-top-bar` `scrollWidth === 344 === clientWidth` in all cases (`offsetHeight: 31` single-row on `stage_01` and `stage_04` w/ `9960` gold; `offsetHeight: 50` on `endless` due to internal wrap of `"W1 · ∞"` in `src/ui/UIManager.ts:317`). `.hub-body-scroll` (`src/style.css:1073–1080`) has computed `touch-action: pan-y` and scrolled `0 -> 180px` (`scrollHeight: 975, clientHeight: 651`). With `#tray-slot` open in both High-Ground `#build-tray` and `#tower-inspector`, `#btn-start-wave` remained fully visible, non-overlapping, and hit-testable (`hitStartBtn: true`).
   - M1 3D/Layer audit (`src/render/BeaconAndPropsFactory.ts:204–576`, `src/render/EnemyFactory.ts:523–538`): Return Beacon has `66` Layer-0 closed-manifold meshes (`0` `openEnded`) and `skyBeam` on Layer 1 (`line 572`); across `stage_01`..`endless` including all 12 spawned enemy types, T1–T4 towers, and active `laser_gate` (`1,074` Layer-0 meshes + `83` Layer-1-only meshes on `stage_04`), `openEndedLayer0Count === 0`, `suspiciousTranslucentLayer0 === []`, `vfxWrongLayerCount === 0`, and GPU memory across 5 `loadStage()` switches stayed flat at `1` geometry / `8` shared textures.

---

## 2. Logic Chain

1. Because `scripts/bundle_standalone.mjs` inlines Vite IIFE JS, CSS, and base64 SVG favicon while asserting `height: 580px` and `0` external URLs, both `dist/starforge_ark_cradle.html` and the brain artifact are bit-for-bit identical (`SHA-256: 0b1ff64c...`) and execute completely offline inside opaque `"null"`-origin sandboxes (`Observation 1, 2`).
2. Because `src/main.ts:12–23` evaluates `isTopWindow || isHttpOrigin || isHostSizedIframe` strictly once at `bootstrap()`, `<agent-embed>` `srcdoc` iframes starting at `0px` parent height retain `#app { height: 580px }` (`0` collapse) and can expand to `740px` and collapse back to `580px` without inadvertently promoting to `html.is-top-window`, while `:5173` top-level (`1440×900`, `390×844`, `360×800`) and `1200×920` side-pane iframes fill `100%` height (`Observation 2, 3`).
3. Because `ProgressionManager` wraps all `window.localStorage` reads/writes in `try/catch` backed by an in-memory fallback store, toggling `#btn-toggle-unlock-all`, inspecting Tech/Codex tabs, switching across all stages, and toggling mute inside `sandbox="allow-scripts"` throws `0` `SecurityError` despite Chromium actively blocking `window.localStorage` (`Observation 2`).
4. Because all solid hulls/dioramas/Return Beacon meshes (`0` `openEnded`) stay on `solidScene` Layer 0 while translucent shields (`shield_skimmer`), repair rings (`repair_drone`), laser gate plasma bars, High-Ground rings, and `skyBeam` use `setLayerRecursive(..., 1)` or `vfxScene` Layer 0, M1's `#1A1033` silhouette and internal seam outlines remain completely free of false outline rings (`Observation 3`).
5. Neither of the two minor empirical findings (Chromium's Permissions-Policy console log when `document.fullscreenEnabled === false` in `GameEngine.ts:302`, and internal wrapping of `"W1 · ∞"` inside `#pill-wave` on `360×800` Endless mode in `UIManager.ts:317` / `style.css:140`) causes functional failure, horizontal overflow, or security/rendering errors, and both sit directly inside files scheduled for Milestone M3's HUD/responsive polish pass.

---

## 3. Caveats

- Automated stress script `/tmp/challenger_m2_2_gen3.mjs` gated continuous background `rAF` stepping between explicit `debugStepSimulation(..., renderFinal)` calls so all 3 parallel Chromium tracks completed in `14.0s` (`< 30s`) on CPU SwiftShader without starving IPC.
- Multi-wave combat balance and M3 Tactical Skills / Synergy Combos / T4-A & T4-B dual branches were not stress-tested here as they belong to Challenger 1 (combat) and Milestone M3.

---

## 4. Conclusion

**Verdict: `APPROVE`**.

Milestone M2 (`campaign-maps-mechanisms-and-preview-sync`) empirically satisfies standalone `<agent-embed>` zero-CDN sandbox safety (`0` `SecurityError`, `580px` zero-collapse, `740px` expand/collapse, identical `881,591`-byte SHA-256 sync), live `:5173` daemon availability (`200 OK`), multi-viewport framing (`1440×900`, `1200×920` iframe, `390×844` 4-stage framing, `360×800` `pan-y` scroll & visible `#btn-start-wave` with `#tray-slot` open), and 100% M1 3D closed-manifold + `#1A1033` Layer-0/1 non-regression.

**Recommended 2-line polish items to fold into Milestone M3 scope**:
1. `src/game/GameEngine.ts:302`: Guard `requestFullscreen` with `if (document.fullscreenEnabled && host.requestFullscreen)` to silence Chromium's native Permissions-Policy console log inside `sandbox="allow-scripts"`.
2. `src/style.css:140` & `src/ui/UIManager.ts:317`: Add `white-space: nowrap;` on `.stat-plate` and compact Endless wave text (`W${snap.waveNumber}·∞`) so `#hud-top-bar` stays `31px` single-row on `360×800` in Endless mode just as it already does on Stages 1–4.

---

## 5. Verification Method

1. **Verify SHA-256 Parity, Zero-CDN HTML, and Live `:5173` Daemon**:
   ```bash
   sha256sum /home/antigravity/GOD-OF-PPT/tdk/dist/starforge_ark_cradle.html /home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html
   curl -sSfI http://127.0.0.1:5173
   ```
2. **Files Inspected**:
   - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` & `.metadata.json`
   - `/home/antigravity/GOD-OF-PPT/tdk/scripts/bundle_standalone.mjs` (`lines 53–111`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/main.ts` (`lines 11–24`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts` (`lines 294–380`, `390–523`, `2280–2546`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/ui/UIManager.ts` (`lines 124–183`, `292–606`, `871–1179`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/style.css` (`lines 20–77`, `121–230`, `412–620`, `1002–1182`, `1452–1570`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts` (`lines 204–576`, `920–1057`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts` (`lines 427–540`)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts` (`lines 21–96`, `471–568`)
3. **Invalidation Conditions**:
   - Any edit to `src/` or `scripts/bundle_standalone.mjs` without re-running `npm run build` invalidates `dist/` ↔ artifact SHA-256 parity.
