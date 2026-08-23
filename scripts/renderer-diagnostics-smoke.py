from __future__ import annotations

import json
import os
import re
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_RENDERER_DIAGNOSTICS_ARTIFACTS", "artifacts/renderer-diagnostics/current"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


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


def click(driver: webdriver.Chrome, selector: str) -> None:
    element = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, selector), message=selector)
    wait_for(driver, lambda _current: element.is_displayed() and element.is_enabled(), message=f"clickable {selector}")
    element.click()


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


def configure_lab(driver: webdriver.Chrome) -> None:
    result = driver.execute_script(
        """
        const set=(selector,value)=>{
          const element=document.querySelector(selector);
          if(!element)return false;
          if(element.type==='checkbox')element.checked=value;else element.value=value;
          element.dispatchEvent(new Event('change',{bubbles:true}));
          return true;
        };
        return {
          bypass:set('[data-lab="bypass"]',true),
          radius:set('[data-lab="radius"]','1'),
          condition:set('[data-lab="condition"]','clear'),
          carver:set('[data-lab="carver"]','none'),
          structure:set('[data-lab="structure"]','none')
        };
        """
    )
    if not all(result.values()):
        raise AssertionError(f"World Lab controls missing: {result}")


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def metric_number(text: str, label: str) -> int | None:
    match = re.search(rf"(?m)^{re.escape(label)}\s+(\d+)", text)
    return int(match.group(1)) if match else None


def current_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    text = str(driver.execute_script("return document.querySelector('[data-ui=metrics]')?.textContent || '';"))
    settings = driver.execute_script("return window.__projectNoclipRenderSettings?.get?.() ?? null;")
    render = driver.execute_script("return window.__projectNoclipRenderSettings?.diagnostics?.() ?? null;")
    runtime = driver.execute_script("return window.__noclipRendererRuntimeDiagnostics?.snapshot?.() ?? null;")
    visibility = driver.execute_script("return window.__noclipVisibilityParticipationDiagnostics ?? null;")

    text_loaded = metric_number(text, "loaded cells")
    resident_cells = text_loaded
    participating_cells = None
    visibility_cells = None
    legacy_distance_cells = None
    if isinstance(render, dict):
        retained = render.get("retainedCells")
        active = render.get("activeCells")
        if isinstance(retained, (int, float)):
            resident_cells = int(retained)
        if isinstance(active, (int, float)):
            participating_cells = int(active)
    if isinstance(visibility, dict):
        visible = visibility.get("visibilityCells")
        legacy = visibility.get("legacyDistanceCells")
        final = visibility.get("finalParticipatingCells")
        if isinstance(visible, list):
            visibility_cells = len(visible)
        if isinstance(legacy, list):
            legacy_distance_cells = len(legacy)
        if participating_cells is None and isinstance(final, list):
            participating_cells = len(final)

    return {
        "metricsText": text,
        "RESIDENT_CELLS": resident_cells,
        "RENDER_PARTICIPATING_CELLS": participating_cells,
        "VISIBILITY_CELLS": visibility_cells,
        "LEGACY_DISTANCE_CELLS": legacy_distance_cells,
        # Historical alias kept only for old evidence readers; it means residency.
        "loadedCells": resident_cells,
        "drawCalls": metric_number(text, "draw calls"),
        "settings": settings,
        "renderDiagnostics": render,
        "visibilityDiagnostics": visibility,
        "runtimeDiagnostics": runtime,
    }


def locate(driver: webdriver.Chrome, region: str, depth: str) -> dict[str, Any]:
    started = time.perf_counter()
    result = driver.execute_async_script(
        """
        const region=arguments[0], depth=arguments[1], done=arguments[arguments.length-1];
        if(!window.__projectNoclipQa?.locate){done({error:'Region locate QA hook unavailable'});return;}
        Promise.resolve(window.__projectNoclipQa.locate(region,depth))
          .then(value=>done({value:value||null}))
          .catch(error=>done({error:String(error)}));
        """,
        region,
        depth,
    )
    elapsed_ms = (time.perf_counter() - started) * 1000
    if not isinstance(result, dict) or result.get("error") or not result.get("value"):
        raise AssertionError(result.get("error") if isinstance(result, dict) else f"Unable to locate {region}/{depth}")
    time.sleep(0.5)
    return {"region": region, "depth": depth, "result": result["value"], "elapsedMs": round(elapsed_ms, 2)}


def main() -> None:
    report: dict[str, Any] = {
        "schemaVersion": 2,
        "baseUrl": BASE_URL,
        "metricSemantics": {
            "RESIDENT_CELLS": "streaming/cache-resident Cells",
            "RENDER_PARTICIPATING_CELLS": "resident Cells enabled for live Phase-1 renderer participation",
            "VISIBILITY_CELLS": "topology Visibility Snapshot Cells before safety/hysteresis/prediction/fallback composition",
        },
        "checks": [],
        "snapshots": {},
        "regionLocate": [],
    }
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(60)
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="title")
        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="Character Creator")
        set_value(driver, '[data-character="name"]', "Renderer Diagnostics")
        click(driver, '[data-action="character-begin"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="hud"]'), timeout=40, message="Level 0 HUD")
        wait_for(
            driver,
            lambda current: bool(current.execute_script("return window.__projectNoclipRenderSettings && window.__projectNoclipQa && window.__noclipVisibilityParticipationDiagnostics")),
            timeout=30,
            message="renderer, visibility and QA diagnostics",
        )
        configure_lab(driver)

        report["snapshots"]["ordinary"] = current_snapshot(driver)
        report["checks"].append("Ordinary renderer and live-visibility diagnostics available")
        driver.save_screenshot(str(ARTIFACT_DIR / "ordinary.png"))

        for region, depth, key in (
            ("pillar-field", "interior", "pillarField"),
            ("arch-rooms", "core", "archRooms"),
            ("ordinary-level-0", "nearest", "ordinaryReturn"),
        ):
            report["regionLocate"].append(locate(driver, region, depth))
            report["snapshots"][key] = current_snapshot(driver)

        for key, snapshot in report["snapshots"].items():
            render = snapshot.get("renderDiagnostics")
            visibility = snapshot.get("visibilityDiagnostics")
            assert isinstance(render, dict), f"{key}: renderer diagnostics unavailable"
            assert isinstance(visibility, dict), f"{key}: live visibility diagnostics unavailable"
            assert snapshot.get("RESIDENT_CELLS") is not None, f"{key}: resident Cell metric unavailable"
            assert snapshot.get("RENDER_PARTICIPATING_CELLS") is not None, f"{key}: render-participating Cell metric unavailable"
            assert snapshot.get("VISIBILITY_CELLS") is not None, f"{key}: visibility Cell metric unavailable"
            assert snapshot.get("drawCalls") is not None, f"{key}: draw-call metric unavailable"
            final = visibility.get("finalParticipatingCells")
            if isinstance(final, list):
                assert snapshot["RENDER_PARTICIPATING_CELLS"] == len(final), (
                    f"{key}: renderer active Cell count must match final visibility participation"
                )
        report["checks"].append("RESIDENT_CELLS and RENDER_PARTICIPATING_CELLS captured as distinct architectural metrics")
        report["checks"].append("draw calls, Visibility Snapshot diagnostics and Region Locate captured independently")

        errors = browser_errors(driver)
        report["browserExceptions"] = errors
        assert not errors, errors
    finally:
        try:
            driver.quit()
        except WebDriverException:
            pass

    (ARTIFACT_DIR / "renderer-diagnostics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
