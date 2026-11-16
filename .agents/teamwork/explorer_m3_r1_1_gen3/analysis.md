# Post-M2 Delta Blueprint — Track 1 (`explorer_m3_r1_1_gen3`)
**6 Legendary `T4-A`/`T4-B` 3D Rigs (`TowerFactory.ts`) · Skill/Combo/T4 VFX (`VfxManager.ts`) · Cinematics & Fog Fix (`CinematicDirector.ts`, `BeaconAndPropsFactory.ts`) · Remaining WebAudio SFX (`AudioManager.ts`)**

> **Core Summary**: Mapped the existing Gen2 combat/VFX/audio architectural designs (`explorer_expansion_survey_2_gen2/analysis.md`) onto the exact post-M2 codebase (`TowerFactory.ts` `928L`, `VfxManager.ts` `715L`, `CinematicDirector.ts` `892L`, `BeaconAndPropsFactory.ts` `1513L`, `AudioManager.ts` `294L`, `types.ts` `566L`). M2 already landed `TowerBranch` types, `TowerRig` optional branch fields (`types.ts:303-312`), deferred tier visibility hooks in `CinematicDirector` (`lines 225, 290, 320, 424`), and 5 M2 SFX (`AudioManager.ts:240-273`), leaving a clean, surgical M3 delta across these 5 files with **zero regressions** to M1.2's `idleCore`, `hingedFlaps`, T3 sub-parts, Magnetic `weaponPitch`, or `#1A1033` Layer-0 outlines.

---

## 1. `src/render/TowerFactory.ts` (+ `src/types.ts:280-312`) — 6 Legendary `T3→T4` Dual Specialization 3D Rigs

### 1.1 Current Post-M2 Baseline Observations
- `src/types.ts:13, 280-285, 303-312`:
  - `TowerBranch = 'A' | 'B'` (`line 13`) already exists.
  - `HingedFlapUserData` (`lines 280-285`) has `{ hingeAxis, restAngle, openAngle, minTier }` — add optional `branchTag?: TowerBranch` (`line 285`) so T4-A and T4-B flaps animate mutually exclusively while T3 flaps (`branchTag = undefined`) remain active on both branches.
  - `TowerRig` (`lines 303-312`) already declares `rotaryBarrels?: THREE.Object3D[]`, `branchBarrelOverlayA?: THREE.Object3D[]`, `branchBarrelOverlayB?: THREE.Object3D[]`, and `tierGroups: { t2, t3, t4, t4A?, t4B? }`. Make `t4A: THREE.Group` & `t4B: THREE.Group` required (with `t4 = t4A` alias preserved).
- `src/render/TowerFactory.ts`:
  - `lines 4`: Imports `{ FlapHingeAxis, TowerRig, TowerTier, TowerType }` — add `TowerBranch`.
  - `lines 63-75`: `registerHingedFlap(hingedFlaps, flap, hingeAxis, openAngle, minTier)` — add 6th optional parameter `branchTag?: TowerBranch` and store `if (branchTag) flap.userData.branchTag = branchTag;`.
  - `lines 95-126`: Palette materials already enforce `CREAM_ARMOR` (`#F3EFE6`) + `DEEP_BLUE_FRAME` + constant `weaponAccentMat` (`bp.weaponColor`) + tier-reactive `tierTrimMat` / `coreMaterial` (`#F59E0B` Gold at Tier 4).
  - `line 169`: Currently creates single `const t4Turret = new THREE.Group();` — replace with:
    ```ts
    const t4ATurret = new THREE.Group();
    const t4BTurret = new THREE.Group();
    const rotaryBarrels: THREE.Object3D[] = [];
    const branchBarrelOverlayA: THREE.Object3D[] = [];
    const branchBarrelOverlayB: THREE.Object3D[] = [];
    ```
  - **M1.2 Invariants Preserved Untouched**:
    1. `idleCore`: Autocannon `coreGem` (`lines 234-237`), Mortar `tierCore` (`lines 468-471`), Magnetic `coreMesh` (`lines 701-706`).
    2. `T3` Sub-Parts: Autocannon `drumGrp` + `topRadiatorGrp` (`lines 309-380`, `weaponPitch.add(t3Turret)` at `line 215`), Mortar lateral `pod`s + `rangefinderArm` (`lines 515-612`), Magnetic `innerRingGrp` + 3 radial `fluxPylon`s (`lines 723-796`).
    3. Magnetic `weaponPitch` (`lines 647, 686-710`): Positioned at `(0, 1.15, 0)` holding `outerRingGrp` (`magRingOuter`), `coreMesh` (`magInnerCore`/`idleCore`), and `muzzle`.
    4. **Zero `openEnded` Layer-0 Meshes**: Every `CylinderGeometry`, `ConeGeometry`, `RoundedBoxGeometry`, `TorusGeometry`, `OctahedronGeometry`, and `SphereGeometry` in `TowerFactory.ts` uses default closed caps (`openEnded = false`) so `ToonOutlineComposer` Pass 1–3 never produces normal-flip artifacts.

### 1.2 Exact 3D Rig Deltas for All 6 Legendary `T4-A` / `T4-B` Specializations

