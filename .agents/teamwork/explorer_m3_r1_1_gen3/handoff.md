# Hard Handoff Report — Post-M2 Delta Explorer 1 (`explorer_m3_r1_1_gen3`)

**Core Summary**: Audited post-M2 `TowerFactory.ts` (`928L`), `VfxManager.ts` (`715L`), `CinematicDirector.ts` (`892L`), `BeaconAndPropsFactory.ts:615–950`, `AudioManager.ts` (`294L`), and `types.ts` (`566L`), producing an exact line-referenced M3 delta blueprint (`analysis.md`) for the **6 Legendary `T4-A`/`T4-B` 3D Rigs**, **Skill/Combo/T4 VFX & `.dispose()`**, **Stage 2B/2C/3/5B Cinematics + `fissureMat` Fog Fix**, and **Remaining M3 Procedural WebAudio SFX**.

---

## 1. Observation

1. **`src/render/TowerFactory.ts` (`928L`) & `src/types.ts` (`566L`)**:
   - `types.ts:13, 280-285, 303-312`: M2 already added `TowerBranch = 'A' | 'B'`, `rotaryBarrels?`, `branchBarrelOverlayA?`, `branchBarrelOverlayB?`, and `tierGroups.{t4A?, t4B?}`, while `HingedFlapUserData` (`lines 280-285`) has `{ hingeAxis, restAngle, openAngle, minTier }` without `branchTag`.
   - `TowerFactory.ts:169, 209-858`: Still builds a single `t4Turret` group per tower (`Autocannon` `lines 382-427`, `Mortar` `lines 614-644`, `Magnetic` `lines 798-826`). M1.2's `idleCore` (`lines 237, 471, 706`), T3 sub-parts (`lines 309-380, 515-612, 723-796`), `hingedFlaps` (`lines 376, 416, 635, 815`), and Magnetic `weaponPitch` (`lines 647-710` at `y = 1.15`) are intact with `0` `openEnded` meshes.
   - `TowerFactory.ts:860-903`: `setTowerTierVisibility(rig, tier)`, `applyTowerTierVisuals(rig, tier, options?: { visibilityOnly?: boolean })`, and `getTierPartObjects(rig, tier)` do not yet accept `branch?: TowerBranch`.

2. **`src/fx/VfxManager.ts` (`715L`) & Capacitor Pylon Hook (`GameEngine.ts:834-865`)**:
   - `VfxManager.ts:66-75, 436-459, 544-557`: Has `tracers`, `mortarShells`, `rings`, `sparks`, `pickups3D`, `debris3D`, and `bossWarningMesh` in `vfxScene` (default Layer `0`). `ExpandingRing` (`line 548`) already lerps `startScale -> endScale` cleanly in both directions (`expand` and `shrink`), while `disposeMortarShell` (`lines 638-641`) preserves `THREE.Sprite.geometry` and `getToonTextures()`.
   - None of the M3 tactical skill, combo lightning, `3s` plasma burn zone, singularity pull, or `7.0m` haste/arc matrix VFX methods exist yet; `GameEngine.ts:840-848` (`capacitor_pylon`) currently triggers only `spawnGroundRing` + `spawnMagneticFieldPulse` without 3D lightning arcs from the pylon's `arcCore` (`y = 1.88`, `BeaconAndPropsFactory.ts:931`).

3. **`src/game/CinematicDirector.ts` (`892L`), `src/render/BeaconAndPropsFactory.ts:645`, & `src/audio/AudioManager.ts` (`294L`)**:
   - `CinematicDirector.ts:48`: Still calls `gsap.ticker.lagSmoothing(0);`.
   - `CinematicDirector.ts:225, 290, 317, 320, 424, 429, 439-448`: Deferred tier ignition (`visibilityOnly: true` at `t=0`, full `applyTowerTierVisuals` at `lockEnd`/`climaxAt`) is already implemented for T2/T3/T4, and `flap.rotation[axis]` already uses `openAngle`/`restAngle` at `lines 440-446`, **but** `playLegendaryUpgradeReveal` (`lines 317, 320, 424, 429, 444`) hardcodes single-branch `4` / `` `传说·${bp.name}` `` without `branch: 'A' | 'B'` or `ud.branchTag` filtering.
   - `CinematicDirector.ts:824-836`: `playOpenRewardChest` assumes `supplyChest.group.visible` and `beacon.skyBeam.visible` were already enabled by `playBossDefeatAndBeaconVictory` (`lines 755, 779`).
   - `BeaconAndPropsFactory.ts:645-650`: `fissureMat` (`MeshBasicMaterial`) omits `fog: false`.
   - `AudioManager.ts:240-273`: M2 already added `playMechanismActivate`, `playTechUpgrade`, `playTechRespec`, and `playAchievementClaim`, whereas the 7 M3 combat/skill SFX (`orbital_strike`, `emp_overdrive`, `nano_repair`, `flux_combo`, `armor_shred`, `singularity_pull`, `cluster_salvo`) and `noiseBuffer` helper are not yet present.

---

## 2. Logic Chain

