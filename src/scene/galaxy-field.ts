import * as THREE from 'three';
import type { SceneMode } from './scene-types';

const TAU = Math.PI * 2;

/** Four tilted spiral systems and a separate foreground current, rendered in five draws. */
export function createGalaxyField(low: boolean) {
  const group = new THREE.Group(); group.name = 'four-galaxy-field';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.ShaderMaterial[] = [];
  const configurations = [
    { x: -5.7, y: 2.1, z: -6.5, radius: 3.2, tilt: 0.92, roll: -0.55, color: '#93aae8' },
    { x: 5.2, y: 2.6, z: -8, radius: 3.8, tilt: 0.47, roll: 0.4, color: '#bda3df' },
    { x: -4.4, y: -3.7, z: -3.5, radius: 2.55, tilt: 1.15, roll: 0.62, color: '#c8aa77' },
    { x: 5.6, y: -2.7, z: -5, radius: 2.8, tilt: 0.72, roll: -0.8, color: '#708daf' },
  ];
  const vertexShader = `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aColor;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uEnergy;
    uniform float uCurrent;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      vec3 p = position;
      float a = uTime * (0.022 + aPhase * 0.004) * (1.0 - uCurrent);
      mat2 spin = mat2(cos(a), -sin(a), sin(a), cos(a));
      p.xy = spin * p.xy;
      p.z += sin(uTime * 0.24 + aPhase * 9.0) * (0.12 + uEnergy * 0.18);
      if (uCurrent > 0.5) {
        p.z = mod(position.z + uTime * 0.32, 10.0) - 6.0;
        p.xy += vec2(sin(uTime * 0.19 + aPhase), cos(uTime * 0.16 + aPhase)) * 0.22;
      }
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(aSize * uPixelRatio * 52.0 / max(1.0, -mv.z), 0.7, 3.5 * uPixelRatio);
      vColor = aColor;
      vTwinkle = 0.65 + 0.35 * pow(sin(uTime * 0.36 + aPhase * 13.0), 2.0);
    }
  `;
  const fragmentShader = `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      float radius = length(gl_PointCoord - 0.5) * 2.0;
      if (radius > 1.0) discard;
      float core = exp(-radius * radius * 9.0);
      float haze = (1.0 - smoothstep(0.0, 1.0, radius)) * 0.19;
      gl_FragColor = vec4(vColor, (core + haze) * uOpacity * vTwinkle);
    }
  `;
  const makePoints = (positions: Float32Array, colors: Float32Array, sizes: Float32Array, phases: Float32Array, current: boolean) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometries.push(geometry);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.7 }, uPixelRatio: { value: 1 }, uEnergy: { value: 0 }, uCurrent: { value: current ? 1 : 0 } },
    });
    materials.push(material);
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; group.add(points); return points;
  };
  const systems = configurations.map((config, system) => {
    const count = low ? 900 : 3800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const outerColor = new THREE.Color(config.color);
    const coreColor = new THREE.Color('#e3c99e');
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const seed = ((i * 73 + system * 37) % 997) / 997;
      const radial = Math.pow((i + 0.5) / count, 0.78);
      const r = radial * config.radius;
      const arm = i % 3;
      const a = i % 5 === 0 ? seed * TAU : arm / 3 * TAU + radial * 5.8 + (seed - 0.5) * (0.55 + radial * 0.65);
      positions.set([Math.cos(a) * r, Math.sin(a) * r, (seed - 0.5) * (0.08 + radial * 0.22)], i * 3);
      color.copy(coreColor).lerp(outerColor, Math.min(1, radial * 1.7));
      colors.set([color.r, color.g, color.b], i * 3);
      sizes[i] = (i % 23 === 0 ? 1.45 : 0.48 + seed * 0.64) * (low ? 1.18 : 1);
      phases[i] = seed * TAU;
    }
    const points = makePoints(positions, colors, sizes, phases, false);
    points.name = `galaxy-system-${system + 1}`;
    points.position.set(config.x, config.y, config.z);
    points.rotation.set(config.tilt, system % 2 ? 0.2 : -0.18, config.roll);
    return points;
  });
  const count = low ? 90 : 320;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963;
    const r = 3.1 + ((i * 37) % 113) / 113 * 4.7;
    positions.set([Math.cos(a) * r, Math.sin(a) * r * 0.7, i % 10], i * 3);
    colors.set([0.72, 0.57 + (i % 3) * 0.05, 0.37 + (i % 5) * 0.07], i * 3);
    sizes[i] = i % 7 === 0 ? 1.1 : 0.52; phases[i] = a;
  }
  const current = makePoints(positions, colors, sizes, phases, true);
  const shardCount = low ? 8 : 18;
  const shardGeometry = new THREE.OctahedronGeometry(0.038, 0);
  geometries.push(shardGeometry);
  const shardMaterial = new THREE.MeshStandardMaterial({color:'#a6b0be',emissive:'#394653',emissiveIntensity:0.08,metalness:0.38,roughness:0.48,flatShading:true,transparent:true,opacity:0.38,depthWrite:false});
  const shards = new THREE.InstancedMesh(shardGeometry,shardMaterial,shardCount);
  shards.name = 'restrained-metal-shards';
  shards.frustumCulled=false;group.add(shards);
  for (let i = 0; i < shardCount; i++) shards.setColorAt(i, new THREE.Color(i % 3 === 0 ? '#a08a66' : '#8a9aae'));
  const dummy = new THREE.Object3D();
  let time = 0;
  let speed = 1;
  let energy = 0;
  let lastIndex = -1;
  let lastMode: SceneMode = 'idle';
  let disposed = false;
  return {
    group,
    update(dt: number, mode: SceneMode, activeIndex: number, pointer: THREE.Vector2, reduced: boolean, narrow: boolean, pixelRatio: number) {
      if (disposed) return;
      const focus = mode === 'revealing' || mode === 'result';
      const ease = reduced ? 1 : 1 - Math.exp(-dt * 2.5);
      if (mode === 'spread' && lastMode === mode && lastIndex >= 0 && lastIndex !== activeIndex) energy = 0.55;
      lastIndex = activeIndex; lastMode = mode; energy *= Math.exp(-dt * 1.5);
      speed = THREE.MathUtils.lerp(speed, focus ? 0.1 : mode === 'burst' ? 1.25 : mode === 'sealed' ? 0.25 : 1 + energy, ease);
      if (!reduced) time += dt * speed;
      systems.forEach((system, i) => {
        const config = configurations[i];
        system.position.x = THREE.MathUtils.lerp(system.position.x, config.x * (narrow ? 0.64 : 1) + (reduced ? 0 : pointer.x * (0.12 + i * 0.06)), ease);
        system.position.y = THREE.MathUtils.lerp(system.position.y, config.y + (reduced ? 0 : pointer.y * 0.18), ease);
        // Upper-left system stays gentle behind the desktop intro copy.
        const opacity = mode === 'idle' && !narrow && i === 0 ? 0.28 : focus ? 0.34 : 0.72;
        system.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(system.material.uniforms.uOpacity.value, opacity, ease);
      });
      current.material.uniforms.uOpacity.value = focus ? 0.12 : 0.32;
      shardMaterial.opacity = focus ? 0.08 : 0.38;
      for(let i=0;i<shardCount;i++){
        const a=i*2.399963+time*0.025, r=3.3+(i*37%101)/101*3.5;
        dummy.position.set(Math.cos(a)*r,Math.sin(a)*r*0.72,((i*0.73+time*0.18)%8)-4);
        dummy.rotation.set(time*0.23+i,time*0.31+i*0.7,time*0.12);
        dummy.scale.setScalar(0.5+(i%5)*0.22);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);
      }
      shards.instanceMatrix.needsUpdate=true;
      materials.forEach((material) => {
        material.uniforms.uTime.value = time;
        material.uniforms.uEnergy.value = reduced ? 0 : energy;
        material.uniforms.uPixelRatio.value = pixelRatio;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      shardMaterial.dispose();
      group.removeFromParent(); group.clear();
    },
  };
}