| Tower & Insert Lines | Branch `A` (`t4ATurret` + `branchBarrelOverlayA`) | Branch `B` (`t4BTurret` + `branchBarrelOverlayB`) |
|---|---|---|
| **1. Autocannon**<br>Parenting: `line 216`<br>`turretYaw.add(t4ATurret);`<br>`turretYaw.add(t4BTurret);`<br>Modules: `lines 382-427` | **`AC-04A` · `暴风火神机甲` *(Tempest Vulcan)***<br>• Keep existing `browCrest` (`lines 383-397`), twin heavy `pauldron`s + hinged vents (`lines 399-420`, pass `'A'` to `registerHingedFlap` at `line 416`), and rear `gear` (`lines 422-427`) in `t4ATurret`.<br>• **Add Rotary Gatling Clusters (`branchBarrelOverlayA` on `barrelL` & `barrelR` after `line 289`)**: On each barrel, add `gatlingGrp` at `(0, 0, 0.34)` (`tagArcFlyPart(gatlingGrp, sx * 0.9, 1.2, 0.9)`): closed `CylinderGeometry(0.135, 0.135, 0.075, 12)` `tierTrimMat` clamp collar + `spinCluster` (`pushed to rotaryBarrels`) holding `3` closed `CylinderGeometry(0.036, 0.036, 0.58, 8)` `darkJointMat` sub-barrels at `120°` (`r = 0.072`, `rotation.x = Math.PI / 2`) + front `weaponAccentMat` muzzle ring `CylinderGeometry(0.125, 0.125, 0.08, 12)`.<br>• **Add Dual Upper Drum Pods on `t4ATurret`**: For `sx of [-1, 1]`, armored `creamMat` auxiliary drum pod (`CylinderGeometry(0.2, 0.2, 0.3, 12)` `rotation.z = Math.PI/2` + `tierTrimMat` endcap + `hazardMat` feed bridge) at `(sx * 0.66, 0.52, -0.42)`, `tagArcFlyPart(..., sx * 1.6, 1.6, -0.9)`. | **`AC-04B` · `双联电磁轨炮` *(Twin Gauss Rail)***<br>• **Sniper Visor Hood (`t4BTurret`)**: Beveled `creamMat` cowl `RoundedBoxGeometry(0.74, 0.22, 0.62, 3, 0.06)` at `(0, 0.88, 0.12)` + twin `weaponAccentMat` closed sensor lenses `CylinderGeometry(0.055, 0.055, 0.08, 10)` (`rotation.x = Math.PI/2` at `(±0.16, -0.02, 0.31)`) + `tierTrimMat` dorsal crest fin (`RoundedBoxGeometry(0.14, 0.16, 0.48, 2, 0.025)`), `tagArcFlyPart(..., 0, 2.2, 0.6)`.<br>• **Side Rail-Shield Cowls (`t4BTurret`)**: For `sx of [-1, 1]`, angular `creamMat` cheek-pauldron `RoundedBoxGeometry(0.26, 0.34, 0.78, 3, 0.06)` + `tierTrimMat` lower rail strip at `(sx * 0.86, 0.6, -0.02)`, `tagArcFlyPart(..., sx * 2.0, 1.8, 0.1)`.<br>• **Dorsal Capacitor Bank + Hinged Fins (`t4BTurret`)**: `RoundedBoxGeometry(0.68, 0.3, 0.38, 3, 0.05)` `deepBlueMat` bank at `(0, 0.62, -0.52)` with `3` glowing `weaponAccentMat` closed capacitor cells `CylinderGeometry(0.075, 0.075, 0.28, 10)` + `2` `creamMat`/`tierTrimMat` hinged discharge fins (`registerHingedFlap(hingedFlaps, finPivot, 'z', -sx * 0.48, 4, 'B')`), `tagArcFlyPart(..., 0, 1.8, -1.4)`.<br>• **Elongated Magnetic Rail Barrels (`branchBarrelOverlayB` on `barrelL` & `barrelR`)**: `railAssembly` at `(0, 0, 0.44)` (`tagArcFlyPart(..., sx * 0.8, 1.1, 1.1)`): upper `creamMat` & lower `deepBlueMat` parallel rail blades (`RoundedBoxGeometry(0.085, 0.062, 0.86, 2, 0.02)` at `y = ±0.072, z = 0.38` leaving a real `0.082m` air-gap!) + `3` `tierTrimMat`/`weaponAccentMat` induction coil clamps (`RoundedBoxGeometry(0.16, 0.19, 0.06, 2, 0.018)` at `z = 0.12, 0.38, 0.64`). |
| **2. Mortar**<br>Parenting: `line 436`<br>`turretYaw.add(t4ATurret);`<br>`turretYaw.add(t4BTurret);`<br>Modules: `lines 614-644` | **`PM-04A` · `天穹聚变巨炮` *(Firmament Fusion)***<br>• Keep existing `siegeCrown` (`lines 615-624`), hinged rear capacitor `doorHinge`s (`lines 627-636`, pass `'A'` to `registerHingedFlap` at `line 635`), and `elevGear` (`lines 638-643`) in `t4ATurret`.<br>• **Add Heavy Fusion Siege Barrel Collar + Plasma Coils (`branchBarrelOverlayA` on `tubeGrp` / `mortarTube` after `line 499`)**: `fusionCollarGrp` (`tagArcFlyPart(..., 0, 1.5, 1.2)`): `3` glowing `weaponAccentMat` plasma containment toroids `TorusGeometry(0.355, 0.042, 10, 20)` spaced at `z = 0.28, 0.52, 0.76`, `2` lateral `creamMat` heavy hydro-buffer pods `RoundedBoxGeometry(0.14, 0.16, 0.64, 2, 0.03)` at `(±0.35, 0, 0.48)`, and a heavy `tierTrimMat` crowned muzzle ring `TorusGeometry(0.33, 0.05, 10, 20)` at `z = 0.93` (keeping `boreDark` unobstructed!). | **`PM-04B` · `集束火箭弹巢` *(Cluster Rocket Pod)***<br>• `setTowerTierVisibility` hides single `mortarTube` (`rig.mortarTube.visible = !(tier >= 4 && branch === 'B')`) so twin MLRS pods cleanly take center stage!<br>• **Twin 6-Cell Beveled MLRS Missile Pods (`t4BTurret`)**: For `sx of [-1, 1]`, `podGrp` at `(sx * 0.46, 0.84, 0.02)` tilted `rotation.x = -0.36`: outer `creamMat` armored pod `RoundedBoxGeometry(0.5, 0.42, 0.68, 3, 0.06)`, recessed `deepBlueMat` tube-plate `RoundedBoxGeometry(0.42, 0.34, 0.06, 2, 0.02)` at `z = 0.32`, `2×3 = 6` closed `darkJointMat` launch cells `CylinderGeometry(0.056, 0.056, 0.08, 10)` (`rotation.x = Math.PI/2`) tipped with `hazardMat`/`weaponAccentMat` closed warhead nose cones `ConeGeometry(0.045, 0.09, 10)` (`rotation.x = Math.PI/2` at `z = 0.36`), `tierTrimMat` gold side band, **top hinged reload hatch** (`RoundedBoxGeometry(0.42, 0.05, 0.38, 2, 0.018)` `tierTrimMat`, `registerHingedFlap(hingedFlaps, hatchPivot, 'x', -0.62, 4, 'B')`), and pod muzzle `Object3D` at `(0, 0, 0.44)` pushed to `muzzlePoints` (`indices 1 & 2`)! `tagArcFlyPart(podGrp, sx * 1.9, 2.0, 0.4)`.<br>• **Central Targeter Dome (`t4BTurret`)**: At `(0, 1.12, -0.18)`, `creamMat` radar/optic housing `RoundedBoxGeometry(0.4, 0.24, 0.36, 3, 0.06)` + closed `weaponAccentMat` scanner lens `CylinderGeometry(0.08, 0.08, 0.07, 12)` (`rotation.x = Math.PI/2`, `z = 0.18`) + `tierTrimMat` dish fin, `tagArcFlyPart(..., 0, 2.3, -0.4)`. |
| **3. Magnetic**<br>Parenting: `line 651`<br>`turretYaw.add(t4ATurret);`<br>`turretYaw.add(t4BTurret);`<br>Modules: `lines 798-826` | **`MR-04A` · `奇点引力中枢` *(Singularity Core)***<br>• Keep existing `crownHalo` + `4` hinged golden petals (`lines 799-818`, pass `'A'` to `registerHingedFlap` at `line 815`) and `driveGear` (`lines 820-825`) in `t4ATurret`.<br>• **Add Gyroscopic Singularity Rings + Gravity Core Nodes (`branchBarrelOverlayA` on `weaponPitch` after `line 707` — preserves `weaponPitch` at `y = 1.15`!)**: `gyroGrp` (`tagArcFlyPart(gyroGrp, 0, 1.6, 0)`): outer golden gimbal `TorusGeometry(0.58, 0.038, 10, 28)` (`tierTrimMat`, `rotation.z = Math.PI / 4`, pushed to `rotaryBarrels`) + inner dark-violet gimbal `TorusGeometry(0.36, 0.032, 10, 24)` (`darkJointMat`, `rotation.x = -Math.PI / 4`, pushed to `rotaryBarrels`) + `4` `weaponAccentMat` gravity-well emitters `OctahedronGeometry(0.065, 0)` on the outer gimbal.<br>• **Add 3 Gravity Anchor Buttresses (`t4ATurret`)**: `3` `creamMat` + `tierTrimMat` beveled buttress fins around mid-spire (`r = 0.58, y = 0.88`), `tagArcFlyPart(..., cos*1.5, 1.5, sin*1.5)`. | **`MR-04B` · `高压电弧矩阵` *(Tesla Arc Matrix)***<br>• **3 Tall Tesla Transformer Spires (`t4BTurret`)**: For `i = 0..2` (`ang = (i * Math.PI * 2) / 3`), `spire` at `(Math.cos(ang) * 0.62, 0, Math.sin(ang) * 0.62)`: chunky `creamMat` transformer block `RoundedBoxGeometry(0.24, 0.42, 0.24, 2, 0.04)` at `y = 0.86`, `3` stacked `weaponAccentMat` ceramic insulator discs `CylinderGeometry(0.13, 0.13, 0.045, 12)` closed at `y = 1.16, 1.30, 1.44`, `tierTrimMat` upper rod `CylinderGeometry(0.052, 0.072, 0.42, 10)` closed at `y = 1.40`, and `coreMaterial` spherical arc-emitter node `SphereGeometry(0.105, 12, 10)` at `y = 1.68`! `tagArcFlyPart(spire, Math.cos(ang) * 1.8, 2.0, Math.sin(ang) * 1.8)`.<br>• **Tesla Pylon Crown + Arc Emitter Nodes + Hinged Flaps (`t4BTurret`)**: `teslaCrown` at `(0, 1.68, 0)`: `tierTrimMat` high-voltage bus `TorusGeometry(0.62, 0.046, 10, 24)` (`rotation.x = Math.PI/2`) + `3` inward `creamMat` emitter prongs `RoundedBoxGeometry(0.1, 0.08, 0.26, 2, 0.02)` with `weaponAccentMat` octahedral arc nodes + `3` hinged capacitor vent flaps (`registerHingedFlap(hingedFlaps, ventPivot, 'x', -0.52, 4, 'B')`), `tagArcFlyPart(teslaCrown, 0, 2.5, 0)`. |

