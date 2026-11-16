import fs from 'node:fs';

const edit = (file, marker, fn) => {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(marker)) return;
  const next = fn(src);
  if (next === src) throw new Error('Anchor miss in ' + file);
  fs.writeFileSync(file, next, 'utf8');
};

edit('.gitignore', '!dist/starforge_ark_cradle.html', (s) =>
  s.replace(/^dist$/m, 'dist/*\n!dist/starforge_ark_cradle.html')
);

edit('scripts/bundle_standalone.mjs', 'rootOutHtml', (s) =>
  s
    .replace(
      "const distOutHtml = path.join(projectRoot, 'dist/starforge_ark_cradle.html');",
      "const distOutHtml = path.join(projectRoot, 'dist/starforge_ark_cradle.html');\nconst rootOutHtml = path.join(projectRoot, 'starforge_ark_cradle.html');"
    )
    .replace(
      "fs.writeFileSync(distOutHtml, html, 'utf8');",
      "fs.writeFileSync(distOutHtml, html, 'utf8');\nfs.writeFileSync(rootOutHtml, html, 'utf8');"
    )
);

edit('src/render/ToonMaterials.ts', 'toon-tier-rim-v2', (s) =>
  s
    .replace('tex.repeat.set(6.5, 4.2);', 'tex.repeat.set(6.5, 4.2);\n  tex.anisotropy = 8;')
    .replace('tex.wrapT = THREE.ClampToEdgeWrapping;', 'tex.wrapT = THREE.ClampToEdgeWrapping;\n  tex.anisotropy = 8;')
    .replace('[102, 158, 222, 255]', '[88, 128, 172, 212, 240, 255]')
    .replace('[78, 136, 198, 255]', '[64, 108, 154, 202, 236, 255]')
    .replace(
      'if (opts.rimColor !== undefined || (opts.rimStrength && opts.rimStrength > 0)) {',
      'if (true) {'
    )
    .replace(
      'const rimUniform = { value: new THREE.Color(opts.rimColor ?? 0x7dd3fc) };\n    const strengthUniform = { value: opts.rimStrength ?? 0.34 };',
      'const hasRim = opts.rimColor !== undefined || Boolean(opts.rimStrength && opts.rimStrength > 0);\n    const rimUniform = { value: new THREE.Color(opts.rimColor ?? 0x67e8f9) };\n    const strengthUniform = { value: hasRim ? (opts.rimStrength ?? 0.34) : 0.09 };'
    )
    .replace("customProgramCacheKey = () => 'toon-tier-rim-v1';", "customProgramCacheKey = () => 'toon-tier-rim-v2';")
    .replace(
      'float steppedRim = smoothstep(0.66, 0.86, 1.0 - rimNdotV);\n        outgoingLight += uTierRimColor * steppedRim * uTierRimStrength;',
      'float steppedRim = smoothstep(0.60, 0.84, 1.0 - rimNdotV) + smoothstep(0.86, 0.97, 1.0 - rimNdotV) * 0.42;\n        vec3 halfV = normalize(normalize(vViewPosition) + vec3(0.28, 0.88, 0.38));\n        float celSpec = smoothstep(0.94, 0.98, clamp(dot(normalize(normal), halfV), 0.0, 1.0));\n        outgoingLight += uTierRimColor * steppedRim * uTierRimStrength + vec3(0.96, 0.98, 1.0) * celSpec * 0.05;'
    )
);

