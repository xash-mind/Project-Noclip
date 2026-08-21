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
    driver.set_script_timeout(50)
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
        raise AssertionError(f"Wallpaper capture was unexpectedly small: {len(data)} bytes")
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


def renderer_diagnostics(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_script("return window.__noclipRendererRuntimeDiagnostics?.snapshot?.() ?? null;")
    return value if isinstance(value, dict) else None


def has_real_a_wall(driver: webdriver.Chrome) -> dict[str, Any] | bool:
    snapshot = diagnostics(driver)
    ordinary = (snapshot or {}).get("regions", {}).get("ordinary-level-0", {})
    if not snapshot or snapshot.get("wallA", 0) <= 0 or ordinary.get("suppliedTextureBindings", 0) <= 0:
        return False
    return snapshot


def qa_locate(driver: webdriver.Chrome, region: str, depth: str) -> str:
    result = driver.execute_async_script("""
      const region=arguments[0], depth=arguments[1], done=arguments[2], qa=window.__projectNoclipQa;
      if(!qa){done({error:'missing __projectNoclipQa'});return;}
      Promise.resolve(qa.locate(region,depth)).then((message)=>done({message})).catch((error)=>done({error:String(error)}));
    """, region, depth)
    if result.get("error"):
        raise AssertionError(result["error"])
    if not result.get("message"):
        raise AssertionError(f"Could not locate {region}/{depth}")
    time.sleep(1.2)
    return str(result["message"])


def region_snapshot(driver: webdriver.Chrome, region: str) -> dict[str, Any]:
    snapshot = diagnostics(driver)
    if not snapshot:
        raise AssertionError("Missing wallpaper diagnostics")
    value = snapshot.get("regions", {}).get(region, {})
    if int(value.get("suppliedTextureBindings", 0)) <= 0:
        raise AssertionError(f"{region} has no supplied wallpaper texture binding: {snapshot}")
    return snapshot


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "regions": {}, "browserErrors": []}
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
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), timeout=25, message="runtime QA bridge")
        initial = wait_for(driver, lambda current: diagnostics(current), timeout=20, message="wallpaper QA bridge")
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

        ordinary = wait_for(driver, has_real_a_wall, timeout=15, message="real A wallpaper material on normal Ordinary wall")
        assert ordinary.get("assets", {}).get("fallbackUsed") == 0, ordinary
        assert 0.15 <= float(ordinary.get("casingSetbackFraction", 0)) <= 0.20, ordinary
        assert int(ordinary.get("casingStrips", 0)) == int(ordinary.get("casingRuns", 0)) * 2, ordinary
        report["regions"]["ordinary-level-0"] = ordinary
        capture_canvas(driver, ARTIFACT_DIR / "ordinary-wallpaper.png")

        pillar_message = qa_locate(driver, "pillar-field", "core")
        pillar = region_snapshot(driver, "pillar-field")
        report["regions"]["pillar-field"] = {"message": pillar_message, "diagnostics": pillar}
        capture_canvas(driver, ARTIFACT_DIR / "pillar-wallpaper.png")

        arch_message = qa_locate(driver, "arch-rooms", "core")
        arch = region_snapshot(driver, "arch-rooms")
        arch_region = arch.get("regions", {}).get("arch-rooms", {})
        assert int(arch_region.get("paleBindings", 0)) > 0, arch
        report["regions"]["arch-rooms"] = {"message": arch_message, "diagnostics": arch}
        capture_canvas(driver, ARTIFACT_DIR / "arch-wallpaper.png")

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

        report["renderer"] = renderer_diagnostics(driver)
        if report["renderer"]:
            batching = report["renderer"].get("batching", {})
            assert int(batching.get("activeGroups", 0)) > 0, report["renderer"]

        errors = severe_errors(driver)
        report["browserErrors"] = errors
        assert not errors, errors
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
