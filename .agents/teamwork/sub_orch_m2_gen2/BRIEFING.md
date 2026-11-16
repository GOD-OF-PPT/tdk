# Milestone M2 Briefing — `sub_orch_m2_gen2`

## Context & Priorities
1. **User Priority Override (`ORIGINAL_REQUEST.md` Follow-up `2026-11-14T08:12:48Z`)**:
   - Multi-Chapter Campaign (`4` distinct 3D maps + `Endless Overdrive`) & Deep Interactive TD Gameplay (`4` 3D map mechanisms + `12` enemy/Boss roster) are **Highest Priority**.
   - Automated testing is **Lowest Priority** (run concise `<30s` smoke checks; always call `await browser.close(); server?.close(); process.exit(0);` so nothing hangs).
   - Sync `starforge_ark_cradle.html` (zero external CDN URLs, `580px` `<agent-embed>` fallback, `100%` `:5173` / side-pane height) AND live `:5173` preview daemon at the end of M2.
2. **M1 Non-Regression Guardrails**:
   - Preserve 100% of M1.1's closed manifold beveled 3D Return Beacon dish & 3-strut gantry (`BeaconAndPropsFactory.ts`).
   - Preserve M1.2's `FlapHingeAxis`, `HingedFlapUserData`, `TowerRig.idleCore`, T3 3D sub-assemblies, `weaponPitch` on Magnetic Tower, and `setTowerTierVisibility` (`types.ts`, `TowerFactory.ts`).
   - Preserve M1.3's `1.5x` supersampled `#1A1033` (`rgb(26,16,51)`) `ToonOutlineComposer.ts` (Layer 0 solid outlined; Layer 1 & `vfxScene` un-outlined).
   - Preserve & wire M1.4's `vfx.spawnChestOpenCelebration(chestPos)` and `vfx.dispose()` (`VfxManager.ts`).
3. **Authoritative Survey Blueprints**:
   - Track 1: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_1_gen2/analysis.md`
   - Track 2 (types alignment): `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_2_gen2/analysis.md`
   - Track 3: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/analysis.md`
