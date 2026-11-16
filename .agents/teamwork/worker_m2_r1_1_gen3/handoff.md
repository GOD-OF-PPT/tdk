# Hard Handoff Report — Milestone M2 (`campaign-maps-mechanisms-and-preview-sync`)

## 1. Observation

### Predecessor Working-Tree Audit & Defects Resolved (`Step 1`)
1. **`src/game/ProgressionManager.ts` (`lines 449–463`)**:
   - Observed strict TypeScript compilation failure (`TS2493`, `TS2322`, `TS18048`) on `TECH_MODULES[id].costs[lv]` because `if (lv >= 4)` did not narrow `4` out of `0 | 1 | 2 | 3 | 4` for a 4-tuple `[number, number, number, number]`.
   - Fixed by narrowing explicitly via `if (lv === 4) return null;` (`line 451`) and `if (lv === 4) return false;` (`line 461`).
2. **`src/render/EnemyFactory.ts` (`lines 519–538`)**:
   - Observed `repair_drone`'s `haloGrp` (`supportHalo`) lacked a Layer-1 non-outlined translucent repair ring (`SCOPE.md:31`, `DEAD_ENDS.md` #1).
   - Added `repairAuraRing` (`RingGeometry(0.28, 0.42, 20)`, `MeshBasicMaterial`, `setLayerRecursive(repairAuraRing, 1)`) onto `haloGrp` while keeping solid 3D cross + gimbal on Layer 0 (`0` `openEnded` Layer-0 meshes).
