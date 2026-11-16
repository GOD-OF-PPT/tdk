# M1 Deliverable 2 Implementation Handoff — `src/types.ts` & `src/render/TowerFactory.ts`

- **From**: `teamwork_preview_explorer_m1_r1_2` (Tower 3D Geometry & Rig Contracts Architect)
- **To**: `sub_orch_m1` (`a12b24b0fbb55cf075660090fd74269e`) & M1 Implementation Worker
- **Companion Deep-Dive**: [`analysis.md`](file:///home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_explorer_m1_r1_2/analysis.md)

---

## 1. Executive Summary (Structured Architecture Contract)

### Observation
- [`src/render/EnemyFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts) has **zero M1 defects** (all cones closed, Layer-1 overlays isolated, Boss `weakPointCore` already exposed with dedicated per-instance `MeshStandardMaterial`) and requires **NO modifications**.
- [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts) and [`src/render/TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts) require 5 tightly scoped, 100% backward-compatible enhancements:
  1. Add `FlapHingeAxis`, `HingedFlapUserData`, and `TowerRig.idleCore?: THREE.Object3D` in [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L119-L141).
  2. Populate `rig.idleCore` (with `userData.restPos` & `userData.restScale`) for all 3 towers (`coreGem`, `tierCore`, `coreMesh`).
  3. Add the 3 missing Tier-3 3D procedural mechanical sub-assemblies matching `gameConfig.ts` `partHeadline` inside `t3Turret` with `tagArcFlyPart(...)` and zero T1–T4 bounding-box collisions:
     - **Autocannon T3 (`顶部开合散热鳍片`)**: `topRadiatorGrp` on rear-top cowl (`weaponPitch` `(0, 0.325, -0.42)` $\implies$ `turretYaw` `(0, 0.685, -0.37)`) with `#FF9F1C` thermal core + 2 hinged louver pivots pushed to `rig.hingedFlaps`.
     - **Mortar T3 (`光学测距摇臂`)**: `rangefinderArm` mounted on left T3 pod shoulder (`(-0.80, 0.80, -0.06)` in `t3Turret`) with swivel joint, angled boom, beveled cream sensor pod, tier brow trim, and glowing `#22D3EE` optical lens (asymmetrically balancing T4's right-side `elevGear`).
     - **Magnetic T3 (`三向磁通增幅柱`)**: `3 × fluxPylon` at $60^\circ, 180^\circ, 300^\circ$, $r = 0.85\text{m}$ with lower bridge struts bolted into `pedCore`, beveled cream base shoes, deep-blue vertical rods, dual `#C084FC` / `tierTrimMat` induction coil rings, and octahedron tips (clearing T2 `shield` $r \le 0.61\text{m}$, T4 `driveGear` $r \le 0.58\text{m}$, and spinning T3 `innerRingGrp` sphere $R = 0.73\text{m}$).
  4. Populate exact outward-opening per-flap metadata (`hingeAxis`, `restAngle`, `openAngle`, `minTier`) on every entry in `rig.hingedFlaps` AND parent Magnetic Tower's upper emitter (`outerRingGrp`, `coreMesh`, `muzzle`) under `weaponPitch` at `(0, 1.15, 0)`.
  5. Export `setTowerTierVisibility(rig, tier)` and `applyTowerTierVisuals(rig, tier, options?: { visibilityOnly?: boolean })`.

### Logic Chain
1. **3D Coordinate & Matrix Proofs Prevent 3 Subtle Bugs**:
   - **Autocannon `t3Turret` Parent Offset**: On Autocannon, `t3Turret` is parented to `weaponPitch` (`(0, 0.36, 0.05)` in `turretYaw`), NOT `turretYaw`. Placing `topRadiatorGrp` at `weaponPitch` `(0, 0.325, -0.42)` lands at `turretYaw` `(0, 0.685, -0.37)`, clearing both T4 `gear` (`z <= -0.475`) and T4 `browCrest` (`z >= -0.19`) even during `+0.22 rad` Boss EMP stun.
   - **Right-Handed Outward Hinge Signs**:
     - Mortar T4 rear doors (`sx ∈ {-1, +1}`): outward swing into `-Z` requires **`openAngle = -sx * 0.58`** (`+0.58` Left, `-0.58` Right — matching `GameEngine.ts:1154`; `+sx` would clip inward through `tierCore`!).
     - Magnetic T4 radial petals (`petalPivot.rotation.y = -pa`, local `+X` = radially outward, `+Y` = up): outward flare around `+Z` requires **`openAngle = -0.48`** (negative! `+0.48` folds petals inward!).
   - **Magnetic `weaponPitch` Origin at `(0, 1.15, 0)`**: Setting `weaponPitch.position.set(0, 1.15, 0)` and child `outerRingGrp`/`coreMesh`/`muzzle` at `(0, 0, 0)` keeps rest world positions 100% unchanged, makes Stage 2A Beat 3 (`z: -0.26 -> 0`) snap the ring/core into the 3 gantry clamps, and ensures Boss EMP stun (`weaponPitch.rotation.x = 0.22`) tilts the ring in-place around `(0, 1.15, 0)` rather than swinging it on a `1.15m` lever arm.

### Caveats
1. **`tsconfig.json` Strict Flags**: `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Use `import type` for type imports and plain union types/interfaces (no `enum`).
2. **`tagArcFlyPart` Call Ordering**: Always set `.position` (and `.rotation`) **before** calling `tagArcFlyPart(obj, ox, oy, oz)`.
3. **Downstream M2 Notes (Do NOT edit M2 files in M1; relay via `sub_orch_m1` to M2)**:
   - In `CinematicDirector.ts:421-423` (and any M2 idle fin breathing in `GameEngine.ts`), read `const axis = (flap.userData.hingeAxis as 'x' | 'y' | 'z') ?? 'x'; const openAngle = (flap.userData.openAngle as number) ?? -0.55; const restAngle = (flap.userData.restAngle as number) ?? 0;` — `openAngle` is already properly signed for outward motion!
   - In `GameEngine.ts:1063`, add `else { rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8); }` so Magnetic's `weaponPitch` recovers smoothly to `0` after Boss EMP stun expires.
   - In `GameEngine.ts` `updateTowers()`, apply `rig.idleCore` scale breathing to all 3 towers, and guard generic `rig.idleCore.rotation.y += ...` with `if (tower.type !== 'magnetic')` so Magnetic's existing `-2.5 / -14 rad/s` spin is unattenuated.

### Conclusion
- Apply the two exact file edits below (`src/types.ts` and `src/render/TowerFactory.ts`); leave `src/render/EnemyFactory.ts` untouched.

### Verification Method
- Run `npx tsc --noEmit` and `npm run build` (must exit `0` with zero warnings/errors).
- Verify via browser/Playwright runtime evaluation on `createTowerRig` across `'autocannon' | 'mortar' | 'magnetic'`:
  - `rig.idleCore` is non-null `OctahedronGeometry` mesh (`children.length === 0`).
  - `getTierPartObjects(rig, 3).length` equals `3` (`autocannon`), `3` (`mortar`), `4` (`magnetic`).
  - `rig.hingedFlaps.length` equals `4` (`autocannon`: 2 T3 + 2 T4), `2` (`mortar`: 2 T4), `4` (`magnetic`: 4 T4), each having valid `userData.{hingeAxis, restAngle, openAngle, minTier}`.
  - On `'magnetic'`, `rig.weaponPitch.children.length === 3` and `rig.magRingOuter` world Y relative to `rig.root` equals `1.49` (`0.34 + 1.15`).
  - `setTowerTierVisibility(rig, 3)` sets `rig.tierGroups.t3.visible === true` without mutating `rig.coreMaterial.color`.

---

## 2. Exact File Edit Blueprints

### File 1: [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L119-L141)

Replace lines `119–141` (`export interface TowerRig { ... }`) with:

```ts
export type FlapHingeAxis = 'x' | 'y' | 'z';

export interface HingedFlapUserData {
  hingeAxis: FlapHingeAxis;
  restAngle: number;
  openAngle: number;
  minTier: TowerTier;
}

export interface TowerRig {
  root: THREE.Group;
  baseGroup: THREE.Group;
  turretYaw: THREE.Group;
  weaponPitch: THREE.Group;
  barrelL: THREE.Object3D | null;
  barrelR: THREE.Object3D | null;
  mortarTube: THREE.Object3D | null;
  magInnerCore: THREE.Object3D | null;
  magRingOuter: THREE.Object3D | null;
  magRingInner: THREE.Object3D | null;
  magClamps: THREE.Object3D[];
  specialGear: THREE.Object3D | null;
  idleCore?: THREE.Object3D;
  hingedFlaps: THREE.Object3D[];
  muzzlePoints: THREE.Object3D[];
  tierGroups: {
    t2: THREE.Group;
    t3: THREE.Group;
    t4: THREE.Group;
  };
  tierAccentMaterials: THREE.MeshToonMaterial[];
  coreMaterial: THREE.MeshStandardMaterial;
}
```

---

### File 2: [`src/render/TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts)

