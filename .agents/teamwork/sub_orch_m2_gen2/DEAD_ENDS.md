# Milestone M2 Dead Ends & Guardrails — `sub_orch_m2_gen2`

1. **`ToonOutlineComposer` Layer Contract (`ToonOutlineComposer.ts:540–548`)**:
   - Pass 4A renders `solidScene` with `camera.layers.set(1)`: non-outlined translucent meshes under `solidScene` (`shieldDome`, repair rings, mechanism halos/laser bars/speed chevrons) MUST call `setLayerRecursive(obj, 1)`.
   - Pass 4B renders `vfxScene` with `camera.layers.set(0)`: meshes under `vfxScene` (`env.vfxRoot`, `stars`, `rangeRing`, `selectRing`, `legendaryBackdrop`) MUST stay on default Layer `0` (setting Layer 1 inside `vfxScene` makes them invisible).
2. **`disposeObject3DTree()` Safety**:
   - Dispose geometries/materials across `THREE.Mesh | THREE.Points | THREE.Line`, explicitly skip `THREE.Sprite.geometry` singleton (`!(obj instanceof THREE.Sprite)`), and NEVER dispose `mat.map` or `mat.gradientMap` (`getToonTextures()` singleton cache).
3. **High-Ground Bastion Idle-Hop Guard**:
   - Place the `0.68m` stepped bastion plinth directly on `env.root` at `(cfg.x, 0, cfg.z)` and store `baseY = cfg.y ?? 0` on `PadVisual` so `GameEngine` hops `padVis.group.position.y` around `padVis.baseY` without lifting or dropping the cliff plinth.
4. **Stage 1 Pad ID Compatibility**:
   - Keep `STAGE_CONFIGS.stage_01.buildPads` IDs as `'pad_01'..'pad_10'` (not `'s1_pad_01'`) and project `(pad.y ?? 0) + 0.15` in `getPadScreenCoordinates`.
5. **Mobile Portrait `FogExp2` Washout Guard**:
   - Scale `fog.density = stage.palette.fogDensity / Math.max(1, distScale * 0.78)` on `390×844` portrait (`distScale` cap `3.25`).
6. **Viewport Promotion & Touch Scroll**:
   - Promote `html.is-top-window` strictly once at `bootstrap()` in `src/main.ts` (`isTopWindow || http(s): || innerHeight >= 620`), keeping `<agent-embed>` at `580px` and `.expanded-embed` at `740px`.
   - Override `#app { touch-action: none }` with `touch-action: pan-y` on `.hub-body-scroll` and `.enamel-dialog`.
7. **Smoke Script Cleanup**:
   - Always close Playwright browsers and temporary servers (`await browser.close(); server?.close(); process.exit(0);`), delete temporary `/tmp` smoke scripts, and never kill the `:5173` daemon.
