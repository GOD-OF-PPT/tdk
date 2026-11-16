# M1 Deliverable 2 Technical Analysis — Tower 3D Geometry, Mechanical Sub-Parts & Rig Contracts

- **Agent**: `teamwork_preview_explorer_m1_r1_2` (Tower 3D Geometry & Rig Contracts Architect)
- **Milestone**: M1 (`render-3d-outline`)
- **Files Inspected (Read-Only)**:
  - [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L1-L267)
  - [`src/render/TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L1-L689)
  - [`src/render/EnemyFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L1-L402)
  - [`src/render/ToonMaterials.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonMaterials.ts#L1-L346)
  - [`src/config/gameConfig.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L220-L488)
  - [`src/game/GameEngine.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L420-L1451)
  - [`src/game/CinematicDirector.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L150-L464)
  - [`tsconfig.json`](file:///home/antigravity/GOD-OF-PPT/tdk/tsconfig.json#L1-L25)

---

## 0. Verification of `src/render/EnemyFactory.ts` (M1 Defect Check)

### Observation
- [`createEnemyRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L15-L401) builds all 5 enemy archetypes (`rover`, `swarm`, `drill`, `elite_drill`, `boss_crawler`) exclusively from closed 3D geometries (`RoundedBoxGeometry`, `CylinderGeometry`, `TorusGeometry`, closed-base `ConeGeometry`, `OctahedronGeometry`, and [`createGearMesh`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L10-L41)).
- Non-outlined ground/HUD attachments (`shadowBlob` at [`L327-L339`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L327-L339), `slowRing` at [`L342-L356`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L342-L356), and `hpBarGroup` at [`L359-L384`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L359-L384)) recursively set Layer `1` via [`setLayerRecursive`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L8-L13), preventing `#1A1033` outline contamination.
- For `boss_crawler`, [`reactorCore`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L241-L250) (`OctahedronGeometry(0.42, 1)` at `(0, 1.48, -0.46)` beneath `dorsalShield` at `(0, 1.88, -0.46)`) is already assigned its own per-instance `MeshStandardMaterial` (`weakCoreMat`) and exposed as [`EnemyRig.weakPointCore`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L167), excluded from `hitFlashMaterials` (`[darkGreyMat, rustMat]`, [`L37`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L37)).

### Logic Chain
1. Unlike Return Beacon's `dish` (`ConeGeometry(..., openEnded=true)` in `BeaconAndPropsFactory.ts:231`), both drill cones in `EnemyFactory.ts` ([`L170`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L170) and [`L282`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts#L282)) omit `openEnded` (default `false`), so they have solid base caps and zero backface-culling holes.
2. `weakPointCore` already has an isolated per-enemy `MeshStandardMaterial` (`emissive: 0xff2a1a, emissiveIntensity: 2.1`) that is never overwritten during 85ms hit flashes (`GameEngine.ts:897-905`), meaning M2 can directly modulate `(e.rig.weakPointCore.material as THREE.MeshStandardMaterial).emissiveIntensity` and `weakPointCore.scale` during exposed-core vulnerability windows.

### Caveats
- None. `EnemyFactory.ts` compiles cleanly under strict `noUnusedLocals` / `verbatimModuleSyntax`.

### Conclusion
- **Zero M1 issues exist in [`src/render/EnemyFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts). Do NOT modify `src/render/EnemyFactory.ts` in M1.**

### Verification Method
- Static inspection + `npx tsc --noEmit` + existing Playwright E2E enemy spawn/hit/death rendering checks.

---

## 1. `TowerRig.idleCore` Contract & Local-Origin Spin/Pulse Safety

### Observation
- In [`TowerRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L119-L141), only Magnetic Tower currently exposes its energy core (`magInnerCore: THREE.Object3D | null` at [`L127`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L127)).
- In [`createTowerRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L63-L634):
  1. **Autocannon**: `coreGem` ([`L213-L215`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L213-L215)) is a local `THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMaterial)` at `(0, 0.45, -0.5)` inside `turretYaw`, with `0` children, never stored on `TowerRig`.
  2. **Mortar**: `tierCore` ([`L393-L395`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L393-L395)) is a local `THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMaterial)` at `(0, 0.58, -0.48)` inside `turretYaw`, with `0` children, never stored on `TowerRig`.
  3. **Magnetic**: `coreMesh` ([`L543-L547`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L543-L547)) is a `THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), coreMaterial)` at `(0, 1.15, 0)` (moving to `(0, 0, 0)` inside `weaponPitch` at `(0, 1.15, 0)` per Section 4), with `0` children, stored as `magInnerCore`.

### Logic Chain
1. **Local-Origin Symmetry**: `THREE.OctahedronGeometry(r, 0)` places its 6 vertices symmetrically at $(\pm r, 0, 0), (0, \pm r, 0), (0, 0, \pm r)$ around local `(0, 0, 0)`. None of the 3 core meshes have child objects (`children.length === 0`; `outerRingGrp` and `innerRingGrp` on Magnetic are sibling groups, not children of `coreMesh`).
2. **Clearance Under Spin & Scale Breathing (`scale = 1.0 ± 0.08`)**:
   - **Autocannon `coreGem`** at `turretYaw` `(0, 0.45, -0.50)`, max radius $0.16 \times 1.08 = 0.173\text{m}$: protrudes cleanly from rear window (`mainHull` back face at `z = -0.48`); T4 `gear` at `(0, 0.58, -0.54)` is a flat spur ring sitting parallel behind/above it (`gear` hub radius `0.094m`). Rotating `coreGem.rotation.y` and pulsing `coreGem.scale` keeps its center fixed at `(0, 0.45, -0.50)`.
   - **Mortar `tierCore`** at `turretYaw` `(0, 0.58, -0.48)`, max radius $0.173\text{m}$: `z ∈ [-0.653, -0.307]` clears T4 rear `door` inner face (`z = -0.70`) by `0.047m`; `y ∈ [0.407, 0.753]` clears T4 `siegeCrown` bottom (`y = 0.84`) by `0.087m`.
   - **Magnetic `coreMesh`** at `weaponPitch` `(0, 0, 0)` (`turretYaw` `(0, 1.15, 0)`), max radius $0.24 \times 1.08 = 0.259\text{m}$: sits inside `magRingOuter` (`TorusGeometry(0.46, 0.065)` inner hole `0.395m`, trim nodes inner face `0.390m`) with `0.131m` all-around radial clearance.
3. **Interaction With Magnetic's Existing Core Spin (`GameEngine.ts:1073-1076`)**:
   - In [`updateTowers`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1073-L1076), Magnetic already runs:
     ```ts
     if (rig.magInnerCore) {
       rig.magInnerCore.rotation.y -= dt * (isCharging ? 14 : 2.5);
       rig.magInnerCore.rotation.x += dt * (isCharging ? 8 : 1.2);
     }
     ```
   - Since `rig.idleCore === rig.magInnerCore` on Magnetic, `TowerFactory.ts` will populate `idleCore` for all 3 towers and tag `idleCore.userData.restPos = idleCore.position.clone()` and `idleCore.userData.restScale = idleCore.scale.clone()`. In M2 (`GameEngine.ts`), scale breathing (`1 + 0.07 * sin(...)`) can apply uniformly to `rig.idleCore` on all 3 towers, while generic idle Y/X rotation applies when `tower.type !== 'magnetic'` so Magnetic's `-2.5` / `-14 rad/s` counter-spin is not partially canceled.

### Caveats
- Because `idleCore.position.y` differs across towers (`0.45` on Autocannon, `0.58` on Mortar, `0.0` inside `weaponPitch` on Magnetic), M2 MUST NOT overwrite `rig.idleCore.position.y` with a hardcoded constant; if vertical bobbing is desired alongside scale/rotation, offset relative to `(rig.idleCore.userData.restPos as THREE.Vector3).y`.

### Conclusion
- Add `idleCore?: THREE.Object3D;` to [`TowerRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L131) (preserving `magInnerCore: THREE.Object3D | null` and all existing fields).
- Populate `idleCore` in [`createTowerRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts) with `coreGem` (`autocannon`), `tierCore` (`mortar`), and `coreMesh` (`magnetic`), recording `userData.restPos` and `userData.restScale`.

### Verification Method
- Unit/runtime check that `createTowerRig(type, 1).idleCore` is a non-null `THREE.Mesh` for all 3 `TowerType`s with `geometry.type === 'OctahedronGeometry'` and `children.length === 0`.

---

## 2. Tier-3 Secondary 3D Mechanical Sub-Parts Matching `gameConfig.ts` `partHeadline`

### Observation
- [`gameConfig.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts) Tier-3 `partHeadline` strings promise two distinct structural additions per tower:
  1. **Autocannon T3** ([`L265`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L265)): `'双侧大容量弹鼓 + 顶部开合散热鳍片'` — [`TowerFactory.ts:286-305`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L286-L305) builds `drumGrp` (`±0.82`), omitting `'顶部开合散热鳍片'`.
  2. **Mortar T3** ([`L328`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L328)): `'双联侧翼脉冲电容仓 + 光学测距摇臂'` — [`TowerFactory.ts:438-453`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L438-L453) builds lateral `pod`s (`±0.78`), omitting `'光学测距摇臂'`.
  3. **Magnetic T3** ([`L391`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L391)): `'双层反向旋转磁环 + 三向磁通增幅柱'` — [`TowerFactory.ts:565-573`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L565-L573) builds `innerRingGrp`, omitting `'三向磁通增幅柱'`.
