# Milestone M1 Technical Architecture & Root-Cause Analysis: Return Beacon Solid 3D Dish & VFX Lifecycle (`teamwork_preview_explorer_m1_r1_3`)

**Author**: `teamwork_preview_explorer_m1_r1_3` (Return Beacon 3D Dish & VFX Lifecycle Architect)  
**Target Milestone**: `M1` (`render-3d-outline`)  
**Target Files Owned by M1 (Scope of this Report)**:
- `/home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts` (`lines 14-47, 88-137, 139-264, 355-414, 616-690`)
- `/home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts` (`lines 1-633`)
**Read-Only Callers Inspected**:
- `/home/antigravity/GOD-OF-PPT/tdk/src/types.ts` (`lines 1-267`)
- `/home/antigravity/GOD-OF-PPT/tdk/src/render/ToonMaterials.ts` (`lines 1-346`)
- `/home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts` (`lines 1-292`)
- `/home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts` (`lines 173-179, 264-269, 317-374, 533-575, 690-777, 940-995, 1140-1342, 1484-1616`)
- `/home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts` (`lines 63-148, 172-178, 272-286, 405-415, 528-558, 591-804`)

---

## 1. Observation

### 1.1 Return Beacon Scene-Graph, Caller Contracts & Defect `D1` (`src/render/BeaconAndPropsFactory.ts:139-264`)
1. **Exported Interface & Runtime References**:
   - Note: `StationEnvironment` is exported as `LunarStationEnvironment` in `src/render/BeaconAndPropsFactory.ts:38-47` (not `src/types.ts`), containing `beacon: ReturnBeaconRig` (`lines 14-21`):
     ```ts
     export interface ReturnBeaconRig {
       group: THREE.Group;
       dishGroup: THREE.Group;
       coreMesh: THREE.Mesh;
       statusLampMats: THREE.MeshStandardMaterial[];
       signalFins: THREE.Group[];
       skyBeam: THREE.Mesh;
     }
     ```
   - **Exhaustive Caller Trace Across `GameEngine.ts` & `CinematicDirector.ts`**:
     - `beacon.group.position` (`(12.95, 0, 2.4)` from `endSample (11.8, 0, 2.4) + (1.15, 0, 0)` at `BeaconAndPropsFactory.ts:141-142`): read for Stage 5 camera & Boss loot target (`CinematicDirector.ts:610, 670, 685-690, 728`), Beacon hit VFX (`GameEngine.ts:994`), wave-clear loot (`GameEngine.ts:1334-1339`), and mobile framing check (`GameEngine.ts:1610`).
     - `beacon.dishGroup`: rotated continuously around `+Y` every non-paused frame in `GameEngine.ts:744`:
       `this.env.beacon.dishGroup.rotation.y += dt * 0.65;`
     - `beacon.coreMesh`: rotated around `-Y` and bobbed vertically (`±0.05m`) in `GameEngine.ts:745-746`:
       `this.env.beacon.coreMesh.rotation.y -= dt * 0.9;`
       `this.env.beacon.coreMesh.position.y = 1.98 + Math.sin(this.elapsedStationTime * 2.2) * 0.05;`
       Its `MeshStandardMaterial.emissiveIntensity` is animated `0.15 -> 1.35` in Stage 1 (`CinematicDirector.ts:93, 138-142`; `GameEngine.ts:370`).
     - `beacon.statusLampMats` (`4` lamps): `emissiveIntensity` animated `0.05 -> 1.8` sequentially in Stage 1 (`CinematicDirector.ts:92, 132-136`) and forced to `1.8` on skip (`GameEngine.ts:369, 387, 585`).
     - `beacon.signalFins` (`3` `THREE.Group` pivots at azimuths $0^\circ, 120^\circ, 240^\circ$): flared outward in Stage 5A via `tl.to(fin.rotation, { z: -0.35, duration: 0.4, ease: 'back.out(2)' }, 1.55)` (`CinematicDirector.ts:716-718`).
     - `beacon.skyBeam` (`Layer 1` mesh at `y = 2.0`, `CylinderGeometry(0.55, 0.24, 18, 16, 1, true)` translated `(0, 9, 0)` -> spans `y ∈ [2.0, 20.0]`): `visible = true` and `material.opacity` animated `0 -> 0.58` in Stage 5A (`CinematicDirector.ts:700, 711-715`), reset to `visible = false, opacity = 0` in `GameEngine.startNewMission()` (`GameEngine.ts:349-350`).

