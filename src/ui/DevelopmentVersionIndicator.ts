import { PROJECT_VERSION } from '../config/version.js';

const DEVELOPMENT_VERSION_INDICATOR_ENABLED = true;

export function mountDevelopmentVersionIndicator(): void {
  if (!DEVELOPMENT_VERSION_INDICATOR_ENABLED) return;
  if (document.querySelector('[data-development-version]')) return;

  const indicator = document.createElement('div');
  indicator.className = 'development-version-indicator';
  indicator.dataset.developmentVersion = PROJECT_VERSION;
  indicator.setAttribute('aria-label', `Development version ${PROJECT_VERSION}`);
  indicator.textContent = `v${PROJECT_VERSION}`;
  document.body.append(indicator);
}
