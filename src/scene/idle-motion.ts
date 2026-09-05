/** Mutable at the input event boundary, before camera/model promises begin. */
export interface IdleControl { enabled: boolean; generation: number }

/** Individual cards pass the front; no camera/stage translation is involved. */
export function createIdleMotion() {
  let phase = 0;
  let position = 0;
  let velocity = 0;
  let generation = -1;
  let stopped = false;
  return {
    update(dt: number, count: number, idle: boolean, control: IdleControl, reduced: boolean) {
      const elapsed = Math.max(0, Math.min(dt, .05));
      if (generation !== control.generation) {
        phase = 0; position = 0; velocity = 0; stopped = false; generation = control.generation;
      }
      if (!idle || !control.enabled) stopped = true;
      if (!idle) { position = 0; velocity = 0; return 0; }
      if (reduced) { velocity = 0; return position; }
      if (idle && !stopped) {
        const amplitude = Math.max(1, count / 2);
        phase += elapsed * .115;
        position = Math.sin(phase) * amplitude;
        velocity = Math.cos(phase) * amplitude * .115;
      } else if (idle) {
        // A short, finite coast; never resume on hand loss, failure, or model loading.
        const decay = Math.exp(-elapsed * 12);
        position += velocity * (1 - decay) / 12;
        velocity *= decay;
        if (Math.abs(velocity) < .001) velocity = 0;
      } else { position = 0; velocity = 0; }
      return position;
    },
  };
}
