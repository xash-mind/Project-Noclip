import { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { InteractionVisual } from './support.js';
import type { OutletInteractionVisual } from './ordinaryWallpaperPresentation.js';

type RuntimeInteraction = InteractionVisual | OutletInteractionVisual;

interface InteractionUiAccess {
  setInteraction(label?: string): void;
  toast(message: string, duration?: number): void;
}

interface GameInteractionAccess {
  interaction?: RuntimeInteraction;
  ui: InteractionUiAccess;
}

type RuntimePrototype = {
  updateInteraction(this: ProjectNoclipGame): void;
  interact(this: ProjectNoclipGame): void;
};

let installed = false;

function access(game: ProjectNoclipGame): GameInteractionAccess {
  return game as unknown as GameInteractionAccess;
}

/**
 * Keeps the outlet on the existing ProjectNoclipGame interaction path without
 * adding outlet state to Journey saves. The first interaction is deliberately
 * observational; later gameplay can extend the same stable outlet target.
 */
export function installOutletInteractionRuntime(): void {
  if (installed) return;
  installed = true;
  const prototype = ProjectNoclipGame.prototype as unknown as RuntimePrototype;
  const originalUpdateInteraction = prototype.updateInteraction;
  const originalInteract = prototype.interact;

  prototype.updateInteraction = function patchedOutletInteractionPrompt(this: ProjectNoclipGame): void {
    originalUpdateInteraction.call(this);
    const state = access(this);
    if (state.interaction?.kind === 'outlet') state.ui.setInteraction('[E] Inspect outlet');
  };

  prototype.interact = function patchedOutletInteraction(this: ProjectNoclipGame): void {
    const state = access(this);
    if (state.interaction?.kind === 'outlet') {
      state.ui.toast('The outlet is inert.', 2800);
      return;
    }
    originalInteract.call(this);
  };
}
