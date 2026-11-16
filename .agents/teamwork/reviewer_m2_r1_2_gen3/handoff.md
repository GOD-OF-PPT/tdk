# Handoff Report — `reviewer_m2_r1_2_gen3` (Milestone M2 Quality & Adversarial Review)

## Review Summary

**Verdict**: **APPROVE**
- **Integrity Check**: **PASS** (0 hardcoded outputs, 0 dummy/facade implementations, 0 external CDN shortcuts, 0 fabricated logs, 0 non-markdown files in `.agents/teamwork/`).
- **Critical Findings**: 0
- **Major Findings**: 0
- **Minor Findings**: 2 (non-blocking cosmetic edge cases documented below for optional M3/M4 polish)

## Challenge Summary

**Overall risk assessment**: **LOW**

---

## 1. Observation

### 1.1 Static Code & Contract Observations
1. **Sandbox-Safe Storage (`src/game/ProgressionManager.ts:133–167`, `src/audio/AudioManager.ts:18–22, 35–39`)**:
   - `createSandboxSafeStore()` wraps `const ls = window.localStorage;` property getter + `setItem` / `removeItem` probe inside a `try/catch` block (`lines 135–166`), falling back to an in-memory `Map<string, string>` (`persistent: false`) when a sandboxed iframe (`sandbox="allow-scripts"` without `allow-same-origin`) throws `DOMException: SecurityError` on getter access. Even when `persistent: true`, individual `getItem` / `setItem` calls remain wrapped in `try/catch` (`lines 144–159`).
   - `ProgressionManager` implements `CampaignSaveDataV2` (`lunar_beacon_campaign_v2`, `line 17`), unlocking next stages sequentially via `STAGE_ORDER` (`lines 320–324`), `"全战区演练解锁"` (`setUnlockAllSandbox`, `lines 262–265`), 6 persistent Tech Upgrades with 100% free crystal respec (`upgradeTech` / `respecTech`, `lines 352–377`), and 9 Commendation Achievements (`lines 422–432`).
   - `grep -rn 'localStorage' src/` confirmed zero unguarded `localStorage` accesses anywhere in `src/`.

