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
    raise SystemExit(f"TEST_HARNESS_FAILURE: could not load {PROFILER_PATH}")
profiler = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = profiler
spec.loader.exec_module(profiler)

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_MATCHED_RUNTIME_ARTIFACTS", "artifacts/runtime-diagnostics/matched"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
COMMIT_SHA = os.environ.get("NOCLIP_BRANCH_HEAD_SHA", "unknown")
RUN_ID = os.environ.get("NOCLIP_MATCHED_RUNTIME_RUN_ID", "1")
FIXED_SEED = os.environ.get("NOCLIP_MATCHED_RUNTIME_SEED", "threshold-001")
FIXED_NOW_MS = int(os.environ.get("NOCLIP_MATCHED_RUNTIME_NOW_MS", "1787961600000"))
FIXED_WORLD_DAY = float(os.environ.get("NOCLIP_MATCHED_RUNTIME_WORLD_DAY", "40"))
FIXED_EXPOSURE = float(os.environ.get("NOCLIP_MATCHED_RUNTIME_EXPOSURE", "10"))
SAMPLE_SECONDS = float(os.environ.get("NOCLIP_MATCHED_RUNTIME_SAMPLE_SECONDS", "45.0"))
MIN_FRAME_SAMPLES = int(os.environ.get("NOCLIP_MATCHED_RUNTIME_MIN_FRAME_SAMPLES", "100"))

if SAMPLE_SECONDS < 2.0:
    raise SystemExit("TEST_HARNESS_FAILURE: matched sample duration must be at least 2 seconds")
if MIN_FRAME_SAMPLES < 100:
    raise SystemExit("TEST_HARNESS_FAILURE: matched p99 runtime evidence requires at least 100 rAF samples per scenario")


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
    driver.get(BASE_URL)
    WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-ui="title"]')))
    driver.execute_script(
        """
        const fixedNow = Number(arguments[0]);
        Date.now = () => fixedNow;
        """,
        FIXED_NOW_MS,
    )
    profiler.set_value(driver, '[data-ui="seed"]', FIXED_SEED)
    profiler.click(driver, '[data-action="new"]')
    WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-ui="character-creator"]')))
    profiler.set_value(driver, '[data-character="name"]', 'Runtime Evidence')
    profiler.click(driver, '[data-action="character-begin"]')
    WebDriverWait(driver, 25).until(lambda current: not current.find_element(By.CSS_SELECTOR, '[data-ui="hud"]').get_attribute("hidden"))
    WebDriverWait(driver, 20).until(lambda current: current.execute_script("return Boolean(window.__projectNoclipQa?.locate && window.__projectNoclipQa?.snapshot);"))
    profiler.configure_lab(driver)
    set_change_value(driver, '[data-lab="world-day"]', str(FIXED_WORLD_DAY))
    set_change_value(driver, '[data-lab="exposure"]', str(FIXED_EXPOSURE))
    profiler.ensure_playing(driver)
    time.sleep(0.8)


def run_one(
    name: str,
    locates: list[tuple[str, str]],
    *,
    running: bool = False,
    turning: bool = False,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    driver = profiler.build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(max(120.0, SAMPLE_SECONDS + 60.0))
    locate_evidence: list[dict[str, Any]] = []
    try:
        deterministic_startup(driver)
        for region, depth in locates:
            locate_evidence.append(profiler.locate(driver, region, depth))
        result = profiler.scenario(
            driver,
            name,
            seconds=SAMPLE_SECONDS,
            running=running,
            turning=turning,
        )
        if int(result.get("sampleCount", 0)) < MIN_FRAME_SAMPLES:
            raise SystemExit(
                f"TEST_HARNESS_FAILURE: {name} produced {result.get('sampleCount', 0)} rAF samples "
                f"during {SAMPLE_SECONDS:.1f}s; p99 evidence requires at least {MIN_FRAME_SAMPLES}"
            )
        result["configuredSeed"] = FIXED_SEED
        result["configuredNowMs"] = FIXED_NOW_MS
        result["configuredWorldDay"] = FIXED_WORLD_DAY
        result["configuredExposure"] = FIXED_EXPOSURE
        result["requestedSampleSeconds"] = SAMPLE_SECONDS
        result["minimumFrameSamples"] = MIN_FRAME_SAMPLES
        return result, locate_evidence
    finally:
        driver.quit()


SCENARIOS: list[tuple[str, list[tuple[str, str]], bool, bool]] = [
    ("standing-ordinary", [("ordinary-level-0", "nearest")], False, False),
    ("sustained-running", [("ordinary-level-0", "nearest")], True, False),
    ("rapid-camera-rotation", [("ordinary-level-0", "nearest")], False, True),
    ("running-plus-turning", [("ordinary-level-0", "nearest")], True, True),
    ("repeated-cell-crossings", [("ordinary-level-0", "nearest")], True, False),
    ("pillar-field", [("pillar-field", "interior")], False, False),
    ("arch-rooms", [("arch-rooms", "core")], False, False),
    (
        "region-locate",
        [
            ("ordinary-level-0", "nearest"),
            ("pillar-field", "interior"),
            ("arch-rooms", "interior"),
            ("ordinary-level-0", "nearest"),
        ],
        False,
        False,
    ),
]

scenario_results: list[dict[str, Any]] = []
region_locate_results: list[dict[str, Any]] = []
for scenario_name, locates, running, turning in SCENARIOS:
    scenario_result, locate_result = run_one(
        scenario_name,
        locates,
        running=running,
        turning=turning,
    )
    scenario_results.append(scenario_result)
    region_locate_results.extend({"scenario": scenario_name, **entry} for entry in locate_result)

for result in scenario_results:
    if result.get("browserExceptions"):
        raise AssertionError(f"{result['scenario']} browser exceptions: {result['browserExceptions']}")
    visibility = result.get("visibilityDiagnostics", {})
    if visibility.get("activeShadowInvariant") is not True:
        raise AssertionError(f"{result['scenario']} active/shadowed M-F1 invariant failed")

output = {
    "schemaVersion": 3,
    "evidenceKind": "matched-runtime-scenarios",
    "commitSha": COMMIT_SHA,
    "version": profiler.VERSION,
    "baseUrl": BASE_URL,
    "matchRunId": RUN_ID,
    "environment": {"renderer": "headless Chromium / SwiftShader"},
    "measurementContract": {
        "scenarioIsolation": "fresh browser and fresh deterministic Journey per scenario",
        "seed": FIXED_SEED,
        "fixedNowMs": FIXED_NOW_MS,
        "worldDay": FIXED_WORLD_DAY,
        "exposure": FIXED_EXPOSURE,
        "requestedSampleSeconds": SAMPLE_SECONDS,
        "minimumFrameSamples": MIN_FRAME_SAMPLES,
        "frameSample": "requestAnimationFrame wall-clock interval",
        "startupIncluded": False,
        "regionLocateIncluded": False,
        "scenarioInput": "unchanged production controls; running holds KeyW+Shift and turning changes camera once per rendered frame",
    },
    "scenarios": scenario_results,
    "regionLocate": region_locate_results,
}

artifact = ARTIFACT_DIR / "runtime-performance-matched.json"
artifact.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
print(json.dumps(output, indent=2))
print(f"matched-runtime-scenarios: PASSED ({artifact})")