#### Chunk 2.1 — Type Import & `registerHingedFlap` / `tagIdleCore` Helpers ([`L4-L62`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L4-L62))
Update line `4`:
```ts
import type { FlapHingeAxis, TowerRig, TowerTier, TowerType } from '../types';
```
And right after `tagArcFlyPart` (`L61`), add:
```ts
function registerHingedFlap(
  hingedFlaps: THREE.Object3D[],
  flap: THREE.Object3D,
  hingeAxis: FlapHingeAxis,
  openAngle: number,
  minTier: TowerTier
): void {
  flap.userData.hingeAxis = hingeAxis;
  flap.userData.restAngle = flap.rotation[hingeAxis];
  flap.userData.openAngle = openAngle;
  flap.userData.minTier = minTier;
  hingedFlaps.push(flap);
}

function tagIdleCore(core: THREE.Object3D): THREE.Object3D {
  core.userData.restPos = core.position.clone();
  core.userData.restScale = core.scale.clone();
  return core;
}
```

#### Chunk 2.2 — `idleCore` Local Variable ([`L184-L187`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L184-L187))
Add `let idleCore: THREE.Object3D | undefined;`:
```ts
  let specialGear: THREE.Object3D | null = null;
  let idleCore: THREE.Object3D | undefined;
  const hingedFlaps: THREE.Object3D[] = [];
  const muzzlePoints: THREE.Object3D[] = [];
```