2. **Multi-Lane Simulation, Disposal, Fog Guard, Raycasting, Mechanisms & Boss Settlement (`src/game/GameEngine.ts`)**:
   - **Stage Reload Disposal (`lines 406–431`)**: `loadStage(stageId, playIntro)` cancels active GSAP timelines (`this.cinematics.cancelAll()`), clears all VFX including in-flight mortar shells (`this.vfx.clearAll()`, verified at `src/fx/VfxManager.ts:670–701`), disposes dynamic towers/enemies/ghost previews (`this.clearDynamicEntities()`), disposes previous `LunarStationEnvironment` (`this.env.dispose()` -> `disposeObject3DTree(root)` & `disposeObject3DTree(vfxRoot)`), compiles new stage lanes, applies stage palette + `syncFogDensityForCamera()`, rebuilds environment, updates `CinematicDirector.setEnvironment(this.env)`, and calls `startNewMission(playIntro)`.
   - **Mobile `FogExp2` Washout Guard (`lines 334–361`)**: `computeCurrentDistScale()` caps `distScale` at `3.25` (`Math.min(3.25, stageCam.distScale * aspectFactor)`), and `syncFogDensityForCamera()` scales `solidScene.fog.density = palette.fogDensity / Math.max(1, distScale * 0.78)` on both `handleResize()` (`line 359`) and `loadStage()` (`line 421`).
   - **`mode === 'playing'` Build Guard (`lines 609–612, 685–687`)**: `previewOrBuildTower()` strictly requires `this.mode === 'playing'`, preventing builds while paused, during opening cinematics, or during legendary reveals.
   - **Multi-Lane Target Ranking (`lines 2154–2171`)**: `acquireBestTarget()` computes `remainingDist = Math.max(0, laneLen - e.distanceTraveled)` per enemy's assigned `compiledLanes[e.laneIndex]` rather than raw `distanceTraveled`.
   - **Horizontal-Plane Raycasting (`lines 2255–2332`)**: `intersectHorizontalPlane(y, out)` sets `scratchPlane.constant = -y` for `Plane((0,1,0), -y)` (`p.y = y`), testing build pads on exact `planeY = (pad.y ?? 0) + 0.15` (`d <= 1.48`), mechanisms on `getMechanismHitElevation` (`crystal_vein: 0.45`, `capacitor_pylon: 0.65`, `laser_gate: 0.85`), and the 3D Victory Supply Chest on `chestPos.y + 0.35` (`d <= 2.05`).
   - **Battlefield Mechanisms (`lines 586–603, 792–885, 1143–1202, 1370–1378`)**:
     - `High-Ground` (`padType === 'high_ground'`): `HIGH_GROUND_RANGE_MULT = 1.18`, `HIGH_GROUND_DAMAGE_MULT = 1.15` (`lines 70–71, 588–595`).
     - `Crystal Vein`: `+45` Gold, `+1` in-run crystal, `+1` persistent crystal, `18s` cooldown + crystal prism regrow animation (`0.35 -> 1.0`).
     - `Capacitor Pylon`: `20s` cooldown (`0.6s` discharge), `4.6m` shockwave stripping `220` `shieldHp` immediately, dealing `95` true arc damage (`armorPierce = 1.0`), applying `48%` (`28%` Boss) slow for `2.4s` and `fluxTimer = 4.0s`.
     - `Laser Gate`: `6.0s` active plasma barrier (`22s` recharge), `0.2s` tick interval dealing `11` damage (`55 DPS`, `0.7` armorPierce) + `40%` (`24%` Boss) slow within `1.95m`.
     - `Speed-Rail`: `getSpeedZoneMultiplier(laneIndex, dist)` applies `1.42x` speed along Stage 3's two induction rail zones (`campaignConfig.ts:680–681`).
   - **New Enemies & Boss Mechanics (`lines 1432–1471, 1552–1578, 1884–2069`)**:
     - `shieldHp` (`lines 1884–1908, 1433–1440`): absorbs damage before `hp`, takes `1.35x` from Magnetic towers & arc mechanisms (`sourceTower === null`), recharges `18/s` on non-Boss units after `3.5s` `shieldRegenDelay`.
     - `splitter_rover` (`lines 1993–1997`): spawns `2x mini_scout` on death with clamped lane distance (`Math.max(0, lane.totalLength - 0.5)`).
     - `repair_drone` (`lines 1443–1471`): heals up to 4 injured allies within `3.6m` every `2.6s` (`+30` normal / `+55` Boss) with spinning `supportHalo`.
     - Boss `weakPointCore` `1.25x` & generalized `armorPlates` (`lines 1311–1312, 1911–1927, 1952–1968`): rear/flank hits (`dot < 0.15` against `(sin(rotY), cos(rotY))`) or hits after any armor plate cracks deal `1.25x` raw damage; 3 breakaway plates on Ch.1–3 Bosses (`[0.25, 0.5, 0.75]`) and 4 plates on `boss_ark_overlord` (`[0.18, 0.35, 0.55, 0.75]`).
     - `victory_cinematic` gating (`lines 2001–2069`): strictly requires `!this.isEndlessMode() && this.waveIndex === this.currentStage.waves.length - 1 && !anyOtherBossAlive && !anyOtherBossPending`; awards `finalWaveCfg.clearGoldBonus` & `clearCrystalBonus`, disposes all remaining stragglers via `disposeObject3DTree`, and runs `playBossDefeatAndBeaconVictory`. Mid-stage Sub-Boss (`Stage 4 Wave 8`) and `Endless` Bosses (`W5, W10...`) execute `playEliteKillClimax` + `dyingTimer = 0.38` without ending the mission.

