from __future__ import annotations

import json
import math
import os
import re
import shutil
import statistics
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_RUNTIME_EVIDENCE_ARTIFACTS", "artifacts/runtime-diagnostics"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
BRANCH_HEAD_SHA = os.environ.get("NOCLIP_BRANCH_HEAD_SHA", "unknown")
VERSION = Path("VERSION").read_text(encoding="utf-8").strip()
SAMPLE_SECONDS = float(os.environ.get("NOCLIP_RUNTIME_SAMPLE_SECONDS", "2.5"))


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 30.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).is_displayed()
    except Exception:
        return False


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for argument in (
        "--headless=new",
        "--window-size=1440,900",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--enable-precise-memory-info",
        "--disable-dev-shm-usage",
        "--no-sandbox",
    ):
        options.add_argument(argument)
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    return webdriver.Chrome(options=options)


def percentile(values: list[float], quantile: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return math.nan
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * quantile
    lower, upper = math.floor(position), math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def measure_frames(driver: webdriver.Chrome, seconds: float, *, turning: bool = False) -> dict[str, Any]:
    raw = driver.execute_async_script(
        """
        const duration=arguments[0], turning=arguments[1], done=arguments[arguments.length-1];
        const intervals=[]; const started=performance.now(); let previous=started; let direction=1;
        function sample(now){
          if(now>previous) intervals.push(now-previous);
          previous=now;
          if(turning){
            direction*=-1;
            document.dispatchEvent(new MouseEvent('mousemove',{
              bubbles:true, movementX:direction*140, movementY:direction*18, clientX:720, clientY:450
            }));
          }
          if(now-started>=duration){done({intervals,elapsedMs:now-started});return;}
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        """,
        int(seconds * 1000),
        turning,
    )
    values = [float(value) for value in raw.get("intervals", []) if float(value) > 0]
    if not values:
        raise AssertionError("No requestAnimationFrame samples recorded")
    return {
        "sampleCount": len(values),
        "elapsedMs": round(float(raw.get("elapsedMs", 0)), 2),
        "medianFrameTimeMs": round(statistics.median(values), 3),
        "p95FrameTimeMs": round(percentile(values, 0.95), 3),
        "p99FrameTimeMs": round(percentile(values, 0.99), 3),
        "maxFrameTimeMs": round(max(values), 3),
        "majorHitchesOver50Ms": sum(value > 50 for value in values),
        "slowFramePctOver33_3Ms": round(sum(value > 33.3 for value in values) * 100 / len(values), 2),
    }


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def metric_number(text: str, label: str) -> int | None:
    match = re.search(rf"(?m)^{re.escape(label)}\s+(\d+)", text)
    return int(match.group(1)) if match else None


def metrics(driver: webdriver.Chrome) -> dict[str, Any]:
    text = str(driver.execute_script("return document.querySelector('[data-ui=metrics]')?.textContent || '';"))
    diagnostics = driver.execute_script("return window.__projectNoclipRenderSettings?.diagnostics?.() ?? null;")
    runtime = driver.execute_script("return window.__noclipRendererRuntimeDiagnostics?.snapshot?.() ?? null;")
    result: dict[str, Any] = {
        "loadedCells": metric_number(text, "loaded cells"),
        "drawCalls": metric_number(text, "draw calls"),
        "participatingCells": None,
        "activeOmnis": None,
        "shadowedOmnis": None,
    }
    if isinstance(diagnostics, dict):
        active_cells = diagnostics.get("activeCells")
        if isinstance(active_cells, (int, float)):
            result["participatingCells"] = int(active_cells)
        for source, target in (("activeOmnis", "activeOmnis"), ("shadowedOmnis", "shadowedOmnis")):
            value = diagnostics.get(source)
            if isinstance(value, (int, float)):
                result[target] = int(value)
    if isinstance(runtime, dict):
        result["runtimeDiagnostics"] = {
            key: runtime.get(key)
            for key in ("activeCells", "activeOmnis", "shadowedOmnis", "fixture", "batching", "arch")
            if key in runtime
        }
    return result


def set_value(driver: webdriver.Chrome, selector: str, value: str) -> None:
    driver.execute_script(
        """
        const element=document.querySelector(arguments[0]);
        if(!element) throw new Error(`Missing ${arguments[0]}`);
        element.value=arguments[1];
        element.dispatchEvent(new Event('input',{bubbles:true}));
        """,
        selector,
        value,
    )


def click(driver: webdriver.Chrome, selector: str) -> None:
    element = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, selector), message=selector)
    wait_for(driver, lambda _current: element.is_displayed() and element.is_enabled(), message=f"clickable {selector}")
    element.click()


def key_event(driver: webdriver.Chrome, down: bool, key: str, code: str) -> None:
    event = "keydown" if down else "keyup"
    driver.execute_script(
        f"window.dispatchEvent(new KeyboardEvent('{event}',{{key:arguments[0],code:arguments[1],bubbles:true}}));",
        key,
        code,
    )


