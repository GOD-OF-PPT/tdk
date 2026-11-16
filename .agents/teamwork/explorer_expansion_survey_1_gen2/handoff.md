# Hard Handoff Report — `explorer_expansion_survey_1_gen2` (Track 1: Multi-Stage 3D Maps, Pathing, Mechanisms & Enemy/Boss Variants)

Full architectural blueprint and exact coordinate tables: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_1_gen2/analysis.md`

---

## 1. Observation

1. **User Playtest Priority Shift (`.agents/teamwork/ORIGINAL_REQUEST.md:113–129`)**:
   - Playtest feedback identifies two P0 pain points: `(1) 游戏不够完整只有1场战役8个波次` and `(2) 游戏的可玩/趣味性不够，导致更像一个demo`. Automated test infrastructure is explicitly deprioritized in favor of delivering a multi-chapter campaign (3–4+ distinct maps + Endless mode) and deep interactive TD gameplay while maintaining `#1A1033` chunky-toon aesthetics, 5-stage climax cinematics, and desktop/mobile framing.
2. **Single-Map Hardcoded Couplings Confirmed Across Source Files**:
   - `src/config/gameConfig.ts:19, 70–79, 169–199, 205–216, 489–597`: `GAME_CONSTANTS.TOTAL_WAVES = 8`, single polyline `RAW_ROAD_WAYPOINTS` (`(-13.0, 0, -3.2)` to `(11.8, 0, 2.4)`), module-global `ROAD_SAMPLES`, `TOTAL_ROAD_LENGTH`, `sampleRoadAtDistance(dist)`, `BUILD_PADS` (10 flat pads), and `WAVE_CONFIGS` (8 waves). Notably, `buildFilletedRoadSamples(waypoints, cornerRadius)` (`lines 81–167`) is already a pure function.
   - `src/render/BeaconAndPropsFactory.ts:3, 38–83, 139–143, 510–514, 757–947`: Imports `BUILD_PADS` and `ROAD_SAMPLES` statically; assumes a single `+X`-facing `entrance: MineEntranceRig` (`start.x - 0.65, 0, start.z`); derives `beacon` position from `ROAD_SAMPLES[last]`; adds `stars`, `rangeRing`, `selectRing`, and `legendaryBackdrop` directly to `vfxScene` (`lines 884, 899, 913, 929`) without a parent `THREE.Group` or `.dispose()` method; hardcodes `supplyChest` at `(9.4, 0, 2.4)`.
   - `src/game/GameEngine.ts:133–211, 286–305, 321–329, 452–479, 785–864, 974–1008, 1272–1301, 1373–1388, 1468–1505`:
     - `this.env` is passed by value into `new CinematicDirector({ env: this.env, ... })` (`line 188`), and `CinematicDirector` caches `this.deps.env` (`src/game/CinematicDirector.ts:36, 70–71, 90, 312, 472, 608–609, 766`).
     - Removing towers (`lines 322, 574`), enemies (`lines 327, 890, 989, 1291`), and ghost previews (`line 1413`) calls `.remove(...)` without `.dispose()`ing per-instance `BufferGeometry` or cloned `Material` instances.
     - `handleCanvasTap` (`line 1479`) intersects a single flat `groundPlane` (`y = 0.15`, `line 108`).
     - `updateWaveSpawner` (`line 785`) checks `item.enemyType === 'boss_crawler'`; `applyDamageToEnemy` (`line 1272`) immediately triggers `victory_cinematic` whenever any `enemy.isBoss` dies.
   - `src/game/CinematicDirector.ts:473, 497–501, 728`: `playBossEntranceSequence` hardcodes `+X` world offset `ent.group.position.clone().add(new THREE.Vector3(1.2, 0, 0))` and Stage 1 banner copy; `playBossDefeatAndBeaconVictory` hardcodes supply chest drop at `(beaconPos.x - 3.2, 5.5, beaconPos.z + 0.3)`.
   - `src/ui/UIManager.ts:1, 464`: Directly imports `BUILD_PADS` to look up the selected pad's label.
   - `src/render/ToonOutlineComposer.ts:512–556`: Renders Layer 0 in `solidScene` through normal+depth `#1A1033` outline detection, then renders Layer 1 in `solidScene` and Layer 0 in `vfxScene` *after* the outline pass so translucent domes, rings, and beams never receive dark edge outlines.
