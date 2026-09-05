import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SceneMode } from './scene-types';

/** Two lightweight draws, attached to the chosen card. No global burst or extra light. */
export function createCardRitualEffects(low: boolean) {
  const group = new THREE.Group(); group.name = 'card-ritual-effects';
  const count = low ? 28 : 64;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 2 * 3);
  const phases = new Float32Array(count * 2);
  const perimeter = 2 * (1.43 + 2.39);
  for (let i = 0; i < count; i++) {
    let distance = i / count * perimeter;
    let x: number; let y: number;
    if (distance < 1.43) { x = distance - 0.715; y = 1.195; }
    else if ((distance -= 1.43) < 2.39) { x = 0.715; y = 1.195 - distance; }
    else if ((distance -= 2.39) < 1.43) { x = 0.715 - distance; y = -1.195; }
    else { distance -= 1.43; x = -0.715; y = -1.195 + distance; }
    positions.set([x * 0.95, y * 0.96, 0.065], i * 3);
    positions.set([x * 0.95, y * 0.96, -0.065], (i + count) * 3);
    phases[i] = phases[i + count] = i / count;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const dustMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 }, uReveal: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: `attribute float aPhase; uniform float uTime; uniform float uReveal; uniform float uPixelRatio; varying float vPhase;
      void main(){vPhase=aPhase;vec3 p=position; p.xy*=1.0+uReveal*.025; p.z+=sign(position.z)*uReveal*.07;
      vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.4+uReveal*1.7)*uPixelRatio,1.0,5.0);}`,
    fragmentShader: `uniform float uTime;uniform float uEnergy;uniform float uReveal;varying float vPhase;
      void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
      float sweep=pow(max(0.0,cos(vPhase*6.283-uTime*4.0)),8.0);
      float opacity=(uEnergy*sweep*.65+uReveal*.75)*exp(-r*r*5.0);
      gl_FragColor=vec4(vec3(1.0,.76,.38),opacity);}`,
  });
  const dust = new THREE.Points(geometry, dustMaterial); dust.frustumCulled = false; group.add(dust);
  // A narrow inner-edge halo stays within CARD_SIZE and preserves layout clearance.
  const outer = new THREE.Shape(); outer.moveTo(-0.715, -1.195); outer.lineTo(0.715, -1.195); outer.lineTo(0.715, 1.195); outer.lineTo(-0.715, 1.195); outer.closePath();
  const inner = new THREE.Path(); inner.moveTo(-0.68, -1.16); inner.lineTo(-0.68, 1.16); inner.lineTo(0.68, 1.16); inner.lineTo(0.68, -1.16); inner.closePath(); outer.holes.push(inner);
  // Both physical card faces receive the same thin rim. Normal depth testing hides
  // the far face as the card turns; the face at local -Z remains visible after a PI flip.
  const frontHalo = new THREE.ShapeGeometry(outer); frontHalo.translate(0, 0, 0.07);
  const backHalo = frontHalo.clone(); backHalo.translate(0, 0, -0.14);
  const haloGeometry = mergeGeometries([frontHalo, backHalo])!;
  frontHalo.dispose(); backHalo.dispose();
  const haloMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: 'varying vec2 vPosition;void main(){vPosition=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vPosition;uniform float uOpacity;void main(){
      float edge=max(abs(vPosition.x)-.73,abs(vPosition.y)-1.16);
      float falloff=1.0-smoothstep(0.0,.035,edge);gl_FragColor=vec4(1.0,.74,.36,falloff*uOpacity);}`,
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial); group.add(halo);
  group.visible = false;
  let previousMode: SceneMode | undefined;
  let previousAnchor: THREE.Object3D | undefined;
  let revealAge = Infinity;
  let time = 0;
  let disposed = false;
  return {
    group,
    update(dt: number, mode: SceneMode, anchor: THREE.Object3D | undefined, energy: number, reduced: boolean) {
      if (disposed) return;
      const elapsed = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.05) : 0;
      if (mode === 'revealing' && (previousMode !== mode || previousAnchor !== anchor)) revealAge = 0;
      previousMode = mode; previousAnchor = anchor;
      if (anchor && group.parent !== anchor) anchor.add(group);
      const activity = !reduced && mode === 'spread' && Number.isFinite(energy) ? THREE.MathUtils.clamp(energy, 0, 1) : 0;
      // Reduced motion consumes the trigger, preventing a delayed burst when re-enabled.
      if (reduced || (mode !== 'revealing' && mode !== 'result')) revealAge = Infinity;
      else revealAge += elapsed;
      const pulse = Number.isFinite(revealAge) && revealAge < 1.25 ? Math.sin(Math.min(1, revealAge / 0.22) * Math.PI / 2) * Math.exp(-Math.max(0, revealAge - 0.22) * 4.8) : 0;
      if (!reduced) time += elapsed;
      group.visible = !!anchor && anchor.visible && (activity > 0.015 || pulse > 0.005);
      dustMaterial.uniforms.uTime.value = time;
      dustMaterial.uniforms.uEnergy.value = activity;
      dustMaterial.uniforms.uReveal.value = pulse;
      haloMaterial.uniforms.uOpacity.value = pulse * 0.24;
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent(); group.clear(); geometry.dispose(); haloGeometry.dispose(); dustMaterial.dispose(); haloMaterial.dispose();
    },
  };
}