### 1.3 Exact Helper Signature Updates (`src/render/TowerFactory.ts:844-903`)

Replace `lines 844-903` with:

```ts
    rotaryBarrels,
    branchBarrelOverlayA,
    branchBarrelOverlayB,
    tierGroups: {
      t2: new THREE.Group(),
      t3: t3Turret,
      t4: t4ATurret, // Alias kept for 100% backward compatibility
      t4A: t4ATurret,
      t4B: t4BTurret,
    },
    tierAccentMaterials,
    coreMaterial,
  };

  rig.tierGroups.t2.userData.subGroups = [t2Base, t2Turret];
  applyTowerTierVisuals(rig, initialTier);

  return rig;
}

export function setTowerTierVisibility(
  rig: TowerRig,
  tier: TowerTier,
  branch: TowerBranch = 'A'
): void {
  const t2Subs = (rig.tierGroups.t2.userData.subGroups as THREE.Group[]) ?? [];
  const showT2 = tier >= 2;
  rig.tierGroups.t2.visible = showT2;
  for (const g of t2Subs) {
    g.visible = showT2;
  }
  rig.tierGroups.t3.visible = tier >= 3;

  const showT4A = tier >= 4 && branch !== 'B';
  const showT4B = tier >= 4 && branch === 'B';
  rig.tierGroups.t4A.visible = showT4A;
  rig.tierGroups.t4B.visible = showT4B;
  rig.tierGroups.t4.visible = showT4A; // t4 aliases t4A

  for (const obj of rig.branchBarrelOverlayA ?? []) obj.visible = showT4A;
  for (const obj of rig.branchBarrelOverlayB ?? []) obj.visible = showT4B;

  // Mortar T4-B (集束火箭弹巢) replaces single mortarTube with twin 6-cell MLRS pods
  if (rig.mortarTube) {
    rig.mortarTube.visible = !showT4B;
  }
}

export function applyTowerTierVisuals(
  rig: TowerRig,
  tier: TowerTier,
  options?: { visibilityOnly?: boolean; branch?: TowerBranch }
): void {
  setTowerTierVisibility(rig, tier, options?.branch ?? 'A');
  if (options?.visibilityOnly) {
    return;
  }

  const meta = TIER_META[tier];
  rig.coreMaterial.color.setHex(meta.color);
  rig.coreMaterial.emissive.setHex(meta.color);

  setMaterialRimColor(rig.tierAccentMaterials[0], meta.rimColor, tier === 4 ? 0.48 : 0.3);
  const trimMat = rig.tierAccentMaterials[1];
  trimMat.color.setHex(meta.color);
  trimMat.emissive.setHex(meta.color);
  setMaterialRimColor(trimMat, meta.rimColor, 0.45);
}

export function getTierPartObjects(
  rig: TowerRig,
  tier: TowerTier,
  branch: TowerBranch = 'A'
): THREE.Object3D[] {
  if (tier === 2) {
    const subs = (rig.tierGroups.t2.userData.subGroups as THREE.Group[]) ?? [];
    return subs.flatMap((g) => [...g.children]);
  }
  if (tier === 3) return [...rig.tierGroups.t3.children];
  if (tier === 4) {
    const activeGroup = branch === 'B' ? rig.tierGroups.t4B : rig.tierGroups.t4A;
    const overlays =
      branch === 'B' ? (rig.branchBarrelOverlayB ?? []) : (rig.branchBarrelOverlayA ?? []);
    return [...activeGroup.children, ...overlays];
  }
  return [];
}
```