edit('src/render/ToonOutlineComposer.ts', 'extractHalo', (s) =>
  s
    .replace(
      'tDiffuse: { value: this.msaaSceneRT.texture },',
      'tDiffuse: { value: this.msaaSceneRT.texture },\n        uResolution: { value: new THREE.Vector2(this.ssWidth, this.ssHeight) },'
    )
    .replace(
      'uniform sampler2D tDiffuse;\n        varying vec2 vUv;\n        void main() {\n          vec4 texel = texture2D(tDiffuse, vUv);\n          gl_FragColor = vec4(texel.rgb, 1.0);',
      'uniform sampler2D tDiffuse;\n        uniform vec2 uResolution;\n        varying vec2 vUv;\n        vec3 extractHalo(vec3 c){ float p=max(c.r,max(c.g,c.b)); return min(c*smoothstep(0.88,1.45,p),vec3(3.0)); }\n        void main() {\n          vec2 ts = 1.0 / uResolution;\n          vec4 texel = texture2D(tDiffuse, vUv);\n          vec3 bl = (extractHalo(texture2D(tDiffuse,vUv+vec2(2.6,0.0)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(-2.6,0.0)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(0.0,2.6)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(0.0,-2.6)*ts).rgb))*0.16 + (extractHalo(texture2D(tDiffuse,vUv+vec2(4.2,4.2)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(-4.2,4.2)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(4.2,-4.2)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(-4.2,-4.2)*ts).rgb))*0.09;\n          vec2 cv = (vUv - 0.5) * vec2(1.08, 0.96);\n          float vig = clamp(1.015 - 0.075 * dot(cv, cv), 0.93, 1.015);\n          gl_FragColor = vec4(texel.rgb * vig + bl * 0.25, 1.0);'
    )
    .replace(
      '(this.outlineMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);',
      '(this.outlineMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);\n    (this.blitMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);'
    )
);

edit('src/render/BeaconAndPropsFactory.ts', 'earthGroup', (s) =>
  s.replace(
    'vfxRoot.add(stars);',
    `vfxRoot.add(stars);
  const earthGroup = new THREE.Group();
  earthGroup.position.set(-19, 21, -56);
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(5.5, 28, 20), new THREE.MeshBasicMaterial({ color: 0x0b1933, fog: false })));
  const earthLit = new THREE.Mesh(new THREE.SphereGeometry(5.55, 28, 20, -1.3, 2.95, 0.18, 2.55), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, fog: false }));
  earthLit.rotation.z = -0.32;
  earthGroup.add(earthLit);
  earthGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ map: tex.softGlow, color: 0x38bdf8, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  const orbArc = new THREE.Mesh(new THREE.RingGeometry(8.1, 8.38, 56), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: 0.24, depthWrite: false, fog: false }));
  orbArc.rotation.set(1.18, 0.28, -0.22);
  earthGroup.add(orbArc);
  vfxRoot.add(earthGroup);`
  )
);