2. **Exact Defect `D1` Visual & Geometric Failure (`BeaconAndPropsFactory.ts:181-185, 228-241`)**:
   - `mast` (`CylinderGeometry(0.46, 0.62, 1.15, 8)` at `y = 1.18`) terminates at top height $y = 1.18 + \frac{1.15}{2} = 1.755\text{ m}$.
   - `dishGroup` sits at `y = 2.58\text{ m}` with **zero physical support structure** spanning the $0.825\text{ m}$ vertical gap ($y \in [1.755, 2.58]$).
   - `dish` uses `new THREE.ConeGeometry(0.58, 0.32, 12, 1, true)` (`openEnded = true`, zero wall thickness, outward-only normals) with `makeToonMaterial(...)` (`side: THREE.FrontSide`) rotated `dish.rotation.x = Math.PI * 0.82` ($\approx 147.6^\circ$). When `dishGroup.rotation.y` faces its concave interior toward the elevated 3/4 gameplay camera or Stage 5 victory camera (`08_stage5_victory_beacon_and_3d_chest.png`), WebGL2 `GL_CULL_FACE` (`BACK`) discards ~90% of the open cone, leaving a paper-thin floating crescent sliver + detached orange stick (`needle`) hovering inside `skyBeam`.

### 1.2 Stage 5B Chest Open Additive Pillar Overexposure (`Defect D7.2`, `src/fx/VfxManager.ts:253-289`, `src/game/CinematicDirector.ts:776-790`)
- During Stage 5B reward claim (`CinematicDirector.ts:781`), `this.deps.vfx.spawnClimaxBurst(chestPos, 0xfbbf24, 0.9, false)` spawns a `4.95m`-tall (`5.5 * 0.9`), `0.81m..1.35m`-wide (`radius 0.405..0.675`) `DoubleSide` + `AdditiveBlending` yellow cylinder (`opacity: 0.82`) in `vfxScene` directly over `chestPos` (`(9.75, 0, 2.7)`).
- In `ToonOutlineComposer.ts:258-277`, `vfxScene` renders in **Pass 4** *after* Layer-0 solid cel-shaded geometry (Pass 2) and `#1A1033` outlines (Pass 3). The double-sided additive yellow cylinder adds $+0.82 \times (1.0, 0.75, 0.14)$ across both front and back walls directly onto the open supply crate (`BeaconAndPropsFactory.ts:355-414`), the 8 beveled 3D Gold Coins, the 8 faceted 3D blue Energy Crystals (`0x38bdf8`), and even nearby towers (`09_stage5_3d_chest_open_loot_fountain.png`), bleaching them into flat yellow-white glare and violating `ORIGINAL_REQUEST.md:21` (*"光效柔和，有明暗层次，避免频繁整屏过曝"*).

