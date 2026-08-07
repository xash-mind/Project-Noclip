from __future__ import annotations

import json
import math
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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_MOBILE_ARTIFACTS", "artifacts/mobile-smoke"))
EXPECTED_VERSION = os.environ.get("NOCLIP_EXPECTED_VERSION") or Path("VERSION").read_text(encoding="utf-8").strip()
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 25.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def browser_log_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry
        for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=900,450")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-webgl")
    options.add_argument("--ignore-gpu-blocklist")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
        "width": 900,
        "height": 450,
        "deviceScaleFactor": 2,
        "mobile": True,
        "screenWidth": 900,
        "screenHeight": 450,
        "positionX": 0,
        "positionY": 0,
    })
    driver.execute_cdp_cmd("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    return driver


def element_rect(driver: webdriver.Chrome, selector: str) -> dict[str, float]:
    value = driver.execute_script(
        """
        const element = document.querySelector(arguments[0]);
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
        """,
        selector,
    )
    if not isinstance(value, dict):
        raise AssertionError(f"Missing element {selector}")
    return {key: float(number) for key, number in value.items()}


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    return bool(driver.execute_script(
        "const e=document.querySelector(arguments[0]); if(!e) return false; const s=getComputedStyle(e); const r=e.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0;",
        selector,
    ))


def rects_overlap(a: dict[str, float], b: dict[str, float], padding: float = 0) -> bool:
    return not (a["right"] + padding <= b["left"] or b["right"] + padding <= a["left"] or a["bottom"] + padding <= b["top"] or b["bottom"] + padding <= a["top"])


def touch_event(driver: webdriver.Chrome, event_type: str, points: list[dict[str, float | int]]) -> None:
    driver.execute_cdp_cmd("Input.dispatchTouchEvent", {"type": event_type, "touchPoints": points})


def touch_hold_move(driver: webdriver.Chrome, selector: str, dx: float, dy: float, hold_seconds: float) -> None:
    rect = element_rect(driver, selector)
    x = rect["left"] + rect["width"] / 2
    y = rect["top"] + rect["height"] / 2
    touch_event(driver, "touchStart", [{"x": x, "y": y, "id": 1, "radiusX": 6, "radiusY": 6, "force": 1}])
    touch_event(driver, "touchMove", [{"x": x + dx, "y": y + dy, "id": 1, "radiusX": 6, "radiusY": 6, "force": 1}])
    time.sleep(hold_seconds)
    touch_event(driver, "touchEnd", [])


def touch_drag(driver: webdriver.Chrome, selector: str, dx: float, dy: float) -> None:
    rect = element_rect(driver, selector)
    x = rect["left"] + rect["width"] / 2
    y = rect["top"] + rect["height"] / 2
    touch_event(driver, "touchStart", [{"x": x, "y": y, "id": 2, "radiusX": 5, "radiusY": 5, "force": 1}])
    steps = 4
    for index in range(1, steps + 1):
        touch_event(driver, "touchMove", [{
            "x": x + dx * index / steps,
            "y": y + dy * index / steps,
            "id": 2,
            "radiusX": 5,
            "radiusY": 5,
            "force": 1,
        }])
        time.sleep(0.04)
    touch_event(driver, "touchEnd", [])


def touch_tap(driver: webdriver.Chrome, selector: str, pointer_id: int) -> None:
    rect = element_rect(driver, selector)
    x = rect["left"] + rect["width"] / 2
    y = rect["top"] + rect["height"] / 2
    touch_event(driver, "touchStart", [{"x": x, "y": y, "id": pointer_id, "radiusX": 5, "radiusY": 5, "force": 1}])
    time.sleep(0.06)
    touch_event(driver, "touchEnd", [])


def metrics_text(driver: webdriver.Chrome) -> str:
    return str(driver.execute_script("return document.querySelector('[data-ui=\"metrics\"]')?.textContent || '';") or "")


def metrics_position(driver: webdriver.Chrome) -> tuple[float, float] | None:
    match = re.search(r"position\s+(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", metrics_text(driver))
    return (float(match.group(1)), float(match.group(2))) if match else None


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({ error: String(request.error) });
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) { db.close(); done(null); return; }
          const read = db.transaction('journey', 'readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done({ error: String(read.error) }); };
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) else None