def locate(driver: webdriver.Chrome, region: str, depth: str) -> dict[str, Any]:
    started = time.perf_counter()
    result = driver.execute_async_script(
        """
        const region=arguments[0], depth=arguments[1], done=arguments[arguments.length-1];
        const qa=window.__projectNoclipQa;
        if(!qa?.locate){done({error:'Region locate QA hook unavailable'});return;}
        Promise.resolve(qa.locate(region,depth)).then(value=>done({value:value||null})).catch(error=>done({error:String(error)}));
        """,
        region,
        depth,
    )
    elapsed_ms = (time.perf_counter() - started) * 1000
    if not isinstance(result, dict) or result.get("error"):
        raise AssertionError(result.get("error") if isinstance(result, dict) else f"Unable to locate {region}/{depth}")
    if not result.get("value"):
        raise AssertionError(f"Unable to locate {region}/{depth}")
    time.sleep(0.6)
    return {"region": region, "depth": depth, "result": result.get("value"), "elapsedMs": round(elapsed_ms, 2)}


def ensure_playing(driver: webdriver.Chrome) -> None:
    try:
        resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
        if resume.is_displayed() and resume.is_enabled():
            resume.click()
    except Exception:
        pass
    try:
        driver.find_element(By.CSS_SELECTOR, "#game-canvas").click()
    except WebDriverException:
        pass


def startup(driver: webdriver.Chrome) -> None:
    driver.get(BASE_URL)
    wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="title")
    click(driver, '[data-action="new"]')
    wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="Character Creator")
    set_value(driver, '[data-character="name"]', "Runtime Evidence")
    click(driver, '[data-action="character-begin"]')
    wait_for(driver, lambda current: displayed(current, '[data-ui="hud"]'), timeout=40, message="Level 0 HUD")
    wait_for(
        driver,
        lambda current: bool(current.execute_script("return window.__projectNoclipQa && window.__projectNoclipRenderSettings")),
        timeout=30,
        message="QA/render diagnostics",
    )
    ensure_playing(driver)
    time.sleep(0.8)


def scenario(
    driver: webdriver.Chrome,
    name: str,
    *,
    seconds: float | None = None,
    running: bool = False,
    turning: bool = False,
) -> dict[str, Any]:
    duration = seconds if seconds is not None else SAMPLE_SECONDS
    if running:
        key_event(driver, True, "Shift", "ShiftLeft")
        key_event(driver, True, "w", "KeyW")
    try:
        frames = measure_frames(driver, duration, turning=turning)
    finally:
        if running:
            key_event(driver, False, "w", "KeyW")
            key_event(driver, False, "Shift", "ShiftLeft")
    time.sleep(0.25)
    errors = browser_errors(driver)
    return {
        "scenario": name,
        **frames,
        **metrics(driver),
        "browserExceptions": errors,
    }


def main() -> None:
    evidence: dict[str, Any] = {
        "schemaVersion": 1,
        "commitSha": BRANCH_HEAD_SHA,
        "version": VERSION,
        "baseUrl": BASE_URL,
        "environment": {"renderer": "headless Chromium / SwiftShader"},
        "scenarios": [],
        "regionLocate": [],
    }
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(120)
    try:
        startup(driver)
        locate(driver, "ordinary-level-0", "nearest")
        evidence["scenarios"].append(scenario(driver, "standing-ordinary"))
        evidence["scenarios"].append(scenario(driver, "sustained-running", seconds=max(4.0, SAMPLE_SECONDS), running=True))
        evidence["scenarios"].append(scenario(driver, "rapid-camera-rotation", turning=True))
        evidence["scenarios"].append(scenario(driver, "running-plus-turning", seconds=max(4.0, SAMPLE_SECONDS), running=True, turning=True))
        evidence["scenarios"].append(scenario(driver, "repeated-cell-crossings", seconds=max(6.0, SAMPLE_SECONDS), running=True))

        evidence["regionLocate"].append(locate(driver, "pillar-field", "interior"))
        evidence["scenarios"].append(scenario(driver, "pillar-field"))
        evidence["regionLocate"].append(locate(driver, "arch-rooms", "core"))
        evidence["scenarios"].append(scenario(driver, "arch-rooms"))

        for region, depth in (
            ("ordinary-level-0", "nearest"),
            ("pillar-field", "interior"),
            ("arch-rooms", "interior"),
            ("ordinary-level-0", "nearest"),
        ):
            evidence["regionLocate"].append(locate(driver, region, depth))
        evidence["scenarios"].append(scenario(driver, "region-locate"))

        evidence["browserExceptions"] = browser_errors(driver)
        all_errors = [error for item in evidence["scenarios"] for error in item.get("browserExceptions", [])]
        assert not all_errors, all_errors
        assert not evidence["browserExceptions"], evidence["browserExceptions"]
    finally:
        driver.quit()

    output = ARTIFACT_DIR / "runtime-performance-evidence.json"
    output.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()