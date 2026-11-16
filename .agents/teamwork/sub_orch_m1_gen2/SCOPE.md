# SCOPE — Milestone M1 (`render-3d-outline`) — `sub_orch_m1_gen2`

## Deliverables & Acceptance Checklist

- [x] **M1.1 — Return Beacon Solid 3D Dish & Physical Mast Support (`src/render/BeaconAndPropsFactory.ts`)**
  - Replaced open single-sided `ConeGeometry(0.58, 0.32, 12, 1, true)` (`openEnded = true`) with a closed, solid beveled 3D telemetry dish assembly (beveled outer dish housing + rim + recessed dark inner reflector dish + center emitter horn/feed + opposite `-Z` transceiver counterweight).
  - Connected the upper telemetry dish assembly physically to the upper mast collar (`y = 1.70..1.76`) via a sturdy 3-strut structural gantry cage + open-bore azimuth bearing ring (`y = 2.50`, inner bore `r = 0.29m > skyBeam r = 0.25m`) that cleanly clears the rotating `coreMesh` (`y = 1.98`) and stationary `signalFins` without intersecting or occluding them.
  - Verified zero backface-culling disappearance (`0` `openEnded === true` meshes across all `66` Layer-0 Beacon meshes) from 3/4 gameplay view and `360°` Stage 5 victory camera angles.

- [x] **M1.2 — Tower 3D Sub-Parts, `idleCore`, Flap Hinge Metadata, Magnetic `weaponPitch` & `setTowerTierVisibility` (`src/types.ts`, `src/render/TowerFactory.ts`)**
  - Added `FlapHingeAxis`, `HingedFlapUserData`, and optional `idleCore?: THREE.Object3D` on `TowerRig` in `src/types.ts` (preserving 100% of existing `TowerRig` properties) and populated `rig.idleCore` (with `userData.restPos` & `userData.restScale`) for all 3 towers (`coreGem` on `autocannon`, `tierCore` on `mortar`, `coreMesh` on `magnetic`).
  - Added promised T3 secondary 3D sub-parts matching `gameConfig.ts` `partHeadline` inside `t3Turret` with `tagArcFlyPart(...)`:
    - Autocannon T3: hinged top radiator heat-sink louvers (`顶部开合散热鳍片`), pushed to `rig.hingedFlaps` with `hingeAxis: 'x'`, `openAngle: -0.58`, `minTier: 3`.
    - Mortar T3: articulated side optical rangefinder arm with beveled housing & cyan lens (`光学测距摇臂`).
    - Magnetic T3: 3 radial magnetic flux amplifier pylons with induction coil rings (`三向磁通增幅柱`).
  - Set `flap.userData = { ...flap.userData, hingeAxis: 'x' | 'y' | 'z', openAngle: number, restAngle: number, minTier: TowerTier }` on EVERY object in `rig.hingedFlaps` (`10` flaps across all 3 towers) and empirically verified upward/outward world-space swing.
  - Parented Magnetic Tower's upper emitter assembly (`outerRingGrp`, `coreMesh`, `muzzle`) under `rig.weaponPitch` positioned at `(0, 1.15, 0)` (`weaponPitch.children.length === 3`, world rest `y = 1.49` preserved).
  - Exported `setTowerTierVisibility(rig: TowerRig, tier: TowerTier): void` and added optional `options?: { visibilityOnly?: boolean }` on `applyTowerTierVisuals(rig, tier, options)` in `TowerFactory.ts`.

- [x] **M1.3 — `1.5x` Supersampling Canvas Buffer & Exact `#1A1033` Post-Processing Outline (`src/render/ToonOutlineComposer.ts`)**
  - Enforced `this.renderer.setPixelRatio(1)` (zero `devicePixelRatio` stacking) and `this.renderer.setSize(this.ssWidth, this.ssHeight, false)` (`updateStyle = false`) in both `constructor` and `setSize`, verified on Desktop (`1440x900` DPR=1 -> `2160x1350`) and Mobile Portrait (`390x844` DPR=2 -> `585x1266`) with accurate mouse/touch raycasting across dynamic resizes.
  - Implemented silent `THREE.HalfFloatType` (`RGBA16F`) MSAA & single-sample FBO completeness probe restoring all GL bindings, with clean zero-warning `THREE.UnsignedByteType` fallback and `resolveDepthBuffer: false`.
  - Preserved exact `#1A1033` (`6,848` exact `[26, 16, 51, 255]` pixels, `±0` byte error) via closed-form inverse `ACESFilmicToneMapping` + `sRGBTransferOETF` `uOutlineColor` computation and `vec4(texel.rgb, 1.0)` in Pass 5 `blitMaterial`, with `0` Pass-4 VFX outline pollution and `0` grazing-angle lunar deck slope stripes.

- [x] **M1.4 — Non-Bleaching Chest Celebration VFX & GPU Resource Disposal (`src/fx/VfxManager.ts`)**
  - Added `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` spawning expanding golden & cyan ground rings + radial celebratory sparkles + front clasp sparks with `0` vertical `AdditiveBlending` cylinders (`spawnClimaxBurst` preserved 100% unchanged).
  - Shared `rustDebrisMat` & `greyDebrisMat`, implemented safe `disposeMortarShell` (preserving `THREE.Sprite.geometry` singleton & shared `softGlow` texture) and `Set`-deduplicated `disposePickupGroup` in `update()` and `clearAll()`, plus `public dispose(): void` (`0` GPU geometry/texture leaks verified).

- [x] **M1.5 — Full 2B Gate Verification (Zero Interference with `dist/` or `:5173`)**
  - `npx tsc --noEmit` & isolated `npx vite build --outDir /tmp/...` exited `0`.
  - Forensic Auditor = `CLEAN`, Reviewer 1 & 2 = `APPROVE`, Challenger 1 & 2 = `APPROVE`.