- In [`CinematicDirector.playNormalUpgrade`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L206-L259), `parts = getTierPartObjects(rig, newTier)` returns `[...rig.tierGroups.t3.children]` ([`TowerFactory.ts:661`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L661)) and animates **only direct children of `t3Turret`** along parabolic arcs from `restPos + flyOffset` to `restPos`, scaling `0.25 -> 1.0`.

### Logic Chain & Bounding-Box Clearance Proofs

#### 2A. Autocannon T3 — Hinged Top Radiator Louver Bank (`topRadiatorGrp`, `'顶部开合散热鳍片'`)
1. **Critical Parent-Space Offset**:
   - On Autocannon, `t3Turret` is parented to **`weaponPitch`** (`weaponPitch.add(t3Turret)` at [`L194`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L194)), where `weaponPitch.position = (0, 0.36, 0.05)` inside `turretYaw` (`t2Turret` and `t4Turret` are direct children of `turretYaw`!).
   - Thus any point $(x_w, y_w, z_w)$ in `t3Turret` maps to `turretYaw` coordinates:
     $$(x_t, y_t, z_t) = (x_w,\; y_w + 0.36,\; z_w + 0.05)$$
2. **Neighbor Bounding Boxes in `turretYaw` Space**:
   - `topTrim` ([`L209-L211`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L209-L211)): `x ∈ [-0.38, 0.38]`, `y ∈ [0.615, 0.685]`, `z ∈ [-0.38, 0.26]`.
   - `mainHull` ([`L203-L206`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L203-L206)): `x ∈ [-0.52, 0.52]`, `y ∈ [0.21, 0.63]`, `z ∈ [-0.48, 0.44]`.
   - T2 `opticPod` ([`L277-L284`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L277-L284)): `x ∈ [-0.17, 0.17]`, `y ∈ [0.65, 0.83]`, `z ∈ [-0.11, 0.25]`.
   - T4 `browCrest` ([`L308-L322`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L308-L322)): `x ∈ [-0.34, 0.34]`, `y ∈ [0.76, 1.00]`, **`z ∈ [-0.19, 0.35]`**.
   - T4 `gear` ([`L348-L352`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L348-L352)): `x ∈ [-0.27, 0.27]`, `y ∈ [0.31, 0.85]`, **`z ∈ [-0.605, -0.475]`**.