---

## 2. `src/fx/VfxManager.ts` — Skill, Synergy Combo & T4 Branch VFX + Leak-Free `.dispose()`

### 2.1 Post-M2 Baseline & Outline / Disposal Rules (`VfxManager.ts:1-715`)
- **Layer & Outline Rule (`Contract C3`)**: Every object added to `this.vfxScene` MUST stay on **default Layer `0`** (NEVER `layers.set(1)`, since `ToonOutlineComposer` renders `vfxScene` on Layer `0` after the `#1A1033` outline pass). All materials must set `transparent: true, depthWrite: false` with non-bleaching peak opacity (`<= 0.85` transient, `<= 0.38` persistent 3s zones).
- **Safe `.dispose()` Rule (`lines 635-714`)**:
  - NEVER call `.geometry.dispose()` on `THREE.Sprite` (`THREE.Sprite.geometry` singleton, `line 639`) or shared `this.sparkGeo` / `this.dustGeo` / `this.debrisGeo` during transient cleanup.
  - NEVER call `.dispose()` on `getToonTextures()` maps (`softGlow`, `ringWave`, `hazardZone`).
- **Minor Enhancement to `ExpandingRing` (`lines 23-30, 436-459, 544-557`)**:
  - Add `maxOpacity: number` (default `0.9`) to `ExpandingRing` and `spawnGroundRing(..., maxOpacity = 0.9)` so wide rings (`26m` EMP wave, `14m` `7.0m`-radius Arc Matrix ring) use `maxOpacity = 0.42–0.56` (`r.mat.opacity = (1 - u) * r.maxOpacity` at `line 550`), preventing screen over-brightening! Also notice `THREE.MathUtils.lerp(r.startScale, r.endScale, ...)` (`line 548`) **already supports shrinking rings** whenever `startScale > endScale`!

### 2.2 Exact New Fields & Methods in `src/fx/VfxManager.ts`

1. **New Pool Interface & Fields (`insert after line 61` & `after line 75`)**:
   ```ts
   interface PlasmaBurnZone {
     group: THREE.Group;
     discMat: THREE.MeshBasicMaterial;
     rimMat: THREE.MeshBasicMaterial;
     elapsed: number;
     duration: number;
     radius: number;
     emberTimer: number;
   }
   ```
   Fields on `VfxManager` (`after line 75`):
   - `private burnZones: PlasmaBurnZone[] = [];`
   - `private tacticalReticleGroup: THREE.Group;`
   - `private tacticalReticleInner: THREE.Mesh;`
   - `private tacticalReticleMats: THREE.MeshBasicMaterial[] = [];`

