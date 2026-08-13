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
      const done = arguments[0];
      const canvas = document.querySelector('#game-canvas');
      if (!canvas) { done({error:'missing #game-canvas'}); return; }
      requestAnimationFrame(() => {
        canvas.toBlob((blob) => {
          if (!blob) { done({error:'canvas.toBlob returned null'}); return; }
          const reader = new FileReader();
          reader.onerror = () => done({error:String(reader.error)});
          reader.onload = () => done(String(reader.result));
          reader.readAsDataURL(blob);
        }, 'image/png');
      });
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
        raise AssertionError(f"WebGL canvas capture was unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def scene_only(driver: webdriver.Chrome) -> None:
    driver.execute_script("""
      if (document.querySelector('#dev5-fidelity-style')) return;
      const style=document.createElement('style');
      style.id='dev5-fidelity-style';
      style.textContent='[data-ui="hud"] > :not(canvas), .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; }';
      document.head.appendChild(style);
    """)


def configure_lab(driver: webdriver.Chrome) -> None:
    result = driver.execute_script("""
      const set=(selector,value)=>{const element=document.querySelector(selector);if(!element)return false;if(element.type==='checkbox')element.checked=value;else element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));return true;};
      return {
        bypass:set('[data-lab="bypass"]',true),
        radius:set('[data-lab="radius"]','3'),
        condition:set('[data-lab="condition"]','clear'),
        carver:set('[data-lab="carver"]','none'),
        structure:set('[data-lab="structure"]','none')
      };
    """)
    if not all(result.values()):
        raise AssertionError(f"World Lab controls missing: {result}")


def qa_locate(driver: webdriver.Chrome, region: str, depth: str) -> str:
    result = driver.execute_async_script("""
      const region=arguments[0], depth=arguments[1], done=arguments[2];
      const qa=window.__projectNoclipQa;
      if(!qa){done({error:'missing __projectNoclipQa'});return;}
      Promise.resolve(qa.locate(region,depth)).then((message)=>done({message})).catch((error)=>done({error:String(error)}));
    """, region, depth)
    if result.get("error"):
        raise AssertionError(result["error"])
    if not result.get("message"):
        raise AssertionError(f"Could not locate {region}/{depth}")
    time.sleep(1.0)
    return str(result["message"])


def resume_input(driver: webdriver.Chrome) -> bool:
    button = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    if button.is_displayed():
        button.click()
    try:
        wait_for(driver, lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"), timeout=7, message="pointer lock")
        return True
    except AssertionError:
        return False


def press_forward(driver: webdriver.Chrome, seconds: float) -> None:
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true}));")
    time.sleep(seconds)
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',bubbles:true}));")


def qa_snapshot(driver: webdriver.Chrome) -> dict[str, Any] | None:
    return driver.execute_script("return window.__projectNoclipQa?.snapshot?.() ?? null;")


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "pillar": {}, "arch": {}, "lighting": {}, "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey")
        new_button.click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="dev.5 QA bridge")
        configure_lab(driver)
        scene_only(driver)

        for depth in ("edge", "interior", "core", "deep-core"):
            message = qa_locate(driver, "pillar-field", depth)
            file_name = f"pillar-{depth}.png"
            capture_canvas(driver, ARTIFACT_DIR / file_name)
            report["pillar"][depth] = {"message": message, "snapshot": qa_snapshot(driver), "file": file_name}

        arch_message = qa_locate(driver, "arch-rooms", "core")
        route = driver.execute_script("return window.__projectNoclipQa?.placeAtArchRoute?.() ?? null;")
        if not route:
            raise AssertionError("Could not resolve a collider-clear route-bearing Arch bay in the running renderer")
        time.sleep(0.7)
        before = qa_snapshot(driver)
        capture_canvas(driver, ARTIFACT_DIR / "arch-route-before.png")
        pointer_lock = resume_input(driver)
        if pointer_lock:
            press_forward(driver, 1.25)
            time.sleep(0.35)
        after = qa_snapshot(driver)
        capture_canvas(driver, ARTIFACT_DIR / "arch-route-after.png")
        if pointer_lock and before and after:
            fixed = float(route["fixed"])
            axis = "z" if route["orientation"] == "z" else "x"
            if not (float(before[axis]) < fixed - 0.7 and float(after[axis]) > fixed + 0.7):
                raise AssertionError(f"Player did not traverse the selected Arch route bay: {before} -> {after}, route={route}")
        report["arch"] = {"message": arch_message, "route": route, "before": before, "after": after, "pointerLock": pointer_lock}

        qa_locate(driver, "ordinary-level-0", "nearest")
        approach = driver.execute_script("return window.__projectNoclipQa?.placeAtFixtureApproach?.() ?? null;")
        if not approach:
            raise AssertionError("Could not resolve a clear fixture-approach path for illumination capture")
        time.sleep(0.6)
        pointer_lock = resume_input(driver)
        lighting_frames = []
        capture_canvas(driver, ARTIFACT_DIR / "fixture-approach-00.png")
        lighting_frames.append({"file": "fixture-approach-00.png", "snapshot": qa_snapshot(driver)})
        if pointer_lock:
            driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true}));")
            for index in range(1, 9):
                time.sleep(0.48)
                file_name = f"fixture-approach-{index:02d}.png"
                capture_canvas(driver, ARTIFACT_DIR / file_name)
                lighting_frames.append({"file": file_name, "snapshot": qa_snapshot(driver)})
            driver.execute_script("window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',bubbles:true}));")
        report["lighting"] = {"approach": approach, "pointerLock": pointer_lock, "frames": lighting_frames}

        report["browserErrors"].extend(severe_errors(driver))
        if report["browserErrors"]:
            raise AssertionError(report["browserErrors"])
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