3. **Sector Hub UI, Responsive CSS & Dual-Preview Bundler (`src/ui/UIManager.ts`, `src/style.css`, `src/main.ts`, `scripts/bundle_standalone.mjs`, `package.json`)**:
   - `UIManager.ts:1–17`: `BUILD_PADS` static import is completely removed; pad labels use `snap.selectedPadLabel` (`line 563`).
   - `#btn-open-hub` (`line 129`), `#sector-hub-modal` (`line 808`), `#btn-toggle-unlock-all` (`line 941`), `#btn-launch-stage` (`line 991`), and `#btn-next-sector` (`line 742`) are cleanly wired.
   - `src/style.css:804–810` (`.enamel-dialog`) and `1073–1080` (`.hub-body-scroll`) both set `overflow-y: auto; touch-action: pan-y; overscroll-behavior: contain;`.
   - `src/main.ts:12–23`: promotes `document.documentElement.classList.add('is-top-window')` once at bootstrap when `isTopWindow || isHttpOrigin || (!isTopWindow && window.innerHeight >= 620)`, while `src/style.css:57` keeps `#app { height: 580px; }` for auto-sized `<agent-embed>` / `srcdoc` iframes.
   - `scripts/bundle_standalone.mjs:53–111` & `package.json:8`: `"build"` runs `tsc && vite build && node scripts/bundle_standalone.mjs`, asserting `height: 580px` on `#app`, `0` external `http(s)://` URLs in CSS/HTML tags, IIFE single-script bundling, and syncing both `starforge_ark_cradle.html` and `starforge_ark_cradle.html.metadata.json`.

### 1.2 Independent CLI & Headless Chromium WebGL2 Verification Results
- `npx tsc --noEmit`: exited `0` (`0` TypeScript errors).
- `curl -sSfI http://127.0.0.1:5173`: returned `HTTP/1.1 200 OK` (`Content-Type: text/html`).
- `sha256sum`:
  - `/home/antigravity/GOD-OF-PPT/tdk/dist/starforge_ark_cradle.html`: `0b1ff64cdd95b1006684b86532ca5c33c0eb11aa086f342eece468451f719a42` (`881,591` bytes)
  - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html`: `0b1ff64cdd95b1006684b86532ca5c33c0eb11aa086f342eece468451f719a42` (`881,591` bytes — exact byte-for-byte match; `.metadata.json` present at `361` bytes, `"userFacing": true`).
- External URL scan on `dist/starforge_ark_cradle.html`: only W3C SVG/XHTML namespace strings and GSAP's internal string constant (`0` external network requests or CDN assets).
- `.agents/teamwork/` layout check (`find_by_name` excluding `*.md`): `Found 0 results`.
- **Independent Playwright WebGL2 Adversarial Stress Suite (`0` console errors, `0` pageerrors)**:
  - **Strict `<iframe sandbox="allow-scripts" srcdoc="...">`**: `appHeight: 580`, `isTop: false`, `persistent: false`, muted toggle + `#sector-hub-modal` + `#btn-toggle-unlock-all` (`unlockedAll: true`) + launch `stage_02` + Tech upgrade (`upOk: true`) + respec (`refunded: 4`) all succeeded with `0` `SecurityError` exceptions.
  - **UI Layout & `#btn-start-wave` Visibility When `#tray-slot` Is Open**:
    - `1440×900`: `#hud-top-bar` height `41px`; `#btn-start-wave` (`663..709` build / `690..736` inspect) sits cleanly above `#build-tray` (`724..898`) and `#tower-inspector` (`743..890`), `overlapsTray: false`, `overlapsTopBar: false`.
    - `960×580` (`<agent-embed>`): `#hud-top-bar` height `34px`; `#btn-start-wave` (`371..411` build / `382..422` inspect) sits cleanly above `#build-tray` (`426..580`) and `#tower-inspector` (`429..572`), `overlapsTray: false`, `overlapsTopBar: false`.
    - `390×844` & `360×800` (Mobile Portrait): `#hud-top-bar` single-row height `31px`; `#btn-start-wave` sits cleanly above `#build-tray` and `#tower-inspector` (`overlapsTray: false`, `overlapsTopBar: false`); `aspect: 0.462`, `fov: 48`, `distScale: 3.25`, `fog.density: 0.003235` (`ent0.x = 49.6px`, `beacon.x = 340.1px` inside `0..390px`).
  - **Combat & Mechanism Verification**:
    - Pointer tap on elevated `pad_03` (`y = 0.68`) selected `pad_03` (`isHighGround: true`); `previewOrBuildTower` while paused returned `false`; while playing built T1 Autocannon with `damage: 18`, `range: 6.37`.
    - Pointer tap on `vein_s1_1` granted `+45` Gold and entered cooldown; `pylon_s2_n` stripped `shield_skimmer` shield (`95 -> 0`) and dealt `95` arc damage (`hp: 135 -> 40`); `splitter_rover` death spawned `2` `mini_scout`; Stage 3 speed-rail returned `1.42x` (`1.0x` outside), `gate_s3_1` ticked `11` burn damage + `0.4` slow, and `repair_drone` healed injured `drill` (`100 -> 130` HP).
    - Stage 4 asymmetric lanes (`32.06m` vs `19.76m`): tower acquired Lane 1 enemy (`10.66m` remaining) over Lane 0 enemy (`15.36m` remaining).
    - `boss_ark_overlord` (`4` `armorPlates`): frontal hit dealt `50` DMG (`1.0x`), rear hit dealt `63` DMG (`1.25x` weak-point bonus).
    - Stage 4 Wave 8 Sub-Boss (`boss_crawler`) kill kept `mode: "playing"` with non-Boss enemies alive; Wave 12 Final Boss (`boss_ark_overlord`) kill entered `victory_cinematic`, granted `+780` Gold (`480 + 300`) & `+18` Crystals (`12 + 6`), and cleaned stragglers (`nonBossRemaining: 0`).
    - Endless Wave 5 (`#val-wave = "W5 · ∞"`) Boss kill kept `mode: "playing"` and advanced cleanly to Wave 6.
    - 8 consecutive stage reloads spawning all 12 enemy types plateaued at `geometries: 2 -> 3`, `textures: 13 -> 13`, and `openEndedLayer0Count: 0`.