### 1.3 GPU Resource Leak & Disposal Hazards (`src/fx/VfxManager.ts`, `src/render/BeaconAndPropsFactory.ts:88-137`)
Line-by-line inspection of all geometries, materials, and textures in `VfxManager.ts` and `BeaconAndPropsFactory.ts` revealed **3 active GPU memory leaks** and **3 critical disposal traps**:
1. **Leak 1 — `mortarShells` (`VfxManager.ts:139-160, 499-504, 608-609`)**: Every mortar shot allocates a fresh `SphereGeometry(0.19, 10, 8)`, a fresh `MeshBasicMaterial`, and a fresh `SpriteMaterial`. Neither `update()` (`line 500`) nor `clearAll()` (`line 608`) disposes them.
2. **Leak 2 — `debris3D` (`VfxManager.ts:294-314, 553-556, 624-625`)**: Every `spawnArmorBreakDebris()` call allocates 2 fresh `MeshToonMaterial` instances (`rustDebrisMat`, `greyDebrisMat`) shared across the `count` chunks of that burst, and never disposes them in `update()` or `clearAll()`.
3. **Leak 3 — `pickups3D` (`BeaconAndPropsFactory.ts:88-137`, `VfxManager.ts:366-399, 591-595, 627-628`)**: `create3DGoldCoinMesh()` allocates **3 fresh `BufferGeometry`s + 2 fresh `MeshToonMaterial`s** per call, and `create3DEnergyCrystalMesh()` allocates **3 fresh `BufferGeometry`s + 1 fresh Fresnel-rim `MeshToonMaterial`** per call (~600 geometries + ~360 materials per 8-wave run). Neither `update()` (`line 592`) nor `clearAll()` (`line 627`) disposes them.
4. **Trap 1 — `THREE.Sprite` Global Singleton Geometry**: Verified against `node_modules/three`: `(new THREE.Sprite()).geometry === (new THREE.Sprite()).geometry` is **`true`**. Calling `halo.geometry.dispose()` on a `MortarShell`'s `THREE.Sprite` child would destroy Three.js's global `Sprite` singleton VBO for the entire application!
5. **Trap 2 — Intra-Group Shared Materials in Loot Helpers (`BeaconAndPropsFactory.ts:95, 102, 105, 116, 123, 127, 131`)**: Inside a single coin `Group`, `rim` and `bar` share the same `rimMat` reference; inside a single crystal `Group`, `body`, `topCrown`, and `botPoint` share the same `gemMat` reference. Naive `group.traverse` disposal without `Set` deduplication would double-/triple-dispose those materials.
6. **Trap 3 — Shared `VfxManager` Geometries & Shared `ToonMaterials` Textures**: `this.sparkGeo` (`line 76`), `this.dustGeo` (`line 77`), `this.debrisGeo` (`line 78`), `this.bossWarningMesh` (`lines 73-74`), environment `vfxScene` meshes (`stars`, `rangeRing`, `selectRing`, `legendaryBackdrop` at `BeaconAndPropsFactory.ts:627-684`), and all 8 cached textures in `getToonTextures()` (`ToonMaterials.ts:14, 236-252`) are **persistent shared resources** that MUST NEVER be disposed during particle expiry or `clearAll()`.

---

## 2. Logic Chain

### 2.1 Exact 3D Envelope & Mechanical Clearance Derivations for Return Beacon (`Defect D1`)

Let `beacon.group` local origin be $(0, 0, 0)$ (world $(12.95, 0, 2.4)$):

1. **`mast` Envelope (`lines 182-185`)**:
   - `CylinderGeometry(0.46, 0.62, 1.15, 8)` at $y = 1.18 \implies y \in [0.605, 1.755]$, top circumradius $R_{\text{mast}}(1.755) = 0.460\text{ m}$, radius at $y = 1.70$ is $R_{\text{mast}}(1.70) = 0.468\text{ m}$.

2. **`coreMesh` Dynamic Envelope (`lines 193-203`, `GameEngine.ts:745-746`)**:
   - `OctahedronGeometry(0.38, 0)` has 6 axial vertices $(\pm 0.38, 0, 0), (0, \pm 0.38, 0), (0, 0, \pm 0.38)$.
   - Under continuous $Y$-rotation (`rotation.y -= dt * 0.9`) and vertical breathing $y_c(t) = 1.98 + 0.05 \sin(2.2 t) \in [1.93, 2.03]$:
     $$y_{\text{core}} \in [1.93 - 0.38,\ 2.03 + 0.38] = [1.550,\ 2.410]\text{ m}$$
     $$R_{\text{core,max}}(y) = \max_{y_c \in [1.93, 2.03]} \max\bigl(0,\ 0.38 - |y - y_c|\bigr) \le 0.380\text{ m}$$

