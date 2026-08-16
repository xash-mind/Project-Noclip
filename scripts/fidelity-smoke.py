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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_FIDELITY_ARTIFACTS", "artifacts/fidelity"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
ARCH_ROUTE_CROSSING_PROGRESS = 0.71
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
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(80)
    return driver


def force_headless_focus(driver: webdriver.Chrome) -> None:
    driver.execute_script("""
      try {
        Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true });
      } catch (_error) {}
      window.focus();
      document.querySelector('#game-canvas')?.focus();
    """)


def pointer_locked(driver: webdriver.Chrome) -> bool:
    return bool(driver.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"))


def ensure_gameplay_active(driver: webdriver.Chrome, timeout: float = 7.0) -> None:
    force_headless_focus(driver)
    if pointer_locked(driver):
        return
    button = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    if button.is_displayed():
        button.click()
    else:
        driver.find_element(By.CSS_SELECTOR, '#game-canvas').click()
    force_headless_focus(driver)
    wait_for(driver, lambda current: pointer_locked(current), timeout=timeout, message="pointer lock")


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
      if (document.querySelector('#fidelity-smoke-style')) return;
      const style=document.createElement('style'); style.id='fidelity-smoke-style';
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
    try:
        ensure_gameplay_active(driver)
        return True
    except AssertionError:
        return False


def movement_key(driver: webdriver.Chrome, event_type: str, key: str, code: str, key_code: int) -> None:
    driver.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": event_type, "key": key, "code": code, "windowsVirtualKeyCode": key_code, "nativeVirtualKeyCode": key_code})


def key_event(driver: webdriver.Chrome, event_type: str) -> None:
    movement_key(driver, event_type, "w", "KeyW", 87)


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
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    ensure_gameplay_active(driver)
    key_event(driver, "keyDown")
    try:
        while time.monotonic() < deadline:
            if not pointer_locked(driver):
                key_event(driver, "keyUp")
                ensure_gameplay_active(driver)
                key_event(driver, "keyDown")
            snapshot = qa_snapshot(driver)
            if snapshot and path_progress(snapshot, start, end) >= target_progress:
                return snapshot
            time.sleep(0.08)
    finally:
        key_event(driver, "keyUp")
    final_snapshot = qa_snapshot(driver)
    raise AssertionError(f"Player did not reach path progress {target_progress:.2f}; final={final_snapshot}, start={start}, end={end}, pointerLock={pointer_locked(driver)}")


def fixture_snapshot(driver: webdriver.Chrome, group_id: str) -> dict[str, Any]:
    value = driver.execute_script(
        "return window.__projectNoclipQa?.fixtureStateSnapshot?.(arguments[0]) ?? null;",
        group_id,
    )
    if not value:
        raise AssertionError(f"Missing fixture state snapshot for {group_id}")
    return value


def wait_for_flicker_phase(driver: webdriver.Chrome, group_id: str, lit: bool, timeout: float = 24.0) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    pulses: set[float] = set()
    while time.monotonic() < deadline:
        ensure_gameplay_active(driver)
        value = fixture_snapshot(driver, group_id)
        pulse = float(value.get("pulse", -1))
        pulses.add(round(pulse, 6))
        if (pulse >= FLICKER_THRESHOLD) == lit:
            time.sleep(0.08)
            settled = fixture_snapshot(driver, group_id)
            settled["observedPulseCount"] = len(pulses)
            return settled
        time.sleep(0.04)
    raise AssertionError(f"Timed out waiting for flicker {'lit' if lit else 'dark'} phase for {group_id}; distinctPulses={sorted(pulses)}")


def fixture_state_evidence(driver: webdriver.Chrome, state: str) -> dict[str, Any]:
    evidence = driver.execute_script("return window.__projectNoclipQa?.placeAtFixtureState?.(arguments[0]) ?? null;", state)
    if not evidence:
        raise AssertionError(f"Could not resolve a deterministic {state} fixture")
    time.sleep(0.7)
    ensure_gameplay_active(driver)
    snapshot = qa_snapshot(driver)
    if not snapshot:
        raise AssertionError(f"Missing runtime snapshot for {state} fixture")
    if snapshot.get("sourceIds"):
        raise AssertionError(f"Player-relative fixture-light ownership reappeared for {state}: {snapshot}")
    state_snapshot = fixture_snapshot(driver, evidence["groupId"])
    if state_snapshot.get("state") != state:
        raise AssertionError(f"Fixture state changed during {state} capture: {state_snapshot}")
    if state_snapshot.get("sourceOwned"):
        raise AssertionError(f"Retired player-relative source ownership reappeared for {state}: {state_snapshot}")

    if state == "flicker":
        lit_snapshot = wait_for_flicker_phase(driver, evidence["groupId"], True)
        capture_canvas(driver, ARTIFACT_DIR / "fixture-flicker-lit.png")
        dark_snapshot = wait_for_flicker_phase(driver, evidence["groupId"], False)
        capture_canvas(driver, ARTIFACT_DIR / "fixture-flicker-dark.png")
        return {
            "files": ["fixture-flicker-lit.png", "fixture-flicker-dark.png"],
            "placement": evidence,
            "runtime": snapshot,
            "lit": lit_snapshot,
            "dark": dark_snapshot,
        }

    pulse = float(state_snapshot.get("pulse", -1))
    if state == "on" and abs(pulse - 1) > 1e-9:
        raise AssertionError(f"On fixture pulse was not 1: {state_snapshot}")
    if state == "off" and abs(pulse) > 1e-9:
        raise AssertionError(f"Off fixture pulse was not 0: {state_snapshot}")
    file_name = f"fixture-{state}.png"
    capture_canvas(driver, ARTIFACT_DIR / file_name)
    return {
        "file": file_name,
        "placement": evidence,
        "runtime": snapshot,
        "fixture": state_snapshot,
    }


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "pillar": {}, "arch": {}, "lighting": {}, "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey").click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="runtime QA bridge")
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
        # Keep the actual journey active in headless Chromium; losing pointer lock pauses movement and the canonical flicker clock.
        after = drive_forward_to_progress(driver, route["start"], route["end"], ARCH_ROUTE_CROSSING_PROGRESS, 36.0)
        capture_canvas(driver, ARTIFACT_DIR / "arch-route-after.png")
        fixed, axis = float(route["fixed"]), "z" if route["orientation"] == "z" else "x"
        if not before or not (float(before[axis]) < fixed - 0.7 and float(after[axis]) > fixed + 0.7):
            raise AssertionError(f"Player did not traverse the selected Arch route bay: {before} -> {after}, route={route}")
        report["arch"] = {"message": arch_message, "route": route, "before": before, "after": after, "pointerLock": pointer_locked(driver)}

        qa_locate(driver, "ordinary-level-0", "nearest")
        fixture_states = {
            state: fixture_state_evidence(driver, state)
            for state in ("on", "flicker", "off")
        }
        report["lighting"] = {
            "ownershipModel": "fixture-owned",
            "legacySourceIdsAbsent": True,
            "states": fixture_states,
        }

        report["browserErrors"].extend(severe_errors(driver))
        if report["browserErrors"]: raise AssertionError(report["browserErrors"])
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