#### Chunk 2.3 — Autocannon `idleCore`, T3 Top Hinged Radiator Louvers (`顶部开合散热鳍片`), and T4 Flap Metadata ([`L213-L215`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L213-L215), [`L286-L306`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L286-L306), [`L334-L342`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L334-L342))
1. At `L213-215`:
```ts
    const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMaterial);
    coreGem.position.set(0, 0.45, -0.5);
    turretYaw.add(coreGem);
    idleCore = tagIdleCore(coreGem);
```
2. After the `drumGrp` loop (`L305`), add the T3 Hinged Top Radiator Louver Bank inside `t3Turret`:
```ts
    // T3 Secondary Sub-Part: Hinged top radiator heat-sink louvers (顶部开合散热鳍片)
    const topRadiatorGrp = new THREE.Group();
    topRadiatorGrp.position.set(0, 0.325, -0.42);

    const manifold = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 0.07, 0.17, 2, 0.02),
      deepBlueMat
    );
    manifold.position.set(0, 0.025, 0);
    manifold.castShadow = true;
    topRadiatorGrp.add(manifold);

    const thermalCore = new THREE.Mesh(
      new RoundedBoxGeometry(0.54, 0.035, 0.11, 2, 0.012),
      weaponAccentMat
    );
    thermalCore.position.set(0, 0.052, 0);
    topRadiatorGrp.add(thermalCore);

    for (const sx of [-1, 1]) {
      const trimCollar = new THREE.Mesh(
        new RoundedBoxGeometry(0.055, 0.09, 0.19, 2, 0.018),
        tierTrimMat
      );
      trimCollar.position.set(sx * 0.35, 0.035, 0);
      topRadiatorGrp.add(trimCollar);

      const louverPivot = new THREE.Group();
      louverPivot.position.set(sx * 0.16, 0.062, -0.065);
      louverPivot.rotation.x = -0.08;

      const primarySlat = new THREE.Mesh(
        new RoundedBoxGeometry(0.27, 0.036, 0.13, 2, 0.012),
        creamMat
      );
      primarySlat.position.set(0, 0.014, 0.065);
      primarySlat.castShadow = true;
      louverPivot.add(primarySlat);

      const accentSlat = new THREE.Mesh(
        new RoundedBoxGeometry(0.23, 0.026, 0.07, 2, 0.01),
        hazardMat
      );
      accentSlat.position.set(0, 0.034, 0.045);
      louverPivot.add(accentSlat);

      topRadiatorGrp.add(louverPivot);
      registerHingedFlap(hingedFlaps, louverPivot, 'x', -0.58, 3);
    }

    tagArcFlyPart(topRadiatorGrp, 0, 1.75, -0.55);
    t3Turret.add(topRadiatorGrp);
```
3. At `L341`, replace `hingedFlaps.push(flapPivot);` with:
```ts
      registerHingedFlap(hingedFlaps, flapPivot, 'x', -0.55, 4);
```

