# Hard Handoff Report — Consolidated Milestone M3 Part A (`worker_m3a_r1_1_gen5`)

## 1. Observation

Audited and completed all 9 exclusively owned M3 Part A source files without touching any unowned files (`src/game/GameEngine.ts`, `src/config/campaignConfig.ts`, `src/ui/UIManager.ts`, `src/style.css`, `src/main.ts`, `README.md`, `scripts/bundle_standalone.mjs`, `src/render/ToonOutlineComposer.ts`, `tests/e2e.mjs`):

1. **`src/types.ts` (`lines 200–616`)**:
   - Verified complete M3 type definitions: `TowerBranch = 'A' | 'B'`, `TowerBranchStats`, `TowerBlueprint.branches: { A: TowerBranchStats; B: TowerBranchStats }` (`lines 237–240`), `HingedFlapUserData.branchTag?: TowerBranch` (`line 286`), `TowerRig` (`rotaryBarrels`, `branchBarrelOverlayA`, `branchBarrelOverlayB`, `tierGroups: { t2, t3, t4, t4A, t4B }`, `lines 305–314`), `TowerInstance` (`branch?`, `overdriveTimer?`, `auraHasteBonus?`, `spinUpStacks?`, `spinUpDecayTimer?`, `pullPulseCounter?`, `flapCloseTimer?`, `lines 325–331`), `EnemyRig` (`shieldFillMesh`, `fluxRingGroup?`, `shredBadgeGroup?`, `lines 355–358`), `CommanderSkillId`, `CommanderSkillConfig`, `CommanderSkillSnapshot`, `T4BranchOptionSnapshot`, `TowerSynergyCodexEntry`, `EnemyCodexMetaEntry`, `MechanismCodexEntry` (`lines 416–476`), `CampaignSaveDataV2.muted` (`line 490`), and `UISnapshot` M3 fields (`lines 553–615`).

2. **`src/config/gameConfig.ts` (`lines 305–1064`)**:
   - Verified `TOWER_BLUEPRINTS` `branches: { A, B }` for all 3 towers:
     - `autocannon`: `A` = `暴风火神机甲` (`AC-04A`, `260G`, `dmg: 38`, `fireInterval: 0.16`, `range: 6.4`, `armorPierce: 0.42`, `旋管叠速 · 破甲狂潮`) vs `B` = `双联电磁轨炮` (`AC-04B`, `280G`, `dmg: 148`, `fireInterval: 0.62`, `range: 8.6`, `armorPierce: 0.85`, `电磁穿甲 · 直线贯通`).
     - `mortar`: `A` = `天穹聚变巨炮` (`PM-04A`, `310G`, `dmg: 225`, `fireInterval: 1.95`, `range: 9.2`, `splashRadius: 3.0`, `armorPierce: 1.0`, `聚变灼烧 · 持续熔区`) vs `B` = `集束火箭弹巢` (`PM-04B`, `295G`, `dmg: 96`, `fireInterval: 1.65`, `range: 8.4`, `splashRadius: 2.2`, `armorPierce: 0.9`, `三联齐射 · 地毯轰炸`).
     - `magnetic`: `A` = `奇点引力中枢` (`MR-04A`, `270G`, `dmg: 54`, `fireInterval: 0.92`, `range: 6.0`, `slowRatio: 0.62`, `slowDuration: 2.5`, `armorPierce: 1.0`, `奇点牵引 · 强效聚怪`) vs `B` = `高压电弧矩阵` (`MR-04B`, `285G`, `dmg: 68`, `fireInterval: 0.85`, `range: 6.2`, `slowRatio: 0.45`, `slowDuration: 2.1`, `armorPierce: 1.0`, `五重链电 · 邻塔加速`).
   - Verified `COMMANDER_SKILL_ORDER`, `COMMANDER_SKILLS` (`orbital_strike`: `45⚡ / 16s / radius 3.2 / dmg 380 / stun 1.4s / requiresTarget: true`; `emp_overdrive`: `55⚡ / 22s / shieldBreak 180 / towerHaste +35% for 6.0s`; `nano_repair`: `40⚡ / 28s / +4 HP / +80G`), and `TACTICAL_ENERGY_CONFIG` (`INITIAL: 45, MAX: 100, PASSIVE_PER_SEC: 2.2`).
   - Verified `ENEMY_BLUEPRINTS.elite_drill.maxHp = 1350` (`line 665`), `ENEMY_BLUEPRINTS.boss_crawler.maxHp = 6400` (`line 680`), `WAVE_CONFIGS[7]` (`rover × 6`, `boss_crawler × 1`, `drill × 5`, `swarm × 14`, `lines 1056–1061`), `ENEMY_CODEX_ORDER`, `TOWER_SYNERGY_CODEX`, `ENEMY_CODEX_META` (all 12 enemies), and `MECHANISM_CODEX_LIST` (all 4 mechanisms).

