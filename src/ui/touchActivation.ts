const SYNTHETIC_CLICK_GUARD_MS = 700;

/**
 * Makes an existing button's click action deterministic for touch browsers that
 * do not reliably synthesize a click after touchend. The button's existing
 * click handler remains the single action source; this adapter only bridges
 * touchend into exactly one click and suppresses a delayed duplicate.
 */
export function installTouchClickActivation(selector: string): void {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing touch-activated button: ${selector}`);

  let dispatchingBridgedClick = false;
  let suppressTrustedClickUntil = 0;

  document.addEventListener('click', (event) => {
    if (dispatchingBridgedClick || performance.now() >= suppressTrustedClickUntil) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(selector)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  button.addEventListener('touchend', (event) => {
    event.preventDefault();
    suppressTrustedClickUntil = performance.now() + SYNTHETIC_CLICK_GUARD_MS;
    dispatchingBridgedClick = true;
    try {
      button.click();
    } finally {
      dispatchingBridgedClick = false;
    }
  }, { passive: false });
}