#### Chunk 2.4 — Mortar `idleCore`, T3 Articulated Side Optical Rangefinder Arm (`光学测距摇臂`), and T4 Door Metadata ([`L393-L395`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L393-L395), [`L438-L453`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L438-L453), [`L468-L477`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L468-L477))
1. At `L393-395`:
```ts
    const tierCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMaterial);
    tierCore.position.set(0, 0.58, -0.48);
    turretYaw.add(tierCore);
    idleCore = tagIdleCore(tierCore);
```
2. After the Mortar T3 `pod` loop (`L453`), add the Articulated Side Optical Rangefinder Arm:
```ts
    // T3 Secondary Sub-Part: Articulated side optical rangefinder arm (光学测距摇臂)
    const rangefinderArm = new THREE.Group();
    rangefinderArm.position.set(-0.8, 0.8, -0.06);

    const mountJoint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.115, 0.09, 10),
      deepBlueMat
    );
    mountJoint.position.set(0, 0.035, 0);
    mountJoint.castShadow = true;
    rangefinderArm.add(mountJoint);

    const pivotPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.15, 10),
      rivetMat
    );
    pivotPin.rotation.z = Math.PI / 2;
    pivotPin.position.set(0, 0.075, 0.01);
    rangefinderArm.add(pivotPin);

    const boomArm = new THREE.Mesh(
      new RoundedBoxGeometry(0.085, 0.28, 0.1, 2, 0.024),
      darkJointMat
    );
    boomArm.position.set(-0.04, 0.19, 0.08);
    boomArm.rotation.set(0.4, 0, 0.14);
    boomArm.castShadow = true;
    rangefinderArm.add(boomArm);

    const elbowCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.11, 10),
      tierTrimMat
    );
    elbowCap.rotation.z = Math.PI / 2;
    elbowCap.position.set(-0.06, 0.31, 0.16);
    rangefinderArm.add(elbowCap);

    const sensorHead = new THREE.Group();
    sensorHead.position.set(-0.06, 0.34, 0.19);
    sensorHead.rotation.x = -0.18;

    const podBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.21, 0.17, 0.27, 2, 0.04),
      creamMat
    );
    podBody.castShadow = true;
    sensorHead.add(podBody);

    const visorTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.23, 0.048, 0.21, 2, 0.015),
      tierTrimMat
    );
    visorTrim.position.set(0, 0.095, 0.02);
    sensorHead.add(visorTrim);

    const lensBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.082, 0.08, 12),
      deepBlueMat
    );
    lensBarrel.rotation.x = Math.PI / 2;
    lensBarrel.position.set(-0.02, -0.01, 0.145);
    sensorHead.add(lensBarrel);

    const opticLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.045, 12),
      weaponAccentMat
    );
    opticLens.rotation.x = Math.PI / 2;
    opticLens.position.set(-0.02, -0.01, 0.17);
    sensorHead.add(opticLens);

    const laserNode = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.05, 10),
      coreMaterial
    );
    laserNode.rotation.x = Math.PI / 2;
    laserNode.position.set(0.058, 0.032, 0.14);
    sensorHead.add(laserNode);

    rangefinderArm.add(sensorHead);
    tagArcFlyPart(rangefinderArm, -1.65, 1.95, 0.45);
    t3Turret.add(rangefinderArm);
```
3. At `L476`, replace `hingedFlaps.push(doorHinge);` with:
```ts
      registerHingedFlap(hingedFlaps, doorHinge, 'y', -sx * 0.58, 4);
```