2. **Persistent Orbital Strike Aiming Reticle (`constructor` `after line 98` + `setTacticalReticle`)**:
   - Build `this.tacticalReticleGroup` in `constructor` and add to `this.vfxScene` (default Layer `0`, `visible = false`, `y = 0.085`):
     - Outer perimeter `RingGeometry(0.94, 1.0, 48)` (`0x38bdf8`, `opacity: 0.78`, `depthWrite: false`, `DoubleSide`, `rotation.x = -Math.PI / 2`).
     - Soft area tint `CircleGeometry(0.94, 36)` (`0x38bdf8`, `opacity: 0.11`, `depthWrite: false`, `rotation.x = -Math.PI / 2`).
     - Rotating inner 4-corner lock diamond `this.tacticalReticleInner` (`RingGeometry(0.46, 0.54, 4)`, `0xfbbf24`, `opacity: 0.76`, `depthWrite: false`, `rotation.x = -Math.PI / 2`).
   - **`setTacticalReticle(visible: boolean, x = 0, z = 0, radius = 3.2): void`**:
     - Sets `this.tacticalReticleGroup.visible = visible;` and when `visible`, sets `position.set(x, 0.085, z)` and `scale.setScalar(radius)`.
   - In `update(dt, realDt)` (`after line 510`): if `this.tacticalReticleGroup.visible`, rotate `this.tacticalReticleInner.rotation.z += realDt * 1.9`.

3. **Orbital Ion Strike Telegraph (`0.55s`) + Sky Ion Beam (`insert after line 205`)**:
   - **`spawnOrbitalLockOn(x: number, z: number, radius = 3.2, duration = 0.55): void`**:
     - Shrinking outer cyan lock ring: `this.spawnGroundRing(new THREE.Vector3(x, 0.09, z), 0x38bdf8, radius * 2.05, radius * 0.28, duration, 0.78);`
     - Shrinking inner amber crosshair ring: `this.spawnGroundRing(new THREE.Vector3(x, 0.095, z), 0xfbbf24, radius * 1.35, 0.18, duration * 0.92, 0.72);`
     - `6` inward converging cyan/gold sparks (`inwardTarget: new THREE.Vector3(x, 0.25, z)`, `maxLife: duration * 0.85`).
   - **`spawnOrbitalIonBeam(x: number, z: number, radius = 3.2): void`**:
     - Inner core cylinder (`CylinderGeometry(0.22, 0.28, 18, 12, 1, true)` translated `+9m` Y, `0xe0f2fe`, `opacity: 0.84`, `AdditiveBlending`, `depthWrite: false`, `DoubleSide`) + outer ion sheath (`CylinderGeometry(0.54, 0.76, 18, 14, 1, true)` translated `+9m` Y, `0x38bdf8`, `opacity: 0.5`, `AdditiveBlending`, `depthWrite: false`, `DoubleSide`) at `(x, 0.05, z)` pushed to `this.tracers` (`maxLife: 0.38`).
     - Impact waves: `spawnGroundRing((x, 0.09, z), 0x38bdf8, 0.5, radius * 2.15, 0.46, 0.82)` + `spawnGroundRing((x, 0.095, z), 0xfbbf24, 0.35, radius * 1.45, 0.34, 0.75)` + `spawnLunarDustRing(new THREE.Vector3(x, 0, z), 12, 1.45)` + `14` cyan/amber sparks.

4. **EMP Overdrive Expanding Station Pulse (+ Nano-Repair Helper)**:
   - **`spawnEmpOverdrivePulse(origin: THREE.Vector3): void`**:
     - Station-wide non-bleaching wave: `this.spawnGroundRing(new THREE.Vector3(origin.x, 0.11, origin.z), 0x38bdf8, 0.8, 26.0, 0.62, 0.54);`
     - Secondary violet Flux wave: `this.spawnGroundRing(new THREE.Vector3(origin.x, 0.115, origin.z), 0xc084fc, 0.5, 20.0, 0.52, 0.46);`
   - **`spawnBeaconNanoRepair(beaconPos: THREE.Vector3): void`**:
     - `2` emerald-cyan ground/plaza rings (`0x34d399` & `0x22d3ee`, `endScale: 5.4`, `maxOpacity: 0.72`) + `3` rising horizontal `TorusGeometry(1.05, 0.045, 8, 24)` rings (`0x34d399`, `tracers`, `maxLife: 0.55`) + `14` upward emerald sparks (`0x34d399`).

5. **Flux Resonance 2-Target Chain Lightning Arcs + Capacitor Pylon Arc Visual**:
   - **`spawnChainLightningArc(from: THREE.Vector3, to: THREE.Vector3, colorHex = 0x38bdf8, maxLife = 0.18): void`**:
     - Computes `3` jittered waypoints `p0 = from`, `p1 = lerp(0.33) + jitter(±0.26)`, `p2 = lerp(0.67) + jitter(±0.26)`, `p3 = to`.
     - For each segment `[a, b]`, spawns a thin oriented `CylinderGeometry(0.036, 0.036, a.distanceTo(b), 5)` (`rotateX(Math.PI / 2)`, positioned at midpoint, `lookAt(b)`, `MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false })`) into `this.vfxScene` and pushes directly to **`this.tracers`**! (Thick & crisp unlike `1px`-clamped WebGL2 `THREE.Line`, and auto-disposed by `this.tracers`!).
   - **`spawnFluxResonanceDetonation(center: THREE.Vector3, chainTargets: THREE.Vector3[]): void`**:
     - `const cGround = new THREE.Vector3(center.x, 0.09, center.z);`
     - `this.spawnGroundRing(cGround, 0x22d3ee, 0.35, 4.2, 0.28, 0.78);`
     - `this.spawnGroundRing(cGround, 0xc084fc, 0.25, 2.8, 0.22, 0.68);`
     - `const arcStart = center.clone().setY(0.58);`
     - For each `targetPos` of `chainTargets.slice(0, 2)`: calls `this.spawnChainLightningArc(arcStart, targetPos.clone().setY(0.55), 0x38bdf8, 0.18)` + `this.spawnFlashBall(targetPos.clone().setY(0.55), 0x67e8f9, 0.22, 0.11)`.
   - **Capacitor Pylon Arc Hook (`GameEngine.ts:849-865`)**: Inside `activateMechanism` (`capacitor_pylon`), pass `new THREE.Vector3(mech.config.x, 1.88, mech.config.z)` → `e.worldPos` into `this.vfx.spawnChainLightningArc(..., 0x22d3ee, 0.24)` so real 3D cyan arcs leap from the Pylon's top `arcCore` (`BeaconAndPropsFactory.ts:931`) to every shocked enemy!