3. **`src/game/ProgressionManager.ts` (`lines 43–315`)**:
   - Verified all 6 `TECH_MODULES`, `getComputedTechModifiers()`, all 9 `ACHIEVEMENT_CONFIGS`, `isMuted()` / `setMuted(muted)` (`lines 306–314`), and `createSandboxSafeStore()` (`lines 133–167`) wrapping `localStorage` in `try/catch` with an in-memory `Map` fallback.
   - Added migration polish (`lines 235–240`) so `'high_ground'` is guaranteed present in `seenCodexIds` even when loading pre-M3 `lunar_beacon_save_v2` payloads from `localStorage`.

4. **`src/render/BeaconAndPropsFactory.ts` (`lines 645–651`)**:
   - Verified `fissureMat` has `fog: false` so dark Stage 3/4 fog never washes out Stage 3 Boss entrance magma fissures.

5. **`src/render/TowerFactory.ts` (`lines 64–1420`)**:
   - Extended `registerHingedFlap` (`lines 64–79`) with optional `branchTag?: TowerBranch` (`flap.userData.branchTag = branchTag`).
   - Built all **6 distinct closed-manifold (`openEnded = false`) `T4-A` / `T4-B` 3D specialization rigs** on Layer `0` using opaque `ToonMaterial`s:
     - `AC-04A` (`暴风火神机甲`): 3-barrel spinning Gatling clusters (`rotaryBarrels`, `branchBarrelOverlayA`) on `barrelL`/`barrelR`, heavy pauldrons + `branchTag: 'A'` hinged vents, dual upper auxiliary ammo drum pods, brow crest, and rear feed spur gear (`t4ATurret`).
     - `AC-04B` (`双联电磁轨炮`): split parallel upper/lower Gauss rail blades with physical air-gap + 3 induction coil clamps (`branchBarrelOverlayB`) on `barrelL`/`barrelR`, twin-lens sniper visor hood, angular rail-shield cowls, and dorsal 3-cell capacitor bank with `branchTag: 'B'` hinged discharge fins (`t4BTurret`).
     - `PM-04A` (`天穹聚变巨炮`): heavy fusion siege barrel collar + 3 glowing plasma containment toroids + 2 lateral hydro-buffer pods + crowned muzzle ring (`branchBarrelOverlayA` on `mortarTube`, keeping `boreDark` unobstructed), siege carapace crown, `branchTag: 'A'` rear capacitor bay doors, and elevation calibration gear (`t4ATurret`).
     - `PM-04B` (`集束火箭弹巢`): twin 6-cell (`2×3`) beveled MLRS missile pods with closed launch tubes, warhead nose cones, `branchTag: 'B'` top hinged reload hatches, pod muzzles pushed to `muzzlePoints` (`indices 1 & 2`, while `index 0` remains single `mortarTube`), and central targeter dome (`t4BTurret`). `setTowerTierVisibility` hides single `mortarTube` when `T4-B` is active (`rig.mortarTube.visible = !showT4B`).
     - `MR-04A` (`奇点引力中枢`): dual counter-tilted gyroscopic singularity gimbals (`rotaryBarrels`) + 4 octahedral gravity-well emitters (`branchBarrelOverlayA` inside `weaponPitch` at `y = 1.15`), crown halo with 4 `branchTag: 'A'` golden petals, 3 gravity anchor buttresses, and lower drive gear (`t4ATurret`).
     - `MR-04B` (`高压电弧矩阵`): 3 tall Tesla transformer spires with 3 stacked ceramic insulator discs + spherical `coreMaterial` arc orbs (`y = 1.68`), and a high-voltage `TorusGeometry` crown with 3 inward emitter prongs + 3 `branchTag: 'B'` hinged capacitor vent flaps (`t4BTurret`).
   - Updated `setTowerTierVisibility(rig, tier, branch = 'A')`, `applyTowerTierVisuals(rig, tier, options?: { visibilityOnly?: boolean; branch?: TowerBranch })`, and `getTierPartObjects(rig, tier, branch = 'A')`, keeping `rig.tierGroups.t4 = t4ATurret` alias for 100% backward compatibility.

