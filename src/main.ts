import * as pc from 'playcanvas';
import './styles.css';
import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';
import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';
import { mountDevelopmentVersionIndicator } from './ui/DevelopmentVersionIndicator.js';
import { installMobileLabToggle } from './ui/touchActivation.js';

type FogParamsLike = {
  type: string;
  color: { copy?: (value: unknown) => unknown };
  start: number;
  end: number;
};

function installPlayCanvasFogCompatibility(): void {
  const sceneClass = (pc as unknown as { Scene?: { prototype: object } }).Scene;
  if (!sceneClass) return;

  const prototype = sceneClass.prototype;
  const fogDescriptor = Object.getOwnPropertyDescriptor(prototype, 'fog');
  if (!fogDescriptor?.get) return;

  const getFog = fogDescriptor.get;
  if (!fogDescriptor.set && fogDescriptor.configurable !== false) {
    Object.defineProperty(prototype, 'fog', {
      configurable: true,
      enumerable: fogDescriptor.enumerable ?? false,
      get: getFog,
      set(this: object, value: string) {
        (getFog.call(this) as FogParamsLike).type = value;
      }
    });
  }

  const defineAlias = (
    property: 'fogColor' | 'fogStart' | 'fogEnd',
    read: (fog: FogParamsLike) => unknown,
    write: (fog: FogParamsLike, value: unknown) => void
  ) => {
    if (Object.getOwnPropertyDescriptor(prototype, property)) return;
    Object.defineProperty(prototype, property, {
      configurable: true,
      enumerable: false,
      get(this: object) {
        return read(getFog.call(this) as FogParamsLike);
      },
      set(this: object, value: unknown) {
        write(getFog.call(this) as FogParamsLike, value);
      }
    });
  };

  defineAlias('fogColor', (fog) => fog.color, (fog, value) => {
    if (fog.color.copy) fog.color.copy(value);
  });
  defineAlias('fogStart', (fog) => fog.start, (fog, value) => {
    fog.start = Number(value);
  });
  defineAlias('fogEnd', (fog) => fog.end, (fog, value) => {
    fog.end = Number(value);
  });
}

installPlayCanvasFogCompatibility();
installStaticWorldBatching();
mountDevelopmentVersionIndicator();

const game = new ProjectNoclipGame();
installMobileLabToggle('[data-action="touch-lab"]');
void game.initialize().then(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('autostart')) (document.querySelector('[data-action="new"]') as HTMLButtonElement | null)?.click();
}).catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>LEVEL 0 FAILED TO RESOLVE</h1><p>${String(error instanceof Error ? error.message : error)}</p></main>`;
});