6. **Mortar `T4-A` `3s` Plasma Burn Zone (+ `T4-B` Cluster Rocket & `T4-B` Railgun / Crit / Shield Break)**:
   - **`spawnPlasmaBurnZone(x: number, z: number, radius = 3.0, duration = 3.0): void`**:
     - Creates `group` in `this.vfxScene` at `(x, 0.062, z)` with:
       - `discMesh`: `CircleGeometry(radius, 36)` (`rotation.x = -Math.PI / 2`), `discMat = MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.22, depthWrite: false })`.
       - `rimMesh`: `RingGeometry(radius * 0.91, radius, 44)` (`rotation.x = -Math.PI / 2`), `rimMat = MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })`.
     - Pushes to `this.burnZones`.
     - **Ticked inside `if (dt > 0)` in `update(dt, realDt)` (`after line 541`)** using combat `dt` (so Pause & Stage 2C `legendary_reveal` freeze burn zones deterministically!): pulses `discMat.opacity = 0.18 + 0.06 * Math.sin(z.elapsed * 9) * fade`, spawns 1 gentle cyan spark every `0.2s`, and at `z.elapsed >= z.duration` calls `disposeBurnZone(z)` (disposing both geometries & materials and removing `z.group` from `this.vfxScene`).
   - **Companion Weapon VFX Helpers**:
     - `launchClusterRocket(from, tx, tz, splashRadius, onImpact)`: reuses `this.mortarShells` (`lines 168-177`) with a `0.36s` duration and compact `#FB923C` + `#38BDF8` rocket mesh (`ConeGeometry` + `CylinderGeometry` closed, auto-disposed by `disposeMortarShell` at `lines 635-651`!).
     - `spawnRailgunSlug(from, to)`: full-length `0.055m` `0x38bdf8` core cylinder + `0xfbbf24` muzzle ring (`maxLife: 0.14s` in `this.tracers`).
     - `spawnWeakPointCrit(pos)` & `spawnShieldBreak(pos)`: crisp gold diamond flash / cyan shard sparks via `spawnFlashBall` + `spawnSpark`.

7. **Magnetic `T4-A` Singularity Pull Ring & Magnetic `T4-B` `7.0m` Haste / Arc Matrix Ring**:
   - **`spawnSingularityPullRing(center: THREE.Vector3, range: number): void`**:
     - Inward-collapsing violet ring: `this.spawnGroundRing(new THREE.Vector3(center.x, 0.08, center.z), 0xa855f7, range * 1.95, 0.35, 0.38, 0.76);`
     - Secondary golden event-horizon ring: `this.spawnGroundRing(new THREE.Vector3(center.x, 0.085, center.z), 0xf59e0b, range * 1.25, 0.22, 0.32, 0.62);`
     - `10` inward suction particles (`inwardTarget: center.clone().setY(0.65)`, `0xc084fc` / `0xfbbf24`, `maxLife: 0.36` in `this.sparks`).
   - **`spawnArcMatrixPulse(center: THREE.Vector3, chainTargets: THREE.Vector3[], auraRadius = 7.0): void`**:
     - Expands crisp `7.0m` (`endScale = auraRadius * 2.0 = 14.0m`) electric-cyan haste/matrix ring: `this.spawnGroundRing(new THREE.Vector3(center.x, 0.075, center.z), 0x38bdf8, 0.6, auraRadius * 2.0, 0.46, 0.42);`
     - Inner golden-violet harmonic pulse: `this.spawnGroundRing(new THREE.Vector3(center.x, 0.08, center.z), 0xf59e0b, 0.4, 5.2, 0.34, 0.55);`
     - Multi-hop chain lightning from Tesla crown `center.clone().setY(1.68)` → `chainTargets[0]` → `chainTargets[1]` ... → `chainTargets[4]` via `this.spawnChainLightningArc(..., 0x38bdf8, 0.16)`!

8. **Cleanup Integration (`clearCombatTransients` `line 493`, `clearAll` `line 670`, `dispose` `line 703`)**:
   - In `clearCombatTransients()` (`after line 505`): dispose all `this.burnZones` and set `this.tacticalReticleGroup.visible = false`.
   - In `clearAll()` (`after line 700`): dispose all `this.burnZones` (`this.burnZones.length = 0`) and set `this.tacticalReticleGroup.visible = false`.
   - In `dispose()` (`after line 707`): remove `this.tacticalReticleGroup` from `this.vfxScene`, dispose its 3 `RingGeometry`/`CircleGeometry` meshes and `this.tacticalReticleMats` (never touching `getToonTextures()` or `THREE.Sprite.geometry`).

---

## 3. `CinematicDirector.ts`, `BeaconAndPropsFactory.ts:645`, & `AudioManager.ts`

### 3.1 `src/game/CinematicDirector.ts` (`892` Lines Post-M2)

