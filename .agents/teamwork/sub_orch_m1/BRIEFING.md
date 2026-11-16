# BRIEFING — Milestone M1 (`render-3d-outline`)

## Identity & Hierarchy
- **Sub-Orchestrator**: `sub_orch_m1` (Conversation ID: `a12b24b0fbb55cf075660090fd74269e`)
- **Parent Orchestrator**: `orchestrator_r1` (Conversation ID: `7eca7555c91ebcd34fcee56ad7e156c8`)
- **Project Root**: `/home/antigravity/GOD-OF-PPT/tdk`
- **Mandatory Spec File**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md`
- **Parent Plan**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/orchestrator_r1/plan.md`
- **Survey Evidence**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_explorer_survey_2/analysis.md`

## Mission Summary
Deliver and empirically verify Milestone M1 (`render-3d-outline`) for *Lunar Beacon — Last Relay* (`starforge_ark_cradle`), remediating Defects D1, D2 (model/metadata half), D3, D4, D6 (model/visibility half), and D7 (VFX/disposal half) with 100% backward compatibility against existing `src/game/**` callers while the sibling `E2E` sub-orchestrator works concurrently on `tests/e2e_tiers.mjs`.

## Exclusive Write Ownership
M1 Workers may ONLY modify:
- `src/types.ts`
- `src/render/ToonOutlineComposer.ts`
- `src/render/BeaconAndPropsFactory.ts`
- `src/render/TowerFactory.ts`
- `src/render/ToonMaterials.ts` (only if needed)
- `src/render/EnemyFactory.ts` (only if needed)
- `src/fx/VfxManager.ts`

Strictly forbidden in M1: `src/game/**`, `src/config/**`, `src/audio/**`, `src/ui/**`, `src/main.ts`, `src/style.css`, `package.json`, `tests/**`, and killing the live `:5173` server.
