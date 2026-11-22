// 3D-Vorschau für die Katalogseite – ohne fremde Bibliotheken, nur WebGL.
// Liest STL (binär/ASCII), OBJ und glTF/GLB (Dreiecke, Knoten-Transformationen, Grundfarbe).
// Nutzung: const info = await Model3D.mount(element, { url, format, up }); info.dims = [B, H, T] in mm
(() => {
  'use strict';

  // ---------- Matrizen (4×4, spaltenweise wie in WebGL) ----------
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const mul = (a, b) => {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  };
  const trans = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const rotX = t => { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
  const rotY = t => { const c = Math.cos(t), s = Math.sin(t); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const trs = n => {
    if (n.matrix) return n.matrix.slice();
    const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
    return [
      (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
      2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
      2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
      tx, ty, tz, 1];
  };
  const apply = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

  // ---------- Formate → Teile [{ pos: Float32Array (Dreiecke), color: [r,g,b] }] ----------
  function parseSTL(buf) {
    const dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if (n && 84 + n * 50 === buf.byteLength) {
      const p = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) p[i * 9 + k] = dv.getFloat32(84 + i * 50 + 12 + k * 4, true);
      return [{ pos: p }];
    }
    const out = [], re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, txt = new TextDecoder().decode(buf);
    for (let m; (m = re.exec(txt));) out.push(+m[1], +m[2], +m[3]);
    return [{ pos: new Float32Array(out) }];
  }

  function parseOBJ(buf) {
    const v = [], out = [];
    for (const line of new TextDecoder().decode(buf).split('\n')) {
      const t = line.trim().split(/\s+/);
      if (t[0] === 'v') v.push([+t[1], +t[2], +t[3]]);
      else if (t[0] === 'f') {
        const idx = t.slice(1).map(x => { const i = parseInt(x, 10); return i < 0 ? v.length + i : i - 1; });
        for (let k = 1; k + 1 < idx.length; k++) out.push(...v[idx[0]], ...v[idx[k]], ...v[idx[k + 1]]);
      }
    }
    return [{ pos: new Float32Array(out) }];
  }

  async function parseGLTF(buf, isGLB, base) {
    let json, bin;
    if (isGLB) {
      const dv = new DataView(buf);
      for (let off = 12; off + 8 <= buf.byteLength;) {
        const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), chunk = buf.slice(off + 8, off + 8 + len);
        if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004E4942) bin = chunk;
        off += 8 + len;
      }
    } else json = JSON.parse(new TextDecoder().decode(buf));
    if (!json) throw new Error('glTF ohne JSON');
    const buffers = await Promise.all((json.buffers || []).map(b => !b.uri ? bin
      : fetch(new URL(b.uri, base)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })));
    const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
    const acc = i => {
      const a = json.accessors[i], bv = json.bufferViews[a.bufferView], T = TYPES[a.componentType], C = SIZE[a.type], es = T.BYTES_PER_ELEMENT;
      const b = buffers[bv.buffer], off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || C * es;
      if (stride === C * es) return new T(b.slice(off, off + a.count * C * es));
      const out = new T(a.count * C);
      for (let k = 0; k < a.count; k++) out.set(new T(b.slice(off + k * stride, off + k * stride + C * es)), k * C);
      return out;
    };
    const parts = [];
    const visit = (ni, parent) => {
      const n = json.nodes[ni], m = mul(parent, trs(n));
      if (n.mesh !== undefined) for (const pr of json.meshes[n.mesh].primitives) {
        if ((pr.mode ?? 4) !== 4 || pr.attributes.POSITION === undefined) continue;
        const P = acc(pr.attributes.POSITION), idx = pr.indices !== undefined ? acc(pr.indices) : null;
        const cnt = idx ? idx.length : P.length / 3, pos = new Float32Array(cnt * 3);
        for (let k = 0; k < cnt; k++) { const j = idx ? idx[k] : k; pos.set(apply(m, P[j * 3], P[j * 3 + 1], P[j * 3 + 2]), k * 3); }
        const f = json.materials?.[pr.material]?.pbrMetallicRoughness?.baseColorFactor;
        parts.push({ pos, color: f ? f.slice(0, 3) : null });
      }
      for (const c of n.children || []) visit(c, m);
    };
    const scene = json.scenes?.[json.scene ?? 0];
    for (const ni of scene ? scene.nodes : (json.nodes || []).map((_, i) => i)) visit(ni, I());
    return parts;
  }

  const formatOf = name => { const x = name.split(/[?#]/)[0].split('.').pop().toLowerCase(); return x === 'stp' ? 'step' : x; };
  const VIEWABLE = ['stl', 'obj', 'glb', 'gltf'];

  // ---------- WebGL ----------
  const VS = `attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 mvp;uniform mat4 rot;varying vec3 vn;varying vec3 vc;
    void main(){vn=(rot*vec4(n,0.)).xyz;vc=c;gl_Position=mvp*vec4(p,1.);}`;
  const FS = `precision mediump float;varying vec3 vn;varying vec3 vc;
    void main(){vec3 n=normalize(vn);if(!gl_FrontFacing)n=-n;
    float d=.38+.55*max(dot(n,normalize(vec3(.35,.6,.75))),0.)+.22*max(dot(n,normalize(vec3(-.6,-.2,.5))),0.);
    gl_FragColor=vec4(vc*d,1.);}`;

  function build(parts, upZ, scale) {
    let tri = 0; for (const p of parts) tri += p.pos.length / 9;
    const P = new Float32Array(tri * 9), N = new Float32Array(tri * 9), C = new Float32Array(tri * 9);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let o = 0;
    for (const part of parts) {
      const col = part.color || [0.74, 0.78, 0.82], s = part.pos;
      for (let i = 0; i < s.length; i += 9) {
        const v = [0, 1, 2].map(k => {
          const x = s[i + k * 3] * scale, y = s[i + k * 3 + 1] * scale, z = s[i + k * 3 + 2] * scale;
          return upZ ? [x, z, -y] : [x, y, z];
        });
        const u = [0, 1, 2].map(k => v[1][k] - v[0][k]), w = [0, 1, 2].map(k => v[2][k] - v[0][k]);
        let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
        for (let k = 0; k < 3; k++) {
          for (let a = 0; a < 3; a++) {
            const x = v[k][a]; P[o + a] = x; N[o + a] = n[a]; C[o + a] = col[a];
            if (x < min[a]) min[a] = x; if (x > max[a]) max[a] = x;
          }
          o += 3;
        }
      }
    }
    return { P, N, C, count: tri * 3, min, max };
  }

  async function mount(el, { url, format, up } = {}) {
    const fmt = format || formatOf(url);
    if (!VIEWABLE.includes(fmt)) throw Object.assign(new Error(`Keine Vorschau für ${fmt.toUpperCase()}`), { code: 'format' });
    const buf = await fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
    const parts = fmt === 'stl' ? parseSTL(buf) : fmt === 'obj' ? parseOBJ(buf) : await parseGLTF(buf, fmt === 'glb', new URL(url, location.href));
    const isGL = fmt === 'glb' || fmt === 'gltf';
    const g = build(parts, (up || (fmt === 'stl' ? 'z' : 'y')) === 'z', isGL ? 1000 : 1);   // glTF in Metern → mm
    if (!g.count) throw new Error('Modell enthält keine Dreiecke');

    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D-Modell, mit der Maus drehbar');
    el.replaceChildren(canvas);
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) throw Object.assign(new Error('WebGL nicht verfügbar'), { code: 'webgl' });
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
    for (const [name, data] of [['p', g.P], ['n', g.N], ['c', g.C]]) {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    }
    const uMVP = gl.getUniformLocation(prog, 'mvp'), uRot = gl.getUniformLocation(prog, 'rot');
    gl.enable(gl.DEPTH_TEST);

    const center = [0, 1, 2].map(k => (g.min[k] + g.max[k]) / 2);
    const radius = Math.hypot(...[0, 1, 2].map(k => g.max[k] - g.min[k])) / 2 || 1;
    const FOV = 0.6, VIEWS = { iso: [-0.6, 0.45], front: [0, 0], side: [-Math.PI / 2, 0], top: [0, Math.PI / 2 - 0.001] };
    const st = { yaw: VIEWS.iso[0], pitch: VIEWS.iso[1], zoom: 1 };
    let queued = false;
    const draw = () => {
      queued = false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2), w = el.clientWidth, h = el.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const asp = canvas.width / Math.max(canvas.height, 1);
      const fit = radius / Math.sin(FOV / 2) / Math.min(1, asp) * 0.78;   // Kugel um das Modell, etwas enger für flache Teile
      const dist = fit * st.zoom, rot = mul(rotX(st.pitch), rotY(st.yaw));
      const mv = mul(trans(0, 0, -dist), mul(rot, trans(-center[0], -center[1], -center[2])));
      gl.uniformMatrix4fv(uMVP, false, new Float32Array(mul(persp(FOV, asp, dist / 50, dist + radius * 4), mv)));
      gl.uniformMatrix4fv(uRot, false, new Float32Array(rot));
      gl.drawArrays(gl.TRIANGLES, 0, g.count);
    };
    const redraw = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };

    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      st.yaw += (e.clientX - drag.x) * 0.01;
      st.pitch = Math.max(-1.55, Math.min(1.55, st.pitch + (e.clientY - drag.y) * 0.01));
      drag = { x: e.clientX, y: e.clientY }; redraw();
    });
    canvas.addEventListener('pointerup', () => { drag = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.2, Math.min(4, st.zoom * Math.exp(e.deltaY * 0.0015))); redraw(); }, { passive: false });
    canvas.addEventListener('dblclick', () => { Object.assign(st, { yaw: VIEWS.iso[0], pitch: VIEWS.iso[1], zoom: 1 }); redraw(); });
    new ResizeObserver(redraw).observe(el);
    redraw();

    const dims = [0, 1, 2].map(k => g.max[k] - g.min[k]);   // Breite (x), Höhe (y), Tiefe (z)
    return {
      dims, triangles: g.count / 3,
      view(name) { const v = VIEWS[name]; if (!v) return; Object.assign(st, { yaw: v[0], pitch: v[1], zoom: 1 }); redraw(); },
    };
  }

  window.Model3D = { mount, formatOf, VIEWABLE };
})();