edit('src/ui/UIManager.ts', 'svg-stage-node', (s) =>
  s
    .replace("{ id: 'stage_01', x: 45, y: 28, color: '#4ADE80' }", "{ id: 'stage_01', x: 54, y: 84, color: '#4ADE80' }")
    .replace("{ id: 'stage_02', x: 155, y: 14, color: '#C084FC' }", "{ id: 'stage_02', x: 162, y: 36, color: '#C084FC' }")
    .replace("{ id: 'stage_03', x: 260, y: 38, color: '#38BDF8' }", "{ id: 'stage_03', x: 272, y: 88, color: '#38BDF8' }")
    .replace("{ id: 'stage_04', x: 365, y: 16, color: '#F59E0B' }", "{ id: 'stage_04', x: 382, y: 34, color: '#F59E0B' }")
    .replace("{ id: 'endless', x: 460, y: 30, color: '#FB7185' }", "{ id: 'endless', x: 486, y: 66, color: '#FB7185' }")
    .replace(
      'stroke="#38BDF8" stroke-width="2.8" opacity="0.92"',
      'class="hyperlane-flow" stroke="#7DD3FC" stroke-width="2.6" stroke-dasharray="7 5" opacity="0.95"'
    )
    .replace(
      'return `${selRing}<circle cx="${pt.x}" cy="${pt.y}" r="${pt.id === \'endless\' ? 6 : 5}" fill="${open ? pt.color : \'#64748B\'}" stroke="#1A1033" stroke-width="1.5" />`;',
      'return `<g class="svg-stage-node" data-stage-id="${pt.id}">${selRing}<circle cx="${pt.x}" cy="${pt.y}" r="${pt.id === \'endless\' ? 11 : 9.5}" fill="${open ? pt.color : \'#64748B\'}" opacity="0.22" /><circle cx="${pt.x}" cy="${pt.y}" r="${pt.id === \'endless\' ? 7.2 : 6.2}" fill="${open ? pt.color : \'#64748B\'}" stroke="#1A1033" stroke-width="1.8" /><circle cx="${pt.x - 1.8}" cy="${pt.y - 1.8}" r="1.8" fill="#FFFFFF" opacity="0.65" /></g>`;'
    )
    .replace(
      '<svg class="constellation-svg" viewBox="0 0 500 56" preserveAspectRatio="none" aria-hidden="true">',
      '<svg class="constellation-svg" viewBox="0 0 540 120" preserveAspectRatio="xMidYMid meet" role="img" aria-label="星区战略星图"><defs><radialGradient id="nebA" cx="28%" cy="40%" r="58%"><stop offset="0%" stop-color="#38BDF8" stop-opacity="0.22"/><stop offset="100%" stop-color="#0F172A" stop-opacity="0"/></radialGradient><radialGradient id="nebB" cx="86%" cy="54%" r="42%"><stop offset="0%" stop-color="#FB7185" stop-opacity="0.24"/><stop offset="100%" stop-color="#0F172A" stop-opacity="0"/></radialGradient></defs><rect width="540" height="120" rx="10" fill="#0D1326"/><rect width="540" height="120" rx="10" fill="url(#nebA)"/><rect width="540" height="120" rx="10" fill="url(#nebB)"/><circle cx="-16" cy="62" r="50" fill="#1E293B" stroke="#38BDF8" stroke-opacity="0.35"/><ellipse cx="270" cy="62" rx="224" ry="44" fill="none" stroke="#334155" stroke-dasharray="4 6" opacity="0.5"/><circle cx="486" cy="66" r="20" fill="none" stroke="#FB7185" stroke-dasharray="3 4" opacity="0.5"/>'
    )
);

edit('src/style.css', '.hyperlane-flow', (s) =>
  s + `\n/* M3 Orbital Star Map & Enamel HUD Polish */
.constellation-svg { height: 112px; border-radius: 10px; border: 1.5px solid rgba(56,189,248,0.28); box-shadow: inset 0 0 20px rgba(8,12,26,0.85); }
.hyperlane-flow { animation: hyperDash 1.8s linear infinite; }
@keyframes hyperDash { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
.svg-stage-node { cursor: pointer; transition: filter 0.15s ease; }
.svg-stage-node:hover { filter: brightness(1.2) drop-shadow(0 0 6px rgba(125,211,252,0.6)); }
.commander-skills-dock { box-shadow: var(--bevel-plate), 0 0 18px rgba(56,189,248,0.16); }
.skill-dock-btn.ready { border-color: rgba(103,232,249,0.85); box-shadow: var(--bevel-btn), 0 0 10px rgba(56,189,248,0.24); }
.enamel-t4-card.branch-a { border-color: rgba(251,191,36,0.72); background: linear-gradient(168deg, #3b3355 0%, #241f38 100%); }
.enamel-t4-card.branch-b { border-color: rgba(56,189,248,0.72); background: linear-gradient(168deg, #243b5c 0%, #182740 100%); }
@media (max-width: 760px) { .constellation-svg { height: 96px; } }\n`
);

edit('tests/e2e.mjs', 'process.env.SHOT_DIR', (s) =>
  s
    .replace(/const SHOT_DIR =\s*\n\s*'[^']+';/, "const SHOT_DIR = process.env.SHOT_DIR || '/tmp/lunar_shots';")
    .replace(
      "executablePath: '/usr/bin/chromium',",
      "executablePath: ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find((p) => fs.existsSync(p)),"
    )
);

console.log('M3 & Art polish applied!');
