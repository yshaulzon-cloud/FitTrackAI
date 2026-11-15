import * as THREE from 'three';

const FIELDS = ['rx', 'rz', 'ox', 'oz'];

function sampler(secs) {
  const s = secs.map(k => ({ t: k.t, rx: k.rx, rz: k.rz ?? k.rx, ox: k.ox ?? 0, oz: k.oz ?? 0 }));
  return (t) => {
    if (t <= s[0].t) return { ...s[0] };
    if (t >= s[s.length - 1].t) return { ...s[s.length - 1] };
    let i = 0;
    while (t > s[i + 1].t) i++;
    const p0 = s[Math.max(0, i - 1)], p1 = s[i], p2 = s[i + 1], p3 = s[Math.min(s.length - 1, i + 2)];
    const u = (t - p1.t) / (p2.t - p1.t);
    const u2 = u * u, u3 = u2 * u;
    const out = { t };
    for (const f of FIELDS) {
      // Catmull-Rom, tangents scaled for non-uniform spacing
      const m1 = (p2[f] - p0[f]) / Math.max(1e-6, p2.t - p0.t) * (p2.t - p1.t);
      const m2 = (p3[f] - p1[f]) / Math.max(1e-6, p3.t - p1.t) * (p2.t - p1.t);
      out[f] = (2 * u3 - 3 * u2 + 1) * p1[f] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[f] + (u3 - u2) * m2;
    }
    return out;
  };
}

/**
 * Lofted tube along local +Y from 0..L with elliptical sections.
 * Local frame: X lateral, Y along bone, Z "anterior". aRef = (x, y/L, z).
 */
export function loft(L, secs, o = {}) {
  const radial = o.radial ?? 40, rings = o.rings ?? 40, capRings = o.capRings ?? 10;
  const capA = o.capA ?? true, capB = o.capB ?? true;
  const S = sampler(secs);
  const ringsArr = [];
  const s0 = S(0), s1 = S(1);
  const clA = o.capLenA ?? Math.min(s0.rx, s0.rz) * 0.95;
  const clB = o.capLenB ?? Math.min(s1.rx, s1.rz) * 0.95;
  if (capA) for (let k = capRings - 1; k >= 1; k--) {
    const a = k / capRings * Math.PI / 2;
    ringsArr.push({ y: -Math.sin(a) * clA, k: Math.cos(a), ...s0 });
  }
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    ringsArr.push({ y: t * L, k: 1, ...S(t) });
  }
  if (capB) for (let k = 1; k <= capRings - 1; k++) {
    const a = k / capRings * Math.PI / 2;
    ringsArr.push({ y: L + Math.sin(a) * clB, k: Math.cos(a), ...s1 });
  }
  const pos = [], ref = [], idx = [];
  const clampZ = (z) => {
    if (o.minZ !== undefined) z = Math.max(z, o.minZ);
    if (o.maxZ !== undefined) z = Math.min(z, o.maxZ);
    return z;
  };
  // refMode 'angle': aRef = (cos θ, t, sin θ) so regions follow the surface around the section
  const angleRef = o.refMode === 'angle';
  const push = (x, y, z, th = 0, k = 1) => {
    pos.push(x, y, z);
    if (angleRef) ref.push(Math.cos(th) * k, y / L, Math.sin(th) * k);
    else ref.push(x, y / L, z);
  };
  let base = 0;
  if (capA) { push(s0.ox, -clA, clampZ(s0.oz), 0, 0); base = 1; }
  const se = 2 / (o.n ?? 2);
  const sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), se);
  for (const r of ringsArr) {
    for (let j = 0; j < radial; j++) {
      const th = j / radial * Math.PI * 2;
      push(r.ox + r.k * r.rx * sp(Math.cos(th)), r.y, clampZ(r.oz + r.k * r.rz * sp(Math.sin(th))), th, r.k);
    }
  }
  const nR = ringsArr.length;
  // winding: counter-clockwise seen from outside (outward normals)
  if (capA) for (let j = 0; j < radial; j++) idx.push(0, base + j, base + (j + 1) % radial);
  for (let i = 0; i < nR - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = base + i * radial + j, b = base + i * radial + (j + 1) % radial;
      const c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
  }
  if (capB) {
    const tip = pos.length / 3;
    push(s1.ox, L + clB, clampZ(s1.oz), 0, 0);
    const last = base + (nR - 1) * radial;
    for (let j = 0; j < radial; j++) idx.push(last + j, tip, last + (j + 1) % radial);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aRef', new THREE.Float32BufferAttribute(ref, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Two lofts with identical topology (e.g. relaxed / contracted muscle); blend with setLoftMorph. */
export function morphLoft(L, secsA, secsB, o = {}) {
  const a = loft(L, secsA, o), b = loft(L, secsB, o);
  a.userData.morphA = a.attributes.position.array.slice();
  a.userData.morphB = b.attributes.position.array.slice();
  a.userData.morphK = -1;
  return a;
}

export function setLoftMorph(geo, k) {
  if (Math.abs(geo.userData.morphK - k) < 1e-4) return;
  const A = geo.userData.morphA, B = geo.userData.morphB, P = geo.attributes.position.array;
  for (let i = 0; i < P.length; i++) P[i] = A[i] + (B[i] - A[i]) * k;
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  geo.userData.morphK = k;
}

export function ellipsoid(rx, ry, rz, seg = 40) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const p = g.attributes.position;
  g.setAttribute('aRef', p.clone());
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rx, p.getY(i) * ry, p.getZ(i) * rz);
  g.computeVertexNormals();
  return g;
}

