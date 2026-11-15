import * as THREE from 'three';
import { MHBody, PART } from './mhbody.js';
import { ik2, frame, v3 } from './character.js';

const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const basis = (dir, ant) => {
  const y = dir.clone().normalize();
  const z = ant.clone().sub(y.clone().multiplyScalar(ant.dot(y)));
  if (z.lengthSq() < 1e-10) z.set(Math.abs(y.x) < 0.9 ? 1 : 0, Math.abs(y.x) < 0.9 ? 0 : 1, 0);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z);
};
const FINGERS = ['index', 'middle', 'ring', 'pinky'];

function segDist(p, ang, len, c) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const t = clamp((c.u - p.u) * dx + (c.v - p.v) * dy, 0, len);
  return Math.hypot(p.u + dx * t - c.u, p.v + dy * t - c.v);
}
function firstContact(f, lo, hi) {
  const step = 0.25 * DEG;
  let prev = lo;
  for (let a = lo; a <= hi; a += step) {
    if (f(a) <= 0) {
      let A = prev, B = a;
      for (let i = 0; i < 40; i++) { const m = (A + B) / 2; if (f(m) <= 0) B = m; else A = m; }
      return A;
    }
    prev = a;
  }
  return hi;
}

/**
 * MakeHuman-based character with the same driving API as the procedural Character:
 * setSpine(pelvis, spine) -> shoulder(i) / chestTop(x) / solveArm(i, grip, pole) -> setPose(p).
 * Every bone gets a target (head position, long axis, front axis); the skin follows.
 */
export class MHCharacter {
  constructor(scene, data) {
    this.body = new MHBody(scene, data);
    const B = this.body;
    this.H = name => B.head(name).clone();
    this.L = {
      upper: B.head('lowerarm_l').distanceTo(B.head('upperarm_l')),
      fore: B.head('hand_l').distanceTo(B.head('lowerarm_l')),
      thigh: B.head('calf_l').distanceTo(B.head('thigh_l')),
      shin: B.head('foot_l').distanceTo(B.head('calf_l')),
    };
    this.ankleHeight = B.head('foot_l').y - B.floorY;
    this.waistY = B.head('spine_01').y;
    this.spineLen = B.head('neck_01').y - this.waistY;
    this.spine = { th0: 0, k: 0 };
    this.buildHandModel();
    this.buildRestFrames();
    this.chestCandidates();
  }

