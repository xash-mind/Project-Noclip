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
TRAVERSAL_SEGMENT_SECONDS = float(os.environ.get("NOCLIP_PROFILE_TRAVERSAL_SEGMENT_SECONDS", "3"))
TRAVERSAL_MAX_SEGMENTS = int(os.environ.get("NOCLIP_PROFILE_TRAVERSAL_MAX_SEGMENTS", "8"))


def wait_for(
    driver: webdriver.Chrome,
    predicate: Callable[[webdriver.Chrome], Any],
    timeout: float = 20.0,
    message: str = "condition",
) -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def text_content(driver: webdriver.Chrome, selector: str) -> str:
    return str(
        driver.execute_script(
            "const element = document.querySelector(arguments[0]); return element ? element.textContent || '' : '';",
            selector,
        )
        or ""
    )


def wait_for_text(
    driver: webdriver.Chrome,
    selector: str,
    required_fragments: tuple[str, ...],
    timeout: float = 20.0,
    message: str = "text content",
) -> str:
    def ready(current: webdriver.Chrome) -> str | bool:
        value = text_content(current, selector)
        return value if all(fragment in value for fragment in required_fragments) else False

    return str(wait_for(driver, ready, timeout=timeout, message=message))


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({ error: String(request.error) });
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) {
            db.close(); done(null); return;
          }
          const read = db.transaction('journey', 'readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done({ error: String(read.error) }); };
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) else None


def browser_log_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry
        for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def best_effort_screenshot(driver: webdriver.Chrome, name: str, warnings: list[str]) -> None:
    try:
        driver.save_screenshot(str(ARTIFACT_DIR / name))
    except Exception as error:
        warnings.append(f"Screenshot {name} failed: {type(error).__name__}: {error}")


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
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    return webdriver.Chrome(options=options)


def dispatch_change(driver: webdriver.Chrome, selector: str, value: str | bool) -> None:
    driver.execute_script(
        """
        const element = document.querySelector(arguments[0]);
        if (!element) throw new Error(`Missing ${arguments[0]}`);
        if (element.type === 'checkbox') element.checked = arguments[1];
        else element.value = arguments[1];
        element.dispatchEvent(new Event('change', { bubbles: true }));
        """,
        selector,
        value,
    )


def lab_is_open(driver: webdriver.Chrome) -> bool:
    classes = driver.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split()
    return "visible" in classes


def ensure_lab(driver: webdriver.Chrome, open_state: bool) -> None:
    if lab_is_open(driver) != open_state:
        driver.execute_script(
            "window.dispatchEvent(new KeyboardEvent('keydown', {key: '`', code: 'Backquote', bubbles: true}));"
        )
    wait_for(driver, lambda current: lab_is_open(current) == open_state, message=f"World Lab {'open' if open_state else 'closed'}")


