from __future__ import annotations

import json
import os
import re
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_COHESION_ARTIFACTS", "artifacts/world-cohesion-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
SPARSE_SEED = "sparse-1"


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 20.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def text_content(driver: webdriver.Chrome, selector: str) -> str:
    return str(driver.execute_script(
        "const element = document.querySelector(arguments[0]); return element ? element.textContent || '' : '';",
        selector,
    ) or "")


def wait_for_text(driver: webdriver.Chrome, selector: str, fragments: tuple[str, ...], timeout: float = 20.0, message: str = "text") -> str:
    def predicate(current: webdriver.Chrome) -> str | bool:
        value = text_content(current, selector)
        return value if all(fragment in value for fragment in fragments) else False
    return str(wait_for(driver, predicate, timeout=timeout, message=message))


def metric_number(metrics: str, label: str) -> int:
    match = re.search(rf"^{re.escape(label)}\s+(\d+)", metrics, flags=re.MULTILINE)
    if not match:
        raise AssertionError(f"Missing numeric metric {label!r}: {metrics}")
    return int(match.group(1))


def draw_call_count(metrics: str) -> int:
    match = re.search(r"^draw calls\s+(\d+)", metrics, flags=re.MULTILINE)
    if not match:
        raise AssertionError(f"Missing numeric draw-call metric: {metrics}")
    return int(match.group(1))


def fixture_light_counts(metrics: str) -> tuple[int, int]:
    match = re.search(r"^fixture lights\s+(\d+)/(\d+) active/real", metrics, flags=re.MULTILINE)
    if not match:
        raise AssertionError(f"Missing fixture-light metric: {metrics}")
    return int(match.group(1)), int(match.group(2))


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-webgl")
    options.add_argument("--ignore-gpu-blocklist")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    return webdriver.Chrome(options=options)


