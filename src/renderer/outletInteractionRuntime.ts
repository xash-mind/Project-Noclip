import type { OutletInteractionVisual } from './level0WallpaperPresentation.js';
import type { InteractionVisual } from './support.js';

/** Runtime interaction shape visible to the application. Outlet eligibility and
 * placement remain presentation-owned; this type only exposes existing targets
 * to the canonical application interaction dispatch path. */
export type RuntimeInteraction = InteractionVisual | OutletInteractionVisual;

export function isOutletInteraction(interaction: RuntimeInteraction | undefined): interaction is OutletInteractionVisual {
  return interaction?.kind === 'outlet';
}
