from __future__ import annotations

import importlib.util
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

SCRIPT_DIR = Path(__file__).resolve().parent
PROFILER_PATH = SCRIPT_DIR / "profile-runtime-scenarios.py"
spec = importlib.util.spec_from_file_location("noclip_runtime_profiler", PROFILER_PATH)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load {PROFILER_PATH}")
profiler = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = profiler
spec.loader.exec_module(profiler)

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_HITCH_ATTRIBUTION_ARTIFACTS", "artifacts/hitch-attribution"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
COMMIT_SHA = os.environ.get("NOCLIP_BRANCH_HEAD_SHA", "unknown")
RUN_ID = os.environ.get("NOCLIP_HITCH_ATTRIBUTION_RUN_ID", "1")
FIXED_SEED = "threshold-001"
FIXED_NOW_MS = 1787961600000
FIXED_WORLD_DAY = 40.0
FIXED_EXPOSURE = 10.0
SAMPLE_SECONDS = float(os.environ.get("NOCLIP_HITCH_ATTRIBUTION_SAMPLE_SECONDS", "45.0"))


def set_change_value(driver: Any, selector: str, value: str) -> None:
    driver.execute_script(
        """
        const element = document.querySelector(arguments[0]);
        if (!element) throw new Error(`Missing ${arguments[0]}`);
        element.value = arguments[1];
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        """,
        selector,
        value,
    )


def deterministic_startup(driver: Any) -> None:
    driver.set_script_timeout(max(120.0, SAMPLE_SECONDS + 60.0))
    driver.get(BASE_URL)
    WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-ui="title"]')))
    driver.execute_script("Date.now = () => Number(arguments[0]);", FIXED_NOW_MS)
    profiler.set_value(driver, '[data-ui="seed"]', FIXED_SEED)
    profiler.click(driver, '[data-action="new"]')
    WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-ui="character-creator"]')))
    profiler.set_value(driver, '[data-character="name"]', 'Runtime Attribution')
    profiler.click(driver, '[data-action="character-begin"]')
    WebDriverWait(driver, 25).until(lambda current: not current.find_element(By.CSS_SELECTOR, '[data-ui="hud"]').get_attribute("hidden"))
    WebDriverWait(driver, 20).until(lambda current: current.execute_script("return Boolean(window.__projectNoclipQa?.locate && window.__projectNoclipQa?.snapshot && window.__noclipRendererRuntimeDiagnostics?.snapshot);"))
    profiler.configure_lab(driver)
    set_change_value(driver, '[data-lab="world-day"]', str(FIXED_WORLD_DAY))
    set_change_value(driver, '[data-lab="exposure"]', str(FIXED_EXPOSURE))
    profiler.ensure_playing(driver)
    time.sleep(0.8)


def chrome_metrics(driver: Any) -> dict[str, float]:
    values = driver.execute_cdp_cmd("Performance.getMetrics", {}).get("metrics", [])
    wanted = {
        "TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration",
        "JSHeapUsedSize", "JSHeapTotalSize", "Nodes", "Documents", "Frames"
    }
    return {entry["name"]: float(entry["value"]) for entry in values if entry.get("name") in wanted}


def metric_delta(before: dict[str, float], after: dict[str, float]) -> dict[str, float]:
    result: dict[str, float] = {}
    for key in sorted(set(before) | set(after)):
        if key in before and key in after:
            result[key] = after[key] - before[key]
    return result


def full_runtime_snapshot(driver: Any) -> dict[str, Any]:
    value = driver.execute_script("return window.__noclipRendererRuntimeDiagnostics?.snapshot?.() ?? null;")
    return value if isinstance(value, dict) else {}


def nested_number(snapshot: dict[str, Any], *path: str) -> float | None:
    value: Any = snapshot
    for key in path:
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return float(value) if isinstance(value, (int, float)) else None


