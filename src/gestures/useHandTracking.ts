'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { advanceGesture, GESTURE_TIMING, initialGestureState, type MagicGesture } from './gesture-machine';
import { readHandSample, type HandSample } from './hand-navigation';

export type { MagicGesture } from './gesture-machine';
export type { HandSample } from './hand-navigation';
type Status = 'off' | 'loading' | 'ready' | 'tracking' | 'error';
interface Session {
  cancelled: boolean;
  stream: MediaStream | null;
  recognizer: GestureRecognizer | null;
  frame: number | null;
  video: HTMLVideoElement;
  removeListeners: () => void;
}
function dispose(session: Session) {
  session.cancelled = true;
  if (session.frame !== null) cancelAnimationFrame(session.frame);
  session.frame = null;
  session.removeListeners();
  session.stream?.getTracks().forEach(track => track.stop());
  if (session.video.srcObject === session.stream) {
    session.video.pause();
    session.video.srcObject = null;
  }
  session.stream = null;
  try { session.recognizer?.close(); } catch { /* Tracks and animation are already released. */ }
  session.recognizer = null;
}

// Keep the recursive frame scheduler outside React's memoized callback analysis.
function scheduleFrames(session: Session, isCurrent: () => boolean, detect: (now: number) => void) {
  const tick = (now: number) => {
    if (!isCurrent()) return;
    detect(now);
    if (isCurrent()) session.frame = requestAnimationFrame(tick);
  };
  session.frame = requestAnimationFrame(tick);
}

export function useHandTracking(options: {
  onSample: (sample: HandSample | null) => void;
  onGesture: (gesture: MagicGesture) => void;
}): { status: Status; error: string | null; start: () => Promise<boolean>; stop: () => void; videoRef: RefObject<HTMLVideoElement | null> } {
  const [status, setStatus] = useState<Status>('off');
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<Status>('off');
  const mounted = useRef(true);
  const resumeAfterRefresh = useRef(false);
  const callbacks = useRef(options);
  useEffect(() => { callbacks.current = options; }, [options]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const active = useRef<Session | null>(null);
  const pending = useRef<Promise<boolean> | null>(null);
  const updateStatus = useCallback((value: Status) => {
    if (mounted.current && statusRef.current !== value) {
      statusRef.current = value;
      setStatus(value);
    }
  }, []);
  const stop = useCallback(() => {
    resumeAfterRefresh.current = false;
    const session = active.current;
    active.current = null;
    pending.current = null;
    if (session) dispose(session);
    if (mounted.current) {
      setError(null);
      updateStatus('off');
      callbacks.current.onSample(null);
    }
  }, [updateStatus]);

  const start = useCallback((): Promise<boolean> => {
    if (!mounted.current) return Promise.resolve(false);
    if (pending.current) return pending.current;
    if (active.current) return Promise.resolve(Boolean(active.current.recognizer));
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setError(!video ? '摄像头预览尚未就绪，请重试。' : '当前环境无法访问摄像头，请使用 localhost 或 HTTPS。');
      updateStatus('error');
      return Promise.resolve(false);
    }
    resumeAfterRefresh.current = true;
    const session: Session = { cancelled: false, stream: null, recognizer: null, frame: null, video, removeListeners: () => {} };
    active.current = session;
    const isCurrent = () => mounted.current && !session.cancelled && active.current === session;
    const fail = (cause: unknown) => {
      if (!isCurrent()) return;
      resumeAfterRefresh.current = false;
      active.current = null;
      dispose(session);
      const name = cause instanceof Error ? cause.name : '';
      setError(name === 'NotAllowedError' ? '摄像头权限未获允许，可重新授权后开启。' : name === 'NotFoundError' ? '未找到可用摄像头。' : `手势识别不可用：${cause instanceof Error ? cause.message : String(cause)}`);
      updateStatus('error');
      callbacks.current.onSample(null);
    };
    setError(null);
    updateStatus('loading');
    const task = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
        if (!isCurrent()) { stream.getTracks().forEach(track => track.stop()); return false; }
        session.stream = stream;
        const ended = () => fail(new Error('摄像头连接已断开，请重新开启。'));
        stream.getVideoTracks().forEach(track => track.addEventListener('ended', ended));
        session.removeListeners = () => stream.getVideoTracks().forEach(track => track.removeEventListener('ended', ended));
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        if (!isCurrent()) return false;
        const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision');
        if (!isCurrent()) return false;
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        if (!isCurrent()) return false;
        const create = (delegate: 'GPU' | 'CPU') => GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/mediapipe/gesture_recognizer.task', delegate },
          runningMode: 'VIDEO', numHands: 1,
          minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        });
        const recognizer = await create('GPU').catch(() => isCurrent() ? create('CPU') : null);
        if (!recognizer) return false;
        if (!isCurrent()) { recognizer.close(); return false; }
        session.recognizer = recognizer;
        updateStatus('ready');
        let machine = initialGestureState();
        let previousSample: HandSample | null = null;
        let lastVideoTime = -1;
        let lastDetection = -Infinity;
        const detect = (now: number) => {
          if (!isCurrent()) return false;
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastDetection >= 33) {
            lastVideoTime = video.currentTime;
            lastDetection = now;
            try {
              const result = recognizer.recognizeForVideo(video, now);
              const sample = readHandSample(result.landmarks[0], result.gestures[0]?.[0], previousSample, now);
              previousSample = sample;
              const transition = advanceGesture(machine, sample, now);
              machine = transition.state;
              if (sample && machine.candidate === 'Pointing_Up') sample.actionProgress = machine.latched === 'Pointing_Up' ? 1 : Math.min(1, Math.max(0, (now - machine.candidateSince) / GESTURE_TIMING.dwellMs));
              updateStatus(sample ? 'tracking' : 'ready');
              callbacks.current.onSample(sample);
              if (isCurrent() && transition.event) callbacks.current.onGesture(transition.event);
            } catch (cause) { fail(cause); return; }
          }
        };
        scheduleFrames(session, isCurrent, detect);
        return true;
      } catch (cause) { fail(cause); return false; }
    })();
    pending.current = task;
    void task.finally(() => { if (pending.current === task) pending.current = null; });
    return task;
  }, [updateStatus]);

  useEffect(() => {
    mounted.current = true;
    // Fast Refresh can remount effects while preserving the opted-in camera UI.
    // Resume that existing opt-in instead of leaving a tracking label on a stopped stream.
    if (resumeAfterRefresh.current && !active.current) void start();
    return () => {
      mounted.current = false;
      const session = active.current;
      active.current = null;
      pending.current = null;
      if (session) dispose(session);
    };
  }, [start]);
  return { status, error, start, stop, videoRef };
}