3. **`signalFins` Dynamic Envelope (`lines 206-226`, `CinematicDirector.ts:716-718`) — Why a Full-Height Rotating Yoke Would Collide**:
   - Three stationary `finPivot` groups sit at azimuths $a_i \in \{0^\circ, 120^\circ, 240^\circ\}$, pivot $(r = 0.54, y = 1.68)$, with `fin` (`0.16 x 0.84 x 0.24`) at local $(0.10, 0.36, 0)$, `rotation.z = -0.22`.
   - Transforming the 4 local $(x, y)$ corners $(\pm 0.08, \pm 0.42)$ across both standby (`finPivot.rotation.z = 0`) and Stage 5 flare (`finPivot.rotation.z = -0.35`):
     - Radial span across $y \in [1.65, 2.4673]$: $r \in [0.470\text{ m}, 0.810\text{ m}]$ in gameplay and $r \in [0.460\text{ m}, 1.010\text{ m}]$ in Stage 5!
     - Maximum fin top height: $y_{\text{fin,max}} = 1.68 + 0.36 + (-0.08)\sin(-0.22) + 0.42\cos(-0.22) = \mathbf{2.4673\text{ m}}$.
   - **Proof Comparing Yoke Topologies**:
     - **Rejected Topology (Full-height yoke rotating with `dishGroup` down to `y = 1.70`)**: Because `coreMesh` reaches $r = 0.380\text{ m}$ and stationary `signalFins` start at $r = 0.460..0.470\text{ m}$ (with tangential thickness $\pm 0.13\text{ m}$), there is **zero radial corridor** at $y = 1.70$ between `mast`/`coreMesh` and `signalFins`, and going outside `signalFins` in Stage 5 would require $r > 1.05\text{ m}$! Any realistic rotating yoke reaching $y = 1.70$ would slice through all 3 stationary `signalFins` every $\frac{2\pi/3}{0.65} = 3.22\text{ s}$.
     - **Selected Topology (Stationary 3-Strut Inter-Fin Gantry Cage `y = 1.70 -> 2.50` + Interlocked Open-Bore Azimuth/Slew Ring Bearing at `y = 2.50..2.58` + Cantilevered Solid Beveled 3D Dish & Counterweight Pod on `dishGroup`)**:
       1. Place **3 stationary beveled gantry legs** on `beacon.group` at azimuths **$60^\circ, 180^\circ, 300^\circ$** ($\frac{\pi}{3}, \pi, \frac{5\pi}{3}$ — exact midpoints between the $0^\circ, 120^\circ, 240^\circ$ `signalFins`!).
          - Azimuthal perpendicular clearance to adjacent fins at $r = 0.56\text{ m}$: $0.56 \sin(60^\circ) - 0.13 = \mathbf{+0.355\text{ m}}$ ($35.5\text{ cm}$) on both sides in BOTH gameplay and Stage 5!
          - Radial clearance from strut inner face ($r_{\text{knee}} = 0.60 - 0.05 = 0.55\text{ m}$ at $y = 2.04$) to `coreMesh` ($r \le 0.38\text{ m}$): exact minimum distance across $y \in [1.72, 2.50]$ is **`+0.1425 m` ($14.25\text{ cm}$)**!
       2. Terminate the 3 gantry legs at a **Stationary Open-Bore Azimuth Bearing Ring** (`TorusGeometry(0.35, 0.06, 10, 16)` horizontal at $y = 2.50$, spanning $y \in [2.44, 2.56]$, $+3.0\text{ cm}$ above peak `coreMesh` apex $2.41\text{ m}$).
       3. Seat `dishGroup` (`(0, 2.58, 0)`) directly atop this bearing via a **Rotating Slew Ring** (`TorusGeometry(0.35, 0.052, 10, 16)` at local $y = -0.01 \implies$ world $y = 2.57$, interlocking $[2.518, 2.622]$ with $[2.44, 2.56]$ via 4 radial bearing clamps so zero air gap exists!).
       4. **Why Open-Bore Slew Ring + Offset Cantilevered Gimbal (`z = +0.60m`) Beats a Dead-Center Dish**:
          - In Stage 5, `skyBeam` (`r(y) = 0.24 + 0.31 \frac{y - 2.0}{18.0}`) rises straight up $(x=0, z=0)$ from `coreMesh` ($y = 2.0$).
          - At $y = 2.50..2.58$, `skyBeam` has radius $0.249..0.250\text{ m}$, while our Azimuth & Slew Rings have inner bore radii **$0.290\text{ m}$** and **$0.298\text{ m}$** (`+4.1..4.8 cm` radial clearance all around `skyBeam`), so `skyBeam` shoots cleanly through the open mechanical focusing ring without impaling opaque metal!
          - Cantilevering the **Closed, Solid Beveled 3D Telemetry Dish** (`R_outer = 0.417m`) on a Twin-Cheek Elevation Gimbal at local `(0, 0.34, 0.60)` (`dishAssembly.rotation.x = +0.78 rad` $\approx 44.7^\circ$, aiming the dish $45.3^\circ$ above the lunar horizon) gives:
            - Minimum vertical height across 360° rotation: $y_{\min} = 2.621\text{ m}$ (**`+0.1537 m` [$15.4\text{ cm}$] above `signalFins` max height $2.4673\text{ m}$**!).
            - Minimum radial clearance outside `skyBeam`: **`+0.0376 m` ($3.8\text{ cm}$)** (dish orbits cleanly around `skyBeam`, never impaled by it!).
            - Maximum horizontal sweep radius: $R_{\max} = 0.984\text{ m} \ll 1.32\text{ m}$ (`base2`) and $1.75\text{ m}$ (`base1`), so horizontal screen bounds on desktop & mobile portrait are 100% unchanged!
          - Adding an **Armored Telemetry Counterweight Pod & Dual Whip Stubs** on the opposite side (`z = -0.40m`) balances the rotating assembly mechanically from all 360° viewing angles.
       5. **100% Closed Manifold Guarantee**: Every Layer-0 primitive in the dish & gantry (`CylinderGeometry` with default `openEnded = false`, `TorusGeometry`, `RoundedBoxGeometry`, `SphereGeometry`) is a closed 2-manifold solid (`openEndedCount = 0` verified across all 41 meshes), completely eliminating backface culling from every camera elevation and azimuth.

