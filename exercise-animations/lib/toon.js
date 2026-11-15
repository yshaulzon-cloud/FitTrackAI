import * as THREE from 'three';

// Palette from exercise-illustration-style-guide.md — [base, shade, highlight]
export const PAL = {
  skin:   ['#C88A5E', '#A96E44', '#D09468'],
  top:    ['#D9D5CE', '#BCB7AF', '#E3E0DA'],
  shorts: ['#2E3033', '#232528', '#383B3F'],
  hair:   ['#2A2A2E', '#202024', '#38383E'],
  shoe:   ['#3C4652', '#2F3740', '#485463'],
  sole:   ['#F2F2F0', '#DADAD7', '#F7F7F5'],
  pad:    ['#8E9296', '#777B7F', '#9A9EA2'],
  frame:  ['#B7BBBF', '#9CA0A4', '#C3C6C9'],
  bar:    ['#6E7378', '#585C61', '#80858A'],
  plate:  ['#8A8F94', '#71767B', '#969BA0'],
  plateIn:['#7F8489', '#686D72', '#8B9095'],
  hub:    ['#6A6F74', '#565A5F', '#777C81'],
  line:   ['#2B2B2B', '#2B2B2B', '#2B2B2B'],
  white:  ['#F4F2EE', '#E2DFDA', '#F8F7F4'],
  lip:    ['#7A4630', '#6A3C28', '#7A4630'],
  strand: ['#4A4A52', '#3C3C43', '#4A4A52'],
  floor:  ['#EEEFF0', '#EEEFF0', '#EEEFF0'],
};

export const ID = {
  skin: 1, top: 2, shorts: 3, hair: 4, shoe: 5, sole: 6, pad: 7, frame: 8,
  bar: 9, plate: 10, plateIn: 11, hub: 12, collar: 13, floor: 14, ear: 15,
  fingerA: 16, fingerB: 17, thumb: 18, face: 19, eye: 20,
};

export const LIGHT = new THREE.Vector3(0.25, 1.0, 0.55).normalize();

const VS = /* glsl */`
  #include <common>
  #include <skinning_pars_vertex>
  attribute vec3 aRef; attribute vec3 aRest;
  varying vec3 vR; varying vec3 vN; varying vec3 vVN; varying float vDepth; varying vec3 vPos;
  void main(){
    vR = aRef; vPos = aRest;
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vec3 vn = normalize(normalMatrix * objectNormal);
    vVN = vn;
    vN = normalize((vec4(vn, 0.0) * viewMatrix).xyz);
    vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

/**
 * regions: [{ id, pal, hi? }]  — region 0 is the default.
 * regionFn: GLSL `int regionOf(vec3 r)` deciding the region from the aRef attribute.
 */
export function makeMats(regions, regionFn = 'int regionOf(vec3 r){ return 0; }', opts = {}) {
  const cols = [];
  for (const r of regions) for (const c of r.pal) cols.push(new THREE.Color(c));
  while (cols.length < 24) cols.push(new THREE.Color(0, 0, 0));
  const ids = regions.map(r => r.id);
  while (ids.length < 8) ids.push(0);
  const hiAmt = regions.map(r => r.hi ?? 1.0);
  while (hiAmt.length < 8) hiAmt.push(0);

  const color = new THREE.ShaderMaterial({
    uniforms: {
      uCols: { value: cols }, uLight: { value: LIGHT }, uHi: { value: hiAmt },
      uShadeT: { value: opts.shadeT ?? 0.0 }, uHiT: { value: opts.hiT ?? 0.82 },
      ...(opts.uniforms || {}),
    },
    vertexShader: VS,
    fragmentShader: /* glsl */`
      uniform vec3 uCols[24]; uniform vec3 uLight; uniform float uHi[8];
      uniform float uShadeT; uniform float uHiT;
      varying vec3 vR; varying vec3 vN; varying vec3 vVN; varying float vDepth; varying vec3 vPos;
      vec3 gP;
      ${regionFn}
      void main(){
        gP = vPos; int r = regionOf(vR);
        if (r < 0) discard;
        vec3 n = normalize(vN);
        float d = dot(n, uLight);
        float aa = max(fwidth(d), 1e-4);
        float sh = 1.0 - smoothstep(uShadeT - aa, uShadeT + aa, d);
        float hi = smoothstep(uHiT - aa, uHiT + aa, d) * uHi[r];
        vec3 c = mix(uCols[r*3], uCols[r*3+1], sh);
        c = mix(c, uCols[r*3+2], hi * (1.0 - sh));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const data = new THREE.ShaderMaterial({
    uniforms: { uIds: { value: ids }, ...(opts.uniforms || {}) },
    vertexShader: VS,
    fragmentShader: /* glsl */`
      uniform float uIds[8];
      varying vec3 vR; varying vec3 vN; varying vec3 vVN; varying float vDepth; varying vec3 vPos;
      vec3 gP;
      ${regionFn}
      void main(){
        gP = vPos; int r = regionOf(vR);
        if (r < 0) discard;
        vec3 n = normalize(vVN);
        gl_FragColor = vec4(uIds[r], vDepth, n.x, n.y);
      }`,
  });
  if (opts.side !== undefined) { color.side = opts.side; data.side = opts.side; }
  return { color, data };
}

