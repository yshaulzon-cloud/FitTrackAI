import * as THREE from 'three';
import { loft, morphLoft, setLoftMorph, ellipsoid, headGeometry, hairGeometry, HEAD_REGION_FN, HAIR_REGION_FN } from './geom.js';
import { makeMats, simpleMats, mesh, PAL, ID } from './toon.js';

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Right-handed frame: Y along yDir, Z toward zHint, X = Y×Z. */
export function frame(origin, yDir, zHint) {
  const y = yDir.clone().normalize();
  let z = zHint.clone().sub(y.clone().multiplyScalar(zHint.dot(y)));
  if (z.lengthSq() < 1e-10) z = Math.abs(y.x) < 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
  z.sub(y.clone().multiplyScalar(z.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
}

function place(m, M) { m.matrix.copy(M); m.matrixWorldNeedsUpdate = true; }

/** Two-bone IK with pole vector and hinge limits (degrees of flexion). */
export function ik2(A, T, l1, l2, pole, limit = [0, 155]) {
  const d = T.clone().sub(A);
  let dist = d.length();
  const minFlex = limit[0] * DEG, maxFlex = limit[1] * DEG;
  // hinge flexion f ⇒ reach = sqrt(l1²+l2²+2 l1 l2 cos f)
  const reach = f => Math.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos(f));
  dist = clamp(dist, reach(maxFlex), reach(minFlex));
  const dir = d.normalize();
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E = A.clone().addScaledVector(dir, x).addScaledVector(p, h);
  const end = A.clone().addScaledVector(dir, dist);
  const flex = Math.acos(clamp((dist * dist - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1)) / DEG;
  return { E, end, flex };
}

// ------------------------------------------------------------------ dimensions
export const DIM = {
  upperArm: 0.300, forearm: 0.262, thigh: 0.440, shin: 0.430,
  palmLen: 0.094, palmHalfThick: 0.0165,
  fingers: [ // radial offset x, knuckle u, phalanx lengths, radius
    { x: 0.0290, u: 0.0905, len: [0.044, 0.026, 0.020], r: 0.0093 },
    { x: 0.0098, u: 0.0935, len: [0.049, 0.030, 0.021], r: 0.0097 },
    { x: -0.0095, u: 0.0895, len: [0.046, 0.029, 0.021], r: 0.0092 },
    { x: -0.0270, u: 0.0815, len: [0.036, 0.021, 0.019], r: 0.0081 },
  ],
  thumb: { cmc: [-0.012, 0.024, 0.002], len: [0.044, 0.033, 0.027], r: 0.0108 },
};

// joint limits in degrees of flexion (constraints)
export const LIMITS = {
  mcp: [-20, 92], pip: [0, 110], dip: [0, 80],
  thumbMcp: [-30, 160], thumbIp: [-100, 80],
  elbow: [2, 150], knee: [0, 155],
};

// --------------------------------------------------------------- hand poses
// Each finger: [MCP, PIP, DIP] flexion in degrees. Thumb: metacarpal direction
// (u, x, v in hand space), then MCP/IP flexion inside the thumb plane.
export const HAND_POSES = {
  open:  { fingers: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
           thumb: { dir: [0.70, 0.70, 0.15], plane: [0, 0, 1], mcp: 5, ip: 5 } },
  fist:  { fingers: [[88, 105, 60], [90, 105, 60], [90, 105, 62], [88, 102, 62]],
           thumb: { dir: [0.75, 0.35, 0.55], plane: [0, 1, 0], mcp: 40, ip: 45 } },
  point: { fingers: [[0, 0, 0], [90, 105, 60], [90, 105, 62], [88, 102, 62]],
           thumb: { dir: [0.75, 0.35, 0.55], plane: [0, 1, 0], mcp: 40, ip: 40 } },
  pinch: { fingers: [[45, 40, 25], [20, 15, 10], [25, 20, 12], [30, 25, 15]],
           thumb: { dir: [0.78, 0.30, 0.55], plane: [0, 1, 0], mcp: 25, ip: 15 } },
};

const ease = { inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2 };
export function lerpHandPose(a, b, t, e = ease.inOutSine) {
  const k = e(clamp(t, 0, 1));
  const L = (x, y) => x + (y - x) * k;
  return {
    fingers: a.fingers.map((f, i) => f.map((ang, j) => L(ang, b.fingers[i][j]))),
    thumb: {
      dir: a.thumb.dir.map((x, i) => L(x, b.thumb.dir[i])),
      plane: a.thumb.plane.map((x, i) => L(x, b.thumb.plane[i])),
      mcp: L(a.thumb.mcp, b.thumb.mcp), ip: L(a.thumb.ip, b.thumb.ip),
    },
  };
}

// ---- contact-solved grip around a cylinder lying across the palm
function segDist(p, ang, len, c) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const t = clamp((c.u - p.u) * dx + (c.v - p.v) * dy, 0, len);
  const qx = p.u + dx * t - c.u, qy = p.v + dy * t - c.v;
  return Math.hypot(qx, qy);
}
function firstCrossing(f, a0, a1, wantNeg) {
  const step = (a1 > a0 ? 1 : -1) * 0.25 * DEG;
  let prev = a0;
  for (let a = a0; (step > 0 ? a <= a1 : a >= a1); a += step) {
    if (wantNeg ? f(a) <= 0 : f(a) >= 0) {
      let A = prev, B = a;
      for (let i = 0; i < 40; i++) {
        const m = (A + B) / 2;
        if (wantNeg ? f(m) <= 0 : f(m) >= 0) B = m; else A = m;
      }
      return A;
    }
    prev = a;
  }
  return a1;
}

/**
 * Solve finger + thumb joint angles so each phalanx wraps a bar of radius barR
 * centred at (u, v) in hand space (u: wrist→knuckles, v: out of the palm).
 */
export function solveCylinderGrip(barR, cu, cv, squeeze = 0.0008) {
  const fingers = DIM.fingers.map((f, fi) => {
    const R = barR + f.r - squeeze;
    const C = { u: cu, v: cv };
    let p = { u: f.u, v: 0 }, phi = 0;
    const lims = [LIMITS.mcp, LIMITS.pip, LIMITS.dip];
    return f.len.map((len, k) => {
      const fn = a => segDist(p, phi + a, len, C) - R;
      const [lo, hi] = lims[k].map(x => x * DEG);
      const th = fn(Math.max(lo, 0)) > 0 ? firstCrossing(fn, Math.max(lo, 0), hi, true) : Math.max(lo, 0);
      phi += th;
      p = { u: p.u + Math.cos(phi) * len, v: p.v + Math.sin(phi) * len };
      return th / DEG;
    });
  });
  // Thumb wraps the other way round the bar, outside the curled fingers: the MP joint sits on the
  // wrap circle at the proximal-palm side, and each phalanx is a chord of that circle (clockwise).
  const t = DIM.thumb;
  const Rt = barR + 2 * DIM.fingers[0].r + t.r - squeeze * 2;
  const thMp = 200 * DEG;
  const mp = { u: cu + Rt * Math.cos(thMp), x: 0.031, v: cv + Rt * Math.sin(thMp) };
  const chord = len => 2 * Math.asin(Math.min(1, len / (2 * Rt)));
  const thIp = thMp - chord(t.len[1]), thTip = thIp - chord(t.len[2]);
  const pt = th => ({ u: cu + Rt * Math.cos(th), v: cv + Rt * Math.sin(th) });
  const ip = pt(thIp), tip = pt(thTip);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const phi0 = Math.atan2(mp.v - t.cmc[2], mp.u - t.cmc[0]);
  const phi1 = Math.atan2(ip.v - mp.v, ip.u - mp.u);
  const phi2 = Math.atan2(tip.v - ip.v, tip.u - ip.u);
  return {
    fingers,
    thumb: { mp: [mp.u, mp.x, mp.v], plane: [0, 1, 0], inPlane: true,
      mcp: wrap(phi1 - phi0) / DEG, ip: wrap(phi2 - phi1) / DEG },
  };
}

// ------------------------------------------------------------------ character
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const MUSCLE_LINE = ['#8C573A', '#7A4A30', '#8C573A'];
const FOLD = ['#BDB8B0', '#A9A49C', '#BDB8B0'];

// Thin interior muscle lines, painted in angle space (phi: 0 lateral, +pi/2 front, -pi/2 back).
const upperArmLines = (lat) => /* glsl */`
int regionOf(vec3 r){
  float t = r.y;
  float phi = atan(r.z, ${lat.toFixed(1)} * r.x);
  float td = 0.47 - 0.40 * abs(phi);
  if (abs(phi) < 0.95 && t > 0.12 && abs(t - td) < 0.0085 * (1.0 - 0.55 * abs(phi))) return 1;
  float s = sin(3.14159 * clamp((t - 0.50) / 0.36, 0.0, 1.0));
  if (t > 0.50 && t < 0.86 && abs(phi + 0.22) < 0.045 * s) return 1;
  return 0;
}`;
const forearmLines = (rad) => /* glsl */`
int regionOf(vec3 r){
  float t = r.y;
  float phi = atan(r.z, ${rad.toFixed(1)} * r.x);
  float s = sin(3.14159 * clamp((t - 0.05) / 0.50, 0.0, 1.0));
  if (t > 0.05 && t < 0.55 && abs(phi - (0.55 - 0.9 * t)) < 0.05 * s) return 1;
  return 0;
}`;
const thighLines = (lat) => /* glsl */`
int regionOf(vec3 r){
  float t = r.y;
  if (t < 0.47) return 0;
  float phi = atan(r.z, ${lat.toFixed(1)} * r.x);
  vec2 m = vec2((phi - 1.5708) * 0.050, (t - 0.975) * 0.44);
  if (m.y < -0.012 && abs(length(m * vec2(1.0, 0.85)) - 0.027) < 0.0011) return 2;
  float s = sin(3.14159 * clamp((t - 0.70) / 0.22, 0.0, 1.0));
  if (t > 0.70 && t < 0.92 && abs(phi - (2.30 - 1.2 * (t - 0.70))) < 0.040 * s) return 2;
  return 1;
}`;
const shinLines = (lat) => /* glsl */`
int regionOf(vec3 r){
  float t = r.y;
  float phi = atan(r.z, ${lat.toFixed(1)} * r.x);
  float s = sin(3.14159 * clamp((t - 0.12) / 0.50, 0.0, 1.0));
  if (t > 0.12 && t < 0.62 && abs(phi - 1.15) < 0.035 * s) return 1;
  return 0;
}`;

export class Character {
  constructor(scene) {
    this.g = new THREE.Group();
    scene.add(this.g);
    const skin = simpleMats('skin');
    const shorts = simpleMats('shorts');
    const hide = (new URLSearchParams(globalThis.location?.search || '').get('hide') || '').split(',');
    let cur = '';
    const add = (geo, mats) => {
      const m = mesh(geo, mats); m.name = cur; m.visible = !hide.includes(cur); this.g.add(m); return m;
    };
    const tag = (n) => { cur = n; };
    this.spine = { th0: 0, k: 0, breath: 0 };

    // ---- torso (tank top with neckline, armholes and a couple of fabric folds)
    this.torsoL = 0.44;
    tag('torso');
    const torsoMats = makeMats(
      [{ id: ID.top, pal: PAL.top, hi: 0.5 }, { id: ID.skin, pal: PAL.skin }, { id: ID.top, pal: FOLD, hi: 0 }],
      /* glsl */`int regionOf(vec3 r){
        // r = (cos θ lateral, t along spine, sin θ anterior); gP = rest-pose torso-local position
        float ac = abs(r.x); float t = r.y; float s = r.z;
        vec3 q = vec3(abs(gP.x) - 0.164, gP.y - 0.362, gP.z + 0.030);
        if (length(q * vec3(1.0, 0.85, 1.15)) < 0.088) return 1;
        if (t > 0.72 && ac > 0.93 && s < 0.25) return 1;
        if (t > 0.94 && ac > 0.64) return 1;
        if (s > 0.0 && ac < 0.40 && t > 0.905 + 0.55 * ac * ac) return 1;
        if (s <= 0.0 && ac < 0.36 && t > 0.975 + 0.3 * ac * ac) return 1;
        float phi = atan(s, ac);
        if (phi > 0.15 && phi < 0.85) {
          float w = 0.0050 * sin(3.14159 * (phi - 0.15) / 0.70);
          for (int k = 0; k < 2; k++) {
            if (abs(t - (0.10 + 0.12 * float(k)) - 0.10 * (phi - 0.35)) < w) return 2;
          }
        }
        return 0; }`);
    this.torso = add(loft(this.torsoL, [
      { t: 0.00, rx: 0.158, rz: 0.104, oz: 0.004 },
      { t: 0.22, rx: 0.152, rz: 0.106, oz: 0.010 },
      { t: 0.48, rx: 0.164, rz: 0.116, oz: 0.020 },
      { t: 0.68, rx: 0.180, rz: 0.122, oz: 0.026 },
      { t: 0.85, rx: 0.192, rz: 0.112, oz: 0.014 },
      { t: 0.95, rx: 0.168, rz: 0.094, oz: 0.000 },
      { t: 1.00, rx: 0.090, rz: 0.066, oz: -0.004 },
    ], { radial: 72, rings: 60, capLenA: 0.03, capLenB: 0.03, refMode: 'angle' }), torsoMats);
    this.torsoRest = this.torso.geometry.attributes.position.array.slice();

    // ---- pelvis / shorts
    tag('pelvis');
    this.pelvis = add(loft(0.27, [
      { t: 0.00, rx: 0.150, rz: 0.098, oz: -0.006 },
      { t: 0.25, rx: 0.168, rz: 0.106, oz: -0.004 },
      { t: 0.60, rx: 0.170, rz: 0.108, oz: 0.000 },
      { t: 1.00, rx: 0.158, rz: 0.102, oz: 0.004 },
    ], { radial: 64, rings: 30, capLenA: 0.06, capLenB: 0.02 }), shorts);

    // ---- neck + head
    tag('neck');
    this.neck = add(loft(0.17, [
      { t: 0, rx: 0.070, rz: 0.060 }, { t: 0.35, rx: 0.057, rz: 0.053, oz: 0.003 }, { t: 1, rx: 0.051, rz: 0.049, oz: 0.006 },
    ], { radial: 40, rings: 16 }), skin);
    this.uEffort = { value: 0 };
    this.uExhale = { value: 0 };
    const headMats = makeMats([
      { id: ID.face, pal: PAL.skin, hi: 0 }, { id: ID.hair, pal: PAL.hair, hi: 0 },
      { id: ID.face, pal: PAL.white, hi: 0 }, { id: ID.face, pal: PAL.line, hi: 0 },
      { id: ID.face, pal: PAL.hair, hi: 0 }, { id: ID.face, pal: PAL.lip, hi: 0 },
      { id: ID.face, pal: PAL.line, hi: 0 },
    ], HEAD_REGION_FN, { shadeT: -0.15, uniforms: { uEffort: this.uEffort, uExhale: this.uExhale } });
    const hairMats = makeMats([
      { id: ID.hair, pal: PAL.hair, hi: 0.5 }, { id: ID.hair, pal: PAL.strand, hi: 0 },
    ], HAIR_REGION_FN, { hiT: 0.75, side: THREE.DoubleSide });
    tag('head');
    this.head = add(headGeometry(), headMats);
    this.hair = add(hairGeometry(), hairMats);
    const earMats = makeMats([{ id: ID.ear, pal: PAL.skin, hi: 0 }, { id: ID.ear, pal: ['#B57A50', '#A06640', '#B57A50'], hi: 0 }],
      `int regionOf(vec3 r){ return (r.z > 0.55 && pow((r.x + 0.12) / 0.55, 2.0) + pow((r.y + 0.05) / 0.62, 2.0) < 1.0) ? 1 : 0; }`);
    this.ears = [add(ellipsoid(0.019, 0.031, 0.010, 32), earMats), add(ellipsoid(0.019, 0.031, 0.010, 32), earMats)];

    // ---- limbs, per side (0 = body right, 1 = body left)
    this.side = [0, 1].map((i) => {
      const s = {};
      const lat = i === 0 ? 1 : -1;
      const lined = (fn, base = { id: ID.skin, pal: PAL.skin }) =>
        makeMats([base, { id: base.id, pal: MUSCLE_LINE, hi: 0 }], fn);
      tag('upper');
      // extended (triceps shortened) <-> flexed (biceps bunched, triceps stretched)
      s.upper = add(morphLoft(DIM.upperArm, [
        { t: 0.00, rx: 0.062, rz: 0.062 },
        { t: 0.16, rx: 0.059, rz: 0.061, oz: 0.002 },
        { t: 0.40, rx: 0.051, rz: 0.058, oz: -0.003 },
        { t: 0.62, rx: 0.047, rz: 0.053, oz: -0.002 },
        { t: 0.84, rx: 0.044, rz: 0.046 },
        { t: 1.00, rx: 0.042, rz: 0.040 },
      ], [
        { t: 0.00, rx: 0.062, rz: 0.062 },
        { t: 0.16, rx: 0.059, rz: 0.061, oz: 0.002 },
        { t: 0.40, rx: 0.050, rz: 0.059, oz: 0.008 },
        { t: 0.62, rx: 0.048, rz: 0.058, oz: 0.010 },
        { t: 0.84, rx: 0.044, rz: 0.047, oz: 0.003 },
        { t: 1.00, rx: 0.042, rz: 0.040 },
      ], { radial: 48, rings: 36, capLenA: 0.035, refMode: 'angle' }), lined(upperArmLines(lat)));
      tag('fore');
      s.fore = add(loft(DIM.forearm, [
        { t: 0.00, rx: 0.042, rz: 0.040 },
        { t: 0.18, rx: 0.048, rz: 0.044, oz: 0.003 },
        { t: 0.50, rx: 0.040, rz: 0.035 },
        { t: 1.00, rx: 0.029, rz: 0.021 },
      ], { radial: 48, rings: 36, refMode: 'angle' }), lined(forearmLines(lat)));
      tag('hand');
      s.palm = add(loft(DIM.palmLen, [
        { t: 0.00, rx: 0.029, rz: 0.019 },
        { t: 0.30, rx: 0.039, rz: 0.018 },
        { t: 0.75, rx: 0.044, rz: 0.016 },
        { t: 1.00, rx: 0.043, rz: 0.013 },
      ], { radial: 36, rings: 16, capLenB: 0.010 }), skin);
      s.thenar = add(ellipsoid(0.015, 0.025, 0.013, 24), skin);
      const fA = makeMats([{ id: ID.fingerA, pal: PAL.skin }]);
      const fB = makeMats([{ id: ID.fingerB, pal: PAL.skin }]);
      const thM = makeMats([{ id: ID.thumb, pal: PAL.skin }]);
      s.fingers = DIM.fingers.map((f, fi) => f.len.map((len, k) => add(loft(len, [
        { t: 0, rx: f.r * (k === 0 ? 1.06 : 1.0), rz: f.r * (k === 0 ? 0.98 : 0.94) },
        { t: 1, rx: f.r * (k === 2 ? 0.86 : 0.95), rz: f.r * (k === 2 ? 0.80 : 0.90) },
      ], { radial: 24, rings: 8, capRings: 7 }), fi % 2 ? fB : fA)));
      const tr = DIM.thumb.r;
      s.thumb = DIM.thumb.len.map((len, k) => add(loft(len, [
        { t: 0, rx: tr * (k === 0 ? 1.25 : 1.04), rz: tr * (k === 0 ? 1.15 : 0.95) },
        { t: 1, rx: tr * (k === 2 ? 0.86 : 1.0), rz: tr * (k === 2 ? 0.80 : 0.92) },
      ], { radial: 24, rings: 8, capRings: 7 }), k === 0 ? skin : thM));
      const thighMats = makeMats(
        [{ id: ID.shorts, pal: PAL.shorts, hi: 0 }, { id: ID.skin, pal: PAL.skin }, { id: ID.skin, pal: MUSCLE_LINE, hi: 0 }],
        thighLines(lat));
      tag('thigh');
      s.thigh = add(loft(DIM.thigh, [
        { t: 0.00, rx: 0.086, rz: 0.088 },
        { t: 0.30, rx: 0.084, rz: 0.086, oz: 0.004 },
        { t: 0.455, rx: 0.083, rz: 0.085, oz: 0.004 },
        { t: 0.47, rx: 0.073, rz: 0.076, oz: 0.004 },
        { t: 0.70, rx: 0.064, rz: 0.068, oz: 0.006 },
        { t: 1.00, rx: 0.050, rz: 0.052 },
      ], { radial: 48, rings: 60, capLenA: 0.04, refMode: 'angle' }), thighMats);
      tag('shin');
      s.shin = add(loft(DIM.shin, [
        { t: 0.00, rx: 0.050, rz: 0.052 },
        { t: 0.22, rx: 0.051, rz: 0.058, oz: -0.010 },
        { t: 0.55, rx: 0.038, rz: 0.040, oz: -0.003 },
        { t: 1.00, rx: 0.030, rz: 0.032 },
      ], { radial: 40, rings: 30, refMode: 'angle' }), lined(shinLines(lat)));
      const shoeMats = makeMats(
        [{ id: ID.shoe, pal: PAL.shoe, hi: 0.5 }, { id: ID.sole, pal: PAL.sole }],
        `int regionOf(vec3 r){ return r.z < 0.019 ? 1 : 0; }`);
      tag('shoe');
      s.shoe = add(loft(0.262, [
        { t: 0.00, rx: 0.038, rz: 0.046, oz: 0.046 },
        { t: 0.18, rx: 0.042, rz: 0.056, oz: 0.056 },
        { t: 0.42, rx: 0.046, rz: 0.048, oz: 0.046 },
        { t: 0.68, rx: 0.050, rz: 0.038, oz: 0.036 },
        { t: 0.88, rx: 0.048, rz: 0.032, oz: 0.030 },
        { t: 1.00, rx: 0.042, rz: 0.028, oz: 0.027 },
      ], { radial: 48, rings: 40, minZ: 0.0, capLenA: 0.025, capLenB: 0.03, n: 2.6 }), shoeMats);
      return s;
    });
  }

  // ---------------------------------------------------------------- spine
  /** Torso-local rest point -> bent torso-local point (sagittal bend; th0 = pitch at the waist, k = curvature). */
  bend(x, y, z) {
    const { th0, k } = this.spine, L = this.torsoL;
    const yc = clamp(y, 0, L);
    const th = th0 - k * yc;
    let cy, cz;
    if (Math.abs(k) < 1e-6) { cy = yc * Math.cos(th0); cz = yc * Math.sin(th0); }
    else { cy = (Math.sin(th0) - Math.sin(th)) / k; cz = (Math.cos(th) - Math.cos(th0)) / k; }
    cy += (y - yc) * Math.cos(th); cz += (y - yc) * Math.sin(th);
    return [x, cy - z * Math.sin(th), cz + z * Math.cos(th), th];
  }

  /** Place pelvis + torso, apply the spine arch and breathing (breath 0..1 expands the rib cage). */
  setSpine(pelvis, spine) {
    Object.assign(this.spine, spine);
    const up = pelvis.up.clone().normalize();
    const fwd = pelvis.fwd.clone().sub(up.clone().multiplyScalar(pelvis.fwd.dot(up))).normalize();
    this.Pm = frame(pelvis.pos, up, fwd);
    this.up = up; this.fwd = fwd;
    place(this.pelvis, frame(this.atPelvis(0, -0.13, 0), up, fwd));
    this.Mt = frame(this.atPelvis(0, 0.10, 0), up, fwd);
    place(this.torso, this.Mt);

    const R = this.torsoRest, P = this.torso.geometry.attributes.position.array, L = this.torsoL;
    const b = this.spine.breath ?? 0;
    for (let i = 0; i < R.length; i += 3) {
      let x = R[i], y = R[i + 1], z = R[i + 2];
      const w = b * sstep(0.22, 0.55, y / L) * (1 - sstep(0.90, 1.0, y / L));
      if (z > 0) z *= 1 + 0.045 * w;
      x *= 1 + 0.018 * w;
      const q = this.bend(x, y, z);
      P[i] = q[0]; P[i + 1] = q[1]; P[i + 2] = q[2];
    }
    this.torso.geometry.attributes.position.needsUpdate = true;
    this.torso.geometry.computeVertexNormals();
    this.torso.geometry.computeBoundingSphere();
  }

  atPelvis(x, y, z) { return v3(x, y, z).applyMatrix4(this.Pm); }
  atTorso(x, y, z) { const q = this.bend(x, y, z); return v3(q[0], q[1], q[2]).applyMatrix4(this.Mt); }
  shoulder(i) { return this.atTorso((i === 0 ? -1 : 1) * 0.164, 0.362, -0.030); }

  /** Highest point of the (bent, breathing) torso surface at a world x, near the midline. */
  chestTop(xWorld, halfWidth = 0.05) {
    const P = this.torso.geometry.attributes.position.array, M = this.Mt;
    const v = new THREE.Vector3();
    let best = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(M);
      if (Math.abs(v.x - xWorld) < 0.012 && Math.abs(v.z) < halfWidth && v.y > best) best = v.y;
    }
    return best;
  }

  /**
   * Arm holding a bar: the hand rotates about the bar axis until the wrist is straight
   * (hand in line with the forearm + `ext` degrees of extension), then 2-bone IK.
   * grip = { center (bar point under the hand), axis, u, v (bar position in hand space), ext }
   */
  solveArm(i, grip, pole) {
    const S = this.shoulder(i);
    const A = grip.axis.clone().normalize();
    const R0 = v3(0, 1, 0).sub(A.clone().multiplyScalar(A.y)).normalize();
    const R1 = new THREE.Vector3().crossVectors(A, R0);
    this._gripAng ||= [0, 0];
    let ang = this._gripAng[i];
    const at = (a) => {
      const U = R0.clone().multiplyScalar(Math.cos(a)).addScaledVector(R1, Math.sin(a));
      const V = new THREE.Vector3().crossVectors(U, A);
      const W = grip.center.clone().addScaledVector(U, -grip.u).addScaledVector(V, -grip.v);
      return { U, V, ik: ik2(S, W, DIM.upperArm, DIM.forearm, pole, LIMITS.elbow) };
    };
    let r;
    for (let it = 0; it < 20; it++) {
      r = at(ang);
      const f = r.ik.end.clone().sub(r.ik.E);
      const next = Math.atan2(f.dot(R1), f.dot(R0)) + (grip.ext ?? 0) * DEG;
      if (Math.abs(next - ang) < 1e-6) break;
      ang = next;
    }
    r = at(ang);
    this._gripAng[i] = ang;
    const f = r.ik.end.clone().sub(r.ik.E).normalize();
    return { S, E: r.ik.E, W: r.ik.end, U: r.U, V: r.V, flex: r.ik.flex,
      wristExt: Math.atan2(r.U.dot(R1), r.U.dot(R0)) / DEG - Math.atan2(f.dot(R1), f.dot(R0)) / DEG };
  }

  /**
   * Call setSpine() first.
   * p.arms[i] = { grip, elbowPole, radial, hand };  p.legs[i] = { ankle, footDir, kneePole }
   * p.effort 0..1 drives the facial expression;  p.headFwd / p.headUp optional
   */
  setPose(p) {
    const up = this.up, fwd = this.fwd;
    const neckBase = this.atTorso(0, 0.39, -0.012);
    const headUp = p.headUp ?? up, headFwd = p.headFwd ?? fwd;
    const headC = this.atPelvis(0, 0.735, 0.0);
    place(this.neck, frame(neckBase, headC.clone().sub(neckBase), fwd));
    place(this.head, frame(headC, headUp, headFwd));
    const hU = headUp.clone().normalize();
    const hF = headFwd.clone().sub(hU.clone().multiplyScalar(headFwd.dot(hU))).normalize();
    const hL = new THREE.Vector3().crossVectors(hU, hF);
    const hp = (x, y, z) => headC.clone().addScaledVector(hL, x).addScaledVector(hU, y).addScaledVector(hF, z);
    place(this.hair, frame(headC, headUp, headFwd));
    const earUp = hU.clone().addScaledVector(hF, -0.25);
    place(this.ears[0], frame(hp(-0.068, -0.010, -0.010), earUp, hL.clone().negate().addScaledVector(hF, -0.25)));
    place(this.ears[1], frame(hp(0.068, -0.010, -0.010), earUp, hL.clone().addScaledVector(hF, -0.25)));
    this.uEffort.value = p.effort ?? 0;
    this.uExhale.value = p.exhale ?? 0;

    this.debug = { arms: [], legs: [] };
    [0, 1].forEach(i => {
      const s = this.side[i];
      const sx = i === 0 ? -1 : 1;
      // ---- arm
      const a = p.arms[i];
      const sol = this.solveArm(i, a.grip, a.elbowPole);
      const { S, E, W, U, V } = sol;
      const foreDir = W.clone().sub(E);
      const ua = E.clone().sub(S).normalize();
      let biceps = foreDir.clone().sub(ua.clone().multiplyScalar(foreDir.dot(ua)));
      if (biceps.length() < 0.02) biceps = V.clone();
      setLoftMorph(s.upper.geometry, clamp((sol.flex - 8) / 112, 0, 1));
      place(s.upper, frame(S, E.clone().sub(S), biceps));
      place(s.fore, frame(E, foreDir, V));
      this.debug.arms.push({ S, E, W, flex: sol.flex, wristExt: sol.wristExt });
      this.poseHand(s, W, U, V, a.radial, a.hand);

      // ---- leg
      const L = p.legs[i];
      const H = this.atPelvis(sx * 0.090, 0, 0);
      const leg = ik2(H, L.ankle, DIM.thigh, DIM.shin, L.kneePole, LIMITS.knee);
      const K = leg.E, Ak = leg.end;
      place(s.thigh, frame(H, K.clone().sub(H), L.kneePole));
      place(s.shin, frame(K, Ak.clone().sub(K), L.footDir));
      const fd = L.footDir.clone().setY(0).normalize();
      const heel = Ak.clone().addScaledVector(fd, -0.062).setY(0);
      place(s.shoe, frame(heel, fd, v3(0, 1, 0)));
      this.debug.legs.push({ H, K, A: Ak, flex: leg.flex });
    });
  }

  poseHand(s, W, U, V, radial, hand) {
    const u = U.clone().normalize();
    const vv = V.clone().sub(u.clone().multiplyScalar(V.dot(u))).normalize();
    const xr = radial.clone().sub(u.clone().multiplyScalar(radial.dot(u))).sub(vv.clone().multiplyScalar(radial.dot(vv))).normalize();
    const hp = (uu, x, v) => W.clone().addScaledVector(u, uu).addScaledVector(xr, x).addScaledVector(vv, v);
    place(s.palm, frame(W, u, vv));
    place(s.thenar, frame(hp(0.030, 0.026, 0.006), u.clone().addScaledVector(xr, 0.35), vv));

    DIM.fingers.forEach((f, fi) => {
      let pos = hp(f.u, f.x, 0), phi = 0;
      f.len.forEach((len, k) => {
        phi += hand.fingers[fi][k] * DEG;
        const dir = u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(vv, Math.sin(phi));
        const nrm = u.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(vv, Math.cos(phi));
        place(s.fingers[fi][k], frame(pos, dir, nrm));
        pos = pos.clone().addScaledVector(dir, len);
      });
    });

    const t = DIM.thumb, th = hand.thumb;
    const cmc = hp(...t.cmc);
    let mp;
    if (th.mp) mp = hp(...th.mp);
    else {
      const d = u.clone().multiplyScalar(th.dir[0]).addScaledVector(xr, th.dir[1]).addScaledVector(vv, th.dir[2]).normalize();
      mp = cmc.clone().addScaledVector(d, t.len[0]);
    }
    const mDir = mp.clone().sub(cmc);
    place(s.thumb[0], frame(cmc, mDir, vv));
    if (th.inPlane) {
      let phi = Math.atan2(mDir.dot(vv), mDir.dot(u));
      let pos = mp.clone();
      [th.mcp, th.ip].forEach((ang, k) => {
        phi += ang * DEG;
        const dir = u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(vv, Math.sin(phi));
        const nrm = u.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(vv, Math.cos(phi));
        place(s.thumb[k + 1], frame(pos, dir, nrm));
        pos = pos.clone().addScaledVector(dir, t.len[k + 1]);
      });
    } else {
      const pn = u.clone().multiplyScalar(th.plane[0]).addScaledVector(xr, th.plane[1]).addScaledVector(vv, th.plane[2]).normalize();
      let dir = mDir.clone().normalize();
      let pos = mp.clone();
      [th.mcp, th.ip].forEach((ang, k) => {
        dir = dir.clone().applyAxisAngle(pn, ang * DEG);
        const nrm = new THREE.Vector3().crossVectors(pn, dir);
        place(s.thumb[k + 1], frame(pos, dir, nrm));
        pos = pos.clone().addScaledVector(dir, t.len[k + 1]);
      });
    }
  }
}
