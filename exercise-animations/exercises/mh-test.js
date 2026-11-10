import { MHBody } from '../lib/mhbody.js';

export const DURATION = 1;

export async function build(scene) {
  const data = await (await fetch('./models/areto_man.json')).json();
  const body = new MHBody(scene, data);
  return { update: () => ({ debug: { arms: [], legs: [] } }), info: { floorY: body.floorY, top: body.uniforms.uTop.value } };
}

export const camera = { azimuth: 30, elevation: 8, target: [0, 0.1, 0], half: 1.0 };
