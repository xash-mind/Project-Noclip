export interface LookState {
  yaw: number;
  pitch: number;
}

export interface LookDelta {
  x: number;
  y: number;
}

export function applyLookDelta(state: LookState, delta: LookDelta, sensitivity: number): LookState {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y) || !Number.isFinite(sensitivity)) return state;
  return {
    yaw: state.yaw - delta.x * sensitivity,
    pitch: Math.max(-84, Math.min(84, state.pitch - delta.y * sensitivity))
  };
}

export const MOVEMENT_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'KeyC'
]);
