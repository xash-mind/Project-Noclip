const SYNTHETIC_CLICK_GUARD_MS = 700;

/**
 * Keeps the mobile World Lab action reachable before and after the Lab opens.
 * The existing GameUI click handler remains the only source of Lab state; this
 * adapter bridges raw touchstart into exactly one click and moves that same
 * button above the Lab panel while the panel is open.
 */
export function installMobileLabToggle(selector: string): void {
  const root = document.querySelector<HTMLElement>('#ui-root');
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (!root || !button) throw new Error(`Missing mobile Lab toggle: ${selector}`);
  const home = button.parentElement;
  if (!home) throw new Error('Mobile Lab toggle has no home container');

  let dispatchingBridgedClick = false;
  let suppressTrustedClickUntil = 0;

  const syncPlacement = (): void => {
    const open = root.classList.contains('lab-open');
    if (open) {
      if (button.parentElement !== root) root.appendChild(button);
      button.classList.add('floating-lab-toggle');
      button.textContent = 'Close Lab';
      button.setAttribute('aria-label', 'Close World Lab');
    } else {
      if (button.parentElement !== home) home.appendChild(button);
      button.classList.remove('floating-lab-toggle');
      button.textContent = 'Lab';
      button.setAttribute('aria-label', 'Open World Lab');
    }
  };

  document.addEventListener('click', (event) => {
    if (dispatchingBridgedClick || performance.now() >= suppressTrustedClickUntil) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(selector)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  button.addEventListener('touchstart', (event) => {
    event.preventDefault();
    suppressTrustedClickUntil = performance.now() + SYNTHETIC_CLICK_GUARD_MS;
    dispatchingBridgedClick = true;
    try {
      button.click();
    } finally {
      dispatchingBridgedClick = false;
    }
  }, { passive: false });

  new MutationObserver(syncPlacement).observe(root, { attributes: true, attributeFilter: ['class'] });
  syncPlacement();
}