def runtime_delta(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    paths = [
        ("streaming", "loadedCells"), ("streaming", "unloadedCells"), ("streaming", "refreshedCells"),
        ("streaming", "cellRendererMs"), ("streaming", "cellUnloadMs"), ("streaming", "cellRefreshMs"),
        ("streaming", "boundaryReconcileMs"), ("streaming", "regionRefreshMs"),
        ("arch", "reconstructionCalls"), ("arch", "reconstructedCells"), ("arch", "reconstructionMs"),
        ("batching", "reconcilePasses"), ("batching", "allocations"), ("batching", "removals"),
        ("batching", "dirtyCalls"), ("batching", "reconcileMs"),
        ("fixture", "updateCalls"), ("fixture", "updateMs"), ("fixture", "selectionCandidateScans"),
        ("hotPaths", "collisionQueries"), ("hotPaths", "collisionCandidates"),
        ("hotPaths", "interactionQueries"), ("hotPaths", "interactionCandidates"),
        ("hotPaths", "dynamicUpdateCalls"), ("hotPaths", "dynamicCandidates"),
    ]
    result: dict[str, Any] = {}
    for path in paths:
        left = nested_number(before, *path)
        right = nested_number(after, *path)
        if left is not None and right is not None:
            result[".".join(path)] = right - left
    return result


SCENARIOS: list[tuple[str, list[tuple[str, str]], bool, bool]] = [
    ("rapid-camera-rotation", [("ordinary-level-0", "nearest")], False, True),
    ("running-plus-turning", [("ordinary-level-0", "nearest")], True, True),
    ("repeated-cell-crossings", [("ordinary-level-0", "nearest")], True, False),
    ("pillar-field", [("pillar-field", "interior")], False, False),
    ("arch-rooms", [("arch-rooms", "core")], False, False),
    ("region-locate", [("ordinary-level-0", "nearest"), ("pillar-field", "interior"), ("arch-rooms", "interior"), ("ordinary-level-0", "nearest")], False, False),
]

results: list[dict[str, Any]] = []
for name, locates, running, turning in SCENARIOS:
    driver = profiler.build_driver()
    try:
        driver.execute_cdp_cmd("Performance.enable", {})
        deterministic_startup(driver)
        locate_evidence = [profiler.locate(driver, region, depth) for region, depth in locates]
        driver.execute_script("window.__noclipRendererRuntimeDiagnostics?.beginScenario?.(arguments[0]);", f"hitch-attribution:{name}")
        before_runtime = full_runtime_snapshot(driver)
        before_chrome = chrome_metrics(driver)
        before_heap = driver.execute_script("return performance.memory ? {usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize} : null;")
        scenario = profiler.scenario(driver, name, seconds=SAMPLE_SECONDS, running=running, turning=turning)
        after_chrome = chrome_metrics(driver)
        after_runtime = full_runtime_snapshot(driver)
        after_heap = driver.execute_script("return performance.memory ? {usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize} : null;")
        results.append({
            "scenario": name,
            "locates": locate_evidence,
            "frame": {key: scenario.get(key) for key in ("sampleCount", "elapsedMs", "medianFrameTimeMs", "p95FrameTimeMs", "p99FrameTimeMs", "maxFrameTimeMs", "movementDistanceMeters", "yawDeltaDegrees")},
            "state": {key: scenario.get(key) for key in ("RESIDENT_CELLS", "RENDER_PARTICIPATING_CELLS", "VISIBILITY_CELLS", "drawCalls", "activeOmnis", "shadowedOmnis")},
            "runtimeBefore": before_runtime,
            "runtimeAfter": after_runtime,
            "runtimeDelta": runtime_delta(before_runtime, after_runtime),
            "chromeBefore": before_chrome,
            "chromeAfter": after_chrome,
            "chromeDelta": metric_delta(before_chrome, after_chrome),
            "heapBefore": before_heap,
            "heapAfter": after_heap,
            "browserExceptions": scenario.get("browserExceptions", []),
        })
    finally:
        driver.quit()

output = {
    "schemaVersion": 1,
    "evidenceKind": "cleanup-wave6-hitch-attribution",
    "commitSha": COMMIT_SHA,
    "runId": RUN_ID,
    "measurement": {
        "sampleSeconds": SAMPLE_SECONDS,
        "seed": FIXED_SEED,
        "fixedNowMs": FIXED_NOW_MS,
        "worldDay": FIXED_WORLD_DAY,
        "exposure": FIXED_EXPOSURE,
        "scenarioIsolation": "fresh browser and deterministic Journey per scenario",
        "purpose": "attribute measured rAF tails to CPU/runtime lifecycle activity without changing production scheduling or workload",
    },
    "scenarios": results,
}
artifact = ARTIFACT_DIR / "hitch-attribution.json"
artifact.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
print(json.dumps(output, indent=2))
print(f"hitch-attribution: PASSED ({artifact})")
