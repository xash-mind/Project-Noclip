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
    try:
        driver.command_executor._client_config.timeout = 30
    except (AttributeError, TypeError):
        pass
    driver.set_script_timeout(30)
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


def move_look(driver: webdriver.Chrome, movement_x: int, movement_y: int) -> None:
    driver.execute_script(
        """
        const event = new MouseEvent('mousemove', { bubbles: true });
        Object.defineProperty(event, 'movementX', { value: arguments[0] });
        Object.defineProperty(event, 'movementY', { value: arguments[1] });
        window.dispatchEvent(event);
        """,
        movement_x,
        movement_y,
    )


def capture_canvas_png(driver: webdriver.Chrome) -> bytes:
    value = driver.execute_async_script("""
      const done=arguments[0], canvas=document.querySelector('#game-canvas');
      if(!canvas){done({error:'missing canvas'});return;}
      requestAnimationFrame(()=>canvas.toBlob((blob)=>{
        if(!blob){done({error:'canvas.toBlob returned null'});return;}
        const reader=new FileReader();
        reader.onerror=()=>done({error:String(reader.error)});
        reader.onload=()=>done(String(reader.result));
        reader.readAsDataURL(blob);
      },'image/png'));
    """)
    if isinstance(value, dict):
        raise AssertionError(value)
    header, encoded = str(value).split(",", 1)
    if "image/png" not in header:
        raise AssertionError(header)
    return base64.b64decode(encoded)


def capture_required(driver: webdriver.Chrome, path: Path) -> None:
    # CV-H1 requires blocking screenshot evidence, but GitHub's software
    # renderer has reproducibly stalled inside ChromeDriver's whole-viewport
    # /screenshot endpoint. Capture the actual game canvas first using the same
    # WebGL-toBlob path already used by the Blackout visual lane; this preserves
    # rendered-pixel evidence instead of weakening the screenshot requirement.
    last_error: Exception | None = None
    try:
        png = capture_canvas_png(driver)
        if png:
            path.write_bytes(png)
            if path.stat().st_size > 1024:
                return
    except Exception as error:
        last_error = error

    # Retain independent browser fallbacks for environments where canvas export
    # is unavailable. Do not extend timeouts merely to force hosted Chrome green.
    for attempt in range(2):
        try:
            png = driver.get_screenshot_as_png()
            if png:
                path.write_bytes(png)
                if path.stat().st_size > 1024:
                    return
        except Exception as error:
            last_error = error
        if attempt == 0:
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
    # Chromium rejects the game's automatic requestPointerLock() calls in
    # headless mode because they are not backed by a trusted gesture. The
    # harness subsequently acquires pointer lock with a real WebDriver click.
    # Ignore only that exact CI-only browser-policy message.
    ignored = (
        "favicon.ico",
        "AudioContext was not allowed to start",
        "A user gesture is required to request Pointer Lock.",
    )
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
        # Locate an actual deterministic CV-H1 occurrence rather than forcing a
        # carver onto the player's current Cell. The runtime locator positions
        # the camera on the cluster's east/outside bypass edge.
        dispatch_change(driver, '[data-lab="carver"]', "")
        locate_button = driver.find_element(By.CSS_SELECTOR, '[data-action="locate-hole-cluster"]')
        driver.execute_script("arguments[0].click();", locate_button)
        # The locator intentionally places the player just outside the cluster,
        # so the *current* Cell can correctly report no local carver even though
        # the occurrence is immediately west and loaded. The locator toast is
        # therefore the authoritative semantic confirmation; current-Cell
        # `carvers` text would be the wrong assertion here.
        toast_text = wait_for_text(
            driver,
            '[data-ui="toasts"]',
            ("Located a natural", "floor-hole cluster", "outer bypass side"),
            timeout=20,
            message="natural CV-H1 locator confirmation",
        )
        metrics = wait_for_text(
            driver,
            '[data-ui="metrics"]',
            ("generation     gen3-v1", "position"),
            timeout=20,
            message="post-locator Level 0 metrics",
        )
        report["locatedMetrics"] = metrics
        report["locatorToast"] = toast_text
        report["checks"].append("located a natural deterministic CV-H1 cluster with timeline bypass and radius 1")

        toggle_lab(driver)
        wait_for(driver, lambda current: not lab_visible(current), message="World Lab close")

        # Pointer lock can only be granted from a trusted user gesture. A JS
        # .click() is intentionally untrusted in Chromium, so use WebDriver's
        # native action path on the real canvas. This exercises the same click
        # listener a player uses without adding any runtime test hook.
        canvas = driver.find_element(By.CSS_SELECTOR, "#game-canvas")
        ActionChains(driver).move_to_element(canvas).click().perform()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.pointerLockElement === document.querySelector('#game-canvas')"),
            timeout=12,
            message="trusted pointer lock for CV-H1 floor inspection",
        )

        # New journeys begin at yaw 0. The CV-H1 locator deliberately places the
        # player east of the occurrence, so rotate about +90 degrees to face west
        # into the cluster and pitch down enough to frame the nearby apertures.
        move_look(driver, -948, 300)
        time.sleep(1.5)
        report["settledMetricsBeforeCapture"] = text_content(driver, '[data-ui="metrics"]')

        standing_path = ARTIFACT_DIR / "01-cvh1-standing-floor.png"
        capture_required(driver, standing_path)
        report["screenshots"].append(standing_path.name)
        report["checks"].append("captured standing-height natural CV-H1 aperture edges from the outer bypass")

        # Raise toward a shallow floor-grazing angle without changing the westward
        # heading; this is the angle most likely to reveal residual floor strips,
        # internal box sides or coplanar junction artifacts.
        move_look(driver, 0, -195)
        time.sleep(1.5)
        grazing_path = ARTIFACT_DIR / "02-cvh1-grazing-floor.png"
        capture_required(driver, grazing_path)
        report["screenshots"].append(grazing_path.name)
        report["checks"].append("captured shallow natural CV-H1 aperture-edge view for seam/junction inspection")

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