  // ------------------------------------------------------------ rest analysis
  /** Hand space per side: U wrist->middle knuckle, V palm normal (flexion side), X radial (thumb side). */
  buildHandModel() {
    const H = this.H;
    this.hand = ['l', 'r'].map(sd => {
      const W = H('hand_' + sd);
      const U = H('middle_01_' + sd).sub(W).normalize();
      const across = H('index_01_' + sd).sub(H('pinky_01_' + sd));
      let X = across.clone().sub(U.clone().multiplyScalar(across.dot(U))).normalize();
      let V = new THREE.Vector3().crossVectors(X, U).normalize();
      // V must point to the side the fingers curl toward
      const m1 = H('middle_01_' + sd), m3 = H('middle_03_' + sd);
      if (m3.clone().sub(m1).dot(V) < 0) V.negate();
      X = new THREE.Vector3().crossVectors(U, V).normalize();
      if (H('thumb_01_' + sd).sub(W).dot(X) < 0) X.negate();
      const toHand = p => { const d = p.clone().sub(W); return { u: d.dot(U), x: d.dot(X), v: d.dot(V) }; };
      const tail = n => this.body.restTail[this.body.index[n]].clone();
      const fingers = FINGERS.map(f => {
        const j = [1, 2, 3].map(k => H(`${f}_0${k}_${sd}`));
        j.push(tail(`${f}_03_${sd}`));
        return { name: f, knuckle: toHand(j[0]), len: [0, 1, 2].map(k => j[k + 1].distanceTo(j[k])), r: 0.0088 };
      });
      const tj = [1, 2, 3].map(k => H(`thumb_0${k}_${sd}`));
      tj.push(tail(`thumb_03_${sd}`));
      const thumb = { cmc: toHand(tj[0]), len: [0, 1, 2].map(k => tj[k + 1].distanceTo(tj[k])), r: 0.0105 };
      // palm surface height (v) from the skin of the palm
      const P = this.body.meshes.body.geometry.attributes.aRest.array;
      const R = this.body.meshes.body.geometry.attributes.aRef.array;
      let palmV = 0.012;
      for (let i = 0; i < P.length / 3; i++) {
        if (Math.round(R[i * 3]) !== PART.hand) continue;
        const q = toHand(new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
        if (q.u > 0.03 && q.u < fingers[1].knuckle.u - 0.01 && Math.abs(q.x) < 0.02) palmV = Math.max(palmV, q.v);
      }
      return { U, V, X, fingers, thumb, palmV, palmLen: fingers[1].knuckle.u };
    });
  }

  /** Rest long-axis / front-axis per bone (rest bone rotations are identity). */
  buildRestFrames() {
    const B = this.body, n = B.bones.length;
    const kids = Array.from({ length: n }, () => []);
    B.parent.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
    this.restFrame = [];
    for (let i = 0; i < n; i++) {
      const name = B.bones[i].name;
      let dir;
      const chainChild = kids[i].find(c => /^(spine|neck|head|lowerarm|hand|calf|foot|ball|.*_0[23]_)/.test(B.bones[c].name) || kids[i].length === 1);
      if (/^(hand)/.test(name)) dir = B.head('middle_01_' + name.slice(-1)).sub(B.restHead[i]);
      else if (/^pelvis/.test(name)) dir = B.head('spine_01').sub(B.restHead[i]);
      else if (chainChild !== undefined) dir = B.restHead[chainChild].clone().sub(B.restHead[i]);
      else dir = B.restTail[i].clone().sub(B.restHead[i]);
      let ant = v3(0, 0, 1);
      const sd = name.endsWith('_l') ? 0 : name.endsWith('_r') ? 1 : -1;
      if (/^(lowerarm|hand|index|middle|ring|pinky|thumb)/.test(name)) ant = this.hand[sd].V.clone();
      if (/^(foot|ball)/.test(name)) ant = v3(0, 1, 0);
      this.restFrame.push(basis(dir, ant));
    }
  }

  chestCandidates() {
    const g = this.body.meshes.body.geometry, P = g.attributes.aRest.array, R = g.attributes.aRef.array;
    const nk = this.body.head('neck_01').y;
    this.chestIdx = [];
    for (let i = 0; i < P.length / 3; i++) {
      if (Math.round(R[i * 3]) !== PART.torso || R[i * 3 + 1] > 0.2) continue;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if (Math.abs(x) < 0.06 && z > 0.03 && y > this.waistY && y < nk) this.chestIdx.push(i);
    }
  }

  // ------------------------------------------------------------ deformation field for the trunk
  /** Rest point (MH space) -> world, through the lumbar/thoracic bend and the body placement. */
  F(p) {
    const { th0, k } = this.spine, pr = this.pelvisRest;
    let x = p.x - pr.x, y = p.y - this.waistY, z = p.z - pr.z;
    let Y, Z;
    if (y <= 0) { Y = y; Z = z; }
    else {
      const th = th0 - k * y;
      let cy, cz;
      if (Math.abs(k) < 1e-6) { cy = y * Math.cos(th0); cz = y * Math.sin(th0); }
      else { cy = (Math.sin(th0) - Math.sin(th)) / k; cz = (Math.cos(th) - Math.cos(th0)) / k; }
      Y = cy - z * Math.sin(th); Z = cz + z * Math.cos(th);
    }
    Y += this.waistY - pr.y;
    return this.origin.clone().addScaledVector(this.ax.x, x).addScaledVector(this.ax.y, Y).addScaledVector(this.ax.z, Z);
  }

  /** pelvis = { pos (x,z used; y auto-fits the back to `support`), up, fwd, support }, spine = { th0, k } */
  setSpine(pelvis, spine) {
    Object.assign(this.spine, spine);
    this.pelvisRest = this.body.head('pelvis');
    const up = pelvis.up.clone().normalize();
    const fwd = pelvis.fwd.clone().sub(up.clone().multiplyScalar(pelvis.fwd.dot(up))).normalize();
    this.up = up; this.fwd = fwd;
    this.ax = { x: new THREE.Vector3().crossVectors(up, fwd), y: up, z: fwd };
    this.origin = pelvis.pos.clone();
    if (pelvis.support !== undefined) {
      // lowest point of the back/glutes/head along -fwd must rest on the support plane (world y)
      const P = this.body.meshes.body.geometry.attributes.aRest.array;
      let low = Infinity;
      for (let i = 0; i < P.length; i += 9) {
        const q = this.F(new THREE.Vector3(P[i], P[i + 1], P[i + 2]));
        if (P[i + 1] > this.body.head('thigh_l').y - 0.08 && Math.abs(P[i]) < 0.17 && q.y < low) low = q.y;
      }
      this.origin.y += pelvis.support - low;
    }
  }

  shoulder(i) {
    const s = i === 0 ? 'r' : 'l';
    return this.F(this.body.head('upperarm_' + s)).addScaledVector(this.fwd, -0.008);
  }

  chestTop(xWorld) {
    const T = {};
    this.trunkTargets(T);
    this.applyPose(T);
    const mesh = this.body.meshes.body, v = new THREE.Vector3();
    let best = -Infinity;
    for (const i of this.chestIdx) {
      mesh.getVertexPosition(i, v);
      if (Math.abs(v.x - xWorld) < 0.015 && Math.abs(v.z) < 0.06 && v.y > best) best = v.y;
    }
    return best;
  }

  // ------------------------------------------------------------ hands
  /** Contact-solved grip of a bar (radius barR, centre (cu, cv) in hand space) for hand side sd (0 = right). */
  solveGrip(sd, barR, cu, cv, squeeze = 0.0008) {
    const hm = this.hand[sd === 0 ? 1 : 0];
    const fingers = hm.fingers.map(f => {
      const C = { u: cu, v: cv }, R = barR + f.r - squeeze;
      let p = { u: f.knuckle.u, v: f.knuckle.v }, phi = 0;
      const lim = [[0, 95], [0, 110], [0, 85]];
      return f.len.map((len, k) => {
        const fn = a => segDist(p, phi + a, len, C) - R;
        const th = fn(0) > 0 ? firstContact(fn, 0, lim[k][1] * DEG) : 0;
        phi += th;
        const out = { p: { ...p }, phi };
        p = { u: p.u + Math.cos(phi) * len, v: p.v + Math.sin(phi) * len };
        return out;
      });
    });
    // thumb: around the bar the other way, outside the curled fingers
    const t = hm.thumb, Rt = barR + 2 * 0.0088 + t.r - 2 * squeeze;
    const cmc = t.cmc, pt = th => ({ u: cu + Rt * Math.cos(th), v: cv + Rt * Math.sin(th) });
    let best = 200 * DEG, bestErr = Infinity;
    for (let a = 150; a <= 270; a += 0.5) {
      const q = pt(a * DEG);
      const err = Math.abs(Math.hypot(q.u - cmc.u, q.v - cmc.v, (fingers[0][0] ? hm.fingers[0].knuckle.x : 0) - cmc.x) - t.len[0]);
      if (err < bestErr) { bestErr = err; best = a * DEG; }
    }
    const chord = len => 2 * Math.asin(Math.min(1, len / (2 * Rt)));
    const a1 = best, a2 = a1 - chord(t.len[1]), a3 = a2 - chord(t.len[2]);
    const thumb = { cmc, mp: pt(a1), ip: pt(a2), tip: pt(a3), x: hm.fingers[0].knuckle.x };
    return { fingers, thumb };
  }

  /** As Character.solveArm: rotate the hand about the bar axis until the wrist is straight (+ext). */
  solveArm(i, grip, pole) {
    const S = this.shoulder(i);
    const A = grip.axis.clone().normalize();
    const R0 = v3(0, 1, 0).sub(A.clone().multiplyScalar(A.y)).normalize();
    const R1 = new THREE.Vector3().crossVectors(A, R0);
    this._ang ||= [0, 0];
    let ang = this._ang[i];
    const at = a => {
      const U = R0.clone().multiplyScalar(Math.cos(a)).addScaledVector(R1, Math.sin(a));
      const V = new THREE.Vector3().crossVectors(U, A);
      const W = grip.center.clone().addScaledVector(U, -grip.u).addScaledVector(V, -grip.v);
      return { U, V, ik: ik2(S, W, this.L.upper, this.L.fore, pole, [2, 150]) };
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
    this._ang[i] = ang;
    const f = r.ik.end.clone().sub(r.ik.E).normalize();
    return { S, E: r.ik.E, W: r.ik.end, U: r.U, V: r.V, flex: r.ik.flex,
      wristExt: Math.atan2(r.U.dot(R1), r.U.dot(R0)) / DEG - Math.atan2(f.dot(R1), f.dot(R0)) / DEG };
  }

  // ------------------------------------------------------------ posing
  target(T, name, head, dir, ant) { T[name] = { head, dir, ant }; }

  /** Trunk bones follow the deformation field F. */
  trunkTargets(T) {
    const B = this.body;
    for (const name of ['Root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'clavicle_l', 'clavicle_r']) {
      const i = B.index[name];
      if (i === undefined) continue;
      const h = B.restHead[i], fr = this.restFrame[i];
      const d = new THREE.Vector3().setFromMatrixColumn(fr, 1), a = new THREE.Vector3().setFromMatrixColumn(fr, 2);
      const head = this.F(h);
      this.target(T, name, head, this.F(h.clone().addScaledVector(d, 0.02)).sub(head), this.F(h.clone().addScaledVector(a, 0.02)).sub(head));
    }
  }

  setPose(p) {
    const T = {};
    this.trunkTargets(T);
    if (p.headFace) {
      const face = p.headFace.clone().normalize();
      let crown = this.up.clone().sub(face.clone().multiplyScalar(this.up.dot(face))).normalize();
      T.head.dir = crown; T.head.ant = face;
      const nk = T.neck_01;
      nk.dir = T.head.head.clone().sub(nk.head); nk.ant = face.clone();
    }
    if (p.headPitch) {
      const h = T.head, ax = this.ax.x.clone();
      h.dir.applyAxisAngle(ax, p.headPitch * DEG); h.ant.applyAxisAngle(ax, p.headPitch * DEG);
    }
    if (p.headTurn) {
      const h = T.head;
      h.ant.applyAxisAngle(h.dir.clone().normalize(), p.headTurn * DEG);
    }
    this.debug = { arms: [], legs: [] };
    [0, 1].forEach(i => {
      const s = i === 0 ? 'r' : 'l';
      const a = p.arms[i];
      const sol = this.solveArm(i, a.grip, a.elbowPole);
      const { S, E, W, U, V } = sol;
      // clavicle aims at the (retracted) shoulder
      this.target(T, 'clavicle_' + s, T['clavicle_' + s].head, S.clone().sub(T['clavicle_' + s].head), this.fwd.clone());
      const foreDir = W.clone().sub(E), ua = E.clone().sub(S).normalize();
      let biceps = foreDir.clone().sub(ua.clone().multiplyScalar(foreDir.dot(ua)));
      if (biceps.length() < 0.02) biceps = V.clone();
      this.target(T, 'upperarm_' + s, S, E.clone().sub(S), biceps);
      // forearm twist: start from the elbow-hinge-consistent orientation, then turn part of the way
      // toward the hand's pronation (the rest happens at the wrist) to avoid candy-wrapping
      const iu = this.body.index['upperarm_' + s], il = this.body.index['lowerarm_' + s];
      const Dup = basis(E.clone().sub(S), biceps).multiply(this.restFrame[iu].clone().transpose());
      const F0 = Dup.clone().multiply(this.restFrame[il]);
      const y0 = new THREE.Vector3().setFromMatrixColumn(F0, 1).normalize();
      const fdN = foreDir.clone().normalize();
      const swing = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(y0, fdN));
      const ant0 = new THREE.Vector3().setFromMatrixColumn(F0, 2).applyMatrix4(swing);
      ant0.sub(fdN.clone().multiplyScalar(ant0.dot(fdN))).normalize();
      const vP = V.clone().sub(fdN.clone().multiplyScalar(V.dot(fdN))).normalize();
      const tw = Math.atan2(new THREE.Vector3().crossVectors(ant0, vP).dot(fdN), ant0.dot(vP));
      const foreAnt = ant0.clone().applyAxisAngle(fdN, tw * 0.65);
      this.target(T, 'lowerarm_' + s, E, foreDir, foreAnt);
      this.target(T, 'hand_' + s, W, U, V);
      this.handTargets(T, i, W, U, V, a.grip.axis, a.hand);
      this.debug.arms.push({ S, E, W, flex: sol.flex, wristExt: sol.wristExt });

      const L = p.legs[i];
      const Hp = this.F(this.body.head('thigh_' + s));
      const leg = ik2(Hp, L.ankle, this.L.thigh, this.L.shin, L.kneePole, [0, 155]);
      const K = leg.E, Ak = leg.end;
      this.target(T, 'thigh_' + s, Hp, K.clone().sub(Hp), L.kneePole);
      this.target(T, 'calf_' + s, K, Ak.clone().sub(K), L.footDir);
      // foot flat on the floor, pointing along footDir
      const fd = L.footDir.clone().setY(0).normalize();
      const Rf = basis(v3(0, 1, 0), fd).multiply(basis(v3(0, 1, 0), v3(0, 0, 1)).transpose());
      for (const n of ['foot_' + s, 'ball_' + s]) {
        const bi = this.body.index[n];
        const off = this.body.restHead[bi].clone().sub(this.body.head('foot_' + s)).applyMatrix4(Rf);
        const fr = this.restFrame[bi];
        this.target(T, n, Ak.clone().add(off),
          new THREE.Vector3().setFromMatrixColumn(fr, 1).applyMatrix4(Rf), new THREE.Vector3().setFromMatrixColumn(fr, 2).applyMatrix4(Rf));
      }
      this.debug.legs.push({ H: Hp, K, A: Ak, flex: leg.flex });
    });
    this._lastTargets = T;
    this.applyPose(T);
  }

  handTargets(T, i, W, U, V, axis, hand) {
    const s = i === 0 ? 'r' : 'l';
    const hm = this.hand[i === 0 ? 1 : 0];
    const X = new THREE.Vector3().crossVectors(U, V).normalize();
    // radial side must face the thumb in world too: rest X is radial, keep handedness of the rest hand
    const restRight = new THREE.Vector3().crossVectors(hm.U, hm.V).dot(hm.X) > 0;
    if (!restRight) X.negate();
    const hp = (q) => W.clone().addScaledVector(U, q.u).addScaledVector(X, q.x).addScaledVector(V, q.v);
    hand.fingers.forEach((ph, fi) => {
      const f = hm.fingers[fi];
      ph.forEach((seg, k) => {
        const head = hp({ u: seg.p.u, x: f.knuckle.x, v: seg.p.v });
        const dir = U.clone().multiplyScalar(Math.cos(seg.phi)).addScaledVector(V, Math.sin(seg.phi));
        const nrm = U.clone().multiplyScalar(-Math.sin(seg.phi)).addScaledVector(V, Math.cos(seg.phi));
        this.target(T, `${f.name}_0${k + 1}_${s}`, head, dir, nrm);
      });
    });
    const th = hand.thumb;
    const c = hp(th.cmc), m = hp({ ...th.mp, x: th.x }), ip = hp({ ...th.ip, x: th.x }), tip = hp({ ...th.tip, x: th.x });
    const pts = [c, m, ip, tip];
    for (let k = 0; k < 3; k++) {
      const dir = pts[k + 1].clone().sub(pts[k]);
      const nrm = new THREE.Vector3().crossVectors(X, dir).normalize();
      if (nrm.dot(V) < 0 && k === 0) nrm.negate();
      this.target(T, `thumb_0${k + 1}_${s}`, pts[k], dir, k === 0 ? V.clone() : nrm.dot(V) < 0 ? nrm.negate() : nrm);
    }
  }

  /** World targets -> bone local transforms (bones without a target keep their rest offset to the parent). */
  applyPose(T) {
    const B = this.body, n = B.bones.length;
    const world = new Array(n);
    const m = new THREE.Matrix4(), inv = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const name = B.bones[i].name, p = B.parent[i];
      const t = T[name];
      if (t) {
        const D = basis(t.dir, t.ant).multiply(this.restFrame[i].clone().transpose());
        world[i] = D.setPosition(t.head);
      } else if (p >= 0) {
        world[i] = world[p].clone().multiply(m.makeTranslation(B.restHead[i].x - B.restHead[p].x, B.restHead[i].y - B.restHead[p].y, B.restHead[i].z - B.restHead[p].z));
      } else world[i] = new THREE.Matrix4().makeTranslation(B.restHead[i].x, B.restHead[i].y, B.restHead[i].z);
      const local = p >= 0 ? inv.copy(world[p]).invert().multiply(world[i]) : world[i].clone();
      local.decompose(B.bones[i].position, B.bones[i].quaternion, B.bones[i].scale);
    }
    B.group.updateMatrixWorld(true);
    B.skeleton.update();
  }
}