#### Chunk 2.5 — Magnetic `weaponPitch` Parenting, `idleCore`, T3 3-Way Flux Amplifier Pylons (`三向磁通增幅柱`), and T4 Petal Metadata ([`L486-L595`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L486-L595))
1. At `L487-491`, set `weaponPitch.position.set(0, 1.15, 0)`:
```ts
    turretYaw.position.y = 0.34;
    weaponPitch.position.set(0, 1.15, 0);
    turretYaw.add(weaponPitch);
    turretYaw.add(t2Turret);
    turretYaw.add(t3Turret);
    turretYaw.add(t4Turret);
```
2. At `L525-553`, parent `outerRingGrp`, `coreMesh`, and `muzzle` inside `weaponPitch` at local `(0, 0, 0)` and assign `idleCore`:
```ts
    // Primary rotating purple magnetic ring (mounted inside weaponPitch at y = 1.15!)
    const outerRingGrp = new THREE.Group();
    const torus1 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.065, 10, 28), weaponAccentMat);
    torus1.rotation.x = Math.PI / 2;
    torus1.castShadow = true;
    outerRingGrp.add(torus1);

    for (let n = 0; n < 4; n++) {
      const a = (n * Math.PI) / 2;
      const node = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.14, 2, 0.03), tierTrimMat);
      node.position.set(Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46);
      outerRingGrp.add(node);
    }
    weaponPitch.add(outerRingGrp);
    magRingOuter = outerRingGrp;

    // Faceted tier-colored inner core (rotates rapidly before each magnetic pulse!)
    const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), coreMaterial);
    coreMesh.castShadow = true;
    weaponPitch.add(coreMesh);
    magInnerCore = coreMesh;
    idleCore = tagIdleCore(coreMesh);

    const muzzle = new THREE.Object3D();
    weaponPitch.add(muzzle);
    muzzlePoints.push(muzzle);
```
3. After `magRingInner = innerRingGrp;` (`L573`), add the 3 Radial Magnetic Flux Amplifier Pylons (`60°, 180°, 300°`, $r = 0.85\text{m}$):
```ts
    // T3 Secondary Sub-Part: 3-Way radial magnetic flux amplifier pylons (三向磁通增幅柱)
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.PI / 3;
      const fluxPylon = new THREE.Group();
      fluxPylon.position.set(Math.cos(ang) * 0.85, 0, Math.sin(ang) * 0.85);
      fluxPylon.rotation.y = -ang + Math.PI / 2;

      const bridgeStrut = new THREE.Mesh(
        new RoundedBoxGeometry(0.15, 0.12, 0.42, 2, 0.03),
        deepBlueMat
      );
      bridgeStrut.position.set(0, 0.12, -0.16);
      bridgeStrut.castShadow = true;
      fluxPylon.add(bridgeStrut);

      const baseShoe = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.18, 0.22, 2, 0.04),
        creamMat
      );
      baseShoe.position.set(0, 0.2, 0);
      baseShoe.castShadow = true;
      fluxPylon.add(baseShoe);

      const coreRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.08, 0.86, 10),
        deepBlueMat
      );
      coreRod.position.set(0, 0.68, 0);
      coreRod.castShadow = true;
      fluxPylon.add(coreRod);

      const coilLower = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.028, 8, 18),
        weaponAccentMat
      );
      coilLower.rotation.x = Math.PI / 2;
      coilLower.position.set(0, 0.5, 0);
      fluxPylon.add(coilLower);

      const coilUpper = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.026, 8, 18),
        tierTrimMat
      );
      coilUpper.rotation.x = Math.PI / 2;
      coilUpper.position.set(0, 0.78, 0);
      fluxPylon.add(coilUpper);

      const finialCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.085, 0.11, 8),
        creamMat
      );
      finialCollar.position.set(0, 1.13, 0);
      fluxPylon.add(finialCollar);

      const fluxTip = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.065, 0),
        weaponAccentMat
      );
      fluxTip.position.set(0, 1.22, 0);
      fluxPylon.add(fluxTip);

      tagArcFlyPart(fluxPylon, Math.cos(ang) * 1.65, 1.75, Math.sin(ang) * 1.65);
      t3Turret.add(fluxPylon);
    }
```
4. At `L592`, replace `hingedFlaps.push(petalPivot);` with:
```ts
      registerHingedFlap(hingedFlaps, petalPivot, 'z', -0.48, 4);
```