3. **Exact Placement & Dimensions**:
   - Place `topRadiatorGrp` inside `t3Turret` at `weaponPitch` local `(0, 0.325, -0.42)` $\implies$ `turretYaw` `(0, 0.685, -0.37)`, resting flush atop `topTrim` (`y = 0.685`):
     - `manifold` (`deepBlueMat`, `RoundedBoxGeometry(0.68, 0.07, 0.17, 2, 0.02)` at `(0, 0.025, 0)`): `turretYaw z ∈ [-0.455, -0.285]`, clearing T4 `gear` (`z <= -0.475`) by **`0.020m`**, T4 `browCrest` (`z >= -0.19`) by **`0.095m`**, and T2 `opticPod` (`z >= -0.11`) by **`0.175m`**.
     - Even during Wave 8 Boss EMP stun (`weaponPitch.rotation.x = +0.22` rad at [`GameEngine.ts:1057`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1057)), the front-top edge `(0, 0.39, -0.335)` in `weaponPitch` rotates to $z_t = 0.05 + 0.39\sin(0.22) - 0.335\cos(0.22) = -0.192 < -0.190$, maintaining zero intersection with `browCrest`!
     - `thermalCore` (`weaponAccentMat` `#FF9F1C`, `RoundedBoxGeometry(0.54, 0.035, 0.11, 2, 0.012)` at `(0, 0.052, 0)`): glowing orange heat-exchanger core revealed beneath opening louvers.
     - `trimCollar` L/R (`tierTrimMat`, `RoundedBoxGeometry(0.055, 0.09, 0.19, 2, 0.018)` at `(±0.35, 0.035, 0)`).
     - Twin `louverPivot` groups (`sx ∈ [-1, 1]` at `(sx * 0.16, 0.062, -0.065)`, initial `rotation.x = -0.08`), each holding beveled `creamMat` `primarySlat` (`0.27 × 0.036 × 0.13` at `(0, 0.014, 0.065)`) + stepped `hazardMat` `accentSlat` (`0.23 × 0.026 × 0.07` at `(0, 0.034, 0.045)`), pushed to `rig.hingedFlaps`.
