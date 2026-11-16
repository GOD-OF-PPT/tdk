# Milestone M1 (`render-3d-outline`) Empirical QA & WebGL2 Stress Handoff — `teamwork_preview_challenger_m1_r1_2_gen2`

- **From**: `teamwork_preview_challenger_m1_r1_2_gen2` (Challenger 2 — Fast Tower 3D Rigs, Chest VFX & GPU Disposal Smoke Check)
- **To**: `sub_orch_m1_gen2` (`6a446ddc2e8a75c90d7e95268c9f41be`)
- **Runtime**: `13927 ms` (`13.93s < 30s`) on ephemeral Vite server (`127.0.0.1:0`) in real headless Chromium WebGL2 (`SwiftShader ANGLE`)
- **Cleanup & Isolation**: `/tmp/chal2_smoke.mjs` deleted (`CLEANUP_VERIFIED`); zero modifications to repository source/config/tests/`./dist/`; port `:5173` untouched.

Verdict: **APPROVE**

---

## 1. Raw Empirical Measurements

### A. Live `GameEngine` & `ToonOutlineComposer` WebGL2 Health
- `isWebGL2`: `true`
- `liveSnapMode`: `"playing"`
- Rapid viewport resize (`1440x900 -> 390x844 -> 1440x900`) `appCanvasMetrics`: `clientW = 1440, clientH = 900, bufferW = 2160, bufferH = 1350` (`1.5x` supersampling preserved)
- `glErrAfterTowerComposer` (rendering all 3 T4 rigs through 5-pass `ToonOutlineComposer`): `0`
- `consoleErrors`: `[]` (`0`)
- `pageErrors`: `[]` (`0`)

### B. `TowerFactory` 3D Rigs (`autocannon`, `mortar`, `magnetic`)
1. **`idleCore` Contract**:
   - `autocannon`, `mortar`, `magnetic`: `idleCoreValid = true` (`OctahedronGeometry` attached under `rig.root`, `userData.restPos` & `userData.restScale` populated and matching initial transform within `< 1e-6`).
2. **T3 Secondary 3D Sub-Parts & `arcFlyOffset` (`userData.flyOffset`)**:
   - `autocannon`: `t3PartCount = 3`, `allT3Tagged = true`; `topRadiatorGrp` verified at `(0, 0.325, -0.42)` with `meshCount = 8`, `louverCount = 2` (`minTier = 3`), `flyOffset = [0, 1.75, -0.55]`.
   - `mortar`: `t3PartCount = 3`, `allT3Tagged = true`; `rangefinderArm` verified at `(-0.8, 0.8, -0.06)` with `meshCount = 9`, `flyOffset = [-1.65, 1.95, 0.45]`.
   - `magnetic`: `t3PartCount = 4`, `allT3Tagged = true`; `3x fluxPylon` verified at `r = 0.85m` (`60°/180°/300°`) with `pylonMeshCounts = [7, 7, 7]` and radial `flyOffsets` (`r = 1.65, y = 1.75`).
3. **`hingedFlaps` Metadata & Outward/Upward World-Space Swing**:
   - **`autocannon` (`4` flaps)**:
     - `idx 0, 1`: `axis = 'x'`, `minTier = 3`, `restAngle = -0.08`, `openAngle = -0.58` -> world bbox center delta `dy = +0.0227m`, `dr = +0.0156m` (upward/outward).
     - `idx 2, 3`: `axis = 'x'`, `minTier = 4`, `restAngle = 0`, `openAngle = -0.55` -> world bbox center delta `dy = +0.0807m`, `dr = +0.0030m` (upward).
   - **`mortar` (`2` flaps)**:
     - `idx 0`: `axis = 'y'`, `minTier = 4`, `restAngle = 0`, `openAngle = +0.58` -> world radial delta `dr = +0.0858m` (outward).
     - `idx 1`: `axis = 'y'`, `minTier = 4`, `restAngle = 0`, `openAngle = -0.58` -> world radial delta `dr = +0.0858m` (outward).
   - **`magnetic` (`4` flaps)**:
     - `idx 0..3`: `axis = 'z'`, `minTier = 4`, `restAngle = 0`, `openAngle = -0.48` -> world radial delta `dr = +0.0533m` across all 4 radial crown petals (outward).