1. **Dual `T4-A`/`T4-B` Rigs Without Breaking M1.2 or Stage 2C (`Observation 1`)**:
   - Keeping current T4 modules inside `t4ATurret` (`t4 = t4ATurret` alias) + adding rotary Gatling clusters (`AC-04A`), fusion plasma coils (`PM-04A`), and gyroscopic gimbals (`MR-04A` inside `weaponPitch` via `branchBarrelOverlayA`), while building distinct `t4BTurret` + `branchBarrelOverlayB` assemblies (`AC-04B` Gauss rails + dorsal capacitor bank, `PM-04B` twin 6-cell MLRS pods with `mortarTube.visible = !showT4B`, `MR-04B` 3 Tesla spires + high-voltage crown) with closed-cap geometries (`openEnded = false`) and `branchTag` on T4 flaps preserves 100% of M1.2 structures and Layer-0 `#1A1033` outlines.
   - Returning `[...activeGroup.children, ...overlays]` from `getTierPartObjects(rig, 4, branch)` makes Stage 2C fly in both turret armor AND barrel/pitch attachments along parabolic arcs before igniting Gold at `climaxAt`.

2. **Crisp Non-Bleaching VFX & WebGL2 Lightning Visibility (`Observation 2`)**:
   - WebGL2 clamps `THREE.Line` width to `1px` on Linux/ANGLE; building `spawnChainLightningArc` from 3 thin oriented `CylinderGeometry(0.036, ...)` segments in `vfxScene` (default Layer `0`) pushed to `this.tracers` yields crisp visible arcs for Flux Resonance, Magnetic `T4-B`, and Capacitor Pylons with automatic disposal.
   - Ticking `burnZones` (`3.0s` Mortar `T4-A` plasma zones) with combat `dt` (`if (dt > 0)`) rather than `realDt` ensures deterministic freeze during Pause and `legendary_reveal`.

3. **Boss Fissure Visibility & Chest Safety (`Observation 3`)**:
   - Replacing `gsap.ticker.lagSmoothing(0)` (`CinematicDirector.ts:48`) with `gsap.ticker.lagSmoothing(500, 33)` + adding `fog: false` on `fissureMat` (`BeaconAndPropsFactory.ts:645`) prevents both frame-spike timeline skipping and `FogExp2` attenuation during Boss intros.
   - Guarding `beacon.skyBeam.visible` and `supplyChest.group.visible` (positioning at `stageConfig.supplyChestPos`) at the top of `playOpenRewardChest` (`CinematicDirector.ts:828`) guarantees visible 3D chest opening even if a stage clears via Final Boss breach survival (`beaconHp > 0`).

---

## 3. Caveats

- **`GameEngine.ts:1805-1815` Mortar Flap `setTimeout`**: While `CinematicDirector.ts:439-448` uses GSAP timelines, `GameEngine.fireMortar` (`lines 1812-1814`) still resets `flap.rotation[axis]` via `setTimeout(..., 240)` without checking `ud.branchTag`. The M3 `GameEngine` worker should replace that `setTimeout` with a `simDt` timer and filter `!ud.branchTag || ud.branchTag === tower.branch`.

---

## 4. Conclusion

Execute the exact line-referenced deltas in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m3_r1_1_gen3/analysis.md`:
1. **`TowerFactory.ts` (`lines 63-75, 169, 216, 289, 382-427, 436, 499, 614-644, 651, 707, 798-903`) + `types.ts:285, 310-311`**: Add `t4A`/`t4B` (`t4 = t4A` alias), `branchBarrelOverlayA/B`, `rotaryBarrels`, `branchTag` flaps, 6 closed-mesh T4 specialization rigs, and `branch`-aware `setTowerTierVisibility` / `applyTowerTierVisuals` / `getTierPartObjects`.
2. **`VfxManager.ts` (`lines 23-30, 62-98, 205, 436-459, 493-557, 670-714`)**: Add `setTacticalReticle`, `spawnOrbitalLockOn`, `spawnOrbitalIonBeam`, `spawnEmpOverdrivePulse`, `spawnBeaconNanoRepair`, `spawnChainLightningArc` + `spawnFluxResonanceDetonation`, `spawnPlasmaBurnZone` (`dt`-ticked), `spawnSingularityPullRing`, `spawnArcMatrixPulse` (`7.0m`), and T4 weapon helpers with leak-free `.dispose()`.
3. **`CinematicDirector.ts` (`lines 48, 288, 309-320, 424-448, 828-835`) + `BeaconAndPropsFactory.ts:645` + `AudioManager.ts:10, 61, 100, 274`**: Set `lagSmoothing(500, 33)` + `fissureMat` `fog: false`, wire `branch` into Stage 2C parts/ignition/title/flaps, guard `supplyChest` & `skyBeam` visibility in `playOpenRewardChest`, and add `noiseBuffer` + the 7 M3 procedural SFX (+ T4-B companions).

---

## 5. Verification Method

1. **Build & Bundle Check**: Run `npm run build` in `/home/antigravity/GOD-OF-PPT/tdk` (`tsc && vite build && node scripts/bundle_standalone.mjs` exits `0`).
2. **Geometry & Layer Audit**: Inspect all 6 `createTowerRig(type, 4)` + `applyTowerTierVisuals(rig, 4, { branch: 'A' | 'B' })` trees to verify `0` `openEnded === true` Layer-0 meshes, mutual exclusivity of `t4A`/`t4B` (`mortarTube.visible === false` on Mortar `B`), intact `idleCore` & `weaponPitch`, and `vfxScene` children strictly on Layer `0`.
3. **Runtime / Smoke Verification**: Trigger T2/T3 and all 6 `T4-A`/`T4-B` upgrades, all 3 Commander Skills, Flux Resonance & Capacitor Pylon arcs, Boss Entrance (`fissureMat` visible through fog), and `claimVictoryRewards()` (`supplyChest.group.visible === true`, `skyBeam.visible === true`), then verify `dispose()` leaves zero leaked geometries/materials while preserving `THREE.Sprite.geometry` and `getToonTextures()`.