def main() -> None:
    checks: list[str] = []
    report: dict[str, Any] = {"baseUrl": BASE_URL, "viewport": {"width": 900, "height": 450, "deviceScaleFactor": 2}, "checks": checks}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="title screen")
        environment = driver.execute_script(
            "return {touch:navigator.maxTouchPoints, coarse:matchMedia('(pointer: coarse)').matches, noHover:matchMedia('(hover: none)').matches, width:innerWidth, height:innerHeight};"
        )
        report["inputEnvironment"] = environment
        assert int(environment.get("touch", 0)) > 0, environment
        assert bool(environment.get("coarse")) or bool(environment.get("noHover")), environment
        checks.append("landscape mobile emulation exposes a coarse/no-hover touch environment")

        expected_version = f"v{EXPECTED_VERSION}"
        version_text = str(driver.find_element(By.CSS_SELECTOR, '[data-ui="version-indicator"]').get_attribute("textContent") or "").strip()
        assert version_text == expected_version, f"expected {expected_version}, saw {version_text!r}"
        report["visibleVersion"] = version_text
        checks.append(f"development version indicator visibly reports {version_text}")

        touch_tap(driver, '[data-action="new"]', 10)
        wait_for(driver, lambda current: displayed(current, '[data-ui="touch-controls"]'), timeout=35, message="landscape touch controls")
        assert not displayed(driver, '[data-ui="touch-orientation"]')
        assert driver.execute_script("return document.pointerLockElement === null") is True
        checks.append("new journey enters landscape touch mode without pointer lock")

        wait_for(driver, lambda current: metrics_position(current) is not None, timeout=25, message="World Lab position metrics")
        start_position = metrics_position(driver)
        assert start_position is not None
        report["startPosition"] = start_position

        move_rect = element_rect(driver, '[data-touch="move"]')
        action_rect = element_rect(driver, '.touch-actions')
        inventory_rect = element_rect(driver, '[data-ui="inventory"]')
        version_rect = element_rect(driver, '[data-ui="version-indicator"]')
        status_rect = element_rect(driver, '.status-bars')
        assert not rects_overlap(move_rect, inventory_rect, 4), "movement control overlaps inventory"
        assert not rects_overlap(action_rect, inventory_rect, 4), "action buttons overlap inventory"
        assert not rects_overlap(version_rect, status_rect, 2), "version indicator overlaps status bars"
        assert move_rect["width"] >= 44 and move_rect["height"] >= 44
        assert element_rect(driver, '[data-action="touch-interact"]')["height"] >= 44
        assert element_rect(driver, '[data-action="touch-use"]')["height"] >= 44
        checks.append("touch targets and HUD/version regions remain readable and non-overlapping")

        touch_hold_move(driver, '[data-touch="move"]', 0, -43, 1.35)
        moved_position = wait_for(
            driver,
            lambda current: (
                pos if (pos := metrics_position(current)) and math.hypot(pos[0] - start_position[0], pos[1] - start_position[1]) > 0.3 else False
            ),
            timeout=12,
            message="touch movement",
        )
        report["movedPosition"] = moved_position
        checks.append("left touch pad moves the canonical player through the existing movement/collision path")

        before_save = wait_for(driver, lambda current: read_save(current), timeout=10, message="schema-v2 save before touch look")
        before_yaw = float(before_save.get("position", {}).get("yaw", 0))
        touch_drag(driver, '[data-touch="look"]', 84, -22)
        time.sleep(2.0)
        after_save = wait_for(driver, lambda current: read_save(current), timeout=10, message="schema-v2 save after touch look")
        after_yaw = float(after_save.get("position", {}).get("yaw", 0))
        assert abs(after_yaw - before_yaw) > 1.0, (before_yaw, after_yaw)
        report["yawBefore"] = before_yaw
        report["yawAfter"] = after_yaw
        checks.append("right-side touch drag rotates the camera and persists orientation without pointer lock")

        touch_tap(driver, '[data-action="touch-interact"]', 20)
        touch_tap(driver, '[data-action="touch-use"]', 21)
        time.sleep(0.3)
        checks.append("minimum touch Interact and Use actions are operable with 44px-plus targets")

        assert after_save.get("version") == 2
        assert after_save.get("seed") == "threshold-001"
        assert driver.execute_script("return document.pointerLockElement === null") is True
        checks.append("touch journey remains save schema v2 on the same deterministic world seed")

        driver.save_screenshot(str(ARTIFACT_DIR / "mobile-landscape.png"))
        errors = browser_log_errors(driver)
        report["browserErrors"] = errors
        assert not errors, errors
        checks.append("mobile landscape journey records no blocking browser-console errors")
    finally:
        try:
            driver.quit()
        finally:
            (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