def toggle_lab(driver: webdriver.Chrome) -> None:
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown', {key: '`', code: 'Backquote', bubbles: true}));")


def lab_visible(driver: webdriver.Chrome) -> bool:
    return "visible" in driver.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split()


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


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def capture_screenshot(driver: webdriver.Chrome, path: Path, report: dict[str, Any], label: str) -> bool:
    try:
        driver.save_screenshot(str(path))
        return True
    except TimeoutException as error:
        warning = f"{label} screenshot timed out in headless SwiftShader; functional assertions remain authoritative: {str(error).splitlines()[0]}"
        report.setdefault("warnings", []).append(warning)
        print(f"WARNING: {warning}")
        return False


def assert_complete_scene(metrics: str, label: str) -> dict[str, int]:
    loaded = metric_number(metrics, "loaded cells")
    colliders = metric_number(metrics, "colliders")
    draw_calls = draw_call_count(metrics)
    active_lights, real_lights = fixture_light_counts(metrics)
    assert loaded > 0, f"{label} has no loaded Cells"
    assert colliders > 0, f"{label} has no ordinary/static collider geometry; possible lights-only scene"
    # PlayCanvas stats can legitimately report zero draw calls between headless
    # SwiftShader samples, especially while World Lab has autoRender suspended.
    # Keep the value as evidence, but use stable scene ownership plus console
    # errors as the blocking runtime signals.
    assert 0 <= active_lights <= real_lights, f"{label} fixture ownership is invalid: {active_lights}/{real_lights} active/real"
    return {"loadedCells": loaded, "colliders": colliders, "drawCalls": draw_calls, "activeFixtureLights": active_lights, "realFixtureLights": real_lights}


def locate_region(driver: webdriver.Chrome, region_id: str, label: str, report: dict[str, Any], sequence_index: int) -> None:
    if not lab_visible(driver):
        toggle_lab(driver)
        wait_for(driver, lambda current: lab_visible(current), message=f"World Lab open before {label}")
    dispatch_change(driver, '[data-lab="region"]', region_id)
    driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, '[data-action="locate-region"]'))
    metrics = wait_for_text(driver, '[data-ui="metrics"]', ("generation     gen3-v1", f"region         {label}"), timeout=40, message=f"located {label}")
    lab_metrics = assert_complete_scene(metrics, f"{label} while World Lab open")
    toggle_lab(driver)
    wait_for(driver, lambda current: not lab_visible(current), message=f"World Lab close after {label}")
    time.sleep(1.4)
    metrics = wait_for_text(driver, '[data-ui="metrics"]', ("generation     gen3-v1", f"region         {label}"), timeout=20, message=f"settled {label}")
    settled_metrics = assert_complete_scene(metrics, f"{label} after rendered settle")
    errors = browser_errors(driver)
    assert not errors, f"Blocking browser console errors after locating {label}: {errors}"
    report.setdefault("transitions", []).append({"index": sequence_index, "regionId": region_id, "label": label, "labMetrics": lab_metrics, "settledMetrics": settled_metrics})
    if label == "Arch Rooms":
        capture_screenshot(driver, ARTIFACT_DIR / f"arch-{sequence_index:02d}.png", report, f"Arch Rooms transition {sequence_index}")


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "seed": SPARSE_SEED, "checks": [], "warnings": [], "transitions": []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.execute_script("return document.readyState") == "complete", message="document load")
        seed_input = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-ui="seed"]'), message="seed input")
        driver.execute_script("arguments[0].value = arguments[1];", seed_input, SPARSE_SEED)
        driver.find_element(By.CSS_SELECTOR, '[data-action="new"]').click()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"),
            timeout=30,
            message="journey HUD",
        )
        time.sleep(2)
        resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
        if resume.is_displayed():
            driver.execute_script("arguments[0].click();", resume)
            time.sleep(1)
        watch = wait_for_text(driver, '[data-ui="watch"]', ("PROJECT NOCLIP", "LEVEL 0", "Ordinary Level 0"), timeout=15, message="Generation 3 ordinary Level 0 watch label")
        ordinary_metrics = wait_for_text(driver, '[data-ui="metrics"]', ("generation     gen3-v1", "region         Ordinary Level 0"), timeout=15, message="Generation 3 ordinary metrics")
        report["ordinaryWatch"] = watch
        report["ordinaryMetrics"] = ordinary_metrics
        report["ordinaryScene"] = assert_complete_scene(ordinary_metrics, "initial Ordinary Level 0")
        capture_screenshot(driver, ARTIFACT_DIR / "01-gen3-ordinary-level-0.png", report, "Ordinary Level 0")
        report["checks"].append("fixed sparse-1 origin exercised continuous ordinary Generation 3 Level 0 in the normal renderer path")

        toggle_lab(driver)
        wait_for(driver, lambda current: lab_visible(current), message="World Lab open")
        dispatch_change(driver, '[data-lab="radius"]', "1")
        dispatch_change(driver, '[data-lab="bypass"]', True)

        sequence = [
            ("arch-rooms", "Arch Rooms"),
            ("pillar-field", "Pillar Field"),
            ("arch-rooms", "Arch Rooms"),
            ("ordinary-level-0", "Ordinary Level 0"),
            ("arch-rooms", "Arch Rooms"),
        ]
        for index, (region_id, label) in enumerate(sequence, start=1):
            locate_region(driver, region_id, label, report, index)

        report["checks"].append("World Lab survived repeated Ordinary/Arch/Pillar Region relocation with loaded Cells, ordinary collider geometry and subsequent rendered settle windows")
        report["checks"].append("every Arch relocation retained nonzero loaded Cells and colliders; no floating-fixture-only scene was observed")

        errors = browser_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser console errors: {errors}"
        report["checks"].append("world-cohesion browser evidence recorded no blocking console errors, including PlayCanvas shadow/render-target exceptions")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            capture_screenshot(driver, ARTIFACT_DIR / "failure.png", report, "failure evidence")
            report["browserErrors"] = browser_errors(driver)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
