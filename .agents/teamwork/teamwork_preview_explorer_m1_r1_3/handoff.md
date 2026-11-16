# Milestone M1 Implementation Handoff: Return Beacon 3D Dish & VFX Lifecycle (`teamwork_preview_explorer_m1_r1_3`)

**Target Worker**: Milestone `M1` Worker (`render-3d-outline`)  
**Files Covered in This Handoff (M1 Exclusive Ownership)**:
1. `/home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts` (`lines 228-241` inside `buildReturnBeacon()`)
2. `/home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts` (`lines 76-80, 291-314, 490-507, 549-632`, plus new `spawnChestOpenCelebration` & `dispose`)

---

## 1. Observation

1. **`src/render/BeaconAndPropsFactory.ts:228-241` (`Defect D1`)**:
   - `dishGroup` floats at `(0, 2.58, 0)` with a `0.825m` empty air gap above `mast` (`top y = 1.755`) and uses an open single-sided `ConeGeometry(0.58, 0.32, 12, 1, true)` (`FrontSide`) tilted `Math.PI * 0.82`, causing backface-culling disappearance and a detached floating `needle` in gameplay and Stage 5 (`08_stage5_victory_beacon_and_3d_chest.png`).
   - All callers (`GameEngine.ts:349-350, 369-370, 744-746, 994, 1334, 1610` and `CinematicDirector.ts:90-142, 608-728`) expect `ReturnBeaconRig` (`{ group, dishGroup, coreMesh, statusLampMats, signalFins, skyBeam }`) unchanged, with `GameEngine.ts:744` rotating `dishGroup.rotation.y += dt * 0.65`.
2. **`src/fx/VfxManager.ts:253-289` (`Defect D7.2`)**:
   - `spawnClimaxBurst` spawns a tall (`5.5 * scale`) `AdditiveBlending` cylinder in `vfxScene` (Pass 4), which bleaches the open chest, 3D Gold Coins, and 3D Energy Crystals when called at Stage 5B reward claim (`09_stage5_3d_chest_open_loot_fountain.png`).
   - Per Contract 2 (`orchestrator_r1/plan.md`), `VfxManager` must keep `spawnClimaxBurst` 100% unchanged for existing combat/cinematic callers and export `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` with expanding gold/cyan ground shockwave rings + outward celebratory sparkles and **zero** vertical additive pillar.
3. **`src/fx/VfxManager.ts` & `BeaconAndPropsFactory.ts:88-137` GPU Resource Disposal**:
   - `mortarShells` (`lines 139-160, 499, 608`), `debris3D` (`lines 295-296, 554, 624`), and `pickups3D` (`lines 377, 592, 627`) currently leak geometries and/or materials on expiry and `clearAll()`.
   - `THREE.Sprite` (`mortarShells` `halo`) shares a global Three.js singleton `Sprite.geometry` (`halo.geometry` MUST NEVER be disposed!), while `create3DGoldCoinMesh` / `create3DEnergyCrystalMesh` share `rimMat` (2 meshes) and `gemMat` (3 meshes) intra-group (requiring `Set`-deduplicated disposal).

---

## 2. Logic Chain & Concrete Code Designs

### 2.1 Deliverable 1: Drop-In Replacement for `BeaconAndPropsFactory.ts:228-241`

Replace lines `228-241` of `/home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts` (inside `buildReturnBeacon()`, keeping `creamMat`, `deepBlueMat`, `hazardMat`, `mast`, `coreMesh`, `signalFins`, and `skyBeam` intact):

