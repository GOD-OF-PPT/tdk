# Milestone M1 (`render-3d-outline`) Sub-Orchestrator Handoff — `sub_orch_m1_gen2`

- **From**: `sub_orch_m1_gen2` (`6a446ddc2e8a75c90d7e95268c9f41be`)
- **To**: Parent Orchestrator `orchestrator_r1_gen2` (`0e463bcfabadd2a009d613505f7e2660`)
- **Milestone**: M1 (`render-3d-outline`) — *Lunar Beacon — Last Relay* (`starforge_ark_cradle`)
- **Step 2B Gate Result**: **`PASS`** (`Auditor: CLEAN`, `Reviewer 1: APPROVE`, `Reviewer 2: APPROVE`, `Challenger 1: APPROVE`, `Challenger 2: APPROVE`)

---

## 1. Delivered & Verified M1 Files (Exclusive Ownership Honored 100%)

Only the 5 authorized M1 files were modified (`./dist/`, `:5173`, `src/game/**`, `src/config/**`, `src/ui/**`, `src/audio/**`, `tests/**`, and `package.json` were 100% untouched):

1. [`src/render/BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L228-L508) (**M1.1**)
   - Replaced the detached open single-sided cone (`openEnded = true`) with a closed manifold beveled 3D telemetry dish assembly (`rearBoss`, `dishShell`, `dishRim`, `3 × rimClamp`, recessed `innerReflector`, `feedPedestal`, `feedMast`, `3 × fStrut`, `emitterHorn`, `emitterLens`) balanced on `-Z` by `transceiverPod`, `podStripe`, and twin `whip` + `whipTip` antennas.
   - Connected `dishGroup` (`y = 2.58`) physically to `mast` (`top y = 1.755`) via `upperMastCollar` (`y = 1.70`), `coreSocketRing` (`y = 1.76`), a stationary 3-strut gantry cage (`60°/180°/300°` inter-fin bays clearing `coreMesh` by `+15.3cm` and `signalFins` by `+35.5cm`), and an open-bore `azimuthRing` (`y = 2.50`, inner bore `r = 0.29m > skyBeam r = 0.249m`).
   - Empirically verified: `66` Layer-0 Beacon meshes, `0` `openEnded` meshes on Layer 0 (`skyBeam` strictly Layer 1), solid visible dish across `360°` azimuth rotation from both 3/4 gameplay and Stage 5 cameras, and `ReturnBeaconRig` 100% preserved.

2. [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L119-L151) & [`src/render/TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L63-L893) (**M1.2 / Contract 1**)
   - Added `FlapHingeAxis = 'x' | 'y' | 'z'`, `HingedFlapUserData`, and `TowerRig.idleCore?: THREE.Object3D` while preserving all existing `TowerRig` fields.
   - Populated `rig.idleCore` (with `userData.restPos` & `userData.restScale`) on all 3 towers (`coreGem` on `autocannon`, `tierCore` on `mortar`, `coreMesh` on `magnetic`).
   - Added all 3 promised T3 secondary 3D sub-assemblies inside `t3Turret` with `tagArcFlyPart(...)`:
     - **Autocannon T3 (`顶部开合散热鳍片`)**: `topRadiatorGrp` (`8` meshes) with `#FF9F1C` thermal core + `2` hinged louver pivots registered in `rig.hingedFlaps` (`hingeAxis: 'x'`, `restAngle: -0.08`, `openAngle: -0.58`, `minTier: 3`).
     - **Mortar T3 (`光学测距摇臂`)**: `rangefinderArm` (`9` meshes) on left T3 pod shoulder (`(-0.8, 0.8, -0.06)`) with articulated swivel/boom, beveled cream sensor pod, tier brow trim, and `#22D3EE` optical lens.
     - **Magnetic T3 (`三向磁通增幅柱`)**: `3 × fluxPylon` (`7` meshes each at `60°/180°/300°`, `r = 0.85m`) with inward bridge struts bolted into `pedCore`, beveled base shoes, deep-blue rods, dual `#C084FC` / `tierTrimMat` induction coil rings, and octahedron tips.
   - Registered right-handed outward/upward metadata (`hingeAxis`, `restAngle`, `openAngle`, `minTier`) on all `10` flaps across all 3 towers (`4` on `autocannon`, `2` on `mortar` with `-sx * 0.58`, `4` on `magnetic` with `-0.48`), empirically verified in world space.
   - Parented Magnetic Tower's upper emitter (`outerRingGrp`, `coreMesh`, `muzzle`) under `rig.weaponPitch` at `(0, 1.15, 0)` (`weaponPitch.children.length === 3`, `magRingOuter` world rest `y = 1.49` preserved).
   - Exported `setTowerTierVisibility(rig, tier)` and added `options?: { visibilityOnly?: boolean }` on `applyTowerTierVisuals(rig, tier, options)`.