4. **Magnetic `weaponPitch` & World Rest Position**:
   - `weaponPitch.children.length = 3` (`outerRingGrp`, `coreMesh`, `muzzle`)
   - `weaponPitch.position.y = 1.15`, `turretYaw.position.y = 0.34`, `magRingOuter` world rest `y = 1.49` (`±0`), `rig.idleCore === rig.magInnerCore` (`true`).
5. **Tier Visibility vs. Tier Color Decoupling**:
   - Across all 3 towers starting at T1 (`coreHex = 0x2ecc71`, `trimHex = 0x2ecc71`, `creamHex = 0xf3ece6`):
     - `setTowerTierVisibility(rig, 3)` -> `t2 = true` (including both `subGroups`), `t3 = true`, `t4 = false`, `coreHexUnchanged = true`, `trimHexUnchanged = true`.
     - `applyTowerTierVisuals(rig, 3, { visibilityOnly: true })` -> `t2 = true`, `t3 = true`, `t4 = false`, `coreHexUnchanged = true`, `trimHexUnchanged = true`.
     - `applyTowerTierVisuals(rig, 4)` -> `t4Visible = true`, `coreHexIsGold = true` (`0xf59e0b`), `trimHexIsGold = true` (`0xf59e0b`), `creamNotDyed = true` (`0xf3ece6`).

### C. `BeaconAndPropsFactory` Sanity Check
- `beaconLayer0Meshes = 66`, `beaconOpenEndedLayer0 = 0`, `dishChildrenCount = 16`, `skyBeamLayerMask = 2` (Layer 1 only), `coinChildMeshes = 3`, `crystalChildMeshes = 3`.

### D. `VfxManager` Non-Bleaching Chest Celebration & GPU Resource Disposal Stress
1. **`spawnChestOpenCelebration(worldPos)`**:
   - `groundRingMeshes = 3` (horizontal `PlaneGeometry` shockwaves)
   - `sparkMeshes = 23` (`18` radial rim sparkles + `5` front lock clasp sparks)
   - `cylinderOrTallMeshes = 0` (**ZERO** tall vertical `AdditiveBlending` cylinder/pillar!)
   - Pixel readback (`400x300`): `fullWhitePixels = 0`, `litCelebrationPixels = 1095`
2. **GPU Memory Conservation (`renderer.info.memory`) & Post-Clear `THREE.Sprite` Integrity**:
   - Warmed persistent baseline: `geoBaseline = 192`, `texBaseline = 6`
   - After `spawnChestOpenCelebration` natural expiry: `geometries = 192` (`0` delta)
   - **Stress Cycle 1 (Natural `update()` Expiry)**: `10x launchMortarShell` + `10x spawnAutocannonShot` + `36` armor debris + `48` 3D coins/crystals -> `geoPeakNatural = 376` (`+184` transient GPU geometries); after 45 steps (`impactsTriggered = 10`, `lootArrived = 48`): `geoAfterNaturalExpiry = 192`, `texAfterNaturalExpiry = 6` (`0` leak).
   - **Stress Cycle 2 (Abrupt Mid-Flight `clearAll()`)**: `12x launchMortarShell` + `40` armor debris + `80` 3D coins/crystals + `spawnChestOpenCelebration` + `spawnClimaxBurst` -> `geoPeakBeforeClear = 462` (`+270` transient GPU geometries); immediately after `clearAll()`: `geoAfterClearAll = 192`, `texAfterClearAll = 6` (`0` leak).
   - **Stress Cycle 3 (Post-`clearAll()` `launchMortarShell` Render)**:
     - `postClearSpriteValid = true` (`Sprite.geometry.attributes.position.count === 4` singleton intact & shared `softGlow` texture intact)
     - `glErrPostClearSprite = 0`, `cyanShellPixels = 1626` rendered cleanly on canvas
     - Post-clear cleanup: `geoAfterPostClearCleanup = 192`
     - `vfx.dispose()`: `geoAfterFullDispose = 188` (`192 - 4` persistent geometries disposed cleanly), `glErrFinal = 0`.