### 2.2 Non-Bleaching `spawnChestOpenCelebration(worldPos)` Design (`Defect D7.2`)
1. **Why Floor Shockwave Rings + Radial Perimeter Sparkles Never Overexpose**:
   - In Pass 4 (`ToonOutlineComposer.ts:276`), `msaaSceneRT` retains the full Layer-0 hardware depth buffer from Pass 2 (`solidScene` including `supplyChest` and fountaining `pickups3D`).
   - Expanding `spawnGroundRing` shockwaves placed at `y = 0.085..0.098` (`0xfbbf24` warm gold `0.65 -> 5.2`, `0x22d3ee` crystal cyan `0.45 -> 3.8`, `0xfde68a` starlight gold `0.35 -> 2.5`) have `depthTest: true` (Three.js default) and `depthWrite: false`. Therefore, pixels behind the 3D supply chest (`y = 0..1.0`) and bouncing 3D coins/crystals (`y = 0.26..2.1`) **automatically fail the depth test** and render ONLY on the dark `#2b3347` plaza floor around the crate!
   - Replacing the `4.95m` `AdditiveBlending` vertical cylinder with **18 radial outward/upward celebratory `NormalBlending` sparkles** (`this.sparkGeo`, `r = 0.085m`, alternating `0xfbbf24` / `0xfde68a` / `0x22d3ee`) launched from a `r = 0.52m` perimeter ring around the chest rim (`y = worldPos.y + 0.68`, outward speed `2.6..4.5 m/s`, `vy = 2.8..4.6 m/s`) plus a crisp 5-spark clasp-pop burst at `(worldPos.x, worldPos.y + 0.68, worldPos.z + 0.48)` frames the fountaining 3D coins and crystals with festive motion while keeping 100% cel-shaded saturation and `#1A1033` outlines intact!
   - `spawnClimaxBurst(...)` remains 100% untouched for Stage 2C (T4 reveal), Stage 3 (Boss entrance), Stage 4A (Elite kill), Stage 4B (Boss death), and Beacon damage.