#### Chunk 2.6 — `rig` Return Object & `setTowerTierVisibility` / `applyTowerTierVisuals` ([`L605-L654`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L605-L654))
Include `idleCore` in `const rig: TowerRig = { ... }` (`L617`) and replace `applyTowerTierVisuals` (`L636-654`) with:
```ts
export function setTowerTierVisibility(rig: TowerRig, tier: TowerTier): void {
  const t2Subs = (rig.tierGroups.t2.userData.subGroups as THREE.Group[]) ?? [];
  const showT2 = tier >= 2;
  rig.tierGroups.t2.visible = showT2;
  for (const g of t2Subs) {
    g.visible = showT2;
  }
  rig.tierGroups.t3.visible = tier >= 3;
  rig.tierGroups.t4.visible = tier >= 4;
}

export function applyTowerTierVisuals(
  rig: TowerRig,
  tier: TowerTier,
  options?: { visibilityOnly?: boolean }
): void {
  setTowerTierVisibility(rig, tier);
  if (options?.visibilityOnly) {
    return;
  }

  const meta = TIER_META[tier];

  // Update tier color ONLY on trim, nameplate, core & rim light (never dyeing main armor!)
  rig.coreMaterial.color.setHex(meta.color);
  rig.coreMaterial.emissive.setHex(meta.color);

  // Index 0 is creamMat (update rim light only!), index 1 is tierTrimMat (update color + emissive + rim)
  setMaterialRimColor(rig.tierAccentMaterials[0], meta.rimColor, tier === 4 ? 0.48 : 0.3);
  const trimMat = rig.tierAccentMaterials[1];
  trimMat.color.setHex(meta.color);
  trimMat.emissive.setHex(meta.color);
  setMaterialRimColor(trimMat, meta.rimColor, 0.45);
}
```
