import * as pc from 'playcanvas';
import type { PropSpec } from '../world/types.js';
import type { ZoneProfile } from '../world/zones.js';
import { RendererCellBuilder, type BoxFactory, type MaterialFactory } from './cellBuilder.js';
import { addLevel0PilotFeaturePresentation } from './level0FeaturePresentation.js';

type BuilderPresentationAccess = {
  app: pc.Application;
  getMaterial: MaterialFactory;
  box: BoxFactory;
};

type BuilderPrototype = {
  addPropGeometry(parent: pc.Entity, prop: PropSpec, profile: ZoneProfile): pc.Entity;
};

let installed = false;

/**
 * Narrow PAU Run 1 migration bridge. It intercepts only the two pilot Features
 * before the legacy cellBuilder presentation path runs. World generation and
 * PropSpec identity stay untouched; non-pilot props use the original builder.
 */
export function installPauFeaturePresentationPilot(): void {
  if (installed) return;
  installed = true;
  const prototype = RendererCellBuilder.prototype as unknown as BuilderPrototype;
  const original = prototype.addPropGeometry;
  prototype.addPropGeometry = function patchedAddPropGeometry(this: RendererCellBuilder, parent: pc.Entity, prop: PropSpec, profile: ZoneProfile): pc.Entity {
    const access = this as unknown as BuilderPresentationAccess;
    const pilot = addLevel0PilotFeaturePresentation(parent, prop, {
      app: access.app,
      getMaterial: access.getMaterial,
      box: access.box
    });
    return pilot ?? original.call(this, parent, prop, profile);
  };
}