6. **`src/render/EnemyFactory.ts` (`lines 900–998`)**:
   - Created `shieldFillMesh` unconditionally on **all 12 enemy rigs** (`visible = (bp.maxShield ?? 0) > 0` initially, on Layer `1`) so shields projected onto non-shield escorts (`rover`, `drill`, `splitter_rover`, `swarm`) by `boss_siege_driller` render dynamically.
   - Added Layer-1 `fluxRingGroup` (`4` cyan/violet segmented targeting brackets at `y = 0.08`, `visible = false`, `setLayerRecursive(fluxRingGroup, 1)`) and Layer-1 `shredBadgeGroup` (`#1A1033` diamond + twin `#F59E0B` cracked-armor chevrons inside `hpBarGroup`, `visible = false`) on all 12 enemy rigs.

7. **`src/fx/VfxManager.ts` (`lines 5–1385`)**:
   - Implemented `tacticalReticleGroup` + `setTacticalReticle(visible, x, z, radius)`, `spawnOrbitalLockOn`, `spawnOrbitalIonBeam` (non-bleaching peak opacity `<= 0.82`), `spawnEmpOverdrivePulse` (+ alias `spawnStationEmpWave`, `maxOpacity: 0.54` / `0.46`), `spawnBeaconNanoRepair` (rising `TorusGeometry` rings + emerald sparks), 3-segment oriented-cylinder `spawnChainLightningArc`, `spawnFluxResonanceDetonation` (+ alias `spawnFluxDetonation`), combat-`dt`-ticked `3.0s` `spawnPlasmaBurnZone` (peak opacity `<= 0.36`, paused when `dt === 0`), `launchClusterRocket` (orienting warhead along flight velocity), `spawnRailgunSlug`, `spawnWeakPointCrit`, `spawnShieldBreak`, `spawnSingularityPullRing` (+ alias `spawnSingularityPull`), and `spawnArcMatrixPulse` (`7.0m` aura + up to 5-target chain lightning).
   - Preserved `maxOpacity` per `TracerBeam` and `ExpandingRing`, kept 100% of `vfxScene` children on Layer `0`, and disposed `burnZones` and `tacticalReticleGroup` cleanly in `clearCombatTransients` / `clearAll` / `dispose` without touching `THREE.Sprite.geometry` or `getToonTextures()`.

8. **`src/game/CinematicDirector.ts` (`lines 9–50, 289–455, 841–872`)**:
   - Updated `playLegendaryUpgradeReveal(tower, statDeltas, onComplete, branchOverride?: TowerBranch)` to resolve `const branch = branchOverride ?? tower.branch ?? 'A'`, fly in `getTierPartObjects(rig, 4, branch)`, defer gold trim/core ignition until `climaxAt` (`applyTowerTierVisuals(rig, 4, { branch })`), stamp `传说·${branchStats.name}`, and filter hinged flaps by `!ud.branchTag || ud.branchTag === branch`.
   - Added defensive `beacon.skyBeam.visible` + `supplyChest.group.visible` at `stageConfig.supplyChestPos` inside `playOpenRewardChest`.
   - Kept `gsap.ticker.lagSmoothing(0)` (`line 49`) after observing that `lagSmoothing(500, 33)` clamps ~550ms headless SwiftShader frames down to `33ms` (causing a 16x slowdown and `15000ms` E2E timeout).

9. **`src/audio/AudioManager.ts` (`lines 1–130, 355–476`)**:
   - Added sandbox-safe mute sync with `lunar_beacon_save_v2` + in-memory fallback, `setMuted(muted)`, reusable `0.5s` `noiseBuffer` + filtered `noiseBurst()`, and all M3 procedural WebAudio SFX & aliases (`playTacticalArm`, `playOrbitalLockOn`, `playOrbitalStrike` / `playOrbitalStrikeImpact`, `playEmpOverdrive`, `playNanoRepair` / `playNanoBeaconRepair`, `playFluxCombo` / `playFluxDetonation`, `playArmorShred` / `playWeakPointCrit`, `playSingularityPull`, `playClusterSalvo` / `playClusterRocketLaunch`, `playRailgunShot`, `playArcMatrix` / `playTeslaArc`, `playShieldBreak`).

