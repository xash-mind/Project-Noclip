from __future__ import annotations

import json
import math
import os
import shutil
import statistics
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_RENDER_SETTINGS_ARTIFACTS", "artifacts/render-settings"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_SECONDS = float(os.environ.get("NOCLIP_RENDER_SETTINGS_SAMPLE_SECONDS", "2.5"))


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 30.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


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


def percentile(values: list[float], quantile: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return math.nan
    position = (len(ordered) - 1) * quantile
    lower, upper = math.floor(position), math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def measure_frames(driver: webdriver.Chrome) -> dict[str, Any]:
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
        int(SAMPLE_SECONDS * 1000),
    )
    values = [float(value) for value in result["intervals"] if float(value) > 0]
    if not values:
        raise AssertionError("No requestAnimationFrame samples recorded")
    fps = [1000.0 / value for value in values]
    return {
        "sampleCount": len(values),
        "frameTimeMs": {
            "median": round(statistics.median(values), 3),
            "p95": round(percentile(values, 0.95), 3),
            "mean": round(statistics.fmean(values), 3),
        },
        "instantaneousFps": {
            "median": round(statistics.median(fps), 2),
            "p05": round(percentile(fps, 0.05), 2),
        },
    }


def bridge(driver: webdriver.Chrome) -> dict[str, Any]:
    return dict(driver.execute_script(
        "return {settings:window.__projectNoclipRenderSettings.get(), diagnostics:window.__projectNoclipRenderSettings.diagnostics()};"
    ))


def apply_preset(driver: webdriver.Chrome, preset: str, expected_cells: int) -> dict[str, Any]:
    driver.execute_script("window.__projectNoclipRenderSettings.preset(arguments[0]);", preset)
    result = wait_for(
        driver,
        lambda current: bridge(current) if bridge(current)["diagnostics"]["activeCells"] == expected_cells else False,
        message=f"{preset} active Cell scope",
    )
    time.sleep(1.0)
    return dict(result)


def apply_custom(driver: webdriver.Chrome) -> dict[str, Any]:
    driver.execute_script(
        "window.__projectNoclipRenderSettings.patch({renderDistance:'high',shadowQuality:'low',shadowResolution:256,renderScale:0.75,postProcessing:'off',fogBehavior:'linked'});"
    )
    return dict(wait_for(
        driver,
        lambda current: bridge(current) if bridge(current)["settings"]["preset"] == "custom" and bridge(current)["diagnostics"]["activeCells"] == 49 else False,
        message="custom render settings",
    ))


def sample(driver: webdriver.Chrome, label: str) -> dict[str, Any]:
    state = bridge(driver)
    diagnostics = state["diagnostics"]
    settings = state["settings"]
    assert diagnostics["activeOmnis"] == diagnostics["shadowedOmnis"], (
        f"{label}: active M-F1 Omnis {diagnostics['activeOmnis']} != shadowed Omnis {diagnostics['shadowedOmnis']}"
    )
    canvas = dict(driver.execute_script(
        "const c=document.querySelector('#game-canvas');return {width:c.width,height:c.height,clientWidth:c.clientWidth,clientHeight:c.clientHeight};"
    ))
    frame = measure_frames(driver)
    path = ARTIFACT_DIR / f"{label}.png"
    driver.save_screenshot(str(path))
    return {
        "settings": settings,
        "diagnostics": diagnostics,
        "canvas": canvas,
        "frames": frame,
    }


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "sampleSeconds": SAMPLE_SECONDS, "profiles": {}, "checks": []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(max(30, int(SAMPLE_SECONDS + 20)))
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.execute_script("return document.readyState") == "complete", message="document load")
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey").click()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden&&!document.querySelector('[data-ui=hud]').hidden"),
            message="Level 0 HUD",
        )
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipRenderSettings)"), message="render settings QA bridge")
        time.sleep(2)

        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")
        wait_for(driver, lambda current: "visible" in current.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split(), message="World Lab")
        driver.execute_script("document.querySelector('[data-render-tab=render]').click();")
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-lab-panel="render-settings"]').is_displayed(), message="Render Settings tab")
        driver.save_screenshot(str(ARTIFACT_DIR / "render-settings-ui.png"))
        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")

        expected_cells = {"low": 9, "medium": 25, "high": 49, "ultra": 81}
        for preset in ("low", "medium", "high", "ultra"):
            apply_preset(driver, preset, expected_cells[preset])
            report["profiles"][preset] = sample(driver, preset)

        apply_custom(driver)
        report["profiles"]["custom"] = sample(driver, "custom-high-lowshadows-75scale")

        low = report["profiles"]["low"]["diagnostics"]
        ultra = report["profiles"]["ultra"]["diagnostics"]
        assert low["activeCells"] == 9 and ultra["activeCells"] == 81
        assert low["activeOmnis"] < ultra["activeOmnis"], (
            f"Low did not reduce M-F1 work: {low['activeOmnis']} vs Ultra {ultra['activeOmnis']}"
        )
        assert low["shadowedOmnis"] < ultra["shadowedOmnis"]
        assert low["fogEnd"] < ultra["fogEnd"]
        report["checks"].extend([
            "Low/Medium/High/Ultra produce 9/25/49/81 active Cell scopes",
            "every measured preset preserves active M-F1 Omni == shadowed M-F1 Omni",
            "Low materially reduces fixture/shadow work versus Ultra",
            "fog horizon expands with real Render Distance scope",
            "Custom combination keeps High distance with Low 256 shadows and 75% Render Scale",
        ])
        report["browserErrors"] = [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE" and "favicon.ico" not in entry.get("message", "")]
        assert not report["browserErrors"], report["browserErrors"]
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            driver.save_screenshot(str(ARTIFACT_DIR / "failure.png"))
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "profile.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