3. [`src/render/ToonOutlineComposer.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts#L1-L569) (**M1.3 / Contract 3**)
   - Enforced `this.renderer.setPixelRatio(1)` (zero `devicePixelRatio` stacking) and `this.renderer.setSize(this.ssWidth, this.ssHeight, false)` (`updateStyle = false`) in both `constructor` and `setSize` (`1440x900` DPR=1 -> `2160x1350`; `390x844` DPR=2 -> `585x1266`; mouse/touch raycasting verified accurate across dynamic resizes).
   - Implemented silent zero-warning `THREE.HalfFloatType` (`RGBA16F`) MSAA & single-sample FBO completeness probe restoring all GL bindings, with clean `THREE.UnsignedByteType` fallback and `resolveDepthBuffer: false`.
   - Implemented closed-form inverse `ACESFilmicToneMapping` + `sRGBTransferOETF(0.41666)` `uOutlineColor` computation + `gl_FragColor = vec4(texel.rgb, 1.0);` in Pass 5 `blitMaterial` (`6,848` exact `[26, 16, 51, 255]` `#1A1033` silhouette pixels read back, `0` Pass-4 VFX outline pollution, `0` lunar deck slope stripes).

4. [`src/fx/VfxManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L76-L714) (**M1.4 / Contract 2**)
   - Added `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` spawning `3` expanding gold/cyan ground rings + `18` radial rim sparkles + `5` front clasp sparks with **`0` tall vertical `AdditiveBlending` cylinders** (`spawnClimaxBurst` preserved 100% unchanged).
   - Shared `rustDebrisMat` & `greyDebrisMat` across `debris3D`, added safe `disposeMortarShell` (preserving `THREE.Sprite.geometry` singleton & shared `softGlow` texture) and `Set`-deduplicated `disposePickupGroup` in `update()` and `clearAll()`, and added `public dispose(): void` (`0` GPU geometry/texture leaks across heavy multi-cycle stress).

---

## 2. Step 2B Gate Verification Artifacts

- **Gate Summary**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/sub_orch_m1_gen2/GATE_STATUS.md` (**`PASS`**)
- **Worker Handoff**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_worker_m1_r1_1_gen2/handoff.md`
- **Forensic Auditor (`CLEAN`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_auditor_m1_r1_1_gen2/handoff.md`
- **Reviewer 1 (`APPROVE`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_reviewer_m1_r1_1_gen2/handoff.md`
- **Reviewer 2 (`APPROVE`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_reviewer_m1_r1_2_gen2/handoff.md`
- **Challenger 1 (`APPROVE`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_challenger_m1_r1_1_gen2/handoff.md`
- **Challenger 2 (`APPROVE`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_challenger_m1_r1_2_gen2/handoff.md`

---

## 3. Ready-to-Use Hooks for Upcoming Campaign & Gameplay Expansion / M2

1. **`CinematicDirector.ts`**:
   - Call `setTowerTierVisibility(rig, newTier)` (or `applyTowerTierVisuals(rig, newTier, { visibilityOnly: true })`) at `t = 0` of T2/T3/T4 upgrades and defer full `applyTowerTierVisuals(rig, newTier)` color/rim ignition until `lockEnd` / `climaxAt`.
   - Animate `flap.rotation[flap.userData.hingeAxis]` between `flap.userData.restAngle` and `flap.userData.openAngle` (all 10 flaps across all 3 towers now have right-handed outward/upward signs).
   - Call `this.deps.vfx.spawnChestOpenCelebration(chestPos)` in Stage 5B `playOpenRewardChest` (`line 781`) to eliminate additive pillar bleaching over the open crate, 3D coins, and 3D crystals.
2. **`GameEngine.ts`**:
   - Add `else { rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8); }` after `tower.type === 'mortar'` (`line 1063`) so Magnetic's `weaponPitch` recovers smoothly from Boss EMP stun.
   - Animate `rig.idleCore` scale breathing across all 3 towers, guarding generic `rig.idleCore.rotation.y` spin with `if (tower.type !== 'magnetic')` so Magnetic's `-2.5 / -14 rad/s` spin remains unattenuated.
   - Note that new T4 Specialization Branches / new Sector Campaign props & mechanisms can plug directly into `ToonOutlineComposer` (Layer 0 = `#1A1033` outlined toon solids; Layer 1 / `vfxScene` = un-outlined glowing telegraphs, range rings, tactical skill indicators, and VFX).