| Requirement | Post-M2 Line(s) & Current Code | Exact M3 Delta |
|---|---|---|
| **1. `gsap.ticker.lagSmoothing(500, 33)`** | **`line 48`**:<br>`gsap.ticker.lagSmoothing(0);` | Replace `line 48` with:<br>`gsap.ticker.lagSmoothing(500, 33);`<br>*(Prevents first-frame WebGL shader compile spikes from jumping past the `0.35s–1.29s` Boss entrance fissure glow ramp.)* |
| **2. Deferred Tier Color Ignition (`visibilityOnly: true` at `t=0`, full `applyTowerTierVisuals` at `lockEnd`/`climaxAt`)** | • **`playNormalUpgrade` (`lines 222–303`)**: ALREADY calls `applyTowerTierVisuals(rig, newTier, { visibilityOnly: true })` at `line 225` and `applyTowerTierVisuals(rig, newTier)` at `line 290` (`lockEnd`).<br>• **`playLegendaryUpgradeReveal` (`lines 317–433`)**: Calls `getTierPartObjects(rig, 4)` (`line 317`), `applyTowerTierVisuals(rig, 4, { visibilityOnly: true })` (`line 320`), and `applyTowerTierVisuals(rig, 4)` (`line 424`) **without `branch`**! | • In `playNormalUpgrade` (`lines 222–303`): keep `line 225` & `line 290` intact; add T3 flap flex at `lockEnd` (`lines 288-303`) for flaps with `(ud.minTier ?? 1) <= newTier && !ud.branchTag`.<br>• In `playLegendaryUpgradeReveal` (`lines 309–433`):<br>  - Add optional param `branchOverride?: TowerBranch` (`const branch: TowerBranch = branchOverride ?? tower.branch ?? 'A';`, importing `TowerBranch` at `line 8`).<br>  - **`line 317`**: `const parts = getTierPartObjects(rig, 4, branch);`<br>  - **`line 320`**: `applyTowerTierVisuals(rig, 4, { visibilityOnly: true, branch });`<br>  - **`line 424`** (at `climaxAt`): `applyTowerTierVisuals(rig, 4, { branch });` |
| **3. `playLegendaryUpgradeReveal` Branch Title Support (`'A' \| 'B'`)** | **`line 429`**:<br>`this.deps.onUpgradeStampUI(\`传说·${bp.name}\`, goldMeta.hex, statDeltas, true);` | Replace `line 429` with:<br>`const branchName = bp.branches?.[branch]?.name ?? bp.name;`<br>`this.deps.onUpgradeStampUI(\`传说·${branchName}\`, goldMeta.hex, statDeltas, true);`<br>*(Stamps `传说·暴风火神机甲`, `传说·双联电磁轨炮`, etc. character-by-character in `#F59E0B` Gold!)* |
| **4. `flap.rotation[flap.userData.hingeAxis]` Animation (`restAngle` / `openAngle` + `branchTag` Filter)** | **`lines 439–448`**:<br>Animates `flap.rotation` on `[axis]` using `openAngle` & `restAngle`, but checks only `(ud.minTier ?? 1) <= 4` (`line 444`) without filtering `ud.branchTag`.<br>*(Also note `GameEngine.ts:1805-1815` uses `setTimeout(..., 240)` on Mortar flaps!)* | • Replace `CinematicDirector.ts:439-448` loop condition with:<br>`if ((ud.minTier ?? 1) <= 4 && (!ud.branchTag || ud.branchTag === branch))`<br>and animate `flap.rotation` `{ [axis]: openAngle }` (`climaxAt + 0.12`) → `{ [axis]: restAngle }` (`climaxAt + 0.36`).<br>• In `playNormalUpgrade` (`after line 287`): flex T2/T3 flaps (`(ud.minTier ?? 1) <= newTier && !ud.branchTag`) `{ [axis]: openAngle }` at `0.06` → `{ [axis]: restAngle }` at `lockEnd + 0.08`.<br>• *(Cross-file note for `GameEngine.ts:1805-1815`)*: Replace `setTimeout` with a `simDt`-driven `flapOpenTimer` on `TowerInstance` (and hold `openAngle` while `overdriveTimer > 0`), filtering `!ud.branchTag || ud.branchTag === tower.branch`. |
| **5. Defensive `supplyChest.group.visible = true` & `beacon.skyBeam.visible = true` in `playOpenRewardChest`** | **`lines 824–831`**:<br>`const chest = this.deps.env.supplyChest;`<br>`const chestPos = chest.group.position.clone();`<br>*(If Final Boss breaches Beacon while `beaconHp` survives > 0 via `beacon_plating` tech or `nano_repair`, `playBossDefeatAndBeaconVictory` never ran, leaving `chest.group.visible = false` and `beacon.skyBeam.visible = false`!)* | Insert defensive initialization right at `lines 828–830` of `playOpenRewardChest`:<br>```ts
const beacon = this.deps.env.beacon;
const chest = this.deps.env.supplyChest;
if (!beacon.skyBeam.visible) {
  beacon.skyBeam.visible = true;
  (beacon.skyBeam.material as THREE.MeshBasicMaterial).opacity = 0.58;
}
if (!chest.group.visible) {
  const targetChestPos = this.deps.env.stageConfig?.supplyChestPos ?? {
    x: beacon.group.position.x - 3.2,
    y: 0,
    z: beacon.group.position.z + 0.3,
  };
  chest.group.position.set(targetChestPos.x, targetChestPos.y ?? 0, targetChestPos.z);
  chest.group.scale.set(1, 1, 1);
  chest.lidPivot.rotation.set(0, 0, 0);
  chest.claspMesh.visible = true;
  chest.claspMesh.position.set(0, 0.66, 0.51);
  chest.claspMesh.rotation.set(0, 0, 0);
  chest.group.visible = true;
}
const chestPos = chest.group.position.clone();
``` |

### 3.2 `src/render/BeaconAndPropsFactory.ts:645-650` — `fissureMat` `fog: false`

- **Current Code (`BeaconAndPropsFactory.ts:645-650`)**:
  ```ts
  const fissureMat = new THREE.MeshBasicMaterial({
    color: 0xff4d29,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  ```
- **Exact M3 Replacement (`lines 645-651`)**:
  ```ts
  const fissureMat = new THREE.MeshBasicMaterial({
    color: 0xff4d29,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    fog: false,
  });
  ```
  *(Prevents `FogExp2` on Stages 2–4 from washing out the crimson-orange ground fissure glow during `playBossEntranceSequence` at `CinematicDirector.ts:561`.)*

### 3.3 `src/audio/AudioManager.ts` (`294` Lines Post-M2) — Exact M2 vs M3 SFX Diff