```ts
  const darkReflectorMat = makeToonMaterial(PALETTE.DEEP_BLUE_DARK, { metallicStep: true });

  // Upper mast support collar & recessed energy-core socket lip (bridges mast top y = 1.755 cleanly)
  const upperMastCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.57, 0.14, 8),
    deepBlueMat
  );
  upperMastCollar.position.y = 1.7;
  upperMastCollar.castShadow = true;
  group.add(upperMastCollar);

  const coreSocketRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.048, 8, 16),
    hazardMat
  );
  coreSocketRing.rotation.x = Math.PI / 2;
  coreSocketRing.position.y = 1.76;
  group.add(coreSocketRing);

  // Stationary 3-Strut Structural Gantry Cage in the 60°/180°/300° inter-fin bays:
  // Clears rotating octahedral coreMesh (r <= 0.38m) by +14.25cm and stationary signalFins by +35.5cm!
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 3;
    const legGroup = new THREE.Group();
    legGroup.rotation.y = -a;

    const lowerStrut = new THREE.Mesh(
      new RoundedBoxGeometry(0.1, 0.38, 0.12, 2, 0.025),
      deepBlueMat
    );
    lowerStrut.position.set(0.55, 1.87, 0);
    lowerStrut.rotation.z = -0.286;
    lowerStrut.castShadow = true;
    legGroup.add(lowerStrut);

    const midKnuckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.13, 0.15, 2, 0.025),
      creamMat
    );
    midKnuckle.position.set(0.6, 2.04, 0);
    midKnuckle.castShadow = true;
    legGroup.add(midKnuckle);

    const knuckleStripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.04, 0.08, 0.16, 2, 0.01),
      hazardMat
    );
    knuckleStripe.position.set(0.66, 2.04, 0);
    legGroup.add(knuckleStripe);

    const upperStrut = new THREE.Mesh(
      new RoundedBoxGeometry(0.1, 0.54, 0.12, 2, 0.025),
      deepBlueMat
    );
    upperStrut.position.set(0.485, 2.27, 0);
    upperStrut.rotation.z = 0.464;
    upperStrut.castShadow = true;
    legGroup.add(upperStrut);

    const topLug = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.12, 0.15, 2, 0.025),
      deepBlueMat
    );
    topLug.position.set(0.37, 2.5, 0);
    legGroup.add(topLug);

    group.add(legGroup);
  }

  // Stationary Open-Bore Azimuth Bearing Ring at y = 2.50 (inner bore r = 0.29m > skyBeam r = 0.25m!)
  const azimuthRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.06, 10, 16),
    deepBlueMat
  );
  azimuthRing.rotation.x = Math.PI / 2;
  azimuthRing.position.y = 2.5;
  azimuthRing.castShadow = true;
  group.add(azimuthRing);

  // Rotating Upper Telemetry Dish Assembly (100% closed manifold 3D solids, zero openEnded cones!)
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 2.58, 0);

  // Interlocked rotating slew ring & 4 bearing clamps riding on azimuthRing
  const slewRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.052, 10, 16),
    creamMat
  );
  slewRing.rotation.x = Math.PI / 2;
  slewRing.position.y = -0.01;
  slewRing.castShadow = true;
  dishGroup.add(slewRing);

  for (let c = 0; c < 4; c++) {
    const ang = (c * Math.PI) / 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.13, 0.12, 2, 0.02),
      deepBlueMat
    );
    clamp.position.set(Math.cos(ang) * 0.37, -0.04, Math.sin(ang) * 0.37);
    clamp.rotation.y = -ang;
    dishGroup.add(clamp);
  }

  // Cantilevered twin-cheek elevation gimbal yoke (+Z side, keeping central skyBeam bore unobstructed!)
  const gimbalBoom = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.12, 0.28, 2, 0.025),
    deepBlueMat
  );
  gimbalBoom.position.set(0, 0.06, 0.46);
  gimbalBoom.rotation.x = -0.48;
  gimbalBoom.castShadow = true;
  dishGroup.add(gimbalBoom);

  for (const sx of [-0.135, 0.135]) {
    const cheek = new THREE.Mesh(
      new RoundedBoxGeometry(0.075, 0.28, 0.15, 2, 0.02),
      deepBlueMat
    );
    cheek.position.set(sx, 0.22, 0.57);
    cheek.rotation.x = -0.18;
    cheek.castShadow = true;
    dishGroup.add(cheek);
  }

  const trunnionPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.36, 10),
    hazardMat
  );
  trunnionPin.rotation.z = Math.PI / 2;
  trunnionPin.position.set(0, 0.3, 0.59);
  dishGroup.add(trunnionPin);

  // Closed, Solid Beveled 3D Telemetry Dish aimed ~45° skyward
  const dishAssembly = new THREE.Group();
  dishAssembly.position.set(0, 0.34, 0.6);
  dishAssembly.rotation.x = 0.78;

  const rearBoss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.14, 0.11, 10),
    deepBlueMat
  );
  rearBoss.position.y = -0.07;
  dishAssembly.add(rearBoss);

  const dishShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.18, 0.14, 16),
    creamMat
  );
  dishShell.position.y = 0.02;
  dishShell.castShadow = true;
  dishAssembly.add(dishShell);

  const dishRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.375, 0.042, 10, 16),
    creamMat
  );
  dishRim.rotation.x = Math.PI / 2;
  dishRim.position.y = 0.085;
  dishRim.castShadow = true;
  dishAssembly.add(dishRim);

  for (let k = 0; k < 3; k++) {
    const ka = (k * Math.PI * 2) / 3;
    const rimClamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.08, 0.065, 0.1, 2, 0.015),
      hazardMat
    );
    rimClamp.position.set(Math.cos(ka) * 0.385, 0.088, Math.sin(ka) * 0.385);
    rimClamp.rotation.y = -ka;
    dishAssembly.add(rimClamp);
  }

  const innerReflector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.345, 0.16, 0.05, 16),
    darkReflectorMat
  );
  innerReflector.position.y = 0.072;
  dishAssembly.add(innerReflector);

  const feedPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.11, 0.06, 10),
    deepBlueMat
  );
  feedPedestal.position.y = 0.115;
  dishAssembly.add(feedPedestal);

  const feedMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.042, 0.26, 8),
    creamMat
  );
  feedMast.position.y = 0.25;
  dishAssembly.add(feedMast);

  for (let s = 0; s < 3; s++) {
    const sa = (s * Math.PI * 2) / 3 + Math.PI / 3;
    const strutPivot = new THREE.Group();
    strutPivot.rotation.y = -sa;
    const fStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.33, 6),
      deepBlueMat
    );
    fStrut.position.set(0.15, 0.23, 0);
    fStrut.rotation.z = 0.66;
    strutPivot.add(fStrut);
    dishAssembly.add(strutPivot);
  }

  const emitterHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.042, 0.08, 10),
    hazardMat
  );
  emitterHorn.position.y = 0.38;
  dishAssembly.add(emitterHorn);

  const emitterLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    })
  );
  emitterLens.position.y = 0.425;
  dishAssembly.add(emitterLens);

  dishGroup.add(dishAssembly);

  // Opposite -Z Armored Telemetry Transceiver Counterweight & Whip Stubs (balances 360° rotation!)
  const transceiverPod = new THREE.Mesh(
    new RoundedBoxGeometry(0.28, 0.18, 0.22, 2, 0.03),
    deepBlueMat
  );
  transceiverPod.position.set(0, 0.04, -0.4);
  transceiverPod.castShadow = true;
  dishGroup.add(transceiverPod);

  const podStripe = new THREE.Mesh(
    new RoundedBoxGeometry(0.22, 0.05, 0.24, 2, 0.01),
    hazardMat
  );
  podStripe.position.set(0, 0.04, -0.4);
  dishGroup.add(podStripe);

  for (const wx of [-0.08, 0.08]) {
    const whip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.026, 0.24, 6),
      creamMat
    );
    whip.position.set(wx, 0.22, -0.42);
    dishGroup.add(whip);

    const whipTip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), hazardMat);
    whipTip.position.set(wx, 0.34, -0.42);
    dishGroup.add(whipTip);
  }

  group.add(dishGroup);
```