---

## 2. Logic Chain

1. **Dual `T4-A` / `T4-B` 3D Specialization Rigs (`TowerFactory.ts` + `CinematicDirector.ts`)**:
   - Separating `t4ATurret` + `branchBarrelOverlayA` from `t4BTurret` + `branchBarrelOverlayB` inside `setTowerTierVisibility(rig, tier, branch)` guarantees strict mutual exclusivity between Branch A and Branch B while preserving `rig.tierGroups.t4 = t4ATurret` for legacy callers.
   - Hiding `rig.mortarTube` when `tier >= 4 && branch === 'B'` lets `PM-04B` (`集束火箭弹巢`) cleanly replace the single siege barrel with its twin 6-cell MLRS pods (`muzzlePoints[1]` & `muzzlePoints[2]`).
   - Tagging T4 hinged flaps with `branchTag: 'A' | 'B'` ensures Stage 2C (`playLegendaryUpgradeReveal`) and combat firing only flex vents/hatches belonging to the active T4 branch.
2. **Layer & Post-Processing Invariants (`TowerFactory.ts`, `EnemyFactory.ts`, `VfxManager.ts`)**:
   - `ToonOutlineComposer` renders `solidScene` on Layer `0` with `#1A1033` edge outlines, then composites `vfxScene` (camera Layer `0` enabled) and HUD overlays (`solidScene` Layer `1`, no outlines).
   - Keeping all tower meshes opaque & closed-manifold on Layer `0`, all enemy HUD/synergy indicators (`shieldFillMesh`, `fluxRingGroup`, `shredBadgeGroup`) on Layer `1`, and all `VfxManager` meshes in `vfxScene` on Layer `0` with capped `AdditiveBlending` peak opacities (`<= 0.85` beams, `<= 0.54` full-map waves, `<= 0.36` burn zones) prevents black outline artifacts, invisible VFX, and white-out bleaching.
3. **Combat-`dt` vs `realDt` & SwiftShader Timing (`VfxManager.ts`, `CinematicDirector.ts`)**:
   - Advancing `burnZones` and `mortarShells` inside `if (dt > 0)` freezes active 3.0s plasma burn zones and cluster rockets cleanly during Pause and Stage 2C Legendary Reveals (`dt === 0`), while `tracers` and `rings` continue advancing on `realDt` so hero reveal bursts never freeze mid-frame.
   - Retaining `gsap.ticker.lagSmoothing(0)` ensures GSAP timelines advance by wall-clock elapsed time even when SwiftShader software rasterization takes `>500ms` per frame.

---

## 3. Caveats

- Per strict file-boundary rules, `src/game/GameEngine.ts`, `src/config/campaignConfig.ts`, `src/ui/UIManager.ts`, `src/style.css`, `src/main.ts`, and `tests/e2e.mjs` were NOT modified by Part A.
- Note for Part B (`GameEngine.ts`):
  - `GameEngine.ts` already calls `this.cinematics.playLegendaryUpgradeReveal(tower, deltas, onComplete)` after setting `tower.branch`; `playLegendaryUpgradeReveal` reads `branchOverride ?? tower.branch ?? 'A'`, so both 3-arg and 4-arg calls work seamlessly.
  - For `PM-04B` (`mortar` Branch `B`), `tower.rig.muzzlePoints[1]` and `tower.rig.muzzlePoints[2]` are the left and right 6-cell MLRS pod muzzles (`muzzlePoints[0]` is the single `mortarTube` muzzle).
  - Both primary method names and explorer aliases are exported on `VfxManager` and `AudioManager` (listed below).

---

## 4. Conclusion

Consolidated Milestone M3 Part A is **100% complete** across all 9 owned files, verified with `npx tsc --noEmit` (`exit code 0`) and headless Chromium WebGL2 + `<iframe sandbox="allow-scripts">` verification (`exit code 0`, 0 console/page errors, 0 geometry/material leaks). Ready for M3 Part B / Part C integration and E2E verification.

