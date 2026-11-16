# Milestone M1 (`render-3d-outline`) Implementation Progress — `teamwork_preview_worker_m1_r1_1`

## Assigned Exclusive Write Ownership
- `src/types.ts`
- `src/render/BeaconAndPropsFactory.ts`
- `src/render/TowerFactory.ts`
- `src/render/ToonOutlineComposer.ts`
- `src/fx/VfxManager.ts`

## Checklist
- [x] Read `ORIGINAL_REQUEST.md`, `orchestrator_r1/plan.md`, and all 3 Explorer implementation blueprints.
- [ ] Inspect exact current contents of all 5 target source files.
- [ ] Implement Deliverable 1: Return Beacon solid 3D dish & physical mast support (`src/render/BeaconAndPropsFactory.ts`).
- [ ] Implement Deliverable 2: `TowerRig` contracts (`idleCore`, `FlapHingeAxis`, `HingedFlapUserData`), T3 secondary 3D sub-assemblies, outward-opening flap metadata, Magnetic `weaponPitch` parenting, and `setTowerTierVisibility` (`src/types.ts`, `src/render/TowerFactory.ts`).
- [ ] Implement Deliverable 3: `1.5x` supersampled canvas backing store (`setPixelRatio(1)` + `setSize(w, h, false)`), silent `HalfFloatType` MSAA probe + fallback, closed-form inverse ACESFilmic + sRGB `#1A1033` `uOutlineColor`, and Pass-4 VFX outline immunity (`src/render/ToonOutlineComposer.ts`).
- [ ] Implement Deliverable 4: Non-bleaching `spawnChestOpenCelebration`, shared `debris3D` materials, safe `disposeMortarShell` & `disposePickupGroup` lifecycle, and `VfxManager.dispose()` (`src/fx/VfxManager.ts`).
- [ ] Run `npx tsc --noEmit` and `npm run build` in `/home/antigravity/GOD-OF-PPT/tdk` (verify exit code `0`).
- [ ] Run headless Chromium WebGL2 verification script from `/tmp/` (ephemeral port, never killing `:5173`, deleting `/tmp/` script afterward) to verify `1.5x` DPR=2 canvas size, `#1A1033` (`rgb(26, 16, 51)`) pixel readback, solid Return Beacon dish, `TowerRig` contracts, `spawnChestOpenCelebration`, and zero GPU geometry leaks.
- [ ] Verify `git status --short` (only authorized M1 files modified, zero scratch files).
- [ ] Write `handoff.md` and send completion report to `sub_orch_m1` (`a12b24b0fbb55cf075660090fd74269e`).