### 2.3 Definitive GPU Resource Ownership & `.dispose()` Architecture

Every GPU resource across `VfxManager.ts`, `BeaconAndPropsFactory.ts`, and `ToonMaterials.ts` falls into strictly one of two disjoint lifecycles:

| Resource / Pool | Location (`File:Lines`) | Geometry Ownership | Material Ownership | Texture Ownership (`map` / `gradientMap`) | Disposal Rule on Expiry & `clearAll()` | Disposal Rule on Engine Teardown (`VfxManager.dispose()`) |
|---|---|---|---|---|---|---|
| `SharedToonTextures` (`grad4Standard`, `grad4Metal`, `lunarDeck`, `haulRoad`, `softGlow`, `ringWave`, `hazardZone`, `shadowBlob`) | `ToonMaterials.ts:14, 236-252` | N/A | N/A | **SHARED singleton** | **NEVER dispose** | Kept in module cache (or app exit) |
| Env `vfxScene` overlays: `stars`, `rangeRing`, `selectRing`, `legendaryBackdrop` | `BeaconAndPropsFactory.ts:625-684` | **SHARED persistent** | **SHARED persistent** | Uses shared `softGlow` | **NEVER dispose** (only `.visible = false` in `GameEngine` / `CinematicDirector`) | Owned by `LunarStationEnvironment` |
| `bossWarningMesh` + `bossWarningMat` | `VfxManager.ts:73-74, 85-95` | **SHARED persistent** (`PlaneGeometry(1,1)`) | **SHARED persistent** (`bossWarningMat`) | Shared `hazardZone` | **NEVER dispose** (`bossWarningMesh.visible = false` in `clearAll()`) | `bossWarningMesh.geometry.dispose(); bossWarningMat.dispose()` |
| `sparkGeo`, `dustGeo` | `VfxManager.ts:76-77` | **SHARED persistent** | N/A | N/A | **NEVER dispose** | `sparkGeo.dispose(); dustGeo.dispose()` |
| `debrisGeo` + promoted `rustDebrisMat`, `greyDebrisMat` | `VfxManager.ts:78, 295-296` | **SHARED persistent** (`BoxGeometry`) | **SHARED persistent** (`2x MeshToonMaterial` promoted to `VfxManager` fields) | Shared `grad4Standard` / `grad4Metal` | **NEVER dispose** (only `solidScene.remove(d.mesh)`) | `debrisGeo.dispose(); rustDebrisMat.dispose(); greyDebrisMat.dispose()` |
| `tracers` (Autocannon streaks, `spawnFlashBall`, `spawnClimaxBurst` pillars) | `VfxManager.ts:66, 109-124, 259-272, 426-437` | **TRANSIENT per-instance** (`CylinderGeometry` / `SphereGeometry`) | **TRANSIENT per-instance** (`MeshBasicMaterial`) | None | **DISPOSE BOTH** `t.mesh.geometry.dispose(); t.mat.dispose()` in `update()`, `clearCombatTransients()`, and `clearAll()` | Covered by `this.clearAll()` |
| `sparks` (hit sparks, mortar sparks, climax sparks, chest sparkles, lunar dust, `suctionParticles`) | `VfxManager.ts:69, 208-231, 319-348, 439-456` | **SHARED** (`sparkGeo` or `dustGeo`) | **TRANSIENT per-instance** (`MeshBasicMaterial`) | None | **DISPOSE MATERIAL ONLY** (`p.mat.dispose()`); **NEVER** dispose `p.mesh.geometry`! | Covered by `this.clearAll()` + shared geo teardown |
| `rings` (`spawnGroundRing`) | `VfxManager.ts:68, 401-424` | **TRANSIENT per-instance** (`PlaneGeometry(1,1)`) | **TRANSIENT per-instance** (`MeshBasicMaterial`) | Shared `ringWave` (**NEVER** dispose `mat.map`!) | **DISPOSE BOTH** `r.mesh.geometry.dispose(); r.mat.dispose()` in `update()` and `clearAll()` | Covered by `this.clearAll()` |
| `mortarShells` (`core` `Mesh` + `halo` `Sprite`) | `VfxManager.ts:67, 139-160` | `core`: **TRANSIENT** `SphereGeometry`; `halo`: **GLOBAL THREE.JS SINGLETON `Sprite.geometry`** | `core`: **TRANSIENT** `MeshBasicMaterial`; `halo`: **TRANSIENT** `SpriteMaterial` | `halo`: Shared `softGlow` (**NEVER** dispose `mat.map`!) | **DISPOSE** `core.geometry`, `core.material`, and `halo.material` via `disposeMortarShell(s)` in `update()` & `clearAll()`; **NEVER** dispose `Sprite.geometry`! | Covered by `this.clearAll()` |
| `pickups3D` (`create3DGoldCoinMesh` / `create3DEnergyCrystalMesh`) | `BeaconAndPropsFactory.ts:88-137`, `VfxManager.ts:70, 366-399` | **TRANSIENT per-pickup** (`3` `BufferGeometry`s per coin or crystal) | **TRANSIENT per-pickup, INTRA-GROUP SHARED** (`2` `MeshToonMaterial`s per coin; `1` `MeshToonMaterial` per crystal) | Shared `grad4Standard` / `grad4Metal` (**NEVER** dispose `gradientMap`!) | **DISPOSE UNIQUE GEOS & MATS** via `Set`-deduplicated `disposePickupGroup(item.mesh)` in `update()` & `clearAll()` | Covered by `this.clearAll()` |

