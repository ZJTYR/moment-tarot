'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { TarotSceneProps } from './scene-types';
import { createAstronomicalClock } from './astronomical-clock';
import { createGalaxyField } from './galaxy-field';
import { createCardRitualEffects } from './card-ritual-effects';
import { createIdleMotion } from './idle-motion';
import { cardTarget } from './card-layout';
import { CARD_SIZE, framePlacement, fitCardsInsideFrame, placeStage, type StageBounds } from './frame-layout';

export type { SceneMode, SceneCard, TarotSceneProps } from './scene-types';

const GOLD = '#c8aa72';
const TAU = Math.PI * 2;

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cardArtwork() {
  return canvasTexture(384, 640, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 384, 640);
    gradient.addColorStop(0, '#172331');
    gradient.addColorStop(0.5, '#070d18');
    gradient.addColorStop(1, '#1d1b28');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 384, 640);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 354, 610);
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(24, 24, 336, 592);
    ctx.translate(192, 320);
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      ctx.arc(0, 0, 54 + ring * 22, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.rotate((i / 12) * TAU);
      ctx.beginPath();
      ctx.moveTo(0, -138);
      ctx.lineTo(8, -151);
      ctx.lineTo(0, -164);
      ctx.lineTo(-8, -151);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(0, -91);
    ctx.lineTo(56, 0);
    ctx.lineTo(0, 91);
    ctx.lineTo(-56, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('A R C A N A', 0, 247);
  });
}