3. **`src/game/GameEngine.ts`**:
   - **`dispose()` (`lines 323–332`)**: Wired `this.cinematics.cancelAll()` and `this.vfx.dispose()` before `clearDynamicEntities()` and `env.dispose()`.
   - **Mobile Portrait Camera & `FogExp2` Washout Guard (`lines 334–378`, `421`)**: Implemented `computeCurrentDistScale()` (`distScale = Math.min(3.25, stageCam.distScale * aspectFactor)`) and `syncFogDensityForCamera()` scaling `fog.density = stage.palette.fogDensity / Math.max(1, distScale * 0.78)` (`DEAD_ENDS.md` #5).
   - **`startNewMission()` (`lines 491–496`)**: Reset `supplyChest.lidPivot.rotation.set(0, 0, 0)`, `claspMesh.visible = true`, `claspMesh.position.set(0, 0.66, 0.51)`, `claspMesh.rotation.set(0, 0, 0)`, and `innerGlow` opacity `0`.
   - **`previewOrBuildTower()` (`lines 610–612`)**: Added `if (this.mode !== 'playing')` guard (`SCOPE.md:36`).
   - **`claimVictoryRewards()` (`lines 1018–1028`)**: Removed duplicate `this.crystals += result.totalBonusCrystals` so in-run `snap.crystals` grants exact chest crystals (`+8` on Stage 1, preserving `tests/e2e.mjs:363–367`), while `this.progression` (`snap.persistentCrystals`) banks both `chestCrystals` and `result.totalBonusCrystals` (`firstClearCrystals + newStarCrystals`).
   - **`updateTowers()` (`lines 1682–1706`)**: Added M1 `idleCore` breathing scale pulse (`restScale * (1 + Math.sin(...) * 0.06)`), guarded `idleCore.rotation.y` with `if (tower.type !== 'magnetic')`, and added `else` recovery on `rig.weaponPitch.rotation.x` so Magnetic towers recover from Boss EMP stun droop.
   - **`applyDamageToEnemy()` (`lines 1910–2030`)**:
     - Added interactive Boss `weakPointCore` `1.25x` bonus damage when rear/flank exposed (`dot < 0.15`) or dorsal armor layers breached (`SCOPE.md:38`).
     - Generalized breakaway plate index to `enemy.rig.armorPlates.length - enemy.armorLayersRemaining` (`line 1940`).
     - On final Campaign Boss kill (`lines 1990–2015`): awarded final-wave `clearGoldBonus` & `clearCrystalBonus` + `recordWaveReached`, marked `pendingSpawns` spawned, and immediately disposed all non-Boss stragglers via `disposeObject3DTree(other.rig.root)` with lunar dust puffs so zero corpses freeze mid-air during `victory_cinematic`.
   - **`acquireBestTarget()` (`lines 2154–2171`)**: Switched target ranking from `progressRatio` to minimum remaining distance to Beacon (`Math.max(0, laneLen - e.distanceTraveled)`) per Interface Contract `C1`.
   - **Elevation-Aware Horizontal Plane Raycasting (`lines 2255–2325`, `2491–2504`)**: Replaced 3D ray-point distance checks in `handleCanvasTap` with exact horizontal-plane intersections (`intersectHorizontalPlane`) at `y = (pad.y ?? 0) + 0.15` for pads (`hypot <= 1.48`), `y = 0.45 / 0.65 / 0.85` for mechanisms (`hypot <= 1.62` / `1.85`), and `y = chestPos.y + 0.35` for supply chest, matching `getPadScreenCoordinates` and `getMechanismScreenCoordinates` (`DEAD_ENDS.md` #4).
4. **Verified Intact Predecessor Files**:
   - `src/types.ts`, `src/config/gameConfig.ts`, `src/config/campaignConfig.ts`, `src/render/BeaconAndPropsFactory.ts` (including 100% untouched M1.1 `buildReturnBeacon` lines `204–576`), `src/audio/AudioManager.ts`, and `src/game/CinematicDirector.ts` audited clean; `TowerFactory.ts`, `ToonOutlineComposer.ts`, `ToonMaterials.ts`, `VfxManager.ts`, and `tests/e2e.mjs` untouched.

### M2.3 UI & Stage Switcher (`Step 2`)
- **`src/ui/UIManager.ts` (`1,096 lines`)**:
  - Removed hardcoded `BUILD_PADS` import; wired `STAGE_CONFIGS`, `STAGE_ORDER`, `TECH_MODULES`, `TECH_ORDER`, and `ACHIEVEMENT_CONFIGS`.
  - Prepend `#btn-open-hub` (`🗺` + `#val-sector-name` + `#hub-alert-pip`) in `#hud-top-bar`, added `.hide-xs` on `#pill-kills`, formatted `#val-wave` & `#btn-start-wave` for Endless (`W{n} · ∞`), and displayed `snap.selectedPadLabel` + High-Ground badges (`▲高地 +18%射程/+15%伤害` / `▲高地增程`) in `#build-tray` and `#tower-inspector`.
  - Updated `#pause-modal` and `#defeat-modal` with `#btn-hub-from-modal` and Endless wave messaging; updated `#victory-screen` post-claim actions with primary `#btn-next-sector` (`▶ 下一战区 · ...`), `#btn-hub-victory`, and preserved `#btn-play-again`.
  - Implemented `#sector-hub-modal` (`openHub` / `closeHub` wired to `engine.setOverlayPause`) with `#hub-crystals-val`, 3 tabs (`#hub-tab-btn-campaign`, `#hub-tab-btn-tech`, `#hub-tab-btn-codex`), SVG constellation Star-Chart (`#stage-node-stage_01`..`#stage-node-endless`), `#btn-toggle-unlock-all` sandbox unlock switch, and `#btn-launch-stage` immediate mission deployment.
- **`src/style.css` (`1,562 lines`)**:
  - Added brushed-enamel Sector Hub, Star-Chart, High-Ground chip, `.dialog-btn-row`, `touch-action: pan-y; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;` on `.hub-body-scroll` and `.enamel-dialog` (`DEAD_ENDS.md` #6), and `@media (max-width: 720px)` + `@media (max-width: 440px)` `.hide-xs` rules.

### M2.4 Atomic Dual-Preview Bundler & Verification (`Steps 3 & 4`)
- **`src/main.ts` (`lines 12–25`)**: One-time `isTopWindow || isHttpOrigin || isHostSizedIframe` (`window.innerHeight >= 620`) promotion to `html.is-top-window`, keeping `#app` at explicit `580px` inside auto-sized sandboxed `srcdoc` artifact iframes (`DEAD_ENDS.md` #8).
- **`scripts/bundle_standalone.mjs` & `package.json`**: Built Vite IIFE into `/tmp/lunar_iife_dist`, asserted `580px` `#app` height rule & `0` external `http(s)://` asset tags, atomically synced identical `852.8 KB` standalone HTML (`SHA-256: 0b1ff64cdd95b100...`) to both `dist/starforge_ark_cradle.html` and `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html`, updated `scratch/bundle_standalone.mjs` to forward to `scripts/bundle_standalone.mjs`, and chained into `npm run build`.
- **Verification Results**:
  - `npm run build` exited `0` (`tsc && vite build && node scripts/bundle_standalone.mjs`).
  - `npx vite preview --host 0.0.0.0 --port 5173` running as background daemon (`HTTP/1.1 200 OK`).
  - Automated Playwright WebGL2 smoke verification passed with `0` console/page errors:
    - M1 Return Beacon `66` Layer-0 closed-manifold meshes & `0` `openEnded` Layer-0 meshes across all 4 stages, Endless, and all 7 new enemy/boss rigs.
    - High-Ground `pad_03` (`y = 0.68`) tap & build (`damage: 18` = `round(16 * 1.15)`, `range: 6.37` = `round(5.4 * 1.18, 2)`).
    - Interactive 3D mechanism taps verified on Stage 1 (`crystal_vein` -> `+45G`, `ready: false`), Stage 2 (`capacitor_pylon` -> `ready: false`), and Stage 3 (`laser_gate` -> `active: true`).
    - Sector Command Hub `#btn-open-hub` + `#btn-toggle-unlock-all` + `#btn-launch-stage` across `stage_02`, `stage_03`, `stage_04`, and `endless` (`#val-wave === 'W1 · ∞'`).
    - GPU memory plateau across 5 full `loadStage()` switches: `2 -> 2` geometries, `12 -> 12` textures (`0` leaks).
    - Mobile `390×844` portrait framing (`ent0.x` & `beacon.x` within `[2, 388]` across Stages 1–4, `fog.density < 0.005`) and `360×800` narrow top HUD (`#pill-kills` `display: none`, single-row height `<= 46px`).
    - Sandboxed `<iframe sandbox="allow-scripts" srcdoc="...">` loading `starforge_ark_cradle.html`: `stageId === 'stage_01'`, `#app` `offsetHeight === 580`, `is-top-window === false`, `0` `SecurityError` crashes.

## 2. Logic Chain

1. Because `ToonOutlineComposer` renders `solidScene` Layer 0 with `overrideMaterial = normalMaterial` (Pass 1) and Layer 1 un-outlined without normal-depth edge passes (Pass 4A), keeping all solid closed-manifold meshes (`openEnded === false`) on Layer 0 while placing translucent overlays (`shieldDome`, `repairAuraRing`, mechanism halos/laser bars, High-Ground boost ring) on Layer 1 via `setLayerRecursive(..., 1)` prevents false outline rings while preserving crisp `#1A1033` silhouettes (`Observation 1.2, 1.4`).
2. Because `disposeLunarStationEnvironment` and `clearDynamicEntities` traverse scenes through `disposeObject3DTree` (skipping `userData.shared === true` procedural gradient/glow textures), switching across all 5 stages repeatedly plateaus at `2` persistent geometries and `12` shared textures (`Observation 1, Verification`).
3. Because `handleCanvasTap` intersects exact horizontal planes at `y = (pad.y ?? 0) + 0.15` for build pads and `y = 0.45 / 0.65 / 0.85` for mechanisms — the exact world Y coordinates projected by `getPadScreenCoordinates` and `getMechanismScreenCoordinates` — oblique 3/4 camera taps on elevated `0.68m` High-Ground bastions and 3D map mechanisms have zero parallax drift (`Observation 1.3`).
4. Because `src/main.ts` promotes `html.is-top-window` once at bootstrap only when `isTopWindow || isHttpOrigin || isHostSizedIframe`, `:5173` fills `100%` viewport while auto-sized `srcdoc` artifact iframes retain `#app { height: 580px }` without collapse (`Observation, Step 3`).

## 3. Caveats

- Full 8-wave campaign E2E updates in `tests/e2e.mjs` remain untouched per M2 scope constraints (scheduled for M4). Note that Stage 1 backward compatibility (`pad_01..pad_07`, `#btn-claim-rewards`, `snap.crystals === preClaimSnap.crystals + 8`, `#btn-play-again`) is fully preserved.
- Active Tactical Commander Skills (`EMP`, `Overclock`, `Decoy`), tower synergy combo badges, and T4A/T4B dual-branch specialization UI remain stubbed cleanly in `UISnapshot` per Interface Contract `C2` for Milestone M3/M4.

## 4. Conclusion

Milestone M2 (`campaign-maps-mechanisms-and-preview-sync`) is complete, verified, and ready for review and Milestone M3 handoff:
- All 4 handcrafted campaign stages (`stage_01`..`stage_04`) + `endless` mode, 12 enemy/boss types (7 new), and 4 interactive 3D terrain mechanisms (`High-Ground Bastion`, `Crystal Vein`, `Capacitor Pylon`, `Laser Gate`) are live and playable.
- Sector Command Hub (`#btn-open-hub` -> `#sector-hub-modal`) with Sandbox Unlock-All (`#btn-toggle-unlock-all`) and post-victory Next Sector flow (`#btn-next-sector`) enables immediate testing of any stage.
- Both `:5173` (`HTTP 200 OK` daemon alive) and standalone single-file `starforge_ark_cradle.html` (`dist/` + brain artifact, `852.8 KB`, identical SHA-256) are built and verified in real headless Chrome WebGL2.

## 5. Verification Method

1. **Build & Dual Standalone Bundle**:
   ```bash
   npm run build
   sha256sum /home/antigravity/GOD-OF-PPT/tdk/dist/starforge_ark_cradle.html /home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html
   ```
2. **Live `:5173` Preview Server Check**:
   ```bash
   curl -sSfI http://127.0.0.1:5173
   ```
3. **Key Files to Inspect**:
   - `/home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts`
   - `/home/antigravity/GOD-OF-PPT/tdk/src/ui/UIManager.ts`
   - `/home/antigravity/GOD-OF-PPT/tdk/src/style.css`
   - `/home/antigravity/GOD-OF-PPT/tdk/src/main.ts`
   - `/home/antigravity/GOD-OF-PPT/tdk/scripts/bundle_standalone.mjs`
   - `/home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts` (`lines 204–576` M1 Return Beacon intact)
   - `/home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts`
