export interface RenderRgb {
  r: number;
  g: number;
  b: number;
}

export interface BlackoutRenderState {
  ambient: RenderRgb;
  fog: RenderRgb;
  clear: RenderRgb;
  guideLightIntensity: number;
  guideLightEnabled: boolean;
}

export const LEVEL0_AMBIENT = { r: 0.09, g: 0.084, b: 0.048 } as const;
export const LEVEL0_FOG_COLOR = { r: 0.15, g: 0.135, b: 0.075 } as const;

// This small floor is part of the existing ordinary runtime presentation. It
// must fade with the environment instead of surviving as free light at the
// Blackout core.
const LEVEL0_AMBIENT_RENDER_FLOOR = { r: 0.009, g: 0.0085, b: 0.005 } as const;
const BLACKOUT_FOG_CUE = { r: 0.018, g: 0.017, b: 0.011 } as const;
const BLACKOUT_GUIDE_MAX_INTENSITY = 0.24;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function resolveBlackoutRenderState(blackoutStrength: number, blackoutEscapeCue: number): BlackoutRenderState {
  const strength = clamp01(blackoutStrength);
  const escapeCue = clamp01(blackoutEscapeCue);
  const coreVisibility = 1 - strength;
  const visibleAmbient = Math.pow(coreVisibility, 1.7);
  const atmosphericCue = Math.pow(strength, 2.1) * coreVisibility;

  const ambient = {
    r: LEVEL0_AMBIENT.r * visibleAmbient + LEVEL0_AMBIENT_RENDER_FLOOR.r * coreVisibility,
    g: LEVEL0_AMBIENT.g * visibleAmbient + LEVEL0_AMBIENT_RENDER_FLOOR.g * coreVisibility,
    b: LEVEL0_AMBIENT.b * visibleAmbient + LEVEL0_AMBIENT_RENDER_FLOOR.b * coreVisibility
  };
  const fog = {
    r: LEVEL0_FOG_COLOR.r * visibleAmbient + BLACKOUT_FOG_CUE.r * atmosphericCue,
    g: LEVEL0_FOG_COLOR.g * visibleAmbient + BLACKOUT_FOG_CUE.g * atmosphericCue,
    b: LEVEL0_FOG_COLOR.b * visibleAmbient + BLACKOUT_FOG_CUE.b * atmosphericCue
  };
  const guideLightIntensity = escapeCue * BLACKOUT_GUIDE_MAX_INTENSITY;

  return {
    ambient,
    fog,
    clear: { ...fog },
    guideLightIntensity,
    guideLightEnabled: strength > 0.52 && guideLightIntensity > 0
  };
}