---

### 2.2 Deliverable 4a & 4b: Additions & Lifecycle Fixes in `src/fx/VfxManager.ts`

1. **Shared `debris3D` Materials (`VfxManager.ts:76-80` & `294-301`)**:
   - Add two shared material fields right under `private debrisGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);`:
     ```ts
     private rustDebrisMat = makeToonMaterial(0x9b392d);
     private greyDebrisMat = makeToonMaterial(0x353844, { metallicStep: true });
     ```
   - In `spawnArmorBreakDebris(pos: THREE.Vector3, count = 5)` (`lines 294-301`), remove the two local `makeToonMaterial` allocations and reference `this.rustDebrisMat` and `this.greyDebrisMat`:
     ```ts
     public spawnArmorBreakDebris(pos: THREE.Vector3, count = 5): void {
       for (let i = 0; i < count; i++) {
         const mesh = new THREE.Mesh(this.debrisGeo, i % 2 === 0 ? this.rustDebrisMat : this.greyDebrisMat);
     ```

2. **New Non-Bleaching `spawnChestOpenCelebration(worldPos: THREE.Vector3)` Method (`VfxManager.ts`, right below `spawnClimaxBurst` at `line 290` — leave `spawnClimaxBurst` 100% unchanged!)**:
   ```ts
   /**
    * Celebratory non-bleaching VFX for Stage 5B Supply Chest Reward Claim:
    * Expanding warm-gold & crystal-cyan ground shockwaves + radial outward rim sparkles,
    * with ZERO vertical AdditiveBlending pillar so 3D chest, coins & crystals stay crisp!
    */
   public spawnChestOpenCelebration(worldPos: THREE.Vector3): void {
     this.spawnGroundRing(new THREE.Vector3(worldPos.x, 0.085, worldPos.z), 0xfbbf24, 0.65, 5.2, 0.56);
     this.spawnGroundRing(new THREE.Vector3(worldPos.x, 0.092, worldPos.z), 0x22d3ee, 0.45, 3.8, 0.44);
     this.spawnGroundRing(new THREE.Vector3(worldPos.x, 0.098, worldPos.z), 0xfde68a, 0.35, 2.5, 0.3);

     const palette = [0xfbbf24, 0xfde68a, 0x22d3ee] as const;
     const count = 18;
     for (let i = 0; i < count; i++) {
       const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
       const rimRadius = 0.52;
       const startPos = new THREE.Vector3(
         worldPos.x + Math.cos(a) * rimRadius,
         worldPos.y + 0.68,
         worldPos.z + Math.sin(a) * rimRadius
       );
       const spd = 2.6 + Math.random() * 1.9;
       const vel = new THREE.Vector3(
         Math.cos(a) * spd,
         2.8 + Math.random() * 1.8,
         Math.sin(a) * spd
       );
       this.spawnSpark(startPos, vel, palette[i % palette.length], 0.52, 9.2);
     }

     // Crisp metallic sparks right at the front lock clasp pop-off point
     this.spawnHitSparks(new THREE.Vector3(worldPos.x, worldPos.y + 0.68, worldPos.z + 0.48), true);
   }
   ```

