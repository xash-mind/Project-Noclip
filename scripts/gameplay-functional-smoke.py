from __future__ import annotations

import json
import math
import os
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_GAMEPLAY_ARTIFACTS", "artifacts/gameplay-functional"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 25, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).is_displayed()
    except Exception:
        return False


def click(driver: webdriver.Chrome, selector: str) -> None:
    element = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, selector), message=selector)
    wait_for(driver, lambda _current: element.is_displayed() and element.is_enabled(), message=f"clickable {selector}")
    element.click()


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({error:String(request.error)});
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) { db.close(); done(null); return; }
          const read = db.transaction('journey','readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done({error:String(read.error)}); };
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) and "error" not in value else None


def qa_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script("return window.__projectNoclipQa?.snapshot?.() ?? null;")
    if not isinstance(value, dict):
        raise AssertionError(f"Missing QA snapshot: {value}")
    return value


def render_diagnostics(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script("return window.__projectNoclipRenderSettings?.diagnostics?.() ?? null;")
    if not isinstance(value, dict):
        raise AssertionError(f"Missing render diagnostics: {value}")
    return value


def ensure_pointer_lock(driver: webdriver.Chrome) -> None:
    if driver.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas');"):
        return
    canvas = driver.find_element(By.CSS_SELECTOR, "#game-canvas")
    ActionChains(driver).move_to_element(canvas).click().perform()
    wait_for(
        driver,
        lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas');"),
        timeout=12,
        message="trusted pointer lock during live performance test",
    )


def dispatch_key(driver: webdriver.Chrome, code: str, down: bool) -> None:
    event_type = "keydown" if down else "keyup"
    driver.execute_script(
        "window.dispatchEvent(new KeyboardEvent(arguments[0],{code:arguments[1],key:arguments[1],bubbles:true}));",
        event_type,
        code,
    )


def move_forward(driver: webdriver.Chrome, seconds: float, sprint: bool = False) -> None:
    dispatch_key(driver, "KeyW", True)
    if sprint:
        dispatch_key(driver, "ShiftLeft", True)
    time.sleep(seconds)
    if sprint:
        dispatch_key(driver, "ShiftLeft", False)
    dispatch_key(driver, "KeyW", False)
    time.sleep(0.25)


def rotate_live(driver: webdriver.Chrome, movement_x: int) -> None:
    driver.execute_script(
        """
        const event=new MouseEvent('mousemove',{bubbles:true});
        Object.defineProperty(event,'movementX',{value:arguments[0]});
        Object.defineProperty(event,'movementY',{value:0});
        window.dispatchEvent(event);
        """,
        movement_x,
    )
    time.sleep(0.25)


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for argument in (
        "--headless=new",
        "--window-size=1440,900",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--disable-dev-shm-usage",
        "--no-sandbox",
    ):
        options.add_argument(argument)
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    return webdriver.Chrome(options=options)


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "checks": []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(30)
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="title screen")
        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="Character Creator")
        driver.execute_script(
            """
            const input=document.querySelector('[data-character="name"]');
            if(!input) throw new Error('Missing Character Creator name input');
            input.value='Verification';
            input.dispatchEvent(new Event('input',{bubbles:true}));
            """
        )
        click(driver, '[data-action="character-begin"]')
        wait_for(
            driver,
            lambda current: not displayed(current, '[data-ui="character-creator"]') and displayed(current, '[data-ui="hud"]'),
            timeout=35,
            message="Level 0 HUD after Begin Journey",
        )
        save = wait_for(driver, lambda current: read_save(current), timeout=20, message="Journey save")
        assert save.get("version") == 2, save
        assert save.get("seed"), save
        character_id = save.get("characterId")
        assert character_id, save
        report["checks"].append("New Game -> Character Creator -> Begin Journey -> Level 0")
        driver.save_screenshot(str(ARTIFACT_DIR / "level0.png"))

        driver.refresh()
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="title after refresh")
        click(driver, '[data-action="continue"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="hud"]'), timeout=35, message="continued Level 0 HUD")
        continued = wait_for(driver, lambda current: read_save(current), timeout=15, message="continued Journey save")
        assert continued.get("characterId") == character_id, (character_id, continued)
        report["checks"].append("refresh -> Continue preserves Journey identity")

        wait_for(
            driver,
            lambda current: current.execute_script("return Boolean(window.__projectNoclipQa && window.__projectNoclipRenderSettings)"),
            timeout=15,
            message="runtime QA bridges",
        )
        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Backquote',key:'`',bubbles:true}));")
        wait_for(driver, lambda current: displayed(current, '[data-ui="lab"]'), message="World Lab open")
        click(driver, '[data-render-tab="render"]')
        wait_for(driver, lambda current: displayed(current, '[data-lab-panel="render-settings"]'), message="Performance Lab panel")
        click(driver, '[data-action="enter-live-performance"]')
        wait_for(
            driver,
            lambda current: current.execute_script("return window.__projectNoclipRenderSettings?.live?.()===true"),
            message="Live Performance Test active",
        )
        assert displayed(driver, '[data-ui="render-live-overlay"]')
        assert not displayed(driver, '[data-ui="lab"]')
        report["checks"].append("Performance Lab -> Enter Live Test leaves compact QA overlay while normal World Lab closes")

        ensure_pointer_lock(driver)
        before_walk = qa_snapshot(driver)
        move_forward(driver, 0.75, sprint=False)
        after_walk = qa_snapshot(driver)
        walk_distance = math.hypot(float(after_walk["x"]) - float(before_walk["x"]), float(after_walk["z"]) - float(before_walk["z"]))
        assert walk_distance > 0.25, (before_walk, after_walk)

        before_sprint = after_walk
        move_forward(driver, 0.75, sprint=True)
        after_sprint = qa_snapshot(driver)
        sprint_distance = math.hypot(float(after_sprint["x"]) - float(before_sprint["x"]), float(after_sprint["z"]) - float(before_sprint["z"]))
        assert sprint_distance > 0.25, (before_sprint, after_sprint)

        yaw_before = float(after_sprint["yaw"])
        rotate_live(driver, -420)
        yaw_after = float(qa_snapshot(driver)["yaw"])
        assert abs(yaw_after - yaw_before) > 10, (yaw_before, yaw_after)
        report["checks"].append("Live Test permits walk, sprint and mouse-look while the compact overlay remains active")

        frontier_samples: dict[str, Any] = {}
        for level in ("low", "medium", "high", "ultra"):
            changed = driver.execute_script("return window.__projectNoclipRenderSettings.patch({renderDistance:arguments[0]});", level)
            assert isinstance(changed, dict) and changed.get("renderDistance") == level, changed
            time.sleep(0.45)
            diagnostics = render_diagnostics(driver)
            assert diagnostics.get("renderDistance") == level, diagnostics
            fog_end = float(diagnostics.get("fogEnd", diagnostics["canonicalFogEnd"]))
            canonical_end = float(diagnostics["canonicalFogEnd"])
            assert fog_end <= canonical_end + 0.001, diagnostics
            frontier = diagnostics.get("nearestGuaranteedFrontierMeters")
            if frontier is not None:
                assert fog_end < float(frontier), diagnostics
            frontier_samples[level] = diagnostics
        report["frontierSamples"] = frontier_samples
        report["checks"].append("Low/Medium/High/Ultra live traversal diagnostics keep fog at/before guaranteed coverage")

        lighting = driver.execute_script("return window.__projectNoclipRenderSettings.lighting({maxActiveLights:64,maxShadowCastingLights:16});")
        assert lighting == {"maxActiveLights": 64, "maxShadowCastingLights": 16}, lighting
        time.sleep(0.35)
        lighting_diag = render_diagnostics(driver)
        assert int(lighting_diag["activeOmnis"]) <= 64, lighting_diag
        assert int(lighting_diag["shadowedOmnis"]) <= 16, lighting_diag
        assert int(lighting_diag["shadowedOmnis"]) <= int(lighting_diag["activeOmnis"]), lighting_diag
        driver.execute_script("window.__projectNoclipRenderSettings.patch({renderScale:0.67,shadowResolution:256,postProcessing:'low'});")
        time.sleep(0.25)
        report["checks"].append("Live Test changes active/shadow ceilings independently and accepts render-scale/shadow/post experiments")

        driver.execute_script("window.__projectNoclipRenderSettings.resetLighting(); window.__projectNoclipRenderSettings.resetRender();")
        after_experiment_save = wait_for(driver, lambda current: read_save(current), timeout=15, message="Journey save after QA experiment")
        serialized = json.dumps(after_experiment_save, sort_keys=True)
        for forbidden in ("maxActiveLights", "maxShadowCastingLights", "renderScale", "shadowResolution", "postProcessing"):
            assert forbidden not in serialized, (forbidden, after_experiment_save)
        report["checks"].append("Live render/light QA overrides remain outside Journey save data")

        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Backquote',key:'`',bubbles:true}));")
        wait_for(
            driver,
            lambda current: current.execute_script("return window.__projectNoclipRenderSettings?.live?.()===false"),
            message="Live Performance Test exit",
        )
        wait_for(driver, lambda current: displayed(current, '[data-ui="lab"]'), message="World Lab restored after Live Test")
        assert displayed(driver, '[data-lab-panel="render-settings"]')
        assert not displayed(driver, '[data-ui="render-live-overlay"]')
        report["checks"].append("Exit Live Test restores normal paused World Lab Performance Lab semantics")

        severe = [
            entry for entry in driver.get_log("browser")
            if entry.get("level") == "SEVERE" and "favicon.ico" not in entry.get("message", "")
        ]
        assert not severe, severe
        report["browserErrors"] = severe
    finally:
        driver.quit()

    (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
