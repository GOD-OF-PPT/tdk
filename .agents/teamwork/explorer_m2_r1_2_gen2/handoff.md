# Explorer Handoff — `explorer_m2_r1_2_gen2`

- **From**: `explorer_m2_r1_2_gen2` (`544337a4193719ce8d3cb48de364421e`)
- **To**: Sub-Orchestrator `sub_orch_m2_gen2` (`fc6059e272e6f3abacf9748117d59270`)
- **Milestone**: M2 (`campaign-maps-mechanisms-and-preview-sync`)
- **Detailed Blueprint**: [`analysis.md`](file:///home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m2_r1_2_gen2/analysis.md)

---

## 1. Observation

1. **[`src/render/EnemyFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts) (`402` lines)**:
   - `setLayerRecursive(obj, layer)` (`lines 8–13`) separates Layer-0 `#1A1033`-outlined `bodyGroup` solids (`lines 20–323`) from Layer-1 `root` attachments (`shadowBlob` `lines 327–339`, `slowRing` `lines 341–356`, `hpBarGroup` `lines 359–384`).
   - Line `198` uses an unconditional `else {` for `boss_crawler` (`weakPointCore` at `(0, 1.48, -0.46)` `lines 247–250`; `armorPlates` `[plateL, plateR, dorsalShield]` `lines 258–273`), so converting `line 198` to `else if (type === 'boss_crawler')` opens `line 323` as the exact insertion site for the 7 new rigs (`shield_skimmer`, `splitter_rover`, `mini_scout`, `repair_drone`, `boss_siege_driller`, `boss_mag_dreadnought`, `boss_ark_overlord`).
2. **[`src/game/GameEngine.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts) (`1,651` lines)**:
   - `hemiLight` (`line 148`), `keyLight` (`line 151`), and `backRimLight` (`line 164`) are local constructor constants (unlike `this.heroLight` at `line 65`); `this.env` (`line 173`) is passed by value to `CinematicDirector` (`line 188`).
   - `computeBaseCameraPose()` (`lines 286–305`) uses `distScale = 1.0` on desktop (`1440×900`) and caps mobile portrait (`390×844`) at `2.65` (`line 292`), leaving only `14.43m` horizontal half-width at `z = 2.0`.
   - `previewOrBuildTower` (`lines 424–490`) lacks a `this.mode === 'playing'` guard at `line 425`, queries global `BUILD_PADS` (`line 452`), and hardcodes `y = 0.14` (`lines 460, 475`); `handleCanvasTap` (`lines 1468–1505`) intersects a single flat `groundPlane` (`y = 0.15`, `line 108`), causing `~0.62m` Z-parallax on `y = 0.68` High-Ground pads.
   - `updateWaveSpawner` (`line 785`) checks `enemyType === 'boss_crawler'`; `updateEnemies` (`lines 866–1033`), `fireMortar` (`lines 1165–1166`), and `acquireBestTarget` (`lines 1373–1388`) assume a single global `TOTAL_ROAD_LENGTH` / `sampleRoadAtDistance`.
   - `applyDamageToEnemy` (`lines 1272–1301`) unconditionally enters `victory_cinematic` on any `isBoss` death — which skips `WAVE_CONFIGS[last]`'s `+200G / +4💎` clear bonus, freezes straggler corpses (`updateEnemies` stops outside `mode === 'playing'` at `line 705`), and breaks Stage 4 Wave 8 Sub-Boss + Endless Mode Boss waves.
3. **[`src/game/CinematicDirector.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts) (`806` lines) & [`src/audio/AudioManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/audio/AudioManager.ts) (`219` lines)**:
   - `CinematicDirector` lacks `setEnvironment(env)` (`insert at line 45`); `playBossEntranceSequence` (`lines 470–586`) hardcodes `+X` offset `(1.2, 0, 0)` (`line 473`) and only leaves `30ms` between contraction end (`1.46s`) and Boss slam (`1.49s`); `playBossDefeatAndBeaconVictory` (`lines 601–756`) has only 2 explosion beats (`0.18s, 0.55s`), silent sky-beam ignition (`line 700`), hardcoded `chest.group.position` (`beaconPos.x - 3.2, 5.5, beaconPos.z + 0.3` at `line 728`), and tight widescreen-only camera framing (`lines 682–696`); `playOpenRewardChest` (`lines 778–781`) hides `claspMesh` instantaneously without pop-open animation and still calls `spawnClimaxBurst` instead of M1's `spawnChestOpenCelebration`.
   - `AudioManager` (`MUTE_STORAGE_KEY` at `line 3`, `toggleMute` at `lines 23–34`, 16 existing SFX methods `lines 90–217`) has zero audio hooks for Beacon breach damage, Defeat shutdown, Sky-beam ignition, Boss chain sub-explosions, or 3D Mechanism activation.

---

## 2. Logic Chain

1. **Multi-Stage & GPU Lifecycle**: Promoting `hemiLight`/`keyLight`/`backRimLight` to `GameEngine` fields + adding `CinematicDirector.setEnvironment(env)` (`line 45`) + calling `disposeObject3DTree` whenever clearing `towers`, `enemies`, `ghostGroup`, or `env` enables leak-free `loadStage(stageId, playIntro)` switching across all 4 campaign stages and Endless mode.
2. **Camera & Elevation Accuracy**: Setting `distScale = Math.min(3.25, stage.camera.distScale * aspectFactor)` (`~1.07–1.10` at `1440×900`; `3.25` cap at `390×844`) frames all 4 maps inside `|NDC.x| <= 0.84`, while per-elevation plane intersection (`y = (pad.y ?? 0) + 0.15` for pads, `y = 0.45/0.65/0.85` for mechanisms) eliminates 3/4 view parallax.
3. **Multi-Lane & Boss Settlement Integrity**: Ranking targets in `acquireBestTarget` by lowest `lane.totalLength - e.distanceTraveled` fixes unequal-lane priority (Stage 4 `19.76m` vs `32.06m`), and gating `victory_cinematic` on `!this.isEndless && isFinalWave && !otherBossRemaining` (while granting final-wave clear bonuses and immediately disposing stragglers) fixes both Endless/Sub-Boss progression and final-wave economy/visual cleanup.

---

## 3. Caveats

1. **`ToonOutlineComposer` Layer Contract (`src/render/ToonOutlineComposer.ts:540–548`)**:
   - Pass 4A renders `solidScene` with `camera.layers.set(1)` — so non-outlined meshes inside `EnemyFactory` (`shadowBlob`, `slowRing`, `hpBarGroup`, and new `shieldDome`) **must** call `setLayerRecursive(obj, 1)`.
   - Pass 4B renders `vfxScene` with `camera.layers.set(0)` — so meshes inside `vfxScene` / `env.vfxRoot` **must remain on default Layer 0** (setting Layer 1 inside `vfxScene` makes them invisible!).
2. **Mobile `FogExp2` Washout at `distScale = 3.25`**:
   - At `390×844` (`camera distance ≈ 86m`), fixed `FogExp2` `density = 0.0085` attenuates scene contrast by `41.4%` (vs `5.7%` on desktop). Scale `fog.density = stage.palette.fogDensity / Math.max(1, distScale * 0.78)` on resize/stage load.
3. **Victory Reset Completeness**:
   - `CinematicDirector.ts:716–718` rotates `beacon.signalFins` to `z = -0.35`, and `playOpenRewardChest` animates `supplyChest.claspMesh` & `lidPivot`. `startNewMission()` (`lines 349–353`) must reset `fin.rotation.z = 0`, `lidPivot.rotation.set(0, 0, 0)`, and `claspMesh` position `(0, 0.66, 0.51)` / rotation / visibility.
4. **Boss Armor Plate Count**:
   - `GameEngine.ts:1245` hardcodes `3 - enemy.armorLayersRemaining`. Generalize to `enemy.rig.armorPlates.length - enemy.armorLayersRemaining` so `boss_ark_overlord` (`4` plates) breaks plates in order `0 -> 1 -> 2 -> 3`.

---

## 4. Conclusion

All post-M1 line numbers, method signatures, M1 integration hooks (`idleCore`, `weaponPitch`, `HingedFlapUserData`, `visibilityOnly`, `spawnChestOpenCelebration`), and hidden edge cases across `EnemyFactory.ts`, `GameEngine.ts`, `CinematicDirector.ts`, and `AudioManager.ts` are verified and ready for M2 worker execution. Full line-by-line specifications are documented in [`analysis.md`](file:///home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m2_r1_2_gen2/analysis.md).

---

## 5. Verification Method

- Read-only static and mathematical inspection of post-M1 source files via `view_file` (`EnemyFactory.ts:1–402`, `GameEngine.ts:1–1651`, `CinematicDirector.ts:1–806`, `AudioManager.ts:1–219`, `types.ts:1–277`, `ToonOutlineComposer.ts:440–569`, `BeaconAndPropsFactory.ts:1–140, 510–665`, `VfxManager.ts:75–170`), plus perspective frustum and `FogExp2` attenuation verification for `1440×900` (`fov = 38°`) and `390×844` (`fov = 48°`). Zero repository source files were modified.