3. **Safe Transient Disposal Helpers & Updated `update()` / `clearAll()` / `dispose()` (`VfxManager.ts:499-504, 591-632`)**:
   - Add private helpers on `VfxManager`:
     ```ts
     private disposeMortarShell(s: MortarShell): void {
       this.vfxScene.remove(s.group);
       for (const child of s.group.children) {
         if (child instanceof THREE.Sprite) {
           // NEVER dispose child.geometry on THREE.Sprite (Three.js global singleton geometry!)
           // and NEVER dispose child.material.map (shared getToonTextures().softGlow!)
           child.material.dispose();
         } else if (child instanceof THREE.Mesh) {
           child.geometry.dispose();
           if (Array.isArray(child.material)) {
             for (const m of child.material) m.dispose();
           } else {
             child.material.dispose();
           }
         }
       }
     }

     private disposePickupGroup(group: THREE.Group): void {
       this.solidScene.remove(group);
       const geos = new Set<THREE.BufferGeometry>();
       const mats = new Set<THREE.Material>();
       group.traverse((obj) => {
         if (obj instanceof THREE.Mesh) {
           if (!obj.geometry.userData?.shared) geos.add(obj.geometry);
           const list = Array.isArray(obj.material) ? obj.material : [obj.material];
           for (const m of list) {
             if (m && !m.userData?.shared) mats.add(m);
           }
         }
       });
       for (const g of geos) g.dispose();
       for (const m of mats) m.dispose();
     }
     ```
   - In `update()`:
     - At `mortarShells` impact (`lines 499-504`), replace `this.vfxScene.remove(s.group);` with `this.disposeMortarShell(s);` **before** `this.mortarShells.splice(i, 1);` and `s.onImpact(...)`.
     - At `pickups3D` arrival (`lines 591-595`), replace `this.solidScene.remove(item.mesh);` with `this.disposePickupGroup(item.mesh);` **before** `this.pickups3D.splice(i, 1);` and `item.onArrive?.()`.
   - In `clearAll()` (`lines 600-631`):
     - Replace `for (const s of this.mortarShells) this.vfxScene.remove(s.group);` (`line 608`) with `for (const s of this.mortarShells) this.disposeMortarShell(s);`.
     - Replace `for (const k of this.pickups3D) this.solidScene.remove(k.mesh);` (`line 627`) with `for (const k of this.pickups3D) this.disposePickupGroup(k.mesh);`.
     - Keep `debris3D` (`line 624`: `this.solidScene.remove(d.mesh)`) and `sparks` (`lines 618-621`: `p.mat.dispose()` only) without disposing shared `debrisGeo` / `rustDebrisMat` / `greyDebrisMat` / `sparkGeo` / `dustGeo`, and keep `this.bossWarningMesh.visible = false`.
   - Add `public dispose(): void` at the bottom of `VfxManager`:
     ```ts
     public dispose(): void {
       this.clearAll();
       this.vfxScene.remove(this.bossWarningMesh);
       this.bossWarningMesh.geometry.dispose();
       this.bossWarningMat.dispose();
       this.sparkGeo.dispose();
       this.dustGeo.dispose();
       this.debrisGeo.dispose();
       this.rustDebrisMat.dispose();
       this.greyDebrisMat.dispose();
     }
     ```

