# BRIEFING — Milestone M1 (`render-3d-outline`) — `sub_orch_m1_gen2`

## Identity & Hierarchy
- **Sub-Orchestrator**: `sub_orch_m1_gen2` (Conversation ID: `6a446ddc2e8a75c90d7e95268c9f41be`)
- **Predecessor Sub-Orchestrator**: `sub_orch_m1` (stopped mid-Worker `teamwork_preview_worker_m1_r1_1` due to transient quota exhaustion)
- **Parent Orchestrator**: `orchestrator_r1_gen2` (Conversation ID: `0e463bcfabadd2a009d613505f7e2660`)
- **Project Root**: `/home/antigravity/GOD-OF-PPT/tdk`
- **Mandatory Spec File**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md`
- **Parent Plan**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/orchestrator_r1_gen2/plan.md`

## Mission Summary
Deliver and empirically verify Milestone M1 (`render-3d-outline`) for *Lunar Beacon — Last Relay* (`starforge_ark_cradle`), resuming cleanly from the completed Explorer blueprints (`m1_r1_1`, `m1_r1_2`, `m1_r1_3`) and any partial edits left in the working tree by `teamwork_preview_worker_m1_r1_1`. Ensure 100% backward compatibility with `src/game/**` and strict conformance to Interface Contracts 1, 2, and 3 while sibling `e2e_orch_gen2` runs concurrently against `:5173` and `dist/`.

## Exclusive Write Ownership & Concurrency Isolation
M1 Workers may ONLY modify:
- `src/types.ts`
- `src/render/BeaconAndPropsFactory.ts`
- `src/render/TowerFactory.ts`
- `src/render/ToonOutlineComposer.ts`
- `src/fx/VfxManager.ts`
- (`src/render/ToonMaterials.ts` / `src/render/EnemyFactory.ts` ONLY if strictly necessary)

**STRICTLY FORBIDDEN in M1**:
- Modifying `src/game/**`, `src/config/**`, `src/audio/**`, `src/ui/**`, `src/main.ts`, `src/style.css`, `package.json`, `tests/**`.
- Overwriting `/home/antigravity/GOD-OF-PPT/tdk/dist/` (do NOT run plain `npm run build` or `npx vite build` without `--outDir /tmp/...`!).
- Touching or killing port `:5173` (`e2e_orch_gen2` is concurrently probing `:5173` / `dist/`).
- All M1 build & headless browser checks MUST use `npx tsc --noEmit` + `npx vite build --outDir /tmp/tdk_m1_dist_<tag>` and serve that `/tmp/` directory on an ephemeral `127.0.0.1:0` port, cleaning up `/tmp/` temporary servers/scripts afterward.
