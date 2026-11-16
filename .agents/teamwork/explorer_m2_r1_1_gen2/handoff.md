# Hard Handoff Report — `explorer_m2_r1_1_gen2` (Post-M1 Delta Inspection for Milestone M2)

- **From**: `explorer_m2_r1_1_gen2`
- **To**: Sub-Orchestrator `sub_orch_m2_gen2` (`fc6059e272e6f3abacf9748117d59270`)
- **Full Line-by-Line Spec**: [`analysis.md`](file:///home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m2_r1_1_gen2/analysis.md)

---

## 1. Observation

1. **[`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L1-L277) (`277` lines post-M1)**:
   - `EnemyType` is at `line 13` (5 IDs); `BuildPadConfig` at `lines 44–49` (`{ id, label, x, z }`); `TowerBlueprint` at `lines 75–83`; `EnemyBlueprint` at `lines 85–99`; `WaveSpawnGroup` at `lines 101–106`.
   - M1.2 additions are at `line 119` (`FlapHingeAxis = 'x' | 'y' | 'z'`), `lines 121–126` (`HingedFlapUserData`), and `line 141` (`TowerRig.idleCore?: THREE.Object3D`), with `TowerRig.tierGroups` at `lines 144–148` (`{ t2, t3, t4 }`).
   - `TowerInstance` is at `lines 153–168`; `EnemyRig` at `lines 170–184`; `EnemyInstance` at `lines 186–215`; `UISnapshot` at `lines 222–276`.
   - `PadVisual` (`lines 7–12`), `ReturnBeaconRig` (`lines 14–21`), `MineEntranceRig` (`lines 23–29`), `SupplyChestRig` (`lines 31–36`), and `LunarStationEnvironment` (`lines 38–47`) currently live in [`src/render/BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L7-L47) and are imported from there by [`GameEngine.ts:17`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L17) and `CinematicDirector.ts`.

2. **[`src/config/gameConfig.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L1-L598) (`598` lines post-M1)**:
   - `GAME_CONSTANTS` (`lines 14–24`), `TIER_META` (`lines 26–63`), `RAW_ROAD_WAYPOINTS` (`lines 70–79`), private `function buildFilletedRoadSamples` (`lines 81–167`), `ROAD_SAMPLES` & `TOTAL_ROAD_LENGTH` (`lines 169–170`), `sampleRoadAtDistance` (`lines 172–199`), `BUILD_PADS` (`lines 205–216`, IDs `'pad_01'..'pad_10'`), `TOWER_ORDER` (`line 218`), `TOWER_BLUEPRINTS` (`lines 220–409`), `ENEMY_BLUEPRINTS` (`lines 411–487`), `WAVE_CONFIGS` (`lines 489–597`).
   - [`tests/e2e.mjs`](file:///home/antigravity/GOD-OF-PPT/tdk/tests/e2e.mjs#L79-L445) (`lines 79, 107, 117, 222–249, 379, 437`) hardcodes Stage 1 pad IDs `'pad_01'`, `'pad_03'`, `'pad_05'`, `'pad_06'`, `'pad_08'`, `'pad_09'`.

3. **[`src/render/BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L1-L948) (`948` lines post-M1), [`ToonMaterials.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonMaterials.ts#L236-L252), [`VfxManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L298-L714)**:
   - `buildRoadRibbonGeometry` (`lines 49–83`, called at `line 801`) reads global `ROAD_SAMPLES` and hardcodes `y = 0.032` at `line 65`.
   - `buildReturnBeacon` (`lines 139–508`): position is set ONLY at `lines 141–142`; M1.1's closed manifold beveled 3D dish & 3-strut gantry cage spans `lines 228–486` (+ Layer-1 `skyBeam` at `lines 489–505`).
   - `buildMineEntrance` (`lines 510–598`): position set at `lines 512–513`; all local geometry faces `+X` (`fissureGroup` at `(+1.15, 0.055, 0)`, `darkVoid` at `(-0.18, 1.1, 0)`).
   - `buildSupplyChestRig` (`lines 600–659`, placed at `lines 932–935` at `(9.4, 0, 2.4)`): `lidPivot` at `(0, 0.68, -0.46)`, `claspMesh` at `(0, 0.66, 0.51)`, `innerGlow` on Layer 1 at `y = 0.69`.
   - `BUILD_PADS.forEach` (`lines 810–848`) places `group` at `(cfg.x, 0, cfg.z)`, while [`GameEngine.ts:755–766`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L755-L766) overwrites `padVis.group.position.y = 0` or `Math.sin(...) * 0.14` every frame.
   - `stars` (`THREE.Points`, `line 884`), `rangeRing` (`line 899`), `selectRing` (`line 913`), and `legendaryBackdrop` (`line 929`) are added directly to `vfxScene`.
   - `ToonMaterials.ts:236–252` caches 8 singleton textures (`grad4Standard`, `grad4Metal`, `lunarDeck`, `haulRoad`, `softGlow`, `ringWave`, `hazardZone`, `shadowBlob`); `VfxManager.ts:635–668` (`disposeMortarShell`, `disposePickupGroup`) and `lines 298–324` (`spawnChestOpenCelebration`) are live post-M1.4.

---

## 2. Logic Chain

1. **Zero-Conflict M1/M2/M3/M4 `src/types.ts` Schema**:
   - Making `TowerBlueprint.branches`, `TowerRig.tierGroups.t4A / t4B`, and M3/M4 `TowerInstance` / `EnemyRig` / `UISnapshot` fields **optional** (`?`) lets M2 add all 12 `EnemyType` IDs, `StageId`, `StageConfig`, `CompiledLane`, `MapMechanismConfig`, `MapMechanismInstance`, `SpeedZoneConfig`, `TowerBranch`, `TacticalSkillId` (`= CommanderSkillId`), and `TechUpgradeId` right now while M1's untouched `TowerFactory.ts` and existing `UIManager.ts` compile with zero errors.
   - Because `ENEMY_BLUEPRINTS` in `gameConfig.ts:411` is typed `Record<EnemyType, EnemyBlueprint>`, expanding `EnemyType` to 12 units requires adding the 7 new `EnemyBlueprint` entries into `gameConfig.ts` in the same step.

2. **One-Way `gameConfig.ts` <- `campaignConfig.ts` Dependency**:
   - Exporting `buildFilletedRoadSamples`, `compileStageLanes`, and `sampleLaneAtDistance` from `gameConfig.ts` (while keeping `ROAD_SAMPLES`, `TOTAL_ROAD_LENGTH`, `sampleRoadAtDistance`, `BUILD_PADS`, and `WAVE_CONFIGS` exported as Stage 1 defaults) lets `campaignConfig.ts` import Stage 1 constants from `./gameConfig` without circular imports or breaking any existing caller.

3. **Preserving M1.1 Dish & Grounding High-Ground Bastions (`BeaconAndPropsFactory.ts`)**:
   - Parameterizing `buildReturnBeacon(beaconPos?: Vec3Like)` ONLY at `lines 139–143` leaves M1.1's `lines 144–508` 100% untouched.
   - Because `buildMineEntrance` faces `+X` in local space, setting `group.position.set(portal.x, 0, portal.z)` and `group.rotation.y = portal.yaw` orients both East-facing (`yaw = 0`) and South-facing (`yaw = -Math.PI / 2`) portals + `fissureGroup` cracks accurately, while `entrance: entrances[0]` preserves legacy access.
   - Because `GameEngine.ts:757, 763, 765` resets `padVis.group.position.y` during the 4.2s idle hop, High-Ground (`y = 0.68m`) bastion plinths MUST be added as stationary geometry on `root` at `(cfg.x, 0, cfg.z)`, while `PadVisual` stores `baseY = cfg.y ?? 0` (`padVis.group` at `y = baseY`, hopping `baseY + Math.sin(...) * 0.14`) so the top socket hops cleanly without lifting the cliff plinth off the lunar floor.

---

## 3. Caveats

1. **Preserve Stage 1 Pad IDs `'pad_01'..'pad_10'`**: `STAGE_CONFIGS.stage_01.buildPads` MUST keep IDs `'pad_01'..'pad_10'` (not `'s1_pad_01'`) so `window.__LUNAR_BEACON_GAME__.getPadScreenCoordinates('pad_03')` and `selectPadOrTower('pad_01' / 'pad_03' / 'pad_06')` in `tests/e2e.mjs` remain 100% functional; also ensure `getPadScreenCoordinates` and `handleCanvasTap` use `(pad.y ?? 0) + 0.15` for `pad_03` & `pad_06` (`y = 0.68`).
2. **`disposeObject3DTree()` Must Handle `THREE.Points` AND Skip `THREE.Sprite.geometry` & `getToonTextures()`**:
   - `stars` (`BeaconAndPropsFactory.ts:872`) is a `THREE.Points` instance (not `THREE.Mesh`), so `disposeObject3DTree` must check `obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line` while explicitly skipping `THREE.Sprite.geometry` (`obj instanceof THREE.Sprite` -> dispose material only) and NEVER calling `.dispose()` on `m.map` or `m.gradientMap` (`ToonMaterials.ts:236` singleton cache).
3. **Stage 2 Supply Chest Coordinates**: In `explorer_expansion_survey_1_gen2/analysis.md:193`, place Stage 2's `supplyChestPos` at `{ x: 10.8, y: 0, z: 2.8 }` (off the `z = 0` converged road and clear of `s2_pad_12` at `(8.8, 3.2)`), and make `CinematicDirector.playBossDefeatAndBeaconVictory` drop the chest onto `stage.supplyChestPos`.

---

## 4. Conclusion

M2 Workers have a 100% verified, zero-conflict delta path across `src/types.ts`, `src/config/gameConfig.ts`, `src/config/campaignConfig.ts`, and `src/render/BeaconAndPropsFactory.ts`:
1. Extend `src/types.ts` with 12-unit `EnemyType`, `StageId`, `StageConfig`, `CompiledLane`, `MapMechanismConfig`, `MapMechanismInstance`, `SpeedZoneConfig`, `TowerBranch`, `TacticalSkillId` (`CommanderSkillId`), `TechUpgradeId`, `AchievementId`, and optional `UISnapshot` / `TowerRig` / `TowerBlueprint` fields while keeping M1.2's `FlapHingeAxis` (`line 119`), `HingedFlapUserData` (`lines 121–126`), and `TowerRig.idleCore` (`line 141`) untouched.
2. Export `buildFilletedRoadSamples`, `compileStageLanes`, and `sampleLaneAtDistance` + add the 7 new `EnemyBlueprint` entries in `src/config/gameConfig.ts`, and author `STAGE_CONFIGS` + `generateEndlessWave` in `src/config/campaignConfig.ts` keeping Stage 1 pad IDs `'pad_01'..'pad_10'`.
3. Refactor `src/render/BeaconAndPropsFactory.ts` to accept `(solidScene, vfxScene, stage?, compiledLanes?)`, preserving `buildReturnBeacon` `lines 144–508` verbatim, adding `entrances[]` (`+ entrance: entrances[0]`), grounded `0.68m` High-Ground bastions + `PadVisual.baseY`, `0.032 + laneIdx * 0.002` multi-lane road ribbons, `vfxRoot` container in `vfxScene`, 3D interactive mechanisms, and `dispose()` via `disposeObject3DTree()`.

---

## 5. Verification Method

1. **Compile & Build Check**: Run `npm run build` (`tsc && vite build`) and confirm exit code `0` with zero TypeScript errors across untouched M1 files (`TowerFactory.ts`, `ToonOutlineComposer.ts`, `VfxManager.ts`).
2. **M1.1 Return Beacon Integrity Check**: Verify `BeaconAndPropsFactory.ts` preserves all `66` Layer-0 Beacon meshes (`0` `openEnded` meshes on Layer 0) across stage switches (`loadStage('stage_01')` -> `'stage_02'` -> `'stage_03'` -> `'stage_04'`).
3. **GPU Memory Leak & Pad Elevation Check**: Switch stages 5× in headless Chromium (`renderer.info.memory.geometries` / `textures` must plateau with `getToonTextures()` intact and `0` WebGL warnings) and verify `getPadScreenCoordinates('pad_03')` tap-selects High-Ground `pad_03` (`y = 0.68`) accurately on both `1440×900` and `390×844`.