4. **Arc Fly-In Integrity Proof for Nested `hingedFlaps`**:
   - `topRadiatorGrp` is a direct child of `t3Turret` (`tagArcFlyPart(topRadiatorGrp, 0, 1.75, -0.55)`).
   - `playNormalUpgrade` (`CinematicDirector.ts:224-259`) mutates ONLY `topRadiatorGrp.position` and `topRadiatorGrp.scale`, restoring both to `restPos` and `restScale` on completion.
   - Nested `louverPivot` children inside `topRadiatorGrp` are **never** touched by `playNormalUpgrade`, so their local hinge origins `(±0.16, 0.062, -0.065)` and `restAngle = -0.08` remain **100% intact** throughout and after the curved arc fly-in!

#### 2B. Mortar T3 — Articulated Side Optical Rangefinder Arm (`rangefinderArm`, `'光学测距摇臂'`)
1. **Neighbor Bounding Boxes in `turretYaw` Space (`t3Turret` is a direct child of `turretYaw`)**:
   - T3 lateral accumulator `pod`s ([`L439-L453`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L439-L453)): `(±0.78, 0.48, -0.14)`, `|x| ∈ [0.63, 0.97]`, `y ∈ [0.22, 0.79]`, `z ∈ [-0.41, 0.13]`.
   - T4 `siegeCrown` ([`L456-L465`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L456-L465)): `x ∈ [-0.58, +0.58]`, `y ∈ [0.84, 1.15]`, `z ∈ [-0.55, 0.03]`.
   - T4 `elevGear` ([`L479-L484`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L479-L484)): mounted exclusively on the **Right (`+X = +0.68`)** side!
2. **Exact Placement & Dimensions**:
   - Anchor `rangefinderArm` on the **Left (`-X`)** shoulder atop the left T3 accumulator pod at `(-0.80, 0.80, -0.06)` in `t3Turret`:
     - `mountJoint` (`deepBlueMat`, `CylinderGeometry(0.095, 0.115, 0.09, 10)` at `(0, 0.035, 0)`) + `pivotPin` (`rivetMat`, `CylinderGeometry(0.045, 0.045, 0.15, 10)` at `(0, 0.075, 0.01)`): bolts directly onto left `pod` cap (`y = 0.79`), keeping `x <= -0.685` (**`0.105m` clear** of `siegeCrown` at `x = -0.58`!).
     - `boomArm` (`darkJointMat`, `RoundedBoxGeometry(0.085, 0.28, 0.10, 2, 0.024)` at `(-0.04, 0.19, 0.08)`, `rotation.x = 0.40, rotation.z = 0.14`) + `elbowCap` (`tierTrimMat` cylinder at `(-0.06, 0.31, 0.16)`).
     - `sensorHead` (`THREE.Group` at `(-0.06, 0.34, 0.19)`, `rotation.x = -0.18` sighting upward along mortar elevation): beveled `creamMat` pod (`0.21 × 0.17 × 0.27`), `tierTrimMat` visor brow (`0.23 × 0.048 × 0.21`), `deepBlueMat` bezel, glowing cyan `#22D3EE` `weaponAccentMat` primary rangefinder lens, and `coreMaterial` laser designator micro-lens (`x ∈ [-0.97, -0.75], y ∈ [1.05, 1.25], z ∈ [0.00, 0.32]`).
     - `tagArcFlyPart(rangefinderArm, -1.65, 1.95, 0.45)`. Balances T4's right-side `elevGear` with an unmistakable industrial silhouette!

#### 2C. Magnetic T3 — 3-Way Radial Flux Amplifier Pylons (`fluxPylon` × 3, `'三向磁通增幅柱'`)
1. **Azimuthal & Spherical Clearance Analysis (`t3Turret` in `turretYaw` Space)**:
   - T1 3 gantry `pylon`s ([`L500-L523`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L500-L523)): $\text{ang} \in \{0^\circ, 120^\circ, 240^\circ\}$, $r = 0.48\text{m}$.
   - T2 3 coil `shield`s ([`L555-L563`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L555-L563)): $\text{ang} \in \{60^\circ, 180^\circ, 300^\circ\}$, $r \in [0.47, 0.61]\text{m}$, $y \in [0.32, 0.76]\text{m}$.
   - T4 `driveGear` ([`L597-L602`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L597-L602)): $r \le 0.58\text{m}$, $y \in [0.42, 0.54]\text{m}$.
   - T3 `innerRingGrp` ([`L566-L573`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L566-L573)): `TorusGeometry(0.68, 0.05)` tilted $\pi/3$ around $X$ and spinning continuously around $Z$ at `(0, 1.15, 0)` $\implies$ sweeps a **3D sphere of outer radius $R_{\text{ring}} = 0.68 + 0.05 = 0.730\text{m}$** centered at `(0, 1.15, 0)`!
     At height $y$, horizontal ring envelope radius is $r_{\text{env}}(y) = \sqrt{0.73^2 - (y - 1.15)^2}$:
     - $r_{\text{env}}(0.50) = 0.332\text{m}$
     - $r_{\text{env}}(0.78) = 0.629\text{m}$
     - $r_{\text{env}}(1.15) = 0.730\text{m}$