---

## 3. Caveats & Edge-Case Protections

1. **Re-Entrant Callback Safety (`s.onImpact` & `item.onArrive`)**:
   - In `VfxManager.update()`, `mortarShells` calls `s.onImpact(s.end.x, s.end.z)` (`line 503`) and `pickups3D` calls `item.onArrive?.()` (`line 594`). Always execute `this.disposeMortarShell(s)` + `this.mortarShells.splice(i, 1)` **before** `s.onImpact(...)`, and `this.disposePickupGroup(item.mesh)` + `this.pickups3D.splice(i, 1)` **before** `item.onArrive?.()`. That guarantees zero double-dispose even if a callback triggers a mode transition or `clearAll()`.
2. **Three.js `THREE.Sprite` Singleton Geometry Trap**:
   - Never call `obj.geometry.dispose()` on an untyped scene-graph traversal without checking `obj instanceof THREE.Mesh && !(obj instanceof THREE.Sprite)`. In Three.js (`^0.187.0`), `Sprite` is NOT a subclass of `Mesh` (`Sprite extends Object3D`), so guarding with `if (obj instanceof THREE.Mesh)` naturally excludes `THREE.Sprite` while catching all solid `Mesh` children!
3. **`debris3D` Shared-Material Promotion vs Per-Chunk Disposal**:
   - Promoting `rustDebrisMat` and `greyDebrisMat` to `private readonly` instance properties on `VfxManager` (alongside `private readonly debrisGeo`) is strictly superior to disposing `d.mesh.material` on chunk expiry because `debris3D` never mutates material opacity or color. It eliminates per-burst material allocation, prevents multi-chunk double-dispose, and keeps `VfxManager.clearAll()` O(N) scene-remove safe.
4. **Stage 5 `signalFins` Reset Note for M2 Integration**:
   - In `CinematicDirector.ts:716-718`, `fin.rotation.z` animates to `-0.35` during Stage 5A. Our Return Beacon gantry ($60^\circ, 180^\circ, 300^\circ$) and upper dish ($y_{\min} = 2.621\text{ m} > 2.467\text{ m}$) maintain $>15\text{ cm}$ clearance whether `fin.rotation.z` is `0` or `-0.35`, so there is zero collision even across `Play Again` restarts! (M2 can optionally reset `for (const fin of this.env.beacon.signalFins) fin.rotation.z = 0;` in `GameEngine.startNewMission()` alongside `skyBeam.visible = false`.)