const gauss = (d2, s) => Math.exp(-d2 / (2 * s * s));
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const R_HEAD = { x: 0.074, y: 0.110, z: 0.094 };

/** Head surface for unit-sphere direction n (local frame: X lateral, Y crown, Z face). */
export function headShape(nx, ny, nz) {
  let x = nx * R_HEAD.x, y = ny * R_HEAD.y, z = nz * R_HEAD.z;
  const nf = Math.max(nz, 0);
  // cranium fuller at the back, face plane flatter
  if (nz < 0) z *= 1.05 + 0.05 * sstep(-0.2, 0.6, ny);
  else z *= 0.96;
  // jaw: sides stay wide down to the jaw angle, chin narrows
  const low = sstep(-0.10, -0.95, ny);
  x *= 1 - low * (0.10 + 0.34 * sstep(-0.3, 0.8, nz) * sstep(-0.50, -0.95, ny));
  if (ny < -0.62) y = -0.62 * R_HEAD.y + (y + 0.62 * R_HEAD.y) * 0.82;
  z += 0.013 * sstep(-0.60, -0.92, ny) * nf * nf;
  x += 0.005 * Math.sign(nx) * gauss((ny + 0.55) ** 2, 0.12) * gauss((nz - 0.05) ** 2, 0.18);
  // nose: ridge from the bridge to the tip, then a sharp underside
  const ridge = gauss(nx * nx, 0.07) * sstep(0.20, 0.06, ny) * sstep(-0.40, -0.31, ny);
  z += ridge * (0.008 + 0.026 * sstep(0.10, -0.30, ny)) * nf ** 3;
  z += 0.008 * gauss((Math.abs(nx) - 0.12) ** 2, 0.05) * gauss((ny + 0.31) ** 2, 0.05) * nf ** 3;
  // brow ridge, eye sockets, cheekbones, lips
  z += 0.007 * gauss(nx * nx, 0.38) * gauss((ny - 0.18) ** 2, 0.06) * nf ** 3;
  z -= 0.005 * gauss((Math.abs(nx) - 0.36) ** 2, 0.10) * gauss((ny - 0.05) ** 2, 0.07) * nf;
  x += 0.004 * gauss((ny + 0.05) ** 2, 0.12) * nf * Math.sign(nx);
  z += 0.004 * gauss(nx * nx, 0.2) * gauss((ny + 0.53) ** 2, 0.06) * nf ** 4;
  return [x, y, z];
}

