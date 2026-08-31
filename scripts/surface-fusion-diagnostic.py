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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_SURFACE_FUSION_ARTIFACTS", "artifacts/surface-fusion"))
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


def capture_canvas(driver: webdriver.Chrome, path: Path) -> dict[str, int]:
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
            reader.onload = () => done({data:String(reader.result), width:canvas.width, height:canvas.height});
            reader.readAsDataURL(blob);
          }, 'image/png');
        } catch (error) { done({error:String(error)}); }
      }));
    """)
    if not isinstance(value, dict) or value.get("error"):
        raise AssertionError(value)
    encoded = str(value["data"]).split(",", 1)[1]
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f"Surface fusion capture unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)
    return {"width": int(value["width"]), "height": int(value["height"])}


def qa_call(driver: webdriver.Chrome, method: str, *args: Any) -> Any:
    return driver.execute_script("""
      const method=arguments[0], args=Array.from(arguments).slice(1), qa=window.__projectNoclipQa;
      if(!qa || typeof qa[method] !== 'function') return null;
      return qa[method](...args) ?? null;
    """, method, *args)


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
    time.sleep(1.0)
    return str(result["message"])


def runtime_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    result = driver.execute_script("return window.__noclipRendererRuntimeDiagnostics?.snapshot?.() ?? null;")
    if not isinstance(result, dict):
        raise AssertionError("Missing renderer diagnostics")
    return result


def fusion_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    result = driver.execute_script("return window.__projectNoclipSurfaceFusion?.diagnostics?.() ?? null;")
    if not isinstance(result, dict):
        raise AssertionError("Missing surface fusion diagnostics")
    return result


def render_settings(driver: webdriver.Chrome) -> dict[str, Any]:
    result = driver.execute_script("return window.__projectNoclipRenderSettings?.get?.() ?? null;")
    if not isinstance(result, dict):
        raise AssertionError("Missing render settings QA bridge")
    return result


def set_preset(driver: webdriver.Chrome, preset: str) -> dict[str, Any]:
    result = driver.execute_script("return window.__projectNoclipRenderSettings.preset(arguments[0]);", preset)
    if not isinstance(result, dict):
        raise AssertionError(f"Could not apply render preset {preset}")
    time.sleep(1.0)
    return result


def patch_render_scale(driver: webdriver.Chrome, scale: float) -> dict[str, Any]:
    result = driver.execute_script("return window.__projectNoclipRenderSettings.patch({renderScale:arguments[0]});", scale)
    if not isinstance(result, dict):
        raise AssertionError(f"Could not patch render scale {scale}")
    time.sleep(1.0)
    return result


def profile_capture(driver: webdriver.Chrome, label: str) -> dict[str, Any]:
    dimensions = capture_canvas(driver, ARTIFACT_DIR / f"{label}.png")
    return {
        "settings": render_settings(driver),
        "canvas": dimensions,
        "renderer": runtime_snapshot(driver),
        "surfaceFusion": fusion_snapshot(driver),
    }


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def assert_low_semantics_preserved(low: dict[str, Any], native: dict[str, Any]) -> None:
    for key in ("renderDistance", "shadowQuality", "shadowResolution", "postProcessing", "fogBehavior"):
        assert low[key] == native[key], (key, low[key], native[key])
    assert abs(float(low["renderScale"]) - 0.67) < 1e-9, low
    assert abs(float(native["renderScale"]) - 1.0) < 1e-9, native


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "profiles": {}, "regions": {}, "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), timeout=35, message="New journey")
        new_button.click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=40, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa && window.__projectNoclipRenderSettings && window.__projectNoclipSurfaceFusion)"), timeout=25, message="diagnostic bridges")
        driver.execute_script("""
          const style=document.createElement('style');
          style.id='surface-fusion-diagnostic-style';
          style.textContent='[data-ui="hud"], .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; pointer-events:none !important; }';
          document.head.appendChild(style);
        """)

        marker = qa_call(driver, "placeAtMarkerWall")
        assert marker, "Could not face a representative Ordinary wall"
        time.sleep(0.8)

        low = set_preset(driver, "low")
        report["profiles"]["low"] = profile_capture(driver, "ordinary-low-current")

        set_preset(driver, "low")
        native = patch_render_scale(driver, 1.0)
        report["profiles"]["lowNativeScale"] = profile_capture(driver, "ordinary-low-native-scale")
        assert_low_semantics_preserved(low, native)

        high = set_preset(driver, "high")
        assert abs(float(high["renderScale"]) - 1.0) < 1e-9, high
        report["profiles"]["high"] = profile_capture(driver, "ordinary-high")

        low_canvas = report["profiles"]["low"]["canvas"]
        native_canvas = report["profiles"]["lowNativeScale"]["canvas"]
        assert low_canvas["width"] < native_canvas["width"], (low_canvas, native_canvas)
        assert low_canvas["height"] < native_canvas["height"], (low_canvas, native_canvas)

        # Establish the same canonical advanced-Region QA gate used by the
        # existing wallpaper visual smoke. This is diagnostic-only runtime state.
        gate_probe = qa_call(driver, "placeAtFixtureState", "on")
        assert gate_probe, "Could not establish advanced-Region QA gate bypass"
        time.sleep(0.8)

        pillar_message = qa_locate(driver, "pillar-field", "core")
        pillar_marker = qa_call(driver, "placeAtMarkerWall")
        assert pillar_marker, "Could not face a Pillar Field wall"
        report["regions"]["pillar-field"] = {
            "message": pillar_message,
            "marker": pillar_marker,
            "capture": profile_capture(driver, "pillar-high")
        }

        arch_message = qa_locate(driver, "arch-rooms", "core")
        arch_marker = qa_call(driver, "placeAtMarkerWall")
        assert arch_marker, "Could not face an Arch Room wall"
        report["regions"]["arch-rooms"] = {
            "message": arch_message,
            "marker": arch_marker,
            "capture": profile_capture(driver, "arch-wall-high")
        }

        arch_overview = qa_call(driver, "placeAtArchOverview")
        assert arch_overview, "Could not frame authoritative A-A1 divider"
        time.sleep(0.8)
        report["regions"]["arch-rooms"]["dividerOverview"] = arch_overview
        report["regions"]["arch-rooms"]["dividerCapture"] = profile_capture(driver, "arch-divider-high")

        errors = severe_errors(driver)
        report["browserErrors"] = errors
        assert not errors, errors

        fusion = report["regions"]["arch-rooms"]["dividerCapture"]["surfaceFusion"]
        assert int(fusion.get("inputSurfaces", 0)) >= int(fusion.get("outputSurfaces", 0)), fusion
        print(json.dumps({
            "lowRenderScale": report["profiles"]["low"]["settings"]["renderScale"],
            "lowCanvas": report["profiles"]["low"]["canvas"],
            "lowNativeRenderScale": report["profiles"]["lowNativeScale"]["settings"]["renderScale"],
            "lowNativeCanvas": report["profiles"]["lowNativeScale"]["canvas"],
            "highRenderScale": report["profiles"]["high"]["settings"]["renderScale"],
            "highCanvas": report["profiles"]["high"]["canvas"],
            "surfaceFusion": fusion,
            "browserErrors": errors
        }, indent=2))
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