---

## 3. Caveats

1. **NEVER Dispose Shared Textures (`map` / `gradientMap`)**: Neither `disposeMortarShell`, `disposePickupGroup`, `clearAll`, nor `VfxManager.dispose` may call `.dispose()` on any `Texture` (`softGlow`, `ringWave`, `hazardZone`, `grad4Standard`, `grad4Metal`), because those textures are singleton-cached in `ToonMaterials.ts:14`.
2. **NEVER Dispose `THREE.Sprite.geometry`**: Always branch `if (child instanceof THREE.Sprite)` before `if (child instanceof THREE.Mesh)` in `disposeMortarShell` so Three.js's global `Sprite` `BufferGeometry` remains intact.
3. **Do NOT Touch `CinematicDirector.ts` or `GameEngine.ts` in M1**: M2 owns `CinematicDirector.ts` and will switch line `781` to call `this.deps.vfx.spawnChestOpenCelebration(chestPos)`. Keep `spawnClimaxBurst` signature and behavior 100% preserved.

---

## 4. Conclusion

Applying the drop-in `buildReturnBeacon()` telemetry gantry + solid beveled dish assembly in `BeaconAndPropsFactory.ts` and the `spawnChestOpenCelebration()` + deduplicated GPU disposal methods in `VfxManager.ts` completely resolves Defects `D1` and `D7.2` (M1 portion) and eliminates 100% of transient VFX geometry/material leaks with zero risk of double-dispose or use-after-dispose.

---

## 5. Verification Method

1. Run `npm run build` (`tsc && vite build`) and confirm zero errors.
2. Verify in headless Chromium (`playwright-core` against preview) that:
   - Every `THREE.Mesh` on `env.beacon.group` Layer 0 has `geometry.parameters?.openEnded !== true`.
   - `vfx.spawnChestOpenCelebration(new THREE.Vector3(9.75, 0, 2.7))` spawns 3 ground rings (`rings.length === 3`) and 23 sparks (`sparks.length === 23`) with `tracers.length === 0` (zero vertical additive pillar).
   - Executing `launchMortarShell`, `spawnArmorBreakDebris`, and `spawn3DLoot` followed by `vfx.clearAll()` returns `renderer.info.memory.geometries` to exact pre-spawn count with zero console/WebGL errors.