2. **Exact Placement & Dimensions**:
   - Place 3 `fluxPylon` groups at $\text{ang} = \frac{2\pi i}{3} + \frac{\pi}{3}$ ($60^\circ, 180^\circ, 300^\circ$, cleanly bisecting the 3 T1 gantry clamps!) at radial distance **$r = 0.85\text{m}$**, with `fluxPylon.rotation.y = -ang + Math.PI / 2` (so local $+Z$ points radially outward, $-Z$ radially inward):
     - `bridgeStrut` (`deepBlueMat`, `RoundedBoxGeometry(0.15, 0.12, 0.42, 2, 0.03)` at local `(0, 0.12, -0.16)`): spans $r \in [0.48, 0.90]\text{m}$ at $y \in [0.06, 0.18]\text{m}$, bolting physically into `pedCore` ($r \le 0.52\text{m}$) with `0.14m` vertical clearance below T2 `shield` ($y \ge 0.32$) and `0.24m` below T4 `driveGear` ($y \ge 0.42$)!
     - `baseShoe` (`creamMat`, `RoundedBoxGeometry(0.22, 0.18, 0.22, 2, 0.04)` at `(0, 0.20, 0)`): $r \in [0.74, 0.96]\text{m}$, clearing T2 `shield` ($r \le 0.61\text{m}$) by `0.13m`.
     - `coreRod` (`deepBlueMat`, `CylinderGeometry(0.065, 0.08, 0.86, 10)` at `(0, 0.68, 0)`): $r \in [0.77, 0.93]\text{m}$, $y \in [0.25, 1.11]\text{m}$.
     - `coilLower` (`weaponAccentMat` `#C084FC`, `TorusGeometry(0.105, 0.028, 8, 18)` at `(0, 0.50, 0)`): $r_{\min} = 0.717\text{m} > 0.61\text{m}$ (`shield`) & $0.332\text{m}$ (`innerRingGrp`).
     - `coilUpper` (`tierTrimMat`, `TorusGeometry(0.10, 0.026, 8, 18)` at `(0, 0.78, 0)`): $r_{\min} = 0.724\text{m} > 0.629\text{m}$ (`innerRingGrp` at $y=0.78$, `0.095m` gap!).
     - `finialCollar` (`creamMat`, `CylinderGeometry(0.05, 0.085, 0.11, 8)` at `(0, 1.13, 0)`) + `fluxTip` (`weaponAccentMat`, `OctahedronGeometry(0.065, 0)` at `(0, 1.22, 0)`): $r_{\min} = 0.765\text{m} > 0.730\text{m}$ (`innerRingGrp` equator, `0.035m` dynamic clearance at all spin angles!), and $r_{\max} = 0.983\text{m} < 1.04\text{m}$ (within T1 plinth footprint!).
     - `tagArcFlyPart(fluxPylon, Math.cos(ang) * 1.65, 1.75, Math.sin(ang) * 1.65)`.

### Caveats
- Always call `part.position.set(...)` (and `part.rotation...`) **before** `tagArcFlyPart(part, ...)` because [`tagArcFlyPart`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L57-L61) snapshots `obj.position.clone()` at call time!

### Conclusion
- Adding `topRadiatorGrp` (`autocannon`), `rangefinderArm` (`mortar`), and `3 × fluxPylon` (`magnetic`) to `t3Turret` achieves 100% fidelity with `gameConfig.ts` `partHeadline`, zero bounding-box collisions across T1–T4, and automatic staggered parabolic fly-in via `getTierPartObjects(rig, 3)`.

### Verification Method
- Inspect `getTierPartObjects(rig, 3).length`: Autocannon = `3` (`2` drums + `1` top louver bank), Mortar = `3` (`2` pods + `1` rangefinder arm), Magnetic = `4` (`1` counter-ring + `3` flux pylons). Visually verify T3 & T4 upgrades in headless Chromium screenshots.

---

## 3. Per-Flap Hinge Axis Metadata (`rig.hingedFlaps`) & Right-Handed Sign Proofs

### Observation
- Currently, [`CinematicDirector.playLegendaryUpgradeReveal`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L421-L423) hardcodes `tl.to(flap.rotation, { x: -0.55, ... })` for all `rig.hingedFlaps`, which clips Mortar's vertical `'y'`-hinged rear doors through the capacitor bay and twists Magnetic's `'z'`-hinged radial crown petals sideways.
- Meanwhile, [`GameEngine.fireMortar`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1153-L1158) uses `door.rotation.y = door.position.x > 0 ? -0.45 : 0.45`.

