from __future__ import annotations

import base64
import json
import os
import re
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_LIGHTING_FINALIZATION_ARTIFACTS", "artifacts/lighting-finalization"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 30, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1200,720")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-webgl")
    options.add_argument("--ignore-gpu-blocklist")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(60)
    return driver


def capture_canvas(driver: webdriver.Chrome, path: Path) -> None:
    value = driver.execute_async_script("""
      const done = arguments[0]; const canvas = document.querySelector('#game-canvas');
      if (!canvas) { done({error:'missing #game-canvas'}); return; }
      requestAnimationFrame(() => canvas.toBlob((blob) => {
        if (!blob) { done({error:'canvas.toBlob returned null'}); return; }
        const reader = new FileReader(); reader.onerror = () => done({error:String(reader.error)});
        reader.onload = () => done(String(reader.result)); reader.readAsDataURL(blob);
      }, 'image/png'));
    """)
    if isinstance(value, dict):
        raise AssertionError(value.get("error", value))
    if not isinstance(value, str) or "," not in value:
        raise AssertionError("WebGL canvas capture did not return a PNG data URL")
    header, encoded = value.split(",", 1)
    if "image/png" not in header:
        raise AssertionError(f"Unexpected capture header: {header}")
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f"WebGL canvas capture unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def metrics_text(driver: webdriver.Chrome) -> str:
    return str(driver.execute_script("return document.querySelector('[data-ui=metrics]')?.textContent ?? '';"))


def metric_value(driver: webdriver.Chrome, pattern: str, label: str) -> float:
    match = re.search(pattern, metrics_text(driver))
    if not match:
        raise AssertionError(f"Missing {label} metric: {metrics_text(driver)}")
    return float(match.group(1))


def eye_exposure(driver: webdriver.Chrome) -> float:
    return metric_value(driver, r"eye exposure\s+([0-9.]+)", "eye exposure")


def blackout_strength(driver: webdriver.Chrome) -> float:
    return metric_value(driver, r"/ blackout\s+([0-9.]+)", "blackout strength")


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey").click()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"),
            timeout=35,
            message="journey HUD",
        )
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="QA bridge")
        driver.execute_script("""
          const style=document.createElement('style');
          style.textContent='[data-ui="hud"] > :not(canvas), .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; }';
          document.head.appendChild(style);
          const bypass=document.querySelector('[data-lab="bypass"]');
          if (bypass) { bypass.checked=true; bypass.dispatchEvent(new Event('change',{bubbles:true})); }
        """)
        resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
        if resume.is_displayed():
            resume.click()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"),
            timeout=7,
            message="pointer lock for active eye adaptation",
        )

        time.sleep(1.0)
        clear_exposure = eye_exposure(driver)
        capture_canvas(driver, ARTIFACT_DIR / "ordinary-before-blackout.png")

        # Use the project's natural Blackout locator rather than a forced Condition selector.
        # Continuous Blackout strength comes from the sampled world field, so the natural
        # locator is the authoritative way to prove entry -> adaptation behavior.
        located = driver.execute_script("""
          const button=document.querySelector('[data-action="locate-blackout"]');
          if (!button) return false;
          button.click();
          return true;
        """)
        if not located:
            raise AssertionError("Missing natural Blackout locator")
        wait_for(driver, lambda current: blackout_strength(current) >= 0.52, timeout=12, message="natural deep Blackout state")
        entry_strength = blackout_strength(driver)
        entry_exposure = eye_exposure(driver)
        capture_canvas(driver, ARTIFACT_DIR / "blackout-entry.png")

        deadline = time.monotonic() + 10.0
        while time.monotonic() < deadline:
            driver.execute_script("return performance.now();")
            time.sleep(0.1)
        adapted_strength = blackout_strength(driver)
        adapted_exposure = eye_exposure(driver)
        capture_canvas(driver, ARTIFACT_DIR / "blackout-adapted.png")

        if adapted_strength < 0.52:
            raise AssertionError(f"Blackout weakened during adaptation capture: {entry_strength:.3f} -> {adapted_strength:.3f}")
        if adapted_exposure <= entry_exposure + 0.25:
            raise AssertionError(f"Dark adaptation did not materially increase exposure: {entry_exposure:.3f} -> {adapted_exposure:.3f}")
        if adapted_exposure > 1.801:
            raise AssertionError(f"Dark adaptation exceeded its bound: {adapted_exposure:.3f}")

        report.update({
            "clearExposure": clear_exposure,
            "entryBlackoutStrength": entry_strength,
            "entryExposure": entry_exposure,
            "adaptedBlackoutStrength": adapted_strength,
            "adaptedExposure": adapted_exposure,
            "files": ["ordinary-before-blackout.png", "blackout-entry.png", "blackout-adapted.png"],
        })
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