---

## 2. Logic Chain

1. **Why Sandbox & Dual-Preview Architecture Is Sound**:
   - Because `ProgressionManager` probes `window.localStorage` inside a `try/catch` (`Observation 1.1.1`) and `src/main.ts` only promotes `html.is-top-window` once at bootstrap while `src/style.css` defaults `#app` to `580px` (`Observation 1.1.3`), the exact same code runs cleanly both at `http://127.0.0.1:5173` (`100%` viewport height) and inside restricted `<agent-embed>` / `sandbox="allow-scripts"` HTML previews (`580px` height, `0` `SecurityError` crashes, `0` external CDN dependencies) (`Observation 1.2`).

2. **Why Multi-Stage Simulation, Raycasting & Resource Lifecycle Are Leak-Free and Fair**:
   - `loadStage()` disposes both `solidScene` (`root`) and `vfxScene` (`vfxRoot`) trees plus all active towers, enemies, ghost previews, GSAP timelines, and in-flight mortar shells (`Observation 1.1.2`), which explains why 8 full stage reloads across all 5 stage configs and 12 enemy rigs plateaued at `geometries: 3, textures: 13` (`Observation 1.2`).
   - Intersecting horizontal planes at `y = (pad.y ?? 0) + 0.15` and mechanism elevations eliminates the `0.45m–0.75m` 3/4-camera parallax miss on elevated `High-Ground` pads (`y = 0.68`) and tall mechanisms (`Observation 1.1.2`, verified by pointer-event dispatch in `Observation 1.2`).
   - Ranking targets by `laneLen - distanceTraveled` prevents multi-portal stages (`Stage 4`, `32.06m` vs `19.76m`) from ignoring enemies on shorter lanes that are physically closer to the Return Beacon (`Observation 1.2`).
   - Gating `victory_cinematic` on `!isEndlessMode() && waveIndex === waves.length - 1` prevents premature victory on Stage 4 Wave 8's vanguard Sub-Boss and Endless Boss waves (`W5, W10...`), while ensuring Campaign final-wave Boss kills still award wave-clear bonuses and purge straggler meshes (`Observation 1.2`).

