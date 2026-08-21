from __future__ import annotations

import base64
import json
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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_CVH1_ARTIFACTS", "artifacts/cvh1-floor-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


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
    for argument in (
        "--headless=new", "--window-size=1024,640", "--use-angle=swiftshader", "--enable-webgl",
        "--ignore-gpu-blocklist", "--disable-dev-shm-usage", "--no-sandbox",
    ):
        options.add_argument(argument)
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    driver = webdriver.Chrome(options=options)
    # Screenshot commands on GitHub's software renderer can take longer than
    # Selenium's default HTTP timeout even when the frame itself is healthy.
    # Keep this local to the visual-evidence harness rather than changing game
    # timing or renderer policy.
    try:
        driver.command_executor._client_config.timeout = 30
    except (AttributeError, TypeError):
        pass
    return driver


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


def toggle_lab(driver: webdriver.Chrome) -> None:
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown', {key: '`', code: 'Backquote', bubbles: true}));")


def lab_visible(driver: webdriver.Chrome) -> bool:
    return "visible" in driver.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split()


def move_pitch(driver: webdriver.Chrome, movement_y: int) -> None:
    driver.execute_script(
        """
        const event = new MouseEvent('mousemove', { bubbles: true });
        Object.defineProperty(event, 'movementY', { value: arguments[0] });
        window.dispatchEvent(event);
        """,
        movement_y,
    )


def capture_required(driver: webdriver.Chrome, path: Path) -> None:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            png = driver.get_screenshot_as_png()
            if png:
                path.write_bytes(png)
                if path.stat().st_size > 1024:
                    return
        except Exception as error:  # Selenium exposes renderer timeouts as several concrete subclasses.
            last_error = error
        if attempt == 1:
            try:
                encoded = driver.execute_cdp_cmd(
                    "Page.captureScreenshot",
                    {"format": "png", "fromSurface": True, "captureBeyondViewport": False},
                ).get("data", "")
                if encoded:
                    path.write_bytes(base64.b64decode(encoded))
                    if path.stat().st_size > 1024:
                        return
            except Exception as error:
                last_error = error
        time.sleep(0.75)
    raise AssertionError(f"Required CV-H1 screenshot failed: {path.name}: {last_error}")


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "checks": [], "screenshots": [], "browserErrors": []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.execute_script("return document.readyState") == "complete", message="document load")
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey")
        driver.execute_script("arguments[0].click();", new_button)
        wait_for(
            driver,
            lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"),
            timeout=30,
            message="Level 0 HUD",
        )
        time.sleep(2)

        toggle_lab(driver)
        wait_for(driver, lambda current: lab_visible(current), message="World Lab open")
        dispatch_change(driver, '[data-lab="radius"]', "1")
        dispatch_change(driver, '[data-lab="bypass"]', True)
        dispatch_change(driver, '[data-lab="condition"]', "clear")
        dispatch_change(driver, '[data-lab="carver"]', "floor-hole-cluster")
        metrics = wait_for_text(
            driver,
            '[data-ui="metrics"]',
            ("generation     gen3-v1", "carvers", "floor-hole-cluster"),
            timeout=25,
            message="forced CV-H1 Cell",
        )
        report["forcedMetrics"] = metrics
        report["checks"].append("forced deterministic Generation 3 CV-H1 at radius 1")

        toggle_lab(driver)
        wait_for(driver, lambda current: not lab_visible(current), message="World Lab close")

        # Pointer lock can only be granted from a trusted user gesture. A JS
        # .click() is intentionally untrusted in Chromium, so use WebDriver's
        # native action path on the real canvas. This exercises the same click
        # listener a player uses without adding any runtime test hook.
        canvas = driver.find_element(By.CSS_SELECTOR, '#game-canvas')
        ActionChains(driver).move_to_element(canvas).click().perform()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.pointerLockElement === document.querySelector('#game-canvas')"),
            timeout=12,
            message="trusted pointer lock for CV-H1 floor inspection",
        )

        # The actual draw-call cap is intentionally checked by
        # profile-candidate-renderer.py after this visual smoke, once the Lab is
        # closed and the radius-1 world is settled. Do not compare a World Lab
        # diagnostic frame against that gameplay cap.
        report["settledMetricsBeforeCapture"] = text_content(driver, '[data-ui="metrics"]')

        move_pitch(driver, 230)
        time.sleep(1.5)
        standing_path = ARTIFACT_DIR / "01-cvh1-standing-floor.png"
        capture_required(driver, standing_path)
        report["screenshots"].append(standing_path.name)
        report["checks"].append("captured standing-height CV-H1 carpet and apertures under normal Level 0 lighting")

        move_pitch(driver, -155)
        time.sleep(1.5)
        grazing_path = ARTIFACT_DIR / "02-cvh1-grazing-floor.png"
        capture_required(driver, grazing_path)
        report["screenshots"].append(grazing_path.name)
        report["checks"].append("captured shallow/grazing CV-H1 carpet view where recessed strips and box-side seams were previously most visible")

        errors = browser_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser errors during CV-H1 floor inspection: {errors}"
        report["checks"].append("CV-H1 visual inspection produced no blocking browser errors")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            capture_required(driver, ARTIFACT_DIR / "failure.png")
            report["browserErrors"] = browser_errors(driver)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