3. **Mathematical Frustum & Clearance Verification**:
   - Executed read-only Three.js `PerspectiveCamera` projection & `buildFilletedRoadSamples(..., 1.42)` clearance checks via `node -e` at `1440×900` (`fov=38°`) and `390×844` (`fov=48°, zLookShift=2.0`) across all 4 proposed stages (`45` total Build Pads):
     - `stage_01`: Lane 0 = `41.58m`, 10 pads road clearance `2.90m–4.32m`, `max|ndc.x| = 0.917` (`1440×900`) / `0.871` (`390×844`).
     - `stage_02`: Lanes 0 & 1 = `31.66m` each, 12 pads road clearance `2.90m–3.20m`, `max|ndc.x| = 0.883` / `0.872`.
     - `stage_03`: Lane 0 = `35.43m`, 11 pads road clearance `3.00m–4.08m`, `max|ndc.x| = 0.876` / `0.809`.
     - `stage_04`: Lane 0 = `32.06m`, Lane 1 = `19.76m`, 12 pads road clearance `3.00m–3.39m`, `max|ndc.x| = 0.820` / `0.821`.

---

## 2. Logic Chain

1. **Why `CinematicDirector.setEnvironment(env)` and `env.vfxRoot` are mandatory (`Observation 2`)**:
   - Because `CinematicDirector` caches `this.deps.env` and `buildLunarStationEnvironment` currently appends 4 meshes directly onto `vfxScene`, rebuilding the map without a `vfxRoot` container and `setEnvironment(env)` hook would both leak orphaned rings/starfields in `vfxScene` and cause Boss/Victory cinematics to animate detached meshes from Stage 1.
2. **Why `disposeObject3DTree` must preserve `getToonTextures()` (`Observation 2` + `ToonMaterials.ts:236`)**:
   - Every tower, enemy, and prop creates fresh `BufferGeometry` instances and per-entity `MeshToonMaterial` / `MeshStandardMaterial` instances (needed for per-unit hit-flash and tier rim uniforms), while sharing singleton textures (`grad4Standard`, `grad4Metal`, `lunarDeck`, `haulRoad`, `softGlow`, etc.). Disposing non-shared geometries and materials (excluding `THREE.Sprite.geometry` singleton and shared texture maps) prevents GPU buffer/program leaks across stage switches and long Endless runs.
3. **Why perspective trapezoid & elevation-plane raycasting matter (`Observation 2 & 3`)**:
   - Under the 3/4 overhead camera (`pos.z ≈ lookAt.z + 17.8`), foreground coordinates (`z > +4`) subtend a wider horizontal angle than background coordinates (`z < -4`), and an elevated High-Ground Pad (`y = 0.68m`) shifts by `~0.64m` in Z when projected onto `y = 0.15m`. Keeping foreground X inside `[-11.8, +11.8]`, applying `stage.camera.distScale` (`1.05–1.07`), and intersecting rays against each pad/mechanism's true elevation plane `y = (pad.y ?? 0) + 0.15` guarantees accurate touch/click targeting and zero off-screen clipping on both `1440×900` and `390×844`.
4. **Why Multi-Lane & Boss Victory conditions need decoupling (`Observation 2`)**:
   - On dual-lane maps with unequal path lengths (`Stage 4`: `32.06m` vs `19.76m`), tower targeting must rank enemies by lowest remaining distance to the Beacon (`lane.totalLength - e.distanceTraveled`) rather than raw `distanceTraveled`. Furthermore, `victory_cinematic` must fire only when `!isEndless` and the final wave's last Boss dies, allowing Stage 4 Wave 8 Sub-Bosses and Endless 5-wave Boss rotations to play out without prematurely ending the run.
5. **Why Layer-1 isolation is essential for new Shields & Mechanisms (`Observation 2`)**:
   - Placing solid mechanical housings (`High-Ground` bastions, `Capacitor Pylon` coils, `Laser Gate` emitter towers, `shield_skimmer` catamaran hulls) on Layer 0 gives them crisp `#1A1033` outlines, while placing `shieldDome`, plasma laser beams, repair rings, and speed-rail chevrons on Layer 1 / `vfxScene` prevents dark post-processing outline artifacts from obscuring roads or units.

---