/** An imperative Three.js stage; animation and interaction never update React per frame. */
export default function TarotScene(props: TarotSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  useLayoutEffect(() => { live.current = props; });
  const [fallback, setFallback] = useState(false);
  const signature = JSON.stringify(props.cards.map(({ id, image, color }) => [id, image, color]));

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: props.quality !== 'low', powerPreference: 'high-performance' });
    } catch {
      queueMicrotask(() => { if (!disposed) setFallback(true); });
      return () => { disposed = true; };
    }
    queueMicrotask(() => { if (!disposed) setFallback(false); });
    let frame = 0;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const geometry = <T extends THREE.BufferGeometry>(item: T): T => { geometries.add(item); return item; };
    const material = <T extends THREE.Material>(item: T): T => { materials.add(item); return item; };
    const texture = (item: THREE.Texture) => { textures.add(item); return item; };
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const stage = new THREE.Group();
    scene.add(stage);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 1.4, 14);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight('#b3c8ec', '#17101c', 2.1));
    const key = new THREE.DirectionalLight('#ffe2a4', 3.3);
    key.position.set(-4, 6, 6); scene.add(key);
    const blue = new THREE.PointLight('#436ddd', 34, 20);
    blue.position.set(5, 1, 3); scene.add(blue);
    const warm = new THREE.PointLight('#d19749', 20, 16);
    warm.position.set(-5, -2, 2); scene.add(warm);

    const clockwork = createAstronomicalClock(props.quality === 'low');
    stage.add(clockwork.group);
    const galaxies = createGalaxyField(props.quality === 'low');
    scene.add(galaxies.group);

    const cardRitual = createCardRitualEffects(props.quality === 'low');
    const loader = new THREE.TextureLoader();
    loader.load('/art/zodiac-medallions.webp', atlas => {
      if (disposed) { atlas.dispose(); return; }
      atlas.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      clockwork.installZodiacAtlas(atlas);
    }, undefined, () => { /* The bronze bodies remain when the atlas cannot load. */ });
    for (const figure of ['goddess', 'angel', 'devil'] as const) {
      loader.load(`/art/fate-theatre/${figure}.webp`, (sculpture) => {
        if (disposed) { sculpture.dispose(); return; }
        sculpture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        clockwork.installTheatreFigure(figure, sculpture);
      }, undefined, () => { /* The pierced wheel remains usable if a sculpture fails to load. */ });
      loader.load(`/art/fate-theatre/${figure}-back.webp`, (sculpture) => {
        if (disposed) { sculpture.dispose(); return; }
        sculpture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        clockwork.installTheatreFigureBack(figure, sculpture);
      }, undefined, () => { /* Retain the carved bronze reverse if its artwork is unavailable. */ });
    }
    const placeholder = texture(cardArtwork());
    const backMaterial = material(new THREE.MeshStandardMaterial({ map: placeholder, roughness: 0.65, metalness: 0.12 }));
    const imageCache = new Map<string, THREE.Texture>();
    const imageWaiters = new Map<string, THREE.MeshStandardMaterial[]>();
    const load = (url: string, target: THREE.MeshStandardMaterial) => {
      if (!url) return;
      const cached = imageCache.get(url);
      if (cached) { target.map = cached; target.needsUpdate = true; return; }
      const pending = imageWaiters.get(url);
      if (pending) { pending.push(target); return; }
      imageWaiters.set(url, [target]);
      loader.load(url, (loaded) => {
        if (disposed) { loaded.dispose(); return; }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        texture(loaded); imageCache.set(url, loaded);
        imageWaiters.get(url)?.forEach((waiting) => { waiting.map = loaded; waiting.needsUpdate = true; });
        imageWaiters.delete(url);
      }, undefined, () => { imageWaiters.delete(url); /* Keep procedural artwork. */ });
    };
    load('/art/card-back.png', backMaterial);
    const cardGeometry = geometry(new THREE.BoxGeometry(CARD_SIZE.width, CARD_SIZE.height, 0.055));
    const planeGeometry = geometry(new THREE.PlaneGeometry(1.38, 2.34));
    const edgeMaterial = material(new THREE.MeshStandardMaterial({ color: '#987d4e', metalness: 0.75, roughness: 0.36 }));
    const borderGeometry = geometry(new THREE.EdgesGeometry(cardGeometry));
    const borderMaterial = material(new THREE.LineBasicMaterial({ color: '#d2b783', transparent: true, opacity: 0.66 }));
    const table = new THREE.Group();
    stage.add(table);
    const cards = live.current.cards.map((card, index) => {
      const group = new THREE.Group();
      group.userData.index = index;
      const body = new THREE.Mesh(cardGeometry, edgeMaterial);
      body.userData.index = index;
      group.add(body);
      const faceMaterial = material(new THREE.MeshStandardMaterial({ map: placeholder, color: '#ffffff', metalness: 0.08, roughness: 0.8 }));
      load(card.image, faceMaterial);
      const face = new THREE.Mesh(planeGeometry, faceMaterial);
      face.position.z = -0.029; face.rotation.y = Math.PI;
      const back = new THREE.Mesh(planeGeometry, backMaterial);
      back.position.z = 0.029;
      group.add(face, back, new THREE.LineSegments(borderGeometry, borderMaterial));
      table.add(group);
      return { group, body, id: card.id };
    });

    const burstCount = props.quality === 'low' ? 110 : 260;
    const burstPositions = new Float32Array(burstCount * 3);
    const burstGeometry = geometry(new THREE.BufferGeometry());
    burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
    const burstMaterial = material(new THREE.PointsMaterial({ color: '#e5c88f', size: 0.055, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const burst = new THREE.Points(burstGeometry, burstMaterial);
    stage.add(burst);
    const revealGroup = new THREE.Group();
    stage.add(revealGroup);
    const glowTexture = texture(canvasTexture(256, 256, (ctx) => {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255,255,255,0.48)');
      gradient.addColorStop(0.28, 'rgba(255,255,255,0.22)');
      gradient.addColorStop(0.65, 'rgba(255,255,255,0.08)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    }));
    const glowMaterial = material(new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const glow = new THREE.Mesh(geometry(new THREE.PlaneGeometry(7, 7)), glowMaterial);
    glow.position.set(0, 0.15, 2.1);
    revealGroup.add(glow);
    const revealLight = new THREE.PointLight(GOLD, 0, 12);
    revealLight.position.set(0, 1.2, 1.5); revealGroup.add(revealLight);
    const revealRings = [0, 1].map(() => {
      const ring = new THREE.Mesh(geometry(new THREE.TorusGeometry(1, 0.009, 6, 140)), material(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
      ring.position.set(0, 0.15, 2.6); revealGroup.add(ring); return ring;
    });
    const trailCount = props.quality === 'low' ? 18 : 36;
    const trailPositions = new Float32Array(trailCount * 6);
    const trailGeometry = geometry(new THREE.BufferGeometry());
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = material(new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    revealGroup.add(new THREE.LineSegments(trailGeometry, trailMaterial));
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reducedQuery.matches;
    const onMotion = () => { reduced = reducedQuery.matches; };
    reducedQuery.addEventListener('change', onMotion);
    let narrow = false;
    let viewportWidth = 1;
    let viewportHeight = 1;
    let stageBounds: StageBounds | undefined;
    let layoutSignature = '';
    const measureStageBounds = () => {
      const rect = container.getBoundingClientRect();
      const experience = container.closest('.experience');
      const idle = live.current.mode === 'idle';
      let top = rect.top + 12;
      for (const selector of !narrow ? ['.topbar'] : idle ? ['.topbar', '.intro'] : ['.topbar', '.collection', '.stage-label']) {
        const element = experience?.querySelector<HTMLElement>(selector);
        if (element && !element.classList.contains('hidden')) top = Math.max(top, element.getBoundingClientRect().bottom + 16);
      }
      const controls = experience?.querySelector<HTMLElement>('.bottom-controls')?.getBoundingClientRect();
      stageBounds = {
        left: Math.max(0, -rect.left) + 16,
        right: Math.min(rect.width, document.documentElement.clientWidth - rect.left) - 16,
        top: top - rect.top,
        bottom: Math.min(rect.bottom - 12, (controls?.top ?? rect.bottom) - 22) - rect.top,
      };
    };
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      viewportWidth = Math.max(width, 1); viewportHeight = Math.max(height, 1);
      narrow = document.documentElement.clientWidth < 761;
      measureStageBounds();
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.position.z = camera.aspect < 1 ? 15.3 : 13.8;
      camera.fov = camera.aspect < 0.7 ? 48 : 39;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, props.quality === 'low' ? 1 : props.quality === 'high' ? 2 : 1.6));
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    container.closest('.experience')?.querySelectorAll('.intro, .bottom-controls, .collection, .stage-label').forEach(element => observer.observe(element));
    resize();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let startX = 0;
    let startY = 0;
    let browseX = 0;
    let pointerId: number | null = null;
    let dragged = false;
    const hit = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(cards.filter((card) => card.group.visible).map((card) => card.body), false)[0];
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      (live.current.idleControl?.current ?? defaultIdleControl).enabled = false;
      pointerId = event.pointerId; startX = event.clientX; browseX = event.clientX; startY = event.clientY; dragged = false;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1);
      if (pointerId === event.pointerId) {
        if (Math.abs(event.clientX - startX) > 12 || Math.abs(event.clientY - startY) > 12) dragged = true;
        const travel = event.clientX - browseX;
        if (Math.abs(travel) >= 60 && Math.abs(event.clientX - startX) > Math.abs(event.clientY - startY)) {
          const steps = Math.floor(Math.abs(travel) / 60);
          for (let step = 0; step < steps; step++) live.current.onBrowse(travel < 0 ? 1 : -1);
          browseX += Math.sign(travel) * steps * 60;
        }
      } else renderer.domElement.style.cursor = hit(event) ? 'pointer' : 'grab';
    };
    const up = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      if (!dragged) {
        const result = hit(event);
        if (result) live.current.onSelect(result.object.userData.index as number);
      }
      pointerId = null;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    };
    const cancel = () => { pointerId = null; };
    const lost = (event: Event) => { event.preventDefault(); setFallback(true); cancelAnimationFrame(frame); };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', cancel);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    let previousTime = 0;
    let modeSince = 0;
    let previousMode = live.current.mode;
    let previousActive = live.current.activeIndex;
    const revealColor = new THREE.Color(GOLD);
    const targetPosition = new THREE.Vector3();
    const targetScale = new THREE.Vector3();
    const targetQuaternion = new THREE.Quaternion();
    const targetEuler = new THREE.Euler();
    let initialized = false;
    const idleMotion = createIdleMotion();
    const defaultIdleControl = { enabled: true, generation: 0 };
    const cardGroups = cards.map(card => card.group);
    const render = (now: number) => {
      if (disposed) return;
      const seconds = now / 1000;
      const dt = Math.min((now - previousTime) / 1000 || 0.016, 0.05);
      previousTime = now;
      const state = live.current;
      if (!initialized) modeSince = seconds;
      if (state.mode !== previousMode || (state.mode === 'revealing' && previousActive !== state.activeIndex)) { previousMode = state.mode; modeSince = seconds; }
      previousActive = state.activeIndex;
      const blend = reduced || !initialized ? 1 : 1 - Math.exp(-dt * 6);
      const focus = state.mode === 'revealing' || state.mode === 'result';
      const active = ((state.activeIndex % Math.max(cards.length, 1)) + cards.length) % Math.max(cards.length, 1);
      const nextLayoutSignature = `${state.mode}:${state.drawnIds.length}`;
      if (nextLayoutSignature !== layoutSignature) { measureStageBounds(); layoutSignature = nextLayoutSignature; }
      const placement = framePlacement(viewportWidth, viewportHeight, narrow, state.mode === 'idle', stageBounds);
      placeStage(stage, camera, viewportWidth, viewportHeight, placement, blend);
      const revealAge = seconds - modeSince;
      const pulse = focus ? (reduced ? 0.2 : Math.exp(-Math.max(0, revealAge - 0.5) * 0.85) * Math.min(1, revealAge * 2)) : 0;
      const cardColor = state.cards[active]?.color;
      revealColor.set(cardColor && /^#[0-9a-f]{3,8}$/i.test(cardColor) ? cardColor : GOLD);
      glowMaterial.color.lerp(revealColor, blend);
      glowMaterial.opacity = THREE.MathUtils.lerp(glowMaterial.opacity, focus ? 0.24 + pulse * 0.46 : 0, blend);
      glow.scale.setScalar(1 + pulse * 0.15);
      revealLight.color.copy(revealColor);
      revealLight.intensity = THREE.MathUtils.lerp(revealLight.intensity, pulse * 9, blend);
      revealRings.forEach((ring, i) => {
        const age = (revealAge - 0.3 - i * 0.4) / 1.8;
        ring.visible = focus && !reduced && age > 0 && age < 1;
        ring.scale.setScalar(1.2 + Math.max(0, age) * 3.2);
        ring.material.color.copy(revealColor);
        ring.material.opacity = Math.max(0, Math.sin(Math.PI * age)) * 0.35;
      });
      trailMaterial.color.copy(revealColor);
      trailMaterial.opacity = focus && !reduced ? pulse * 0.43 : 0;
      for (let i = 0; i < trailCount; i++) {
        const angle = i * 2.399963 + revealAge * 0.23;
        const radius = 1.55 + (i % 9) * 0.16 + Math.min(revealAge, 3) * 0.38;
        for (let tip = 0; tip < 2; tip++) {
          const a = angle - tip * 0.025;
          const r = radius - tip * 0.1;
          const at = i * 6 + tip * 3;
          trailPositions[at] = Math.cos(a) * r;
          trailPositions[at + 1] = Math.sin(a) * r + 0.15;
          trailPositions[at + 2] = 2.8;
        }
      }
      trailGeometry.attributes.position.needsUpdate = true;
      clockwork.update(dt, state.mode, state.activeIndex, state.drawnIds.length, reduced, narrow, state.handOffset?.current ?? 0);
      galaxies.update(dt, state.mode, state.activeIndex, pointer, reduced, narrow, renderer.getPixelRatio());
      blue.intensity = THREE.MathUtils.lerp(blue.intensity, state.drawnIds.length >= 2 ? 26 : 20, blend);
      warm.intensity = THREE.MathUtils.lerp(warm.intensity, state.drawnIds.length === 1 ? 26 : 17, blend);
      const handDrag = state.mode === 'spread' ? Math.max(-0.95, Math.min(0.95, state.handOffset?.current ?? 0)) : 0;
      const cardBlend = state.mode === 'spread' && !reduced ? 1 - Math.exp(-dt * 12) : blend;
      const idleOffset = idleMotion.update(dt, cards.length, state.mode === 'idle', state.idleControl?.current ?? defaultIdleControl, reduced);
      cards.forEach((card, index) => {
        const chosen = index === active;
        const sealed = state.mode === 'sealed';
        const scale = cardTarget(index, active + (state.mode === 'idle' ? idleOffset : 0), cards.length, state.mode, narrow, handDrag, seconds, reduced, targetPosition, targetEuler, stage.scale.x * viewportHeight / (28 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
        card.group.position.lerp(targetPosition, cardBlend);
        targetQuaternion.setFromEuler(targetEuler);
        card.group.quaternion.slerp(targetQuaternion, cardBlend);
        card.group.scale.lerp(targetScale.setScalar(scale), cardBlend);
        card.group.visible = !state.drawnIds.includes(card.id) || chosen || sealed;
      });
      fitCardsInsideFrame(table, cardGroups, clockwork.group, camera, narrow, clockwork.getFigureBounds(), viewportHeight);
      cardRitual.update(dt, state.mode, cards[active]?.group, Number(clockwork.group.userData.motionEnergy ?? 0), reduced);
      const burstAge = seconds - modeSince;
      const bursting = state.mode === 'burst' && burstAge < 2.5 && !reduced;
      burst.visible = bursting;
      if (bursting) {
        const progress = burstAge / 2.5;
        burstMaterial.opacity = (1 - progress) * 0.85;
        for (let i = 0; i < burstCount; i++) {
          const a = i * 2.399963;
          const radius = (0.5 + progress * 8) * (0.4 + (i % 17) / 20);
          burstPositions[i * 3] = Math.cos(a) * radius;
          burstPositions[i * 3 + 1] = Math.sin(a) * radius;
          burstPositions[i * 3 + 2] = 2 + Math.sin(i * 7.3) * progress * 3;
        }
        burstGeometry.attributes.position.needsUpdate = true;
      }
      initialized = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      reducedQuery.removeEventListener('change', onMotion);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', cancel);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      cardRitual.dispose();
      clockwork.dispose();
      galaxies.dispose();
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      textures.forEach((item) => item.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  // Rebuild GPU assets only when cards or quality change; callbacks and mode are live refs.
  }, [signature, props.quality]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 260 }}>
      <div ref={host} style={{ position: 'absolute', inset: 0, visibility: fallback ? 'hidden' : 'visible' }} />
      {fallback && <fieldset aria-label="塔罗牌阵" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'auto', padding: 20, border: 0, margin: 0 }}>
        <button type="button" aria-label="上一张牌" onClick={() => props.onBrowse(-1)} style={{ color: GOLD, background: '#101525', border: '1px solid #746344', borderRadius: 24, padding: 12 }}>←</button>
        {props.cards.length > 0 && (() => {
          const index = ((props.activeIndex % props.cards.length) + props.cards.length) % props.cards.length;
          const card = props.cards[index];
          const reveal = props.mode === 'revealing' || props.mode === 'result';
          return <button type="button" aria-label={reveal ? card.name : `选择第 ${index + 1} 张牌`} onClick={() => props.onSelect(index)} style={{ flexShrink: 0, width: 'min(48vw, 210px)', aspectRatio: '3 / 5', padding: 7, border: '1px solid #c8aa72', borderRadius: 9, color: GOLD, background: 'linear-gradient(145deg,#20283b,#080c16)', boxShadow: '0 20px 65px #0008', position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', inset: 20, border: '1px solid #746344', display: 'grid', placeContent: 'center', fontSize: 32 }}>✧</span>
            <span aria-hidden="true" style={{ position: 'absolute', inset: 7, backgroundImage: `url(${JSON.stringify(reveal ? card.image : '/art/card-back.png')})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 4 }} />
          </button>;
        })()}
        <button type="button" aria-label="下一张牌" onClick={() => props.onBrowse(1)} style={{ color: GOLD, background: '#101525', border: '1px solid #746344', borderRadius: 24, padding: 12 }}>→</button>
      </fieldset>}
    </div>
  );
}
