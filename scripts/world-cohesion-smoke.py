from __future__ import annotations

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


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "seed": SPARSE_SEED, "checks": []}
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
        watch = wait_for_text(driver, '[data-ui="watch"]', ("PROJECT NOCLIP", "LEVEL 0", "field-solved open office"), timeout=15, message="Generation 3 pilot watch label")
        report["pilotWatch"] = watch
        driver.save_screenshot(str(ARTIFACT_DIR / "01-gen3-field-solved-open-office.png"))
        report["checks"].append("fixed sparse-1 origin exercised the Generation 3 field-solved open-office pilot in the normal renderer path")

        toggle_lab(driver)
        wait_for(driver, lambda current: lab_visible(current), message="World Lab open")
        dispatch_change(driver, '[data-lab="radius"]', "1")
        dispatch_change(driver, '[data-lab="bypass"]', True)
        dispatch_change(driver, '[data-lab="zone"]', "arch")
        metrics = wait_for_text(driver, '[data-ui="metrics"]', ("zone          Arch Rooms",), timeout=20, message="forced Arch Room")
        report["archMetrics"] = metrics
        driver.save_screenshot(str(ARTIFACT_DIR / "02-forced-arch-lab.png"))
        report["checks"].append("World Lab forced an unchanged legacy Arch Room under the normal deterministic renderer path")

        toggle_lab(driver)
        wait_for(driver, lambda current: not lab_visible(current), message="World Lab close")
        time.sleep(2)
        driver.save_screenshot(str(ARTIFACT_DIR / "03-forced-arch-room.png"))
        report["checks"].append("forced Arch Room browser view captured to guard an out-of-pilot ordinary generation path")

        errors = browser_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser console errors: {errors}"
        report["checks"].append("world-cohesion browser evidence recorded no blocking console errors")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            driver.save_screenshot(str(ARTIFACT_DIR / "failure.png"))
            report["browserErrors"] = browser_errors(driver)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