5. **M1 vs M2 Call-Site Coordination for `spawnChestOpenCelebration`**:
   - M1 owns `src/fx/VfxManager.ts` and adds `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` while keeping `spawnClimaxBurst` 100% intact. M2 owns `src/game/CinematicDirector.ts` and will swap line `781` from `this.deps.vfx.spawnClimaxBurst(chestPos, 0xfbbf24, 0.9, false)` to `this.deps.vfx.spawnChestOpenCelebration(chestPos)` (per `orchestrator_r1/plan.md` Contract 2).

---

## 4. Conclusion

1. **Defect `D1` (`src/render/BeaconAndPropsFactory.ts`)**: Replace lines `228-241` of `buildReturnBeacon()` with:
   - An **Upper Mast Collar & Core Socket Ring** (`y = 1.70..1.76`),
   - A **Stationary 3-Strut Beveled Gantry Cage** (`a = 60°, 180°, 300°`, clearing `coreMesh` by `+14.25 cm` and `signalFins` by `+35.5 cm`) supporting a **Stationary Open-Bore Azimuth Bearing Ring** at `y = 2.50` (`bore r = 0.29m > skyBeam 0.25m`), and
   - A **Rotating Slew-Ring Pedestal + Cantilevered Twin-Cheek Elevation Gimbal + Closed Manifold Beveled 3D Telemetry Dish Assembly + Opposite Transceiver Counterweight Pod** on `dishGroup` (`y = 2.58`, `openEndedCount === 0`, `+15.4 cm` vertical clearance above `signalFins`, `+3.8 cm` radial clearance outside `skyBeam`).
2. **Defect `D7.2` (`src/fx/VfxManager.ts`)**: Add `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` combining 3 staggered warm-gold/cyan/pale-gold floor shockwave rings (`y = 0.085..0.098`, depth-tested behind the solid crate & loot) + 18 radial outward `NormalBlending` rim sparkles + 5 clasp-pop sparks, with zero vertical `AdditiveBlending` cylinder.
3. **GPU Resource Lifecycle (`src/fx/VfxManager.ts`)**: Promote `rustDebrisMat` and `greyDebrisMat` to shared `VfxManager` fields; add `disposeMortarShell(s)` (`Sprite`-safe) and `disposePickupGroup(group)` (`Set`-deduplicated) called in both `update()` and `clearAll()`; add `public dispose(): void` on `VfxManager` for full engine teardown.

---

## 5. Verification Method

1. **Typecheck & Production Build**: Run `npm run build` (`tsc && vite build`) — must pass with `0` TypeScript or bundler errors.
2. **Closed-Manifold & Clearance Invariant Check**: Inspect `env.beacon.group` in Three.js runtime — verify `0` Layer-0 meshes have `geometry.parameters?.openEnded === true`, `dishGroup` rotates smoothly via `GameEngine.updateAmbientStationLife`, and from both 3/4 gameplay camera and Stage 5 victory camera (`08_stage5_victory_beacon_and_3d_chest.png`), the upper dish has crisp `#1A1033` silhouette/inner seams, solid beveled thickness, and visible 3-strut mechanical connection to `mast` without clipping `coreMesh`, `signalFins`, or `skyBeam`.
3. **GPU Memory Stability Check (`renderer.info.memory`)**:
   - Spawn & expire `mortarShells`, `debris3D`, `pickups3D` (`spawn3DLoot`), and `spawnChestOpenCelebration`, then call `vfx.clearAll()`.
   - Verify `renderer.info.memory.geometries` returns to exact pre-combat baseline (`Δgeometries === 0`) across repeated waves and `startNewMission()` (`Play Again`) cycles, with zero WebGL warnings or `use-after-dispose` console errors.
