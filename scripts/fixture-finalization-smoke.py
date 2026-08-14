from __future__ import annotations

import base64
import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_FIXTURE_FINALIZATION_ARTIFACTS", "artifacts/fixture-finalization"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
FLICKER_THRESHOLD = 0.5


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
    header, encoded = str(value).split(",", 1)
    if "image/png" not in header:
        raise AssertionError(f"Unexpected capture header: {header}")
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f"WebGL canvas capture unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def fixture_snapshot(driver: webdriver.Chrome, group_id: str) -> dict[str, Any]:
    value = driver.execute_script("return window.__projectNoclipQa?.fixtureStateSnapshot?.(arguments[0]) ?? null;", group_id)
    if not value:
        raise AssertionError(f"Missing fixture snapshot for {group_id}")
    return value


def place_fixture(driver: webdriver.Chrome, state: str) -> dict[str, Any]:
    evidence = driver.execute_script("return window.__projectNoclipQa?.placeAtFixtureState?.(arguments[0]) ?? null;", state)
    if not evidence:
        raise AssertionError(f"Could not place at deterministic {state} fixture")
    time.sleep(0.8)
    return evidence


def wait_flicker(driver: webdriver.Chrome, group_id: str, lit: bool, timeout: float = 24.0) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        snapshot = fixture_snapshot(driver, group_id)
        pulse = float(snapshot.get("pulse", -1))
        if (pulse >= FLICKER_THRESHOLD) == lit:
            time.sleep(0.05)
            return fixture_snapshot(driver, group_id)
        driver.execute_script("return performance.now();")
        time.sleep(0.035)
    raise AssertionError(f"Timed out waiting for flicker {'lit' if lit else 'dark'} phase")


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "states": {}}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey").click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="QA bridge")
        driver.execute_script("""
          const style=document.createElement('style'); style.textContent='[data-ui="hud"] > :not(canvas), .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; }'; document.head.appendChild(style);
          const set=(selector,value)=>{const e=document.querySelector(selector);if(!e)return false;if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));return true;};
          set('[data-lab="bypass"]',true); set('[data-lab="radius"]','3'); set('[data-lab="condition"]','clear'); set('[data-lab="carver"]','none'); set('[data-lab="structure"]','none');
        """)
        resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
        if resume.is_displayed():
            resume.click()
        wait_for(driver, lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"), timeout=7, message="pointer lock")

        on = place_fixture(driver, "on")
        on_snapshot = fixture_snapshot(driver, on["groupId"])
        if abs(float(on_snapshot.get("pulse", -1)) - 1) > 1e-9:
            raise AssertionError(f"On fixture did not report pulse=1: {on_snapshot}")
        capture_canvas(driver, ARTIFACT_DIR / "fixture-on.png")
        report["states"]["on"] = {"placement": on, "snapshot": on_snapshot, "file": "fixture-on.png"}

        flicker = place_fixture(driver, "flicker")
        lit_snapshot = wait_flicker(driver, flicker["groupId"], True)
        capture_canvas(driver, ARTIFACT_DIR / "fixture-flicker-lit.png")
        dark_snapshot = wait_flicker(driver, flicker["groupId"], False)
        capture_canvas(driver, ARTIFACT_DIR / "fixture-flicker-dark.png")
        report["states"]["flicker"] = {"placement": flicker, "lit": lit_snapshot, "dark": dark_snapshot, "files": ["fixture-flicker-lit.png", "fixture-flicker-dark.png"]}

        off = place_fixture(driver, "off")
        off_snapshot = fixture_snapshot(driver, off["groupId"])
        if abs(float(off_snapshot.get("pulse", -1))) > 1e-9:
            raise AssertionError(f"Off fixture did not report pulse=0: {off_snapshot}")
        capture_canvas(driver, ARTIFACT_DIR / "fixture-off.png")
        report["states"]["off"] = {"placement": off, "snapshot": off_snapshot, "file": "fixture-off.png"}
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