#### A. Already Implemented in Post-M2 (`lines 201–293` — DO NOT Duplicate!)
- `lines 201–238`: `playBossSubExplosion`, `playClimaxKillBurst`, `playBeaconDamageAlarm`, `playDefeatShutdown`, `playBeaconBeamIgnite`
- `lines 240–252` *(Added in M2)*: `playMechanismActivate(kind: 'crystal_vein' | 'capacitor_pylon' | 'laser_gate')`
- `lines 254–259` *(Added in M2)*: `playTechUpgrade(level: number)`
- `lines 261–265` *(Added in M2)*: `playTechRespec()`
- `lines 267–273` *(Added in M2)*: `playAchievementClaim()`
- `lines 275–292`: `playLootChime(isCrystal)`, `playChestOpenFanfare()`

#### B. Remaining M3 Procedural SFX to Add (`src/audio/AudioManager.ts`)
1. **Cached Noise Buffer & Filtered Burst Helper (`insert field at line 10`, init in `unlock()` at `line 61`, helper after `tone()` at `line 100`)**:
   - `private noiseBuffer: AudioBuffer | null = null;`
   - Inside `unlock()` (`after line 60`, inside `if (!this.ctx)` block):
     ```ts
     const len = Math.floor(this.ctx.sampleRate * 0.4);
     this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
     const data = this.noiseBuffer.getChannelData(0);
     for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
     ```
   - `private noiseBurst(duration: number, freqStart: number, freqEnd: number, filterType: BiquadFilterType, volume: number, delay = 0): void` (connects `BufferSource -> BiquadFilter -> GainNode -> this.masterGain`).

2. **Exact 7 Remaining M3 SFX (+ T4 Branch Weapon Companions, `insert at line 274` before `playLootChime`)**:

| M3 SFX Key / Event | Exact Method Signature(s) in `AudioManager.ts` | Synthesis Recipe (routed via `this.masterGain` `0.42` + Compressor) |
|---|---|---|
| **`orbital_strike`** | `playTacticalArm(): void`<br>`playOrbitalLockOn(): void`<br>`playOrbitalStrike(): void` | • `Arm`: `tone(540, 820, 0.06, 'triangle', 0.16)` + `tone(1080, 1320, 0.05, 'sine', 0.12, 0.04)`<br>• `LockOn` (`0.55s`): `tone(420, 1280, 0.52, 'sine', 0.15)` + 3 lock pips `[0, 0.17, 0.34]` `tone(920+i*240, 960+i*240, 0.06, 'square', 0.12, d)`<br>• `Strike` (impact): `tone(195, 28, 0.54, 'sawtooth', 0.38)` + `tone(92, 26, 0.58, 'triangle', 0.36)` + `tone(1680, 280, 0.18, 'sine', 0.22)` + `noiseBurst(0.42, 1600, 180, 'bandpass', 0.26)` |
| **`emp_overdrive`** | `playEmpOverdrive(): void` | `tone(110, 840, 0.28, 'sine', 0.22)` + `tone(1480, 220, 0.16, 'sawtooth', 0.18, 0.04)` + 4-note overdrive chord `[523.25, 659.25, 783.99, 1046.5]` (`triangle`, `0.32s`, `vol 0.18`, stagger `0.045s`) |
| **`nano_repair`** | `playNanoRepair(): void` | Ascending 5-note harmonic matrix chime `[392, 493.88, 587.33, 783.99, 1046.5]` (`sine`, `0.36s`, `vol 0.18`, stagger `0.055s`) |
| **`flux_combo`** | `playFluxCombo(): void` | Rate-limited `('flux', 85)`: `tone(960, 175, 0.15, 'sawtooth', 0.22)` + `tone(1420, 580, 0.11, 'square', 0.13, 0.02)` |
| **`armor_shred`** | `playArmorShred(isCrit = false): void` | Rate-limited `(isCrit ? 'crit' : 'shred', 115)`: `tone(860, 210, 0.08, 'sawtooth', 0.16)` + (when `isCrit`: `tone(1440, 2160, 0.075, 'triangle', 0.18)`) |
| **`singularity_pull`** | `playSingularityPull(): void` | Rate-limited `('grav', 320)`: `tone(310, 62, 0.34, 'sine', 0.24)` + `tone(155, 44, 0.34, 'triangle', 0.2, 0.03)` |
| **`cluster_salvo`** | `playClusterSalvo(): void` | Rate-limited `('rkt', 68)` *(allows all 3 staggered `0.11s` rockets to sound!)*: `tone(260, 520, 0.085, 'triangle', 0.18)` + `noiseBurst(0.11, 2200, 900, 'highpass', 0.14)` |
| **T4-B Companions** | `playRailgunShot(): void`<br>`playTeslaArc(): void`<br>`playShieldBreak(): void` | • `Railgun` (`'rail', 150`): `tone(1650, 180, 0.14, 'sawtooth', 0.24)` + `tone(105, 38, 0.18, 'triangle', 0.26)`<br>• `TeslaArc` (`'tesla', 90`): `tone(1580, 420, 0.085, 'square', 0.13)` + `tone(880, 1320, 0.07, 'sine', 0.12)`<br>• `ShieldBreak` (`'shbrk', 120`): `tone(1780, 290, 0.18, 'sawtooth', 0.2)` + `tone(1180, 460, 0.14, 'triangle', 0.16, 0.03)` |

*(Adding thin method aliases `playOrbitalStrikeImpact = () => this.playOrbitalStrike()`, `playNanoBeaconRepair = () => this.playNanoRepair()`, `playFluxDetonation = () => this.playFluxCombo()`, `playWeakPointCrit = () => this.playArmorShred(true)`, `playClusterRocketLaunch = () => this.playClusterSalvo()` guarantees zero naming mismatch between Track 1 and Track 2 workers!)*
