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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_WALLPAPER_ARTIFACTS", "artifacts/wallpaper"))
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
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(40)
    return driver


def capture_canvas(driver: webdriver.Chrome, path: Path) -> None:
    value = driver.execute_async_script("""
      const done = arguments[0];
      const canvas = document.querySelector('#game-canvas');
      if (!canvas) { done({error:'missing #game-canvas'}); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try {
          canvas.toBlob((blob) => {
            if (!blob) { done({error:'canvas.toBlob returned null'}); return; }
            const reader = new FileReader();
            reader.onerror = () => done({error:String(reader.error)});
            reader.onload = () => done(String(reader.result));
            reader.readAsDataURL(blob);
          }, 'image/png');
        } catch (error) { done({error:String(error)}); }
      }));
    """)
    if isinstance(value, dict):
        raise AssertionError(value.get("error", value))
    if not isinstance(value, str) or "," not in value:
        raise AssertionError("WebGL canvas capture did not return a PNG data URL")
    header, encoded = value.split(",", 1)
    if "image/png" not in header:
        raise AssertionError(f"Unexpected canvas capture header: {header}")
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f"Wallpaper showcase capture was unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def diagnostics(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_script("return window.__projectNoclipWallpaper?.diagnostics?.() ?? null;")
    return value if isinstance(value, dict) else None


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        new_button = wait_for(
            driver,
            lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'),
            timeout=35,
            message="New journey after wallpaper preload",
        )
        new_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=40,
            message="journey HUD",
        )
        initial = wait_for(
            driver,
            lambda current: diagnostics(current),
            timeout=20,
            message="wallpaper QA bridge",
        )
        assets = initial.get("assets", {})
        assert assets.get("prepared") is True, assets
        assert assets.get("fallbackUsed") == 0, assets
        asset_states = assets.get("assets", {})
        for family in ("A", "B", "C"):
            state = asset_states.get(family, {})
            assert state.get("ready") is True, (family, state)
            assert state.get("fetched") is True, (family, state)
            assert state.get("hashVerified") is True, (family, state)
            assert state.get("decoded") is True, (family, state)
            assert int(state.get("width", 0)) > 0 and int(state.get("height", 0)) > 0, (family, state)
            assert str(state.get("runtimePath", "")).startswith("/assets/runtime/images/"), (family, state)
        normal = wait_for(
            driver,
            lambda current: (snapshot := diagnostics(current)) if snapshot and snapshot.get("wallA", 0) > 0 else False,
            timeout=15,
            message="real A wallpaper material on normal Ordinary wall",
        )
        assert normal.get("assets", {}).get("fallbackUsed") == 0, normal
        report["normalJourney"] = normal

        driver.execute_script("""
          const style=document.createElement('style');
          style.id='wallpaper-smoke-style';
          style.textContent='[data-ui="hud"], .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; pointer-events:none !important; }';
          document.head.appendChild(style);
          return window.__projectNoclipWallpaper.showcase();
        """)
        time.sleep(1.2)
        capture_canvas(driver, ARTIFACT_DIR / "wallpaper-showcase.png")
        report["showcase"] = diagnostics(driver)
        assert report["showcase"]["assets"]["fallbackUsed"] == 0, report["showcase"]
        driver.execute_script("window.__projectNoclipWallpaper.clearShowcase();")

        errors = severe_errors(driver)
        report["browserErrors"] = errors
        assert not errors, errors
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