## 3. Caveats

1. **Cross-Track Integration Boundary**: This Track 1 blueprint covers Multi-Stage 3D Maps, Multi-Lane Pathing, Interactive 3D Map Mechanisms, Endless Wave Generation, and New Enemy/Boss Variants. Out-of-battle Campaign Stage Selector UI, Star-Rating persistence, Tech Tree / Blueprint meta-progression, Active Crystal Tactical Skills, and T3→T4 Tower Branching (surveyed in Track 2) should connect cleanly via `GameEngine.loadStage(stageId)` and `UISnapshot`.
2. **Concurrent Worker Awareness**: Read `src/render/BeaconAndPropsFactory.ts` (948 lines) and `src/types.ts` (277 lines) cleanly with zero edits; implementers should `view_file` the latest head before applying Track 1 + Track 2 merges.

---

## 4. Conclusion

Implement the Track 1 expansion according to the exact specifications in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_1_gen2/analysis.md`:
1. **`src/types.ts` & `src/config/gameConfig.ts`**: Add `StageId`, `StageConfig`, `CompiledLane`, `MapMechanismConfig`, `SpeedZoneConfig`, expanded `EnemyType` (12 total types), `STAGE_CONFIGS` (`stage_01` Outpost Relay 8w, `stage_02` Twin-Rift Crater Shaft 10w, `stage_03` Mag-Rail Launch Corridor 10w, `stage_04` Ark Core Citadel 12w), `compileStageLanes`, `sampleLaneAtDistance`, and `generateEndlessWave`.
2. **`src/render/BeaconAndPropsFactory.ts`**: Refactor `buildLunarStationEnvironment` to accept `(solidScene, vfxScene, stageConfig, compiledLanes)`, build rotated multi-portal `entrances[]`, `y = 0.68` High-Ground bastions, `crystal_vein` / `capacitor_pylon` / `laser_gate` 3D rigs, Stage 2 central crater shaft & Stage 3 speed-rail chevrons, parent all `vfxScene` elements under `vfxRoot`, and expose leak-free `dispose()` + `disposeObject3DTree()`.
3. **`src/render/EnemyFactory.ts`**: Add chunky-toon Layer-0 + Layer-1 rigs for `shield_skimmer` (geodesic shield dome), `splitter_rover` + `mini_scout` (dorsal twin scout pods), `repair_drone` (emerald-amber 3D cross-halo), and stage Bosses `boss_siege_driller`, `boss_mag_dreadnought`, and `boss_ark_overlord`.
4. **`src/game/GameEngine.ts`, `src/game/CinematicDirector.ts`, & `src/ui/UIManager.ts`**: Implement `loadStage(stageId, playIntro)`, `cinematics.setEnvironment(env)`, `localToWorld` portal Boss intros, multi-lane spawning/pathing/remaining-distance targeting, elevation-aware raycasting + mechanism activation/cooldown ticks, shield/splitter/repair/boss-skill combat hooks, and `BUILD_PADS`-free `UISnapshot` labels.

---

## 5. Verification Method

1. **TypeScript & Production Bundle Check**:
   - Run `npm run build` (`tsc && vite build`) in `/home/antigravity/GOD-OF-PPT/tdk` and rebuild standalone preview via `node scratch/bundle_standalone.mjs` — must exit `0` with zero TS errors.
2. **Coordinate Clearance & Frustum Invariant Check**:
   - Verify all 4 `STAGE_CONFIGS` entries maintain `minRoadDist >= 2.80m` across all `buildPads` and `|NDC.x| <= 0.93`, `NDC.y ∈ [-0.66, +0.78]` at both `1440×900` and `390×844` (exact Three.js verification script logic documented in validation pass).
3. **Zero-Leak `loadStage` Smoke Check**:
   - In browser console via `window.__LUNAR_BEACON_GAME__`, cycle `loadStage('stage_01') -> loadStage('stage_02') -> loadStage('stage_03') -> loadStage('stage_04') -> loadStage('endless') -> loadStage('stage_01')` and verify `renderer.info.memory.geometries` returns to baseline without monotonic growth, Boss intro camera frames each stage's portal cleanly, and tapping High-Ground Pads, Crystal Veins, Capacitor Pylons, and Laser Gates triggers accurate 3D feedback and stat/combat effects.
