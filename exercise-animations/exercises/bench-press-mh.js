import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { simpleMats, mesh, makeMats, PAL, ID } from '../lib/toon.js';
import { v3 } from '../lib/character.js';
import { MHCharacter } from '../lib/mhcharacter.js';

const BAR_R = 0.0145;
const HEAD_PITCH = +(new URLSearchParams(location.search).get("hp") ?? 12);
const PAD_TOP = 0.43;

function box(w, h, d, r, mats, x, y, z) {
  const m = mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mats);
  m.matrix.makeTranslation(x, y, z);
  return m;
}
function cylZ(r, len, mats, z, seg = 64) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.rotateX(Math.PI / 2);
  const m = mesh(g, mats);
  m.matrix.makeTranslation(0, 0, z);
  return m;
}

// ---------------------------------------------------------------- timing
// top hold + inhale | controlled descent | brief touch | press | lockout + exhale
const T = { down0: 0.55, down1: 2.25, up0: 2.45, up1: 3.60 };
export const DURATION = 4.6;

const clamp01 = t => Math.min(1, Math.max(0, t));
const minJerk = s => { s = clamp01(s); return s * s * s * (10 - 15 * s + 6 * s * s); };

// press: minimum-jerk velocity with a mild sticking point at ~40% of the range
const press = (() => {
  const N = 400, v = [], P = [0];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    v.push(s * s * (1 - s) * (1 - s) * (1 - 0.32 * Math.exp(-(((s - 0.40) / 0.11) ** 2))));
  }
  for (let i = 1; i <= N; i++) P.push(P[i - 1] + (v[i - 1] + v[i]) / 2);
  return s => {
    const x = clamp01(s) * N, i = Math.min(N - 1, Math.floor(x));
    return (P[i] + (P[i + 1] - P[i]) * (x - i)) / P[N];
  };
})();

const keys = pts => t => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, v0] = pts[i], [t1, v1] = pts[i + 1];
    if (t <= t1) return v0 + (v1 - v0) * (1 - Math.cos(Math.PI * (t - t0) / (t1 - t0))) / 2;
  }
  return pts[pts.length - 1][1];
};
// brace with a full breath before the descent, hold it through the rep, exhale after lockout
const breathAt = keys([[0, 0], [0.08, 0], [0.50, 1], [3.55, 1], [4.25, 0], [4.6, 0]]);
// face: calm -> focused on the way down -> peak strain through the sticking point -> relaxed
const effortAt = keys([[0, 0], [0.55, 0.12], [2.25, 0.45], [2.45, 0.6], [2.95, 1.0], [3.40, 0.8], [3.75, 0.25], [4.2, 0], [4.6, 0]]);
const exhaleAt = keys([[0, 0], [3.55, 0], [3.80, 1], [4.15, 1], [4.45, 0], [4.6, 0]]);

function progressAt(t) {
  if (t < T.down0) return 1;
  if (t < T.down1) return 1 - minJerk((t - T.down0) / (T.down1 - T.down0));
  if (t < T.up0) return 0;
  if (t < T.up1) return press((t - T.up0) / (T.up1 - T.up0));
  return 1;
}