### Exact Exported Contracts for Downstream Workers
- **`TowerFactory.ts`**:
  - `setTowerTierVisibility(rig: TowerRig, tier: TowerTier, branch: TowerBranch = 'A'): void`
  - `applyTowerTierVisuals(rig: TowerRig, tier: TowerTier, options?: { visibilityOnly?: boolean; branch?: TowerBranch }): void`
  - `getTierPartObjects(rig: TowerRig, tier: TowerTier, branch: TowerBranch = 'A'): THREE.Object3D[]`
- **`CinematicDirector.ts`**:
  - `playLegendaryUpgradeReveal(tower: TowerInstance, statDeltas: StatDeltaPopup[], onComplete: () => void, branchOverride?: TowerBranch): void`
- **`VfxManager.ts`**:
  - `setTacticalReticle(visible: boolean, x?: number, z?: number, radius?: number): void`
  - `spawnOrbitalLockOn(x: number, z: number, radius?: number, duration?: number): void`
  - `spawnOrbitalIonBeam(x: number, z: number, radius?: number): void`
  - `spawnEmpOverdrivePulse(origin: THREE.Vector3): void` / `spawnStationEmpWave(origin: THREE.Vector3): void`
  - `spawnBeaconNanoRepair(beaconPos: THREE.Vector3): void`
  - `spawnChainLightningArc(from: THREE.Vector3, to: THREE.Vector3, colorHex?: number, maxLife?: number): void`
  - `spawnFluxResonanceDetonation(center: THREE.Vector3, chainTargets: THREE.Vector3[]): void` / `spawnFluxDetonation(...)`
  - `spawnPlasmaBurnZone(x: number, z: number, radius?: number, duration?: number): void`
  - `launchClusterRocket(from: THREE.Vector3, targetX: number, targetZ: number, splashRadius: number, onImpact: (x: number, z: number) => void): void`
  - `spawnRailgunSlug(from: THREE.Vector3, to: THREE.Vector3): void`
  - `spawnWeakPointCrit(pos: THREE.Vector3): void`
  - `spawnShieldBreak(pos: THREE.Vector3): void`
  - `spawnSingularityPullRing(center: THREE.Vector3, range: number): void` / `spawnSingularityPull(...)`
  - `spawnArcMatrixPulse(center: THREE.Vector3, chainTargets: THREE.Vector3[], auraRadius?: number): void`
- **`AudioManager.ts`**:
  - `setMuted(muted: boolean): void`, `isMuted(): boolean`, `toggleMute(): boolean`
  - `playTacticalArm()`, `playOrbitalLockOn()`, `playOrbitalStrike()` / `playOrbitalStrikeImpact()`, `playEmpOverdrive()`, `playNanoRepair()` / `playNanoBeaconRepair()`, `playFluxCombo()` / `playFluxDetonation()`, `playArmorShred(isCrit?: boolean)` / `playWeakPointCrit()`, `playSingularityPull()`, `playClusterSalvo()` / `playClusterRocketLaunch()`, `playRailgunShot()`, `playArcMatrix()` / `playTeslaArc()`, `playShieldBreak()`

---

## 5. Verification Method

1. **TypeScript Strict Check**:
   ```bash
   npx tsc --noEmit
   ```
   Confirm exit code `0` with zero diagnostics.
2. **Module, 3D Manifold, Layer-0/1, Combat-`dt` Pause & Sandboxed-Iframe Verification**:
   Inspect:
   - `src/render/TowerFactory.ts` (`t4ATurret`, `t4BTurret`, `branchBarrelOverlayA`, `branchBarrelOverlayB`, `setTowerTierVisibility`, `applyTowerTierVisuals`, `getTierPartObjects`)
   - `src/render/EnemyFactory.ts` (`lines 900–998`: unconditional `shieldFillMesh`, `fluxRingGroup`, `shredBadgeGroup` on Layer `1`)
   - `src/fx/VfxManager.ts` (`lines 266–828` & `1120–1370`)
   - `src/game/CinematicDirector.ts` (`lines 46–50`, `289–455`, `841–872`)
   - `src/audio/AudioManager.ts` (`lines 1–130`, `355–476`)
   - `src/game/ProgressionManager.ts` (`lines 133–167`, `235–254`, `306–314`)
