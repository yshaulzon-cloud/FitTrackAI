import * as THREE from 'three';
import { makeMats, PAL, ID } from './toon.js';

// MakeHuman (game_engine rig) body: skinned mesh + toon regions for clothes.
// Units: MakeHuman decimetres -> metres. Rest pose: standing, y up, facing +z, body left = +x.
const S = 0.1;

export const PART = { torso: 0, head: 1, upper: 2, fore: 3, hand: 4, thigh: 5, calf: 6, foot: 7, index: 8, middle: 9, ring: 10, pinky: 11, thumb: 12 };

function partOf(name) {
  if (/^(index|middle|ring|pinky|thumb)/.test(name)) return PART[name.split('_')[0]];
  if (/^hand/.test(name)) return PART.hand;
  if (/^lowerarm/.test(name)) return PART.fore;
  if (/^upperarm/.test(name)) return PART.upper;
  if (/^thigh/.test(name)) return PART.thigh;
  if (/^calf/.test(name)) return PART.calf;
  if (/^(foot|ball)/.test(name)) return PART.foot;
  if (/^(neck|head)/.test(name)) return PART.head;
  return PART.torso;
}

// Clothes painted in rest space (gP = rest position, metres); r.x = body part of the dominant bone.
const BODY_REGIONS = /* glsl */`
uniform vec4 uTop;   // x: waist y, y: armhole |x|, z: neckline y, w: shorts hem y
uniform float uSoleY;
uniform float uShoeY;
int regionOf(vec3 r){
  int part = int(r.x + 0.5);
  float ax = abs(gP.x), y = gP.y, z = gP.z;
  if (part == 7) return 0;
  if (part >= 8) return (part == 9 || part == 11 || part == 12) ? 6 : 5;
  float armW = r.y, headW = r.z;
  if (armW < 0.5 && y < uTop.x && y > uTop.w) return 2;
  if (armW < 0.45 && headW < 0.5 && y >= uTop.x) {
    if (z > 0.0 && ax < 0.070 && y > uTop.z + 9.0 * ax * ax) return 0;
    if (z <= 0.0 && ax < 0.065 && y > uTop.z + 0.06) return 0;
    return 1;
  }
  return 0;
}`;

const SHOE_REGIONS = /* glsl */`
uniform float uSoleY;
uniform float uShoeY;
int regionOf(vec3 r){ if (gP.y > uShoeY) return 2; return gP.y < uSoleY ? 1 : 0; }`;

const EYE_REGIONS = /* glsl */`
uniform float uIrisZ;
int regionOf(vec3 r){ return gP.z > uIrisZ ? 1 : 0; }`;

export class MHBody {
  constructor(scene, data) {
    this.data = data;
    this.group = new THREE.Group();
    scene.add(this.group);
    const n = data.bones.length;
    this.index = {};
    data.bones.forEach((b, i) => { this.index[b.name] = i; });
    this.restHead = data.bones.map(b => new THREE.Vector3(...b.head).multiplyScalar(S));
    this.restTail = data.bones.map(b => new THREE.Vector3(...b.tail).multiplyScalar(S));
    this.parent = data.bones.map(b => (b.parent ? this.index[b.parent] : -1));
    this.bones = data.bones.map(b => { const bone = new THREE.Bone(); bone.name = b.name; return bone; });
    for (let i = 0; i < n; i++) {
      const p = this.parent[i];
      if (p < 0) { this.bones[i].position.copy(this.restHead[i]); this.group.add(this.bones[i]); }
      else { this.bones[i].position.copy(this.restHead[i]).sub(this.restHead[p]); this.bones[p].add(this.bones[i]); }
    }
    this.group.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);

    this.uniforms = {
      uTop: { value: new THREE.Vector4(0, 0, 0, 0) }, uSoleY: { value: 0 }, uShoeY: { value: 0 },
      uIrisZ: { value: 0 },
    };
    this.meshes = {};
    for (const m of data.meshes) this.meshes[m.name] = this.buildMesh(m);
    this.calibrate();
  }

  buildMesh(m) {
    const nv = m.coord.length / 3;
    const pos = new Float32Array(m.coord.length);
    for (let i = 0; i < pos.length; i++) pos[i] = m.coord[i] * S;
    // top-4 skin weights per vertex
    const per = Array.from({ length: nv }, () => []);
    for (const [bname, [verts, ws]] of Object.entries(m.weights)) {
      const bi = this.index[bname];
      if (bi === undefined) continue;
      for (let k = 0; k < verts.length; k++) per[verts[k]].push([bi, ws[k]]);
    }
    const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), ref = new Float32Array(nv * 3);
    for (let v = 0; v < nv; v++) {
      const l = per[v].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const tot = l.reduce((s, x) => s + x[1], 0) || 1;
      l.forEach(([bi, w], k) => { si[v * 4 + k] = bi; sw[v * 4 + k] = w / tot; });
      if (!l.length) { si[v * 4] = this.index.head; sw[v * 4] = 1; }
      ref[v * 3] = l.length ? partOf(this.data.bones[l[0][0]].name) : PART.head;
      for (const [bi, w] of l) {
        const p = partOf(this.data.bones[bi].name);
        if (p === PART.upper || p === PART.fore || p === PART.hand || p >= PART.index) ref[v * 3 + 1] += w / tot;
        if (p === PART.head) ref[v * 3 + 2] += w / tot;
      }
    }
    const idx = [];
    const F = m.faces;
    for (let f = 0; f < F.length; f += 4) {
      const [a, b, c, d] = [F[f], F[f + 1], F[f + 2], F[f + 3]];
      idx.push(a, b, c);
      if (d !== c && d !== a) idx.push(a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRest', new THREE.BufferAttribute(pos.slice(), 3));
    g.setAttribute('aRef', new THREE.BufferAttribute(ref, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();

    let mats;
    if (m.type === 'Body') {
      const fing = PAL.skin;
      mats = makeMats([
        { id: ID.skin, pal: PAL.skin }, { id: ID.top, pal: PAL.top, hi: 0.4 }, { id: ID.shorts, pal: PAL.shorts, hi: 0 },
        { id: ID.shoe, pal: PAL.shoe, hi: 0.5 }, { id: ID.sole, pal: PAL.sole }, { id: ID.fingerA, pal: fing },
        { id: ID.fingerB, pal: fing },
      ], BODY_REGIONS, { uniforms: this.uniforms });
    } else if (m.type === 'Clothes') {
      mats = makeMats([{ id: ID.shoe, pal: PAL.shoe, hi: 0.5 }, { id: ID.sole, pal: PAL.sole }, { id: ID.skin, pal: PAL.skin }], SHOE_REGIONS, { uniforms: this.uniforms });
    } else if (m.type === 'Hair') {
      mats = makeMats([{ id: ID.hair, pal: PAL.hair, hi: 0.5 }], undefined, { side: THREE.DoubleSide, hiT: 0.75 });
    } else if (m.type === 'Eyebrows') {
      mats = makeMats([{ id: ID.skin, pal: PAL.hair, hi: 0 }], undefined, { side: THREE.DoubleSide });
    } else {
      mats = makeMats([{ id: ID.eye, pal: PAL.white, hi: 0 }, { id: ID.eye, pal: PAL.line, hi: 0 }], EYE_REGIONS, { uniforms: this.uniforms });
    }
    const mesh = new THREE.SkinnedMesh(g, mats.color);
    mesh.userData.mats = mats;
    mesh.frustumCulled = false;
    mesh.bind(this.skeleton);
    this.group.add(mesh);
    return mesh;
  }

  head(name) { return this.restHead[this.index[name]]; }

  /** Derive clothing boundaries from the skeleton so they track body proportions. */
  calibrate() {
    const pelvis = this.head('pelvis'), sp1 = this.head('spine_01'), ua = this.head('upperarm_l');
    const neck = this.head('neck_01'), thigh = this.head('thigh_l'), calf = this.head('calf_l'), foot = this.head('foot_l');
    const waist = (pelvis.y + sp1.y) / 2 + 0.02;
    const hem = thigh.y - 0.45 * (thigh.y - calf.y);
    this.uniforms.uTop.value.set(waist, ua.x - 0.075, neck.y - 0.075, hem);
    let minY = Infinity;
    const P = (this.meshes.shoes06 || this.meshes.body).geometry.attributes.aRest.array;
    for (let i = 1; i < P.length; i += 3) minY = Math.min(minY, P[i]);
    this.floorY = minY;
    this.uniforms.uSoleY.value = minY + 0.017;
    this.uniforms.uShoeY.value = foot.y + 0.02;
    const eyes = this.meshes.HighPolyEyes?.geometry.attributes.aRest.array;
    if (eyes) { let mz = -Infinity; for (let i = 2; i < eyes.length; i += 3) mz = Math.max(mz, eyes[i]); this.uniforms.uIrisZ.value = mz - 0.0026; }
  }
}