### Logic Chain (Exact Right-Handed Rotation Matrix Proofs)
In Three.js right-handed local coordinates:

1. **Autocannon T3 Top Louvers & T4 Pauldron Vents (`hingeAxis = 'x'`)**:
   - Both `louverPivot` (T3) and `flapPivot` (T4, [`L335-L341`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L335-L341)) place the hinge at rear (`z = 0`) and extend the flap mesh forward in $+Z$ (`z = +0.065` / `+0.16`, `y = +0.014` / `+0.02`).
   - Rotating around $+X$ by $\theta$:
     $$y' = y\cos\theta - z\sin\theta$$
   - For $\theta < 0$ ($\sin\theta < 0$), $-z\sin\theta > 0 \implies y'$ increases (**lifts UPWARD $+Y$ away from hull/pauldron**).
   - **Exact Metadata**:
     - T3 `louverPivot` ($\times 2$): `hingeAxis: 'x'`, `restAngle: -0.08`, `openAngle: -0.58`, `minTier: 3`.
     - T4 `flapPivot` ($\times 2$): `hingeAxis: 'x'`, `restAngle: 0`, `openAngle: -0.55`, `minTier: 4`.

2. **Mortar T4 Rear Capacitor Bay Doors (`hingeAxis = 'y'`)**:
   - [`TowerFactory.ts:468-L477`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L468-L477): `doorHinge.position.set(sx * 0.36, 0.52, -0.7)` (`sx ∈ {-1, +1}`), with `door.position.set(-sx * 0.15, 0, -0.04)`.
   - The Mortar body (`capHousing`, `tierCore`) lies in $+Z$ (`z > -0.70`), while open air behind the Mortar lies in **$-Z$ (`z < -0.70`)**.
   - Rotating inner door edge $(x_0, 0, z_0) = (-\text{sx}\cdot 0.31, 0, -0.04)$ around $+Y$ by $\theta$:
     $$z' = -x_0\sin\theta + z_0\cos\theta = \text{sx}\cdot 0.31\sin\theta - 0.04\cos\theta$$
   - For the door to swing **OUTWARD into $-Z$** ($z' < -0.04$), we require $\text{sx}\cdot\sin\theta < 0$:
     - Right door (`sx = +1`, `position.x = +0.36`): $\theta < 0 \implies \text{openAngle} = -0.58\text{ rad}$ ($z' = -0.203\text{m}$).
     - Left door (`sx = -1`, `position.x = -0.36`): $\theta > 0 \implies \text{openAngle} = +0.58\text{ rad}$ ($z' = -0.203\text{m}$).
   - This **100% matches** [`GameEngine.ts:1154`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1154) (`door.position.x > 0 ? -0.45 : 0.45`, i.e. `-sx * angle` — note that `+sx * 0.62` would have swung the doors INWARD into `tierCore`!).
   - **Exact Metadata**: `hingeAxis: 'y'`, `restAngle: 0`, `openAngle: -sx * 0.58`, `minTier: 4`.

3. **Magnetic T4 Crown Petals (`hingeAxis = 'z'`)**:
   - [`TowerFactory.ts:582-L593`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L582-L593): for $p \in \{0,1,2,3\}$, $pa = \frac{p\pi}{2}$, `petalPivot.position = (0.38 cos(pa), 0, 0.38 sin(pa))`, `petalPivot.rotation.y = -pa`.
   - Transforming `petalPivot`'s local $+X$ unit vector `(1, 0, 0)` into `crownHalo` space via $R_y(-pa)$:
     $$R_y(-pa)\begin{pmatrix}1\\0\\0\end{pmatrix} = \begin{pmatrix}\cos(-pa)\\0\\-\sin(-pa)\end{pmatrix} = \begin{pmatrix}\cos(pa)\\0\\\sin(pa)\end{pmatrix}$$
     Hence local **$+X$ points radially OUTWARD** for all 4 petals, and local **$+Y$ points UP**.
   - Inside `petalPivot`, `petal` sits at `(0.1, 0.14, 0)` with `petal.rotation.z = -0.35`, placing the petal tip at $(x_0, y_0, 0) = (+0.158, +0.300, 0)$.
   - Rotating around local $+Z$ by $\theta$:
     $$x' = x_0\cos\theta - y_0\sin\theta$$
   - To flare the petal **OUTWARD** ($x' > x_0$), we require $-y_0\sin\theta > 0 \implies \mathbf{\theta < 0}$!
     - At $\theta = -0.48\text{ rad}$: $x' = 0.158(0.887) - 0.300(-0.462) = +0.279\text{m}$ (**flares outward** away from spire center!).
     - (Conversely, $\theta = +0.48\text{ rad}$ yields $x' = +0.002\text{m}$, folding inward!)
   - **Exact Metadata**: `hingeAxis: 'z'`, `restAngle: 0`, `openAngle: -0.48`, `minTier: 4`.

### Caveats
- Before M2 runs, `GameEngine.ts:1153` only iterates `hingedFlaps` inside `fireMortar()` (where `hingedFlaps` still contains only the 2 `'y'` doors), and `CinematicDirector.ts:422` runs `yoyo: true, repeat: 1` on `x: -0.55` (which cleanly opens & returns both T3 and T4 `'x'` flaps on Autocannon to their exact initial `rotation.x`). Thus M1 is 100% backward-compatible with unedited M2 files.

### Conclusion
- Define `export type FlapHingeAxis = 'x' | 'y' | 'z'` and `export interface HingedFlapUserData` in [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts), and populate `flap.userData` (`hingeAxis`, `restAngle`, `openAngle`, `minTier`) on every entry in `rig.hingedFlaps` via a shared `registerHingedFlap(...)` helper in [`TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts).

### Verification Method
- Assert for every tower type that all `rig.hingedFlaps` entries define valid `userData.hingeAxis`, `restAngle`, `openAngle`, and that setting `flap.rotation[hingeAxis] = openAngle` increases world-space radial/upward distance of child mesh bounding-box centers from the turret core.

---

## 4. Magnetic Tower `weaponPitch` Parenting (`Defect D6.1`)

### Observation
- In [`TowerFactory.ts:488-L552`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L488-L552), Magnetic Tower creates `weaponPitch` at default `(0, 0, 0)` with **zero children**, attaching `outerRingGrp` (`(0, 1.15, 0)`), `coreMesh` (`(0, 1.15, 0)`), and `muzzle` (`(0, 1.15, 0)`) directly to `turretYaw`.
- Consequently, Beat 3 of [`CinematicDirector.playTowerBuildAssembly`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L164-L165) (`weaponPitch.position.z = restWeaponZ - 0.26` $\to$ `tl.to(weaponPitch.position, { z: restWeaponZ, ... }, 0.34)`) animates an empty group on Magnetic builds.
- **Hidden Interaction Discovered in [`GameEngine.ts:1055-L1063`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1055-L1063)**:
  ```ts
  if (tower.stunTimer > 0) {
    tower.stunTimer = Math.max(0, tower.stunTimer - dt);
    rig.weaponPitch.rotation.x = 0.22; // Droop slightly while EMP-stunned
    continue;
  } else if (tower.type === 'autocannon') {
    rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8);
  } else if (tower.type === 'mortar') {
    rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, -0.58, dt * 8);
  }
  ```

### Logic Chain
1. **Why `weaponPitch.position` MUST Be `(0, 1.15, 0)` (NOT `(0, 0, 0)`)**:
   - If `weaponPitch.position` were `(0, 0, 0)` with `outerRingGrp` and `coreMesh` at `(0, 1.15, 0)` inside it, then when the Wave 8 Boss stuns a Magnetic Tower (`rig.weaponPitch.rotation.x = 0.22`), the lever arm of `1.15m` would swing the ring forward by $+1.15\sin(0.22) = +0.251\text{m}$, colliding with the front gantry clamp!
   - By setting **`weaponPitch.position.set(0, 1.15, 0)`** inside `turretYaw`, and placing `outerRingGrp`, `coreMesh`, and `muzzle` at **local `(0, 0, 0)`** inside `weaponPitch`:
     - **Rest world coordinates are 100.000% identical**: `(0, 0.14 + 0.34 + 1.15, 0) = (0, 1.63, 0)`.
     - **Stage 2A Build Beat 3 (`CinematicDirector.ts:164-192`)**: `restWeaponZ = 0`; `weaponPitch.position` slides from `(0, 1.15, -0.26)` into `(0, 1.15, 0)` with `back.out(2.6)` overshoot right as the 3 gantry clamps rise, snapping the purple containment ring + glowing octahedron core into the 3 gantry jaws!
     - **Boss EMP Stun (`weaponPitch.rotation.x = 0.22`)**: tilts the suspended magnetic ring & core cleanly in-place around its own center `(0, 1.15, 0)` with zero lateral translation and zero clamp collision!
     - **`t3Turret` Independence**: `t3Turret` (`innerRingGrp` + `3 × fluxPylon`) stays directly under `turretYaw` (`turretYaw.add(t3Turret)`), so T3's structural base pylons never slide at T1 build or tilt during EMP stun.
     - **Reference Preservation**: `rig.magRingOuter = outerRingGrp`, `rig.magInnerCore = coreMesh`, `rig.idleCore = coreMesh`, and `rig.muzzlePoints = [muzzle]` remain direct object references whose local rotations (`outerRingGrp.rotation.y`, `coreMesh.rotation.y/x`) spin cleanly around `(0, 0, 0)`.

### Caveats
- **Important Handoff Note for M2 (`GameEngine.ts:1063`)**: Now that `magnetic`'s `weaponPitch` has visible children (`weaponPitch.children.length === 3`), M2 should add `else { rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8); }` at [`GameEngine.ts:1063`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1063) so after Boss EMP stun (`2.2s`) expires on a Magnetic Tower, `weaponPitch.rotation.x` smoothly recovers from `0.22` back to `0`!

### Conclusion
- Set `weaponPitch.position.set(0, 1.15, 0)` on Magnetic Tower and parent `outerRingGrp` (`(0,0,0)`), `coreMesh` (`(0,0,0)`), and `muzzle` (`(0,0,0)`) under `weaponPitch`.

### Verification Method
- Verify `createTowerRig('magnetic', 1).weaponPitch.children.length === 3`, `magRingOuter.getWorldPosition()` equals `(0, 1.49, 0)` (relative to `root` at origin), and Stage 2A build animation cleanly snaps the ring/core into the gantry clamps.

---

## 5. Tier Visibility Helper (`setTowerTierVisibility` & `applyTowerTierVisuals` Options)

### Observation
- [`applyTowerTierVisuals`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L636-L654) currently couples two operations into one unparameterized call:
  1. Mutating tier colors/rims on `rig.coreMaterial` and `rig.tierAccentMaterials` (`[creamMat, tierTrimMat]`).
  2. Toggling `.visible` on `t2Subs` (`[t2Base, t2Turret]`), `rig.tierGroups.t3`, and `rig.tierGroups.t4` (note: `rig.tierGroups.t2.visible` itself was previously unsynced).
- Calling `applyTowerTierVisuals(rig, newTier)` at `t = 0` of [`playNormalUpgrade`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L209) and [`playLegendaryUpgradeReveal`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L303) prematurely switches the tower's core/trim/nameplate color before the new 3D modules fly in (`Defect D6.3`).

### Logic Chain
1. Extracting `export function setTowerTierVisibility(rig: TowerRig, tier: TowerTier): void` isolates visibility toggling (`t2Base`, `t2Turret`, `rig.tierGroups.t2`, `rig.tierGroups.t3`, `rig.tierGroups.t4`).
2. Extending `export function applyTowerTierVisuals(rig: TowerRig, tier: TowerTier, options?: { visibilityOnly?: boolean }): void` to call `setTowerTierVisibility(rig, tier)` first and return early when `options?.visibilityOnly === true`:
   - Preserves **100% backward compatibility** with all existing 2-argument callers (`createTowerRig` at `L631`, `CinematicDirector` at `L209, L303` prior to M2).
   - Gives M2 (`CinematicDirector.ts`) both ergonomic APIs: call `setTowerTierVisibility(rig, newTier)` (or `applyTowerTierVisuals(rig, newTier, { visibilityOnly: true })`) at `t = 0` so new 3D parts appear and fly along parabolic arcs while the tower retains its previous tier's core/trim color, then call `applyTowerTierVisuals(rig, newTier)` at `lockEnd` / `climaxAt` when the parts lock in and ignite!
3. [`createGhostTowerPreview`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L669-L688) calls `createTowerRig(type, 1)`, which invokes `applyTowerTierVisuals(rig, 1)` (hiding T2/T3/T4 groups) and traverses `rig.root` to set Layer `1` + `ghostMat`. With Magnetic's emitter parented to `weaponPitch` at `(0, 1.15, 0)`, ghost previews remain 100% identical in geometry, world transforms, and Layer-1 outline exclusion.

### Caveats
- When M2 implements rapid-upgrade timeline cancellation (`T1 -> T2 -> T3`), canceling an in-flight `T1 -> T2` timeline before `lockEnd` must call `applyTowerTierVisuals(rig, 2)` during cleanup so the tower is already at Tier-2 Blue before `T2 -> T3` begins its `visibilityOnly` fly-in.

### Conclusion
- Export both `setTowerTierVisibility(rig: TowerRig, tier: TowerTier): void` and `applyTowerTierVisuals(rig: TowerRig, tier: TowerTier, options?: { visibilityOnly?: boolean }): void` from [`src/render/TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts).

### Verification Method
- Call `const rig = createTowerRig('autocannon', 1); setTowerTierVisibility(rig, 3);` and verify `rig.tierGroups.t3.visible === true` while `rig.coreMaterial.color.getHex() === TIER_META[1].color` (`0x2ecc71`), followed by `applyTowerTierVisuals(rig, 3)` updating `rig.coreMaterial.color.getHex() === TIER_META[3].color` (`0xa855f7`).