3. **Adversarial Stress Findings (Minor / Non-Blocking Only)**:
   - **[Minor] Finding 1 / Challenge 1 — Untracked Banner Auto-Hide `setTimeout` Across Sub-2s Stage Switch**:
     - *Where*: `src/game/GameEngine.ts:964–966` (`startNextWave`) and `2131–2133` (`checkWaveCompletion`).
     - *Attack Scenario*: Starting a wave schedules an untracked `setTimeout(..., 2400)` that calls `onHideBanner()` if `this.mode === 'playing'`. If a player starts a wave, switches stages via Sector Hub within `<2.4s`, and starts Wave 1 on the new stage, the prior timer hides the new stage's banner slightly early.
     - *Blast Radius*: Purely cosmetic banner display duration; zero state corruption or exception.
     - *Mitigation*: Store `private bannerHideTimer = 0` on `GameEngine` and `clearTimeout` inside `startNewMission()`.
   - **[Minor] Finding 2 / Challenge 2 — Stage 2 Boss Temporary Ally Shield Strip Visibility**:
     - *Where*: `src/game/GameEngine.ts:1553–1560` (`boss_siege_driller` skill) & `src/render/EnemyFactory.ts:930–943`.
     - *Attack Scenario*: `boss_siege_driller` grants `+120` `shieldHp` (`maxShieldHp = 120`) to nearby allies. Allies whose blueprint has no `maxShield` (`splitter_rover`, `swarm`) do not have a `shieldFillMesh` strip created in `EnemyFactory`, though `syncEnemyShieldVisuals` safely null-checks both `shieldDome` and `shieldFillMesh` (`0` errors) and shield-break rings still render.
     - *Blast Radius*: Minor visual feedback nuance on non-skimmer escorts during Stage 2 Wave 10.
     - *Mitigation*: Optionally build `shieldFillMesh` (hidden by default) on all enemy `hpBarGroup` rigs if visual shield bars on Boss-buffed escorts are desired in M4 polish.

---

## 3. Caveats

- **Milestone M3 Forward-Wired Contracts (Out of M2 Failure Scope per `plan.md` & Dispatch)**:
  - `activateCommanderSkill()` (`src/game/GameEngine.ts:887–893`), `tacticalEnergy` / `skills` / `selectedTowerBranchOptions` in `UISnapshot`, Tech upgrades `tactical_reactor` (tactical energy modifier) & `flux_resonator` (`comboDamageMultiplier`), and Achievements `ach_synergy_25` / `ach_skill_12` are intentionally scaffolded as contracts for Milestone M3 (`commander-skills-tower-branches-synergy-and-progression-hub`).
  - `setTimeout` on Mortar flap doors (`src/game/GameEngine.ts:1812`) is explicitly scheduled for replacement by `simDt` Mortar doors in Milestone M3 per `plan.md`.
- **Hardware GPU Caveat**: Headless verification used Chromium WebGL2 with ANGLE/SwiftShader software rasterization; actual GPU frame-times on physical mobile devices were not measured directly, though render-target sizing (`maxDim <= 3200`) and geometry/texture counts (`3` dynamic geometries, `13` shared textures) are well within mobile budgets.

---

## 4. Conclusion

Milestone M2 (`campaign-maps-mechanisms-and-preview-sync`) is **APPROVED** to proceed to Milestone M3. All 4 distinct campaign stages (`stage_01..stage_04`) + `endless` mode, 4 interactive terrain/battlefield mechanisms (`High-Ground`, `Crystal Vein`, `Capacitor Pylon`, `Laser Gate`, plus Stage 3 `Speed-Rail`), 4 new enemy archetypes + 3 new chapter Bosses, sandbox-safe `ProgressionManager`, Sector Command Hub (`#sector-hub-modal` + `"全战区演练解锁"`), responsive mobile/embed/desktop layout, live `:5173` preview, and byte-synced standalone `starforge_ark_cradle.html` (+ `.metadata.json`) meet every M2 specification with zero integrity violations and zero runtime or TypeScript errors.

---

## 5. Verification Method

To independently reproduce all checks:
1. **Typecheck & Live Preview Check**:
   ```bash
   npx tsc --noEmit
   curl -sSfI http://127.0.0.1:5173
   ```
2. **Standalone Artifact & Metadata Sync Check**:
   ```bash
   sha256sum /home/antigravity/GOD-OF-PPT/tdk/dist/starforge_ark_cradle.html \
     /home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html
   ```
3. **Full Automated E2E Regression Suite**:
   ```bash
   npm test
   ```
4. **Invalidation Conditions**: This approval is invalidated if any subsequent edit modifies `src/` without re-running `npm run build` (which re-bundles and syncs `starforge_ark_cradle.html` + `.metadata.json`), introduces external `http(s)://` assets, or breaks `:5173` availability.