function shapedSphere(fn, w = 128, h = 96) {
  const g = new THREE.SphereGeometry(1, w, h);
  const p = g.attributes.position;
  g.setAttribute('aRef', p.clone());
  for (let i = 0; i < p.count; i++) p.setXYZ(i, ...fn(p.getX(i), p.getY(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

export function headGeometry() { return shapedSphere(headShape); }

/** Hair shell over the skull: volume on top, swept-up quiff at the front. */
export function hairGeometry() {
  return shapedSphere((nx, ny, nz) => {
    const [x, y, z] = headShape(nx, ny, nz);
    const q = Math.exp(-((nx / 0.50) ** 2 + ((ny - 0.70) / 0.32) ** 2 + ((nz - 0.62) / 0.42) ** 2));
    const hl = -0.30 + 0.80 * sstep(-0.55, 0.75, nz) + 0.10 * sstep(0.45, 0.85, Math.abs(nx)) * sstep(-0.2, 0.4, nz);
    const taper = sstep(hl, hl + 0.32, ny);
    const thick = 0.0025 + (0.004 + 0.010 * sstep(-0.1, 0.7, ny) + 0.020 * q) * taper;
    const len = Math.hypot(x, y, z);
    const k = 1 + thick / len;
    return [x * k, y * k + 0.008 * q * taper, z * k + 0.003 * q * taper];
  });
}

// hairline as a function of direction: low at the nape, around the ears, high at the forehead
const HAIRLINE = /* glsl */`
float hairline(vec3 r){
  float h = mix(-0.30, 0.50, smoothstep(-0.55, 0.75, r.z));
  h += 0.10 * smoothstep(0.45, 0.85, abs(r.x)) * smoothstep(-0.2, 0.4, r.z);
  return h;
}`;

// Head regions: 0 face, 1 hair (under shell), 2 sclera, 3 iris, 4 brow, 5 mouth, 6 lid line
// Features are placed in millimetre-true units (unit sphere scaled by the head radii).
// uEffort (0 relaxed … 1 max strain): brows drop and knit, eyes narrow, lips press.
export const HEAD_REGION_FN = HAIRLINE + /* glsl */`
uniform float uEffort;
uniform float uExhale;
int regionOf(vec3 r){
  if (r.y > hairline(r) - 0.01) return 1;
  if (r.z < 0.35) return 0;
  float E = clamp(uEffort, 0.0, 1.0);
  vec2 P = vec2(abs(r.x) * 0.074, r.y * 0.110);
  vec2 e = (P - vec2(0.0290, 0.0058 - 0.0004 * E)) / vec2(0.0120, 0.0040 * (1.0 - 0.32 * E));
  e.y -= 0.25 * e.x * e.x;
  float ea = dot(e, e);
  if (ea < 1.0) {
    vec2 ir = P - vec2(0.0284, 0.0064);
    if (dot(ir, ir) < 0.0036 * 0.0036) return 3;
    return 2;
  }
  if (ea < 1.75 + 0.6 * E && e.y > -0.10) return 6;
  // nose wings
  vec2 nw = P - vec2(0.0095, -0.0320);
  if (nw.x > 0.0005 && nw.y < 0.0010 && abs(length(nw) - 0.0048) < 0.0007) return 6;
  // brows: lower and knit toward the centre under effort
  vec2 bq = P - vec2(0.0290, 0.0190 - 0.0020 * E);
  bq.y -= 0.0030 * (1.0 - (bq.x / 0.017) * (bq.x / 0.017)) * (1.0 - 0.6 * E);
  bq.y += 0.0036 * E * clamp(-bq.x / 0.017, 0.0, 1.0);
  if (abs(bq.x) < 0.0170 && abs(bq.y) < 0.0021 * (1.0 - 0.5 * smoothstep(0.0, 0.017, bq.x))) return 4;
  // frown lines between the brows
  float g = smoothstep(0.45, 0.9, E);
  if (g > 0.0 && abs(P.x - 0.0042) < 0.00045 * g && P.y > 0.0125 && P.y < 0.0195) return 6;
  // mouth: lips parted on the exhale, otherwise a line (slight smile relaxed, flat and pressed under effort)
  float X = clamp(uExhale, 0.0, 1.0);
  if (X > 0.02 && r.z > 0.6) {
    vec2 mo = vec2(P.x / (0.0068 * X), (P.y + 0.0592) / (0.0036 * X));
    if (dot(mo, mo) < 1.0) return 6;
  }
  float curve = mix(5.0, 1.5, E);
  if (r.z > 0.6 && P.x < 0.0195 + 0.0025 * E && abs(P.y + 0.0590 - curve * P.x * P.x) < 0.0010 + 0.0005 * E) return 5;
  return 0;
}`;

// Hair shell regions: -1 discard (outside hairline), 0 hair, 1 strand highlight
export const HAIR_REGION_FN = HAIRLINE + /* glsl */`
int regionOf(vec3 r){
  float h = hairline(r);
  if (r.y < h) return -1;
  if (r.z > -0.15 && r.y > h + 0.14) {
    float u = atan(r.x, r.z) + 0.35 * r.y;
    float k = abs(fract(u * 2.2) - 0.5);
    if (k < 0.016 + 0.014 * smoothstep(0.3, 0.9, r.y)) return 1;
  }
  return 0;
}`;