export async function build(scene) {
  const data = await (await fetch('./models/areto_man.json')).json();
  const ch = new MHCharacter(scene, data);

  // ---- bench: pad + T-legs
  const pad = simpleMats('pad'), frameM = simpleMats('frame');
  const bench = new THREE.Group();
  bench.add(box(1.18, 0.07, 0.29, 0.022, pad, -0.16, PAD_TOP - 0.035, 0));
  bench.add(box(1.02, 0.045, 0.075, 0.006, frameM, -0.16, PAD_TOP - 0.093, 0));
  for (const x of [-0.62, 0.30]) {
    bench.add(box(0.055, PAD_TOP - 0.13, 0.065, 0.006, frameM, x, (PAD_TOP - 0.13) / 2 + 0.03, 0));
    bench.add(box(0.07, 0.035, 0.44, 0.008, frameM, x, 0.0175, 0));
  }
  scene.add(bench);

  // ---- barbell
  const bar = new THREE.Group();
  const barM = simpleMats('bar'), plate = simpleMats('plate'), hub = simpleMats('hub');
  const plateIn = makeMats([{ id: ID.plateIn, pal: PAL.plateIn, hi: 0.6 }]);
  const collar = makeMats([{ id: ID.collar, pal: PAL.bar, hi: 0.6 }]);
  bar.add(cylZ(BAR_R, 1.31, barM, 0, 32));
  for (const s of [-1, 1]) {
    bar.add(cylZ(0.031, 0.02, collar, s * 0.645, 40));
    bar.add(cylZ(0.025, 0.36, barM, s * 0.835, 40));
    bar.add(cylZ(0.175, 0.042, plate, s * 0.681, 96));
    bar.add(cylZ(0.145, 0.0436, plateIn, s * 0.681, 96));
    bar.add(cylZ(0.046, 0.054, hub, s * 0.681, 48));
    bar.add(cylZ(0.036, 0.03, collar, s * 0.717, 40));
  }
  bar.matrixAutoUpdate = true;
  scene.add(bar);

  // ---- floor
  const floorM = makeMats([{ id: ID.floor, pal: PAL.floor, hi: 0 }]);
  const floorGeo = new THREE.CircleGeometry(1, 128).scale(1.25, 0.62, 1).rotateX(-Math.PI / 2);
  const floor = mesh(floorGeo, floorM);
  floor.matrix.makeTranslation(0.0, -0.001, 0);
  floor.matrixWorldNeedsUpdate = true;
  scene.add(floor);

  // ---- body set-up: lying supine (head toward -x), glutes and shoulder blades on the pad,
  // slight lumbar arch, scapulae retracted (in Character.shoulder), feet flat.
  const pelvis = { pos: v3(0.22, 0.54, 0), up: v3(-1, 0, 0), fwd: v3(0, 1, 0), support: PAD_TOP };
  const ARCH = { th0: 0.24, k: 1.30 };
  const GRIP_Z = 0.405, hm = ch.hand[0], GU = 0.62 * hm.palmLen, GV = hm.palmV + BAR_R - 0.001;
  const hands = [0, 1].map(i => ch.solveGrip(i, BAR_R, GU, GV));
  const gripFor = (C, i) => ({
    center: C.clone().setZ(i === 0 ? GRIP_Z : -GRIP_Z), axis: v3(0, 0, 1), u: GU, v: GV, ext: 4,
  });
  const poleFor = (i, p) => {
    const sz = i === 0 ? 1 : -1;
    return v3(0.62 - 0.27 * p, -0.45 + 0.10 * p, sz).normalize();
  };

  // bar touch point: mid-chest; lockout: above the shoulder joints, elbows ~6° short of locked
  ch.setSpine(pelvis, { ...ARCH });
  const xb = ch.shoulder(0).x + 0.125;
  const xt = ch.shoulder(0).x + 0.012;
  let lo = 0.8, hi = 1.4;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    const sol = ch.solveArm(0, gripFor(v3(xt, m, 0), 0), poleFor(0, 1));
    if (sol.flex > 6) lo = m; else hi = m;
  }
  const yt = lo;

  function barAt(p) {
    const x = xb + (xt - xb) * (1 - (1 - p) * (1 - p));
    const yb = ch.chestTop(xb) + BAR_R + 0.003;
    let y = yb + (yt - yb) * p;
    y = Math.max(y, ch.chestTop(x) + BAR_R + 0.003);
    return v3(x, y, 0);
  }

  function update(t) {
    const p = progressAt(t);
    const breath = breathAt(t), effort = effortAt(t);
    ch.setSpine(pelvis, { ...ARCH });
    const C = barAt(p);
    bar.position.copy(C);
    const arms = [0, 1].map(i => ({
      grip: gripFor(C, i), elbowPole: poleFor(i, p), radial: v3(0, 0, i === 0 ? -1 : 1), hand: hands[i],
    }));
    const legs = [0, 1].map(i => {
      const sz = i === 0 ? 1 : -1;
      return {
        ankle: v3(0.625, ch.ankleHeight, sz * 0.235),
        footDir: v3(1, 0, sz * 0.20).normalize(),
        kneePole: v3(0.55, 1, sz * 0.32).normalize(),
      };
    });
    const turn = 20 * Math.PI / 180;
    ch.setPose({ arms, legs, effort, headTurn: 20, headFace: v3(Math.sin(HEAD_PITCH * Math.PI / 180), Math.cos(HEAD_PITCH * Math.PI / 180), 0) });
    return { bar: C, debug: { ...ch.debug, p, breath, effort } };
  }

  window.__dbg = () => { const B = ch.body, o = {}; for (const n of ["clavicle_r","upperarm_r","lowerarm_r","hand_r"]) { const b = B.bones[B.index[n]]; const v = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); o[n] = v.toArray().map(x=>+x.toFixed(3)); } o.target = ch.debug.arms[0]; return o; };
  return { update, character: ch, info: { xb, xt, yt, GU, GV, L: ch.L } };
}

export const camera = { azimuth: 56, elevation: 24, target: [-0.09, 0.57, 0.10], half: 1.12 };
