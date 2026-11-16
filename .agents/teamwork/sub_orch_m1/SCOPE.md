# SCOPE — Milestone M1 (`render-3d-outline`)

## Deliverables & Acceptance Checklist

- [ ] **M1.1 — Return Beacon Solid 3D Dish & Physical Mast Support (`src/render/BeaconAndPropsFactory.ts`)**
  - Replace open single-sided `ConeGeometry(0.58, 0.32, 12, 1, true)` (`openEnded = true`) with a closed, solid beveled 3D telemetry dish assembly (beveled outer dish housing + recessed dark inner reflector dish + center emitter horn/feed).
  - Connect the upper telemetry dish assembly physically to the upper mast collar via a sturdy 3D structural support yoke/bracket that cleanly clears the rotating `coreMesh` (`y = 1.98`) without intersecting or occluding it.
  - Zero backface-culling disappearance from 3/4 gameplay view or Stage 5 victory camera.

- [ ] **M1.2 — Tower 3D Sub-Parts, `idleCore`, Flap Hinge Metadata, Magnetic `weaponPitch` & `setTowerTierVisibility` (`src/types.ts`, `src/render/TowerFactory.ts`)**
  - Add optional `idleCore?: THREE.Object3D` on `TowerRig` in `src/types.ts` and populate `rig.idleCore` for all 3 towers (`coreGem` on `autocannon`, `tierCore` on `mortar`, `magInnerCore` on `magnetic`).
  - Add promised T3 secondary 3D sub-parts matching `gameConfig.ts` `partHeadline` inside `t3Turret`:
    - Autocannon T3: hinged top radiator heat-sink louvers (`顶部开合散热鳍片`), pushed to `rig.hingedFlaps` with `hingeAxis: 'x'`.
    - Mortar T3: articulated side optical rangefinder arm with beveled housing & cyan lens (`光学测距摇臂`).
    - Magnetic T3: 3 radial magnetic flux amplifier pylons with copper/purple coil rings (`三向磁通增幅柱`).
  - Set `flap.userData = { ...flap.userData, hingeAxis: 'x' | 'y' | 'z', openAngle: number, restAngle: number }` on EVERY object in `rig.hingedFlaps` across all 3 towers (`'x'` for Autocannon vents/louvers, `'y'` with outward side sign for Mortar rear bay doors, `'z'` for Magnetic radial crown petals).
  - Parent Magnetic Tower's upper emitter assembly (`magRingOuter` & `magInnerCore`, preserving `rig.rotatingRings` & `rig.idleCore` references and exact world rest positions) under `rig.weaponPitch` so `rig.weaponPitch.children.length > 0` for Stage 2A's 3-beat build mount.
  - Export `setTowerTierVisibility(rig: TowerRig, tier: TowerTier): void` and add optional `options?: { visibilityOnly?: boolean }` on `applyTowerTierVisuals` in `TowerFactory.ts`.

- [ ] **M1.3 — `1.5x` Supersampling Canvas Buffer & Exact `#1A1033` Post-Processing Outline (`src/render/ToonOutlineComposer.ts`)**
  - Keep `this.renderer.setPixelRatio(1)` (NEVER multiply `window.devicePixelRatio`) and call `this.renderer.setSize(this.ssWidth, this.ssHeight, false)` (`updateStyle = false`) so CSS size stays `100% x 100%` (`cssWidth x cssHeight`) while `canvas.width x canvas.height` holds the full `1.5x` supersampled buffer. Ensure Pass 5 `setViewport(0, 0, this.ssWidth, this.ssHeight)` matches.
  - Use `THREE.HalfFloatType` for `msaaSceneRT` when supported by WebGL2 (`EXT_color_buffer_float` / `EXT_color_buffer_half_float` + completeness, with clean `THREE.UnsignedByteType` fallback).
  - Preserve exact `#1A1033` (`rgb(26, 16, 51)` ± 3 per channel in sRGB `readPixels` / screenshot) without post-outline `ACESFilmicToneMapping` purple-black toe-crush (`#150628`), while keeping Layer 1 & `vfxScene` transparent overlays/rings/particles 100% free of dark outlines and `grazing^3` slope compensation intact.

- [ ] **M1.4 — Non-Bleaching Chest Celebration VFX & GPU Resource Disposal (`src/fx/VfxManager.ts`)**
  - Add `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` spawning expanding golden & cyan ground rings + radial upward/outward celebratory sparkles WITHOUT any tall `AdditiveBlending` vertical cylinder over the open chest, 3D coins, and 3D crystals.
  - Properly `.dispose()` transient per-instance geometries/materials when removing expired `mortarShells`, `debris3D`, `pickups3D`, and inside `clearAll()`, without disposing shared/cached geometries or materials.

- [ ] **M1.5 — Full 2B Gate Verification**
  - `npx tsc --noEmit` & `npm run build` exit `0`.
  - Forensic Auditor = `CLEAN`, Reviewer 1 & 2 = `APPROVE`, Challenger 1 & 2 (empirical headless Chromium WebGL2 verification) = `APPROVE`.