def ensure_pointer_lock(driver: webdriver.Chrome) -> None:
    if driver.execute_script("return document.pointerLockElement === document.querySelector('#game-canvas')"):
        return
    resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    driver.execute_script("arguments[0].click();", resume)
    wait_for(
        driver,
        lambda current: current.execute_script(
            "return document.pointerLockElement === document.querySelector('#game-canvas')"
        ),
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
        district = re.search(r"district\s+(\S+)", cell)
        if district:
            result["district"] = district.group(1)
    for label, key in (("seed", "seed"), ("room", "room"), ("zone", "zone")):
        value = value_for(label)
        if value is not None:
            result[key] = value
    for label, key in (
        ("loaded cells", "loadedCells"),
        ("colliders", "colliders"),
        ("interactions", "interactions"),
        ("draw calls", "drawCalls"),
    ):
        value = value_for(label)
        if value is None:
            continue
        result[key] = int(value) if value.isdigit() else value
    position = value_for("position")
    if position:
        match = re.match(r"(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", position)
        if match:
            result["position"] = {"x": float(match.group(1)), "z": float(match.group(2))}
    return result


def current_metrics(driver: webdriver.Chrome) -> dict[str, Any]:
    return parse_metrics(text_content(driver, '[data-ui="metrics"]'))


def wait_for_metrics(
    driver: webdriver.Chrome,
    predicate: Callable[[dict[str, Any]], bool],
    message: str,
) -> dict[str, Any]:
    def ready(current: webdriver.Chrome) -> dict[str, Any] | bool:
        value = current_metrics(current)
        return value if predicate(value) else False

    return dict(wait_for(driver, ready, timeout=20, message=message))


def percentile(values: list[float], quantile: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return math.nan
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * quantile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def summarize_frames(intervals: list[float], elapsed_ms: float) -> dict[str, Any]:
    valid = [value for value in intervals if value > 0]
    if not valid:
        raise AssertionError("No requestAnimationFrame samples were recorded")
    fps = [1000.0 / value for value in valid]
    return {
        "sampleCount": len(valid),
        "elapsedMs": round(elapsed_ms, 2),
        "frameTimeMs": {
            "mean": round(statistics.fmean(valid), 3),
            "median": round(statistics.median(valid), 3),
            "p95": round(percentile(valid, 0.95), 3),
            "max": round(max(valid), 3),
        },
        "instantaneousFps": {
            "median": round(statistics.median(fps), 2),
            "p05": round(percentile(fps, 0.05), 2),
            "p95": round(percentile(fps, 0.95), 2),
        },
        "slowFramePct": {
            "over16_7ms": round(sum(value > 16.7 for value in valid) * 100 / len(valid), 2),
            "over33_3ms": round(sum(value > 33.3 for value in valid) * 100 / len(valid), 2),
            "over50ms": round(sum(value > 50 for value in valid) * 100 / len(valid), 2),
        },
    }


def measure_frames(driver: webdriver.Chrome, seconds: float) -> tuple[list[float], float]:
    result = driver.execute_async_script(
        """
        const durationMs = arguments[0];
        const done = arguments[arguments.length - 1];
        const intervals = [];
        const startedAt = performance.now();
        let previous = startedAt;
        function sample(now) {
          if (now > previous) intervals.push(now - previous);
          previous = now;
          if (now - startedAt >= durationMs) {
            done({ intervals, elapsedMs: now - startedAt }); return;
          }
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        """,
        int(seconds * 1000),
    )
    return [float(value) for value in result["intervals"]], float(result["elapsedMs"])


def cdp_metrics(driver: webdriver.Chrome) -> dict[str, float]:
    raw = driver.execute_cdp_cmd("Performance.getMetrics", {})
    return {str(entry["name"]): float(entry["value"]) for entry in raw.get("metrics", [])}


def cdp_delta(before: dict[str, float], after: dict[str, float], wall_seconds: float) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for name in ("TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"):
        if name in before and name in after:
            result[f"{name}Ms"] = round((after[name] - before[name]) * 1000, 3)
    for name in ("LayoutCount", "RecalcStyleCount"):
        if name in before and name in after:
            result[name] = round(after[name] - before[name], 3)
    task_ms = result.get("TaskDurationMs")
    if isinstance(task_ms, (int, float)) and wall_seconds > 0:
        result["mainThreadBusyPct"] = round(task_ms / (wall_seconds * 1000) * 100, 2)
    return result


def memory_snapshot(driver: webdriver.Chrome, cdp: dict[str, float]) -> dict[str, Any]:
    result: dict[str, Any] = {
        "performanceMemory": driver.execute_script(
            "return performance.memory ? {usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit} : null"
        )
    }
    for name in ("JSHeapUsedSize", "JSHeapTotalSize", "Nodes", "Documents", "Frames", "JSEventListeners"):
        if name in cdp:
            result[name] = cdp[name]
    return result


def webgl_environment(driver: webdriver.Chrome) -> dict[str, Any]:
    return dict(
        driver.execute_script(
            """
            const canvas = document.querySelector('#game-canvas');
            const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
            if (!gl) return { available: false };
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            return {
              available: true,
              version: gl.getParameter(gl.VERSION),
              shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
              vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
              renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            };
            """
        )
    )


def sample_static_scenario(
    driver: webdriver.Chrome,
    name: str,
    seconds: float,
    warnings: list[str],
) -> dict[str, Any]:
    metrics_before = wait_for_metrics(
        driver,
        lambda value: isinstance(value.get("loadedCells"), int) and value.get("drawCalls") not in (None, "n/a"),
        f"{name} metrics",
    )
    cdp_before = cdp_metrics(driver)
    intervals, elapsed_ms = measure_frames(driver, seconds)
    cdp_after = cdp_metrics(driver)
    metrics_after = current_metrics(driver)
    best_effort_screenshot(driver, f"{name}.png", warnings)
    return {
        "durationSeconds": round(elapsed_ms / 1000, 3),
        "worldMetricsBefore": metrics_before,
        "worldMetricsAfter": metrics_after,
        "frames": summarize_frames(intervals, elapsed_ms),
        "cpu": cdp_delta(cdp_before, cdp_after, elapsed_ms / 1000),
        "memoryAfter": memory_snapshot(driver, cdp_after),
    }


def dispatch_key(
    driver: webdriver.Chrome,
    event_type: str,
    key: str,
    code: str,
    virtual_key: int,
    modifiers: int = 0,
) -> None:
    driver.execute_cdp_cmd(
        "Input.dispatchKeyEvent",
        {
            "type": event_type,
            "key": key,
            "code": code,
            "windowsVirtualKeyCode": virtual_key,
            "nativeVirtualKeyCode": virtual_key,
            "modifiers": modifiers,
        },
    )


def unload_totals(save: dict[str, Any] | None) -> tuple[int, int]:
    counts = (save or {}).get("unloadCounts") or {}
    numeric = [int(value) for value in counts.values() if isinstance(value, (int, float))]
    return sum(numeric), len(numeric)


def save_position(save: dict[str, Any] | None) -> dict[str, float]:
    position = (save or {}).get("position") or {}
    return {"x": float(position.get("x", 0)), "z": float(position.get("z", 0))}


def distance(a: dict[str, float], b: dict[str, float]) -> float:
    return math.hypot(a["x"] - b["x"], a["z"] - b["z"])


def traversal_profile(driver: webdriver.Chrome, warnings: list[str]) -> dict[str, Any]:
    ensure_lab(driver, False)
    ensure_pointer_lock(driver)
    before_save = wait_for(driver, lambda current: read_save(current), timeout=15, message="save before traversal")
    before_metrics = current_metrics(driver)
    before_unloads, before_unique = unload_totals(before_save)
    start_position = save_position(before_save)
    cdp_before = cdp_metrics(driver)
    all_intervals: list[float] = []
    elapsed_total_ms = 0.0
    segments: list[dict[str, Any]] = []
    directions = (
        ("w", "KeyW", 87),
        ("d", "KeyD", 68),
        ("w", "KeyW", 87),
        ("a", "KeyA", 65),
        ("s", "KeyS", 83),
        ("d", "KeyD", 68),
        ("w", "KeyW", 87),
        ("a", "KeyA", 65),
    )

    for index, (key, code, virtual_key) in enumerate(directions[:TRAVERSAL_MAX_SEGMENTS], start=1):
        dispatch_key(driver, "rawKeyDown", "Shift", "ShiftLeft", 16, modifiers=8)
        dispatch_key(driver, "rawKeyDown", key, code, virtual_key, modifiers=8)
        try:
            intervals, elapsed_ms = measure_frames(driver, TRAVERSAL_SEGMENT_SECONDS)
        finally:
            dispatch_key(driver, "keyUp", key, code, virtual_key, modifiers=8)
            dispatch_key(driver, "keyUp", "Shift", "ShiftLeft", 16)
        all_intervals.extend(intervals)
        elapsed_total_ms += elapsed_ms
        time.sleep(0.5)
        save = read_save(driver)
        metrics = current_metrics(driver)
        total_unloads, unique_unloads = unload_totals(save)
        segments.append(
            {
                "index": index,
                "input": f"Shift+{code}",
                "cell": metrics.get("cell"),
                "position": metrics.get("position"),
                "drawCalls": metrics.get("drawCalls"),
                "unloadCountDelta": total_unloads - before_unloads,
                "uniqueUnloadedCellsDelta": unique_unloads - before_unique,
            }
        )
        if total_unloads - before_unloads >= 14 and index >= 2:
            break

    time.sleep(2)
    after_save = read_save(driver)
    after_metrics = current_metrics(driver)
    cdp_after = cdp_metrics(driver)
    after_unloads, after_unique = unload_totals(after_save)
    end_position = save_position(after_save)
    travelled = distance(start_position, end_position)
    unload_delta = after_unloads - before_unloads
    unique_delta = after_unique - before_unique
    assert travelled > 1.0, f"Trusted Chromium traversal did not move far enough ({travelled:.2f} m)"
    assert unload_delta >= 14, f"Traversal did not stream at least two cell bands (unload delta {unload_delta})"
    best_effort_screenshot(driver, "traversal-end.png", warnings)
    return {
        "durationSeconds": round(elapsed_total_ms / 1000, 3),
        "startWorldMetrics": before_metrics,
        "endWorldMetrics": after_metrics,
        "startPosition": start_position,
        "endPosition": end_position,
        "persistedDistanceMeters": round(travelled, 3),
        "unloadCountDelta": unload_delta,
        "uniqueUnloadedCellsDelta": unique_delta,
        "segments": segments,
        "frames": summarize_frames(all_intervals, elapsed_total_ms),
        "cpu": cdp_delta(cdp_before, cdp_after, elapsed_total_ms / 1000),
        "memoryAfter": memory_snapshot(driver, cdp_after),
    }


def main() -> None:
    report: dict[str, Any] = {
        "baseUrl": BASE_URL,
        "deployment": {"commit": DEPLOYMENT_COMMIT, "id": DEPLOYMENT_ID},
        "rollback": {"commit": DEPLOYMENT_COMMIT, "deploymentId": DEPLOYMENT_ID},
        "checks": [],
        "warnings": [],
        "environment": {
            "viewport": {"width": 1440, "height": 900},
            "seed": "threshold-001",
            "normalActiveRadius": 3,
            "staticSampleSeconds": STATIC_SAMPLE_SECONDS,
            "traversalSegmentSeconds": TRAVERSAL_SEGMENT_SECONDS,
            "traversalMaxSegments": TRAVERSAL_MAX_SEGMENTS,
        },
        "scenarios": {},
    }
    warnings: list[str] = report["warnings"]
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(max(30, int(STATIC_SAMPLE_SECONDS + 15), int(TRAVERSAL_SEGMENT_SECONDS + 15)))

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
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey action")
        assert "Begin new local journey" in str(new_button.get_attribute("textContent"))
        new_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=30,
            message="Level 0 HUD",
        )
        wait_for(driver, lambda current: read_save(current), timeout=15, message="IndexedDB save creation")
        ensure_pointer_lock(driver)
        report["checks"].append("new threshold-001 journey launched with pointer lock")
        report["environment"]["webgl"] = webgl_environment(driver)
        assert report["environment"]["webgl"].get("available") is True
        report["checks"].append("WebGL renderer metadata captured")
        time.sleep(2)

        report["scenarios"]["baselineSpawn"] = sample_static_scenario(
            driver, "baseline-spawn", STATIC_SAMPLE_SECONDS, warnings
        )
        baseline = report["scenarios"]["baselineSpawn"]["worldMetricsAfter"]
        assert baseline.get("seed") == "threshold-001"
        assert baseline.get("loadedCells") == 49
        report["checks"].append("baseline radius-3 spawn profiled with 49 loaded cells")

        ensure_lab(driver, True)
        dispatch_change(driver, '[data-lab="radius"]', "1")
        dispatch_change(driver, '[data-lab="bypass"]', True)
        dispatch_change(driver, '[data-lab="zone"]', "holes")
        wait_for_metrics(
            driver,
            lambda value: value.get("zone") == "Hole Section" and value.get("loadedCells") == 9,
            "forced Hole Section radius 1",
        )
        ensure_lab(driver, False)
        ensure_pointer_lock(driver)
        report["scenarios"]["holeSectionRadius1"] = sample_static_scenario(
            driver, "hole-section-radius-1", STATIC_SAMPLE_SECONDS, warnings
        )
        report["checks"].append("forced Hole Section radius-1 scenario profiled")

        ensure_lab(driver, True)
        dispatch_change(driver, '[data-lab="zone"]', "")
        dispatch_change(driver, '[data-lab="bypass"]', False)
        dispatch_change(driver, '[data-lab="radius"]', "3")
        wait_for_metrics(driver, lambda value: value.get("loadedCells") == 49, "baseline radius restored")
        spawn_all = driver.find_element(By.CSS_SELECTOR, '[data-action="spawn-all-objects"]')
        driver.execute_script("arguments[0].click();", spawn_all)
        report["catalogStatus"] = wait_for_text(
            driver,
            '[data-ui="catalog-status"]',
            ("Spawned 23",),
            timeout=15,
            message="World Lab full object showcase",
        )
        ensure_lab(driver, False)
        ensure_pointer_lock(driver)
        report["scenarios"]["worldLabShowcase23"] = sample_static_scenario(
            driver, "world-lab-showcase-23", STATIC_SAMPLE_SECONDS, warnings
        )
        report["checks"].append("23-object World Lab showcase profiled at normal radius")

        ensure_lab(driver, True)
        clear_button = driver.find_element(By.CSS_SELECTOR, '[data-action="clear-lab-objects"]')
        driver.execute_script("arguments[0].click();", clear_button)
        wait_for_text(driver, '[data-ui="catalog-status"]', ("Showcase cleared",), timeout=10, message="showcase clear")
        ensure_lab(driver, False)
        ensure_pointer_lock(driver)
        report["checks"].append("non-persistent showcase cleared before traversal")

        report["scenarios"]["boundedTraversal"] = traversal_profile(driver, warnings)
        report["checks"].append("trusted Chromium traversal streamed at least two cell bands")

        before_refresh = wait_for(driver, lambda current: read_save(current), timeout=15, message="save before refresh")
        before_position = save_position(before_refresh)
        character_id = before_refresh.get("characterId")
        driver.refresh()
        continue_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="continue"]'), message="Continue after refresh")
        wait_for(driver, lambda _current: not continue_button.get_attribute("disabled"), timeout=15, message="saved journey availability")
        continue_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=30,
            message="continued journey HUD",
        )
        continued = wait_for(driver, lambda current: read_save(current), timeout=15, message="continued save")
        continued_position = save_position(continued)
        assert continued.get("version") == 2
        assert continued.get("characterId") == character_id
        assert continued.get("seed") == "threshold-001"
        position_delta = distance(before_position, continued_position)
        assert position_delta < 0.25
        report["saveReload"] = {
            "version": continued.get("version"),
            "characterIdPreserved": True,
            "seed": continued.get("seed"),
            "positionDeltaMeters": round(position_delta, 4),
        }
        report["checks"].append("direct refresh and Continue preserved save schema v2, character, seed and position")

        errors = browser_log_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser console errors: {errors}"
        report["checks"].append("no blocking browser-console errors were recorded")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            report["browserErrors"] = browser_log_errors(driver)
            best_effort_screenshot(driver, "failure.png", warnings)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "profile.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
