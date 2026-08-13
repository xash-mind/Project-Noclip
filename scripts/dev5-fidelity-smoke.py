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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_DEV5_FIDELITY_ARTIFACTS", "artifacts/dev5-fidelity"))
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
    driver.set_script_timeout(80)
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
    if isinstance(value, dict): raise AssertionError(value.get("error", value))
    if not isinstance(value, str) or "," not in value: raise AssertionError("WebGL canvas capture did not return a PNG data URL")
    header, encoded = value.split(",", 1)
    if "image/png" not in header: raise AssertionError(f"Unexpected canvas capture header: {header}")
    data = base64.b64decode(encoded)
    if len(data) < 10_000: raise AssertionError(f"WebGL canvas capture was unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)]


def scene_only(driver: webdriver.Chrome) -> None:
    driver.execute_script("""
      if (document.querySelector('#dev5-fidelity-style')) return;
      const style=document.createElement('style'); style.id='dev5-fidelity-style';
      style.textContent='[data-ui="hud"] > :not(canvas), .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; }';
      document.head.appendChild(style);
    """)


def configure_lab(driver: webdriver.Chrome) -> None:
    result = driver.execute_script("""
      const set=(selector,value)=>{const element=document.querySelector(selector);if(!element)return false;if(element.type==='checkbox')element.checked=value;else element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));return true;};
      return {bypass:set('[data-lab="bypass"]',true),radius:set('[data-lab="radius"]','3'),condition:set('[data-lab="condition"]','clear'),carver:set('[data-lab="carver"]','none'),structure:set('[data-lab="structure"]','none')};
    """)
    if not all(result.values()): raise AssertionError(f"World Lab controls missing: {result}")


def qa_locate(driver: webdriver.Chrome, region: str, depth: str) -> str:
    result = driver.execute_async_script("""
      const region=arguments[0], depth=arguments[1], done=arguments[2], qa=window.__projectNoclipQa;
      if(!qa){done({error:'missing __projectNoclipQa'});return;}
      Promise.resolve(qa.locate(region,depth)).then((message)=>done({message})).catch((error)=>done({error:String(error)}));
    """, region, depth)
    if result.get("error"): raise AssertionError(result["error"])
    if not result.get("message"): raise AssertionError(f"Could not locate {region}/{depth}")
    time.sleep(1.0)
    return str(result["message"])


def resume_input(driver: webdriver.Chrome) -> bool:
    button = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    if button.is_displayed(): button.click()
    try:
        wait_for(driver, lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"), timeout=7, message="pointer lock")
        return True
    except AssertionError:
        return False


def key_event(driver: webdriver.Chrome, event_type: str) -> None:
    driver.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": event_type, "key": "w", "code": "KeyW", "windowsVirtualKeyCode": 87, "nativeVirtualKeyCode": 87})


def qa_snapshot(driver: webdriver.Chrome) -> dict[str, Any] | None:
    return driver.execute_script("return window.__projectNoclipQa?.snapshot?.() ?? null;")


def path_progress(snapshot: dict[str, Any], start: dict[str, float], end: dict[str, float]) -> float:
    dx, dz = float(end["x"]) - float(start["x"]), float(end["z"]) - float(start["z"])
    denominator = dx * dx + dz * dz
    if denominator <= 1e-9: return 1.0
    return ((float(snapshot["x"]) - float(start["x"])) * dx + (float(snapshot["z"]) - float(start["z"])) * dz) / denominator


def drive_forward_to_progress(
    driver: webdriver.Chrome,
    start: dict[str, float],
    end: dict[str, float],
    target_progress: float,
    timeout: float,
    captures: list[tuple[float, str]] | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    pending = list(captures or [])
    captured: list[dict[str, Any]] = []
    deadline = time.monotonic() + timeout
    key_event(driver, "keyDown")
    try:
        while time.monotonic() < deadline:
            driver.execute_script("return performance.now();")
            snapshot = qa_snapshot(driver)
            if snapshot:
                progress = path_progress(snapshot, start, end)
                while pending and progress >= pending[0][0]:
                    threshold, file_name = pending.pop(0)
                    capture_canvas(driver, ARTIFACT_DIR / file_name)
                    captured.append({"file": file_name, "threshold": threshold, "progress": progress, "snapshot": snapshot})
                if progress >= target_progress:
                    return snapshot, captured
            time.sleep(0.08)
    finally:
        key_event(driver, "keyUp")
    final_snapshot = qa_snapshot(driver)
    raise AssertionError(f"Player did not reach path progress {target_progress:.2f}; final={final_snapshot}, start={start}, end={end}")


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "pillar": {}, "arch": {}, "lighting": {}, "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey").click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="dev.5 QA bridge")
        configure_lab(driver); scene_only(driver)

        for depth in ("edge", "interior", "core", "deep-core"):
            message = qa_locate(driver, "pillar-field", depth); file_name = f"pillar-{depth}.png"
            capture_canvas(driver, ARTIFACT_DIR / file_name)
            report["pillar"][depth] = {"message": message, "snapshot": qa_snapshot(driver), "file": file_name}

        arch_message = qa_locate(driver, "arch-rooms", "core")
        route = driver.execute_script("return window.__projectNoclipQa?.placeAtArchRoute?.() ?? null;")
        if not route: raise AssertionError("Could not resolve a freshly streamed runtime-clear Arch route bay")
        time.sleep(0.7); before = qa_snapshot(driver); capture_canvas(driver, ARTIFACT_DIR / "arch-route-before.png")
        if not resume_input(driver): raise AssertionError("Pointer lock unavailable for required Arch traversal")
        after, _ = drive_forward_to_progress(driver, route["start"], route["end"], 0.80, 24.0)
        capture_canvas(driver, ARTIFACT_DIR / "arch-route-after.png")
        fixed, axis = float(route["fixed"]), "z" if route["orientation"] == "z" else "x"
        if not before or not (float(before[axis]) < fixed - 0.7 and float(after[axis]) > fixed + 0.7):
            raise AssertionError(f"Player did not traverse the selected Arch route bay: {before} -> {after}, route={route}")
        report["arch"] = {"message": arch_message, "route": route, "before": before, "after": after, "pointerLock": True}

        qa_locate(driver, "ordinary-level-0", "nearest")
        # The long approach/pass/retreat capture is a visual gate, not a full-load benchmark.
        # Keep only the nearby streamed ring so SwiftShader can advance real movement at a useful rate.
        radius_changed = driver.execute_script("""
          const element=document.querySelector('[data-lab="radius"]');
          if(!element)return false; element.value='1';
          element.dispatchEvent(new Event('change',{bubbles:true})); return true;
        """)
        if not radius_changed: raise AssertionError("Could not reduce the visual-capture stream radius")
        time.sleep(0.8)
        approach = driver.execute_script("return window.__projectNoclipQa?.placeAtFixtureApproach?.() ?? null;")
        if not approach: raise AssertionError("Could not resolve a freshly streamed clear fixture approach/pass/retreat path")
        time.sleep(0.6)
        if not resume_input(driver): raise AssertionError("Pointer lock unavailable for required fixture traversal")
        frames = [{"file": "fixture-approach-00.png", "threshold": 0.0, "progress": 0.0, "snapshot": qa_snapshot(driver)}]
        capture_canvas(driver, ARTIFACT_DIR / "fixture-approach-00.png")
        capture_targets = [(index / 8, f"fixture-approach-{index:02d}.png") for index in range(1, 9)]
        final_lighting, captured = drive_forward_to_progress(driver, approach["start"], approach["end"], 0.98, 90.0, capture_targets)
        frames.extend(captured)
        if len(frames) != 9: raise AssertionError(f"Fixture spatial capture missed milestones: {frames}")
        fixture_id = str(approach["fixtureId"])
        for frame in frames:
            snapshot = frame.get("snapshot") or {}
            if fixture_id not in snapshot.get("sourceIds", []):
                raise AssertionError(f"Fixture {fixture_id} lost stable physical-light ownership during traversal: {frame}")
        report["lighting"] = {"approach": approach, "pointerLock": True, "frames": frames, "final": final_lighting}

        report["browserErrors"].extend(severe_errors(driver))
        if report["browserErrors"]: raise AssertionError(report["browserErrors"])
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
