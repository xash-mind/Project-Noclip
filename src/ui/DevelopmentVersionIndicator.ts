import './development-version-indicator.css';
import { PROJECT_VERSION } from '../version.js';

const SHOW_DEVELOPMENT_VERSION = true;

export function mountDevelopmentVersionIndicator(): void {
  if (!SHOW_DEVELOPMENT_VERSION || document.querySelector('[data-ui="version-indicator"]')) return;
  const indicator = document.createElement('div');
  indicator.className = 'development-version-indicator';
  indicator.dataset.ui = 'version-indicator';
  indicator.textContent = `v${PROJECT_VERSION}`;
  indicator.setAttribute('aria-label', `Development version ${PROJECT_VERSION}`);
  document.body.appendChild(indicator);
}
