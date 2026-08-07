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
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "https://project-noclip.vercel.app")
DEPLOYMENT_COMMIT = os.environ.get("NOCLIP_DEPLOYMENT_COMMIT", "c2d3cb38faacfc7e8e22dae67aa2e8e8af9ddfea")
DEPLOYMENT_ID = os.environ.get("NOCLIP_DEPLOYMENT_ID", "dpl_C1FfCuvYVQ7aKaVG6bpUPT2o6Gmp")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_PROFILE_ARTIFACTS", "artifacts/production-profile"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
STATIC_SAMPLE_SECONDS = float(os.environ.get("NOCLIP_PROFILE_STATIC_SECONDS", "5"))


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 20.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def text_content(driver: webdriver.Chrome, selector: str) -> str:
    return str(driver.execute_script(
        "const e=document.querySelector(arguments[0]); return e ? e.textContent || '' : '';",
        selector,
    ) or "")


def wait_for_text(driver: webdriver.Chrome, selector: str, fragment: str, timeout: float = 20.0) -> str:
    def ready(current: webdriver.Chrome) -> str | bool:
        value = text_content(current, selector)
        return value if fragment in value else False
    return str(wait_for(driver, ready, timeout, f"{selector} containing {fragment!r}"))


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done=arguments[0];
        const request=indexedDB.open('project-noclip',2);
        request.onerror=()=>done({error:String(request.error)});
        request.onsuccess=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains('journey')){db.close();done(null);return;}
          const read=db.transaction('journey','readonly').objectStore('journey').get('local-character');
          read.onerror=()=>{db.close();done({error:String(read.error)});};
          read.onsuccess=()=>{const result=read.result??null;db.close();done(result);};
        };
        """
    )
    return value if isinstance(value, dict) else None


def browser_log_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(part in entry.get("message", "") for part in ignored)
    ]


def screenshot(driver: webdriver.Chrome, name: str, warnings: list[str]) -> None:
    try:
        driver.save_screenshot(str(ARTIFACT_DIR / name))
    except Exception as error:
        warnings.append(f"Screenshot {name} failed: {type(error).__name__}: {str(error).splitlines()[0]}")


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for argument in (
        "--headless=new", "--window-size=1440,900", "--use-angle=swiftshader", "--enable-webgl",
        "--ignore-gpu-blocklist", "--enable-precise-memory-info", "--disable-dev-shm-usage", "--no-sandbox",
    ):
        options.add_argument(argument)
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    return webdriver.Chrome(options=options)


def dispatch_change(driver: webdriver.Chrome, selector: str, value: str | bool) -> None:
    driver.execute_script(
        """
        const e=document.querySelector(arguments[0]);
        if(!e) throw new Error(`Missing ${arguments[0]}`);
        if(e.type==='checkbox') e.checked=arguments[1]; else e.value=arguments[1];
        e.dispatchEvent(new Event('change',{bubbles:true}));
        """,
        selector,
        value,
    )


def lab_is_open(driver: webdriver.Chrome) -> bool:
    return "visible" in driver.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split()


def ensure_lab(driver: webdriver.Chrome, open_state: bool) -> None:
    if lab_is_open(driver) != open_state:
        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")
    wait_for(driver, lambda current: lab_is_open(current) == open_state, message=f"World Lab {'open' if open_state else 'closed'}")


def ensure_pointer_lock(driver: webdriver.Chrome) -> None:
    if driver.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"):
        return
    resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    driver.execute_script("arguments[0].click();", resume)
    wait_for(
        driver,
        lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"),
        timeout=8,
        message="pointer lock",
    )


def parse_metrics(text: str) -> dict[str, Any]:
    def value_for(label: str) -> str | None:
        match = re.search(rf"(?m)^{re.escape(label)}\s+(.+)$", text)
        return match.group(1).strip() if match else None

    result: dict[str, Any] = {"raw": text}
    cell = value_for("cell")
    if cell:
        result["cell"] = cell.split(" / ", 1)[0]
    for label, key in (("seed", "seed"), ("room", "room"), ("zone", "zone")):
        value = value_for(label)
        if value is not None:
            result[key] = value
    for label, key in (("loaded cells", "loadedCells"), ("colliders", "colliders"), ("interactions", "interactions"), ("draw calls", "drawCalls")):
        value = value_for(label)
        if value is not None:
            result[key] = int(value) if value.isdigit() else value
    position = value_for("position")
    if position:
        match = re.match(r"(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", position)
        if match:
            result["position"] = {"x": float(match.group(1)), "z": float(match.group(2))}
    return result


def current_metrics(driver: webdriver.Chrome) -> dict[str, Any]:
    return parse_metrics(text_content(driver, '[data-ui="metrics"]'))


def wait_for_metrics(driver: webdriver.Chrome, predicate: Callable[[dict[str, Any]], bool], message: str) -> dict[str, Any]:
    def ready(current: webdriver.Chrome) -> dict[str, Any] | bool:
        value = current_metrics(current)
        return value if predicate(value) else False
    return dict(wait_for(driver, ready, 25, message))


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


def measure_frames(driver: webdriver.Chrome, seconds: float) -> dict[str, Any]:
    result = driver.execute_async_script(
        """
        const duration=arguments[0], done=arguments[arguments.length-1];
        const intervals=[], started=performance.now(); let previous=started;
        function sample(now){
          if(now>previous) intervals.push(now-previous); previous=now;
          if(now-started>=duration){done({intervals,elapsedMs:now-started});return;}
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        """,
        int(seconds * 1000),
    )
    values = [float(value) for value in result["intervals"] if float(value) > 0]
    if not values:
        raise AssertionError("No requestAnimationFrame samples recorded")
    fps = [1000.0 / value for value in values]
    return {
        "sampleCount": len(values),
        "elapsedMs": round(float(result["elapsedMs"]), 2),
        "frameTimeMs": {
            "mean": round(statistics.fmean(values), 3), "median": round(statistics.median(values), 3),
            "p95": round(percentile(values, 0.95), 3), "max": round(max(values), 3),
        },
        "instantaneousFps": {
            "median": round(statistics.median(fps), 2), "p05": round(percentile(fps, 0.05), 2), "p95": round(percentile(fps, 0.95), 2),
        },
        "slowFramePct": {
            "over16_7ms": round(sum(value > 16.7 for value in values) * 100 / len(values), 2),
            "over33_3ms": round(sum(value > 33.3 for value in values) * 100 / len(values), 2),
            "over50ms": round(sum(value > 50 for value in values) * 100 / len(values), 2),
        },
    }


def cdp_metrics(driver: webdriver.Chrome) -> dict[str, float]:
    raw = driver.execute_cdp_cmd("Performance.getMetrics", {})
    return {str(entry["name"]): float(entry["value"]) for entry in raw.get("metrics", [])}


def cdp_delta(before: dict[str, float], after: dict[str, float], wall_seconds: float) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for name in ("TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"):
        if name in before and name in after:
            result[f"{name}Ms"] = round((after[name] - before[name]) * 1000, 3)
    task_ms = result.get("TaskDurationMs")
    if isinstance(task_ms, (int, float)) and wall_seconds > 0:
        result["mainThreadBusyPct"] = round(task_ms / (wall_seconds * 1000) * 100, 2)
    return result


def memory_snapshot(driver: webdriver.Chrome, cdp: dict[str, float]) -> dict[str, Any]:
    result: dict[str, Any] = {"performanceMemory": driver.execute_script(
        "return performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null"
    )}
    for name in ("JSHeapUsedSize", "JSHeapTotalSize", "Nodes", "Documents", "Frames", "JSEventListeners"):
        if name in cdp:
            result[name] = cdp[name]
    return result


def webgl_environment(driver: webdriver.Chrome) -> dict[str, Any]:
    return dict(driver.execute_script(
        """
        const canvas=document.querySelector('#game-canvas');
        const gl=canvas&&(canvas.getContext('webgl2')||canvas.getContext('webgl'));
        if(!gl) return {available:false};
        const ext=gl.getExtension('WEBGL_debug_renderer_info');
        return {available:true,version:gl.getParameter(gl.VERSION),shadingLanguageVersion:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
        """
    ))


def sample_static(driver: webdriver.Chrome, name: str, warnings: list[str]) -> dict[str, Any]:
    before_world = wait_for_metrics(driver, lambda value: isinstance(value.get("loadedCells"), int) and value.get("drawCalls") not in (None, "n/a"), f"{name} metrics")
    before_cpu = cdp_metrics(driver)
    started = time.perf_counter()
    frames = measure_frames(driver, STATIC_SAMPLE_SECONDS)
    wall_seconds = time.perf_counter() - started
    after_cpu = cdp_metrics(driver)
    after_world = current_metrics(driver)
    screenshot(driver, f"{name}.png", warnings)
    return {
        "worldMetricsBefore": before_world,
        "worldMetricsAfter": after_world,
        "frames": frames,
        "cpu": cdp_delta(before_cpu, after_cpu, wall_seconds),
        "memoryAfter": memory_snapshot(driver, after_cpu),
    }


def profile_streaming_bands(driver: webdriver.Chrome) -> dict[str, Any]:
    ensure_lab(driver, True)
    dispatch_change(driver, '[data-lab="zone"]', "")
    dispatch_change(driver, '[data-lab="bypass"]', False)
    dispatch_change(driver, '[data-lab="radius"]', "3")
    start = wait_for_metrics(driver, lambda value: value.get("loadedCells") == 49, "streaming start radius 3")
    before_cpu = cdp_metrics(driver)
    transitions: list[dict[str, Any]] = []
    started = time.perf_counter()
    for radius in (2, 1, 2, 3):
        target = (radius * 2 + 1) ** 2
        transition_started = time.perf_counter()
        dispatch_change(driver, '[data-lab="radius"]', str(radius))
        metrics = wait_for_metrics(driver, lambda value, target=target: value.get("loadedCells") == target, f"radius {radius} loaded cells")
        transitions.append({
            "radius": radius,
            "loadedCells": target,
            "settleMs": round((time.perf_counter() - transition_started) * 1000, 2),
            "drawCalls": metrics.get("drawCalls"),
            "colliders": metrics.get("colliders"),
            "interactions": metrics.get("interactions"),
        })
    wall_seconds = time.perf_counter() - started
    after_cpu = cdp_metrics(driver)
    end = current_metrics(driver)
    assert [entry["loadedCells"] for entry in transitions] == [25, 9, 25, 49]
    return {
        "startWorldMetrics": start,
        "endWorldMetrics": end,
        "loadedCellsSequence": [49, 25, 9, 25, 49],
        "peakCellsUnloaded": 40,
        "peakCellsReloaded": 40,
        "transitions": transitions,
        "cpu": cdp_delta(before_cpu, after_cpu, wall_seconds),
        "memoryAfter": memory_snapshot(driver, after_cpu),
        "note": "World Lab radius changes are non-persistent local development controls; this measures renderer streaming without changing journey save data.",
    }


def position(save: dict[str, Any] | None) -> dict[str, float]:
    value = (save or {}).get("position") or {}
    return {"x": float(value.get("x", 0)), "z": float(value.get("z", 0))}


def distance(a: dict[str, float], b: dict[str, float]) -> float:
    return math.hypot(a["x"] - b["x"], a["z"] - b["z"])


def main() -> None:
    report: dict[str, Any] = {
        "baseUrl": BASE_URL,
        "deployment": {"commit": DEPLOYMENT_COMMIT, "id": DEPLOYMENT_ID},
        "rollback": {"commit": DEPLOYMENT_COMMIT, "deploymentId": DEPLOYMENT_ID},
        "checks": [], "warnings": [], "scenarios": {},
        "environment": {"viewport": {"width": 1440, "height": 900}, "seed": "threshold-001", "normalActiveRadius": 3, "staticSampleSeconds": STATIC_SAMPLE_SECONDS},
    }
    warnings: list[str] = report["warnings"]
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(max(30, int(STATIC_SAMPLE_SECONDS + 20)))

    try:
        driver.execute_cdp_cmd("Performance.enable", {})
        report["environment"]["browser"] = {
            "userAgent": driver.execute_script("return navigator.userAgent"),
            "browserVersion": driver.capabilities.get("browserVersion"),
            "chromeDriver": driver.capabilities.get("chrome", {}).get("chromedriverVersion"),
            "platformName": driver.capabilities.get("platformName"),
        }
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.execute_script("return document.readyState") == "complete", message="document load")
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey")
        assert "Begin new local journey" in str(new_button.get_attribute("textContent"))
        new_button.click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden&&!document.querySelector('[data-ui=hud]').hidden"), 30, "Level 0 HUD")
        wait_for(driver, lambda current: read_save(current), 15, "save creation")
        ensure_pointer_lock(driver)
        report["environment"]["webgl"] = webgl_environment(driver)
        assert report["environment"]["webgl"].get("available") is True
        report["checks"].append("new threshold-001 journey and WebGL renderer verified")
        time.sleep(2)

        report["scenarios"]["baselineSpawn"] = sample_static(driver, "baseline-spawn", warnings)
        baseline = report["scenarios"]["baselineSpawn"]["worldMetricsAfter"]
        assert baseline.get("seed") == "threshold-001" and baseline.get("loadedCells") == 49
        report["checks"].append("baseline spawn profiled at radius 3")

        ensure_lab(driver, True)
        dispatch_change(driver, '[data-lab="radius"]', "1")
        dispatch_change(driver, '[data-lab="bypass"]', True)
        dispatch_change(driver, '[data-lab="zone"]', "holes")
        wait_for_metrics(driver, lambda value: value.get("zone") == "Hole Section" and value.get("loadedCells") == 9, "forced Hole Section")
        ensure_lab(driver, False)
        ensure_pointer_lock(driver)
        report["scenarios"]["holeSectionRadius1"] = sample_static(driver, "hole-section-radius-1", warnings)
        report["checks"].append("forced Hole Section profiled at radius 1")

        ensure_lab(driver, True)
        dispatch_change(driver, '[data-lab="zone"]', "")
        dispatch_change(driver, '[data-lab="bypass"]', False)
        dispatch_change(driver, '[data-lab="radius"]', "3")
        wait_for_metrics(driver, lambda value: value.get("loadedCells") == 49, "normal radius restored")
        driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, '[data-action="spawn-all-objects"]'))
        report["catalogStatus"] = wait_for_text(driver, '[data-ui="catalog-status"]', "Spawned 23", 15)
        ensure_lab(driver, False)
        ensure_pointer_lock(driver)
        report["scenarios"]["worldLabShowcase23"] = sample_static(driver, "world-lab-showcase-23", warnings)
        report["checks"].append("World Lab 23-object showcase profiled at radius 3")

        ensure_lab(driver, True)
        driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, '[data-action="clear-lab-objects"]'))
        wait_for_text(driver, '[data-ui="catalog-status"]', "Showcase cleared", 10)
        report["scenarios"]["boundedStreamingBands"] = profile_streaming_bands(driver)
        report["checks"].append("deterministic streaming cycle unloaded and reloaded 40 cells (49→25→9→25→49)")
        ensure_lab(driver, False)
        ensure_pointer_lock(driver)

        before_refresh = wait_for(driver, lambda current: read_save(current), 15, "save before refresh")
        before_position = position(before_refresh)
        character_id = before_refresh.get("characterId")
        driver.refresh()
        continue_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="continue"]'), message="Continue after refresh")
        wait_for(driver, lambda _current: not continue_button.get_attribute("disabled"), 15, "saved journey availability")
        continue_button.click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden&&!document.querySelector('[data-ui=hud]').hidden"), 30, "continued HUD")
        continued = wait_for(driver, lambda current: read_save(current), 15, "continued save")
        position_delta = distance(before_position, position(continued))
        assert continued.get("version") == 2 and continued.get("characterId") == character_id and continued.get("seed") == "threshold-001" and position_delta < 0.25
        report["saveReload"] = {"version": 2, "characterIdPreserved": True, "seed": "threshold-001", "positionDeltaMeters": round(position_delta, 4)}
        report["checks"].append("refresh/Continue preserved save schema v2, character, seed and position")

        errors = browser_log_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser console errors: {errors}"
        report["checks"].append("no blocking browser-console errors")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            report["browserErrors"] = browser_log_errors(driver)
            screenshot(driver, "failure.png", warnings)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "profile.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