export function simpleMats(name) {
  return makeMats([{ id: ID[name], pal: PAL[name], hi: name === 'skin' ? 1 : name === 'shorts' ? 0 : 0.6 }]);
}

export function addRef(geo) {
  if (!geo.attributes.aRef) geo.setAttribute('aRef', geo.attributes.position.clone());
  if (!geo.attributes.aRest) geo.setAttribute('aRest', geo.attributes.position.clone());
  return geo;
}

export function mesh(geo, mats) {
  addRef(geo);
  const m = new THREE.Mesh(geo, mats.color);
  m.userData.mats = mats;
  m.matrixAutoUpdate = false;
  return m;
}

// ---------------------------------------------------------------- renderer
export class ToonRenderer {
  constructor(canvas, size, opts = {}) {
    this.size = size;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    this.r.setPixelRatio(1);
    this.r.setSize(size, size, false);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.rtColor = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    });
    this.rtData = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    });
    this.lineRadius = opts.lineRadius ?? 3.6;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rtColor.texture }, tData: { value: this.rtData.texture },
        uPx: { value: new THREE.Vector2(1 / size, 1 / size) },
        uRad: { value: this.lineRadius }, uDepthThr: { value: opts.depthThr ?? 0.035 },
        uNormThr: { value: opts.normThr ?? 0.45 },
        uLine: { value: new THREE.Color(PAL.line[0]) },
        uBg: { value: new THREE.Color('#FFFFFF') },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tColor; uniform sampler2D tData; uniform vec2 uPx; uniform float uRad;
        uniform float uDepthThr; uniform float uNormThr; uniform vec3 uLine; uniform vec3 uBg;
        varying vec2 vUv;
        vec3 nrm(vec4 d){ return vec3(d.ba, sqrt(max(0.0, 1.0 - dot(d.ba, d.ba)))); }
        bool isHard(float id){ return id > 6.5 && id < 13.5; }
        bool isCloth(float id){ return id > 1.5 && id < 3.5; }
        bool isFloor(float id){ return abs(id - 14.0) < 0.5; }
        bool isFace(float id){ return abs(id - 19.0) < 0.5 || abs(id - 15.0) < 0.5 || abs(id - 20.0) < 0.5; }
        float edge(vec4 c, vec2 uv){
          vec4 n = texture2D(tData, uv);
          if (abs(n.r - c.r) > 0.5) {
            if ((isFloor(c.r) && n.r < 0.5) || (isFloor(n.r) && c.r < 0.5)) return 0.0;
            return 1.0;
          }
          if (c.r < 0.5) return 0.0;
          bool hard = isHard(c.r);
          float dthr = hard ? uDepthThr : (isCloth(c.r) ? uDepthThr * 2.8 : (isFace(c.r) ? uDepthThr * 0.45 : uDepthThr * 2.0));
          if (abs(n.g - c.g) > dthr) return 1.0;
          if (hard && dot(nrm(c), nrm(n)) < uNormThr) return 1.0;
          if (isFace(c.r) && dot(nrm(c), nrm(n)) < 0.30) return 1.0;
          return 0.0;
        }
        void main(){
          vec4 c = texture2D(tData, vUv);
          float e = 0.0;
          for (int i = 0; i < 16; i++) {
            float a = 6.2831853 * float(i) / 16.0;
            vec2 o = vec2(cos(a), sin(a)) * uPx;
            e = max(e, edge(c, vUv + o * uRad));
            e = max(e, edge(c, vUv + o * uRad * 0.5));
          }
          vec3 col = c.r < 0.5 ? uBg : texture2D(tColor, vUv).rgb;
          gl_FragColor = vec4(mix(col, uLine, e), 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    }));
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  render(scene, camera) {
    const r = this.r;
    const meshes = [];
    scene.traverse(o => { if (o.isMesh && o.userData.mats) meshes.push(o); });

    for (const m of meshes) m.material = m.userData.mats.color;
    r.setRenderTarget(this.rtColor);
    r.setClearColor(0xffffff, 1);
    r.clear();
    r.render(scene, camera);

    for (const m of meshes) m.material = m.userData.mats.data;
    r.setRenderTarget(this.rtData);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);

    for (const m of meshes) m.material = m.userData.mats.color;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }
}
