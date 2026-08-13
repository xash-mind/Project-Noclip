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
    return [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE" and not any(fragment in entry.get("message", "") for fragment in ignored)]


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
    driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width": 900, "height": 450, "deviceScaleFactor": 2, "mobile": True, "screenWidth": 900, "screenHeight": 450, "positionX": 0, "positionY": 0})
    driver.execute_cdp_cmd("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    return driver


def element_rect(driver: webdriver.Chrome, selector: str) -> dict[str, float]:
    value = driver.execute_script("""
        const element = document.querySelector(arguments[0]);
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
    """, selector)
    if not isinstance(value, dict):
        raise AssertionError(f"Missing element {selector}")
    return {key: float(number) for key, number in value.items()}


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    return bool(driver.execute_script("const e=document.querySelector(arguments[0]); if(!e) return false; const s=getComputedStyle(e); const r=e.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0;", selector))


def has_class(driver: webdriver.Chrome, selector: str, class_name: str) -> bool:
    return bool(driver.execute_script("const e=document.querySelector(arguments[0]); return Boolean(e?.classList.contains(arguments[1]));", selector, class_name))


def hit_testable(driver: webdriver.Chrome, selector: str) -> bool:
    return bool(driver.execute_script("""
        const element = document.querySelector(arguments[0]);
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return false;
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return false;
        const hit = document.elementFromPoint(x, y);
        return hit === element || element.contains(hit);
    """, selector))


def rects_overlap(a: dict[str, float], b: dict[str, float], padding: float = 0) -> bool:
    return not (a["right"] + padding <= b["left"] or b["right"] + padding <= a["left"] or a["bottom"] + padding <= b["top"] or b["bottom"] + padding <= a["top"])


def touch_event(driver: webdriver.Chrome, event_type: str, points: list[dict[str, float | int]]) -> None:
    driver.execute_cdp_cmd("Input.dispatchTouchEvent", {"type": event_type, "touchPoints": points})


def center_point(driver: webdriver.Chrome, selector: str, pointer_id: int) -> dict[str, float | int]:
    rect = element_rect(driver, selector)
    return {"x": rect["left"] + rect["width"] / 2, "y": rect["top"] + rect["height"] / 2, "id": pointer_id, "radiusX": 5, "radiusY": 5, "force": 1}


def touch_move_until(
    driver: webdriver.Chrome,
    selector: str,
    dx: float,
    dy: float,
    start_position: tuple[float, float],
    threshold: float,
    timeout: float,
) -> tuple[float, float]:
    point = center_point(driver, selector, 1)
    x = float(point["x"]); y = float(point["y"])
    touch_event(driver, "touchStart", [point])
    touch_event(driver, "touchMove", [{**point, "x": x + dx, "y": y + dy}])
    try:
        return wait_for(
            driver,
            lambda current: (
                pos if (pos := metrics_position(current))
                and math.hypot(pos[0] - start_position[0], pos[1] - start_position[1]) > threshold
                else False
            ),
            timeout=timeout,
            message="touch movement while the control remains held",
        )
    finally:
        touch_event(driver, "touchEnd", [])


def touch_sprint_move_until(
    driver: webdriver.Chrome,
    start_position: tuple[float, float],
    threshold: float = 0.2,
    timeout: float = 10,
) -> tuple[float, float]:
    sprint = center_point(driver, '[data-action="touch-sprint"]', 3)
    move = center_point(driver, '[data-touch="move"]', 4)
    moved = {**move, "y": float(move["y"]) - 43}
    touch_event(driver, "touchStart", [sprint, move])
    wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="touch-sprint"]').get_attribute("aria-pressed") == "true", timeout=3, message="Sprint held state")
    touch_event(driver, "touchMove", [sprint, moved])
    try:
        return wait_for(
            driver,
            lambda current: (
                pos if (pos := metrics_position(current))
                and math.hypot(pos[0] - start_position[0], pos[1] - start_position[1]) > threshold
                else False
            ),
            timeout=timeout,
            message="Sprint plus movement while both controls remain held",
        )
    finally:
        touch_event(driver, "touchEnd", [])
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="touch-sprint"]').get_attribute("aria-pressed") == "false", timeout=3, message="Sprint released state")


def touch_drag(driver: webdriver.Chrome, selector: str, dx: float, dy: float, steps: int = 6) -> None:
    point = center_point(driver, selector, 2)
    x = float(point["x"]); y = float(point["y"])
    input_scale = float(driver.execute_script("return window.devicePixelRatio || 1"))
    input_dx, input_dy = dx * input_scale, dy * input_scale
    touch_event(driver, "touchStart", [point])
    # CDP mobile emulation consumes this Look displacement in its device-input
    # pixel space while the app receives PointerEvent client coordinates in CSS
    # pixels. Scale only the injected Look drag by DPR; the asserted gesture is
    # still the requested CSS displacement and gameplay sensitivity is unchanged.
    time.sleep(0.06)
    for index in range(1, steps + 1):
        touch_event(driver, "touchMove", [{**point, "x": x + input_dx * index / steps, "y": y + input_dy * index / steps}])
        time.sleep(0.04)
    touch_event(driver, "touchEnd", [])


def touch_tap(driver: webdriver.Chrome, selector: str, pointer_id: int) -> None:
    point = center_point(driver, selector, pointer_id)
    touch_event(driver, "touchStart", [point])
    time.sleep(0.06)
    touch_event(driver, "touchEnd", [])


def click_button(driver: webdriver.Chrome, selector: str) -> None:
    button = driver.find_element(By.CSS_SELECTOR, selector)
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", button)
    wait_for(driver, lambda current: hit_testable(current, selector), timeout=3, message=f"{selector} hit target")
    driver.find_element(By.CSS_SELECTOR, selector).click()


def metrics_text(driver: webdriver.Chrome) -> str:
    return str(driver.execute_script("return document.querySelector('[data-ui=\"metrics\"]')?.textContent || '';") or "")


def metrics_position(driver: webdriver.Chrome) -> tuple[float, float] | None:
    match = re.search(r"position\s+(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", metrics_text(driver))
    return (float(match.group(1)), float(match.group(2))) if match else None


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script("""
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
    """)
    return value if isinstance(value, dict) else None


def write_save(driver: webdriver.Chrome, save: dict[str, Any]) -> None:
    result = driver.execute_async_script("""
        const save = arguments[0]; const done = arguments[1];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done(String(request.error));
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('journey', 'readwrite');
          tx.objectStore('journey').put(save, 'local-character');
          tx.oncomplete = () => { db.close(); done(null); };
          tx.onerror = () => { const error=String(tx.error); db.close(); done(error); };
        };
    """, save)
    if result:
        raise AssertionError(f"Could not write smoke save: {result}")


def main() -> None:
    checks: list[str] = []
    report: dict[str, Any] = {"baseUrl": BASE_URL, "viewport": {"width": 900, "height": 450, "deviceScaleFactor": 2}, "checks": checks}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="title screen")
        environment = driver.execute_script("return {touch:navigator.maxTouchPoints, coarse:matchMedia('(pointer: coarse)').matches, noHover:matchMedia('(hover: none)').matches, width:innerWidth, height:innerHeight};")
        report["inputEnvironment"] = environment
        assert int(environment.get("touch", 0)) > 0, environment
        assert bool(environment.get("coarse")) or bool(environment.get("noHover")), environment
        checks.append("landscape mobile emulation exposes a coarse/no-hover touch environment")

        expected_version = f"v{EXPECTED_VERSION}"
        version_text = str(driver.find_element(By.CSS_SELECTOR, '[data-ui="version-indicator"]').get_attribute("textContent") or "").strip()
        assert version_text == expected_version, f"expected {expected_version}, saw {version_text!r}"
        report["visibleVersion"] = version_text
        checks.append(f"development version indicator visibly reports {version_text}")

        click_button(driver, '[data-action="new"]')
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
        for selector in ('[data-action="touch-sprint"]', '[data-action="touch-marker"]', '[data-action="touch-interact"]', '[data-action="touch-use"]', '[data-action="touch-lab"]'):
            rect = element_rect(driver, selector)
            assert rect["width"] >= 44 and rect["height"] >= 44, (selector, rect)
        assert move_rect["width"] >= 44 and move_rect["height"] >= 44
        checks.append("Sprint, Marker, Interact, Use and Lab targets remain 44px-plus without essential HUD overlap")

        moved_position = touch_move_until(driver, '[data-touch="move"]', 0, -43, start_position, threshold=0.3, timeout=12)
        report["movedPosition"] = moved_position
        checks.append("left touch pad still moves the canonical player through the existing movement/collision path")

        sprint_start = metrics_position(driver)
        assert sprint_start is not None
        sprint_end = touch_sprint_move_until(driver, sprint_start)
        report["sprintStart"] = sprint_start
        report["sprintEnd"] = sprint_end
        checks.append("Sprint can be held simultaneously with Move and releases cleanly through shared player intent")

        before_save = wait_for(driver, lambda current: read_save(current), timeout=10, message="schema-v2 save before touch look")
        before_yaw = float(before_save.get("position", {}).get("yaw", 0))
        touch_drag(driver, '[data-touch="look"]', 84, -22)
        time.sleep(2.0)
        after_save = wait_for(driver, lambda current: read_save(current), timeout=10, message="schema-v2 save after touch look")
        after_yaw = float(after_save.get("position", {}).get("yaw", 0))
        yaw_delta = abs(after_yaw - before_yaw)
        assert yaw_delta >= 17.0, (before_yaw, after_yaw, yaw_delta)
        report["yawBefore"] = before_yaw
        report["yawAfter"] = after_yaw
        report["yawDelta"] = yaw_delta
        checks.append("one trusted 84px touch move produces the faster look response without pointer lock")

        click_button(driver, '[data-action="touch-lab"]')
        wait_for(driver, lambda current: has_class(current, '[data-ui="lab"]', 'visible'), timeout=5, message="World Lab open state from mobile action")
        click_button(driver, '[data-action="close-lab"]')
        wait_for(driver, lambda current: not has_class(current, '[data-ui="lab"]', 'visible'), timeout=5, message="World Lab closed state from mobile action")
        wait_for(driver, lambda current: displayed(current, '[data-ui="touch-controls"]'), timeout=5, message="touch controls restored after Lab")
        assert driver.execute_script("return document.pointerLockElement === null") is True
        checks.append("mobile World Lab actions open and close the testing panel and restore touch input without pointer lock")

        seeded = wait_for(driver, lambda current: read_save(current), timeout=10, message="save for marker setup")
        marker = {
            "instanceId": "mobile-smoke-marker",
            "definitionId": "marker",
            "condition": 1,
            "charge": 1,
            "quantity": 1,
            "owner": {"type": "character", "id": seeded["characterId"]},
            "origin": {"type": "event", "sourceId": "mobile-smoke", "createdAt": int(time.time() * 1000)},
            "revision": 1,
            "tradeable": True,
        }
        seeded["inventory"] = [item for item in seeded.get("inventory", []) if item.get("definitionId") != "marker"] + [marker]
        seeded["selectedItemId"] = marker["instanceId"]
        write_save(driver, seeded)
        driver.refresh()
        wait_for(driver, lambda current: displayed(current, '[data-action="continue"]'), timeout=20, message="Continue after marker setup")
        click_button(driver, '[data-action="continue"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="touch-controls"]'), timeout=35, message="touch controls after Continue")
        wait_for(driver, lambda current: bool(current.execute_script("return window.__projectNoclipQa")), timeout=10, message="current-world QA bridge")
        marker_target = driver.execute_script("return window.__projectNoclipQa?.placeAtMarkerWall?.() ?? null;")
        assert marker_target, "Could not resolve a current collider-clear wall for touch marker coverage"
        report["markerTarget"] = marker_target
        time.sleep(0.8)
        click_button(driver, '[data-action="touch-marker"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="marker-mode"]'), timeout=5, message="touch marker mode")
        touch_marker_text = str(driver.find_element(By.CSS_SELECTOR, '.touch-marker-instruction').get_attribute("textContent") or "")
        assert "drag" in touch_marker_text.lower() and "look" in touch_marker_text.lower()
        assert "primary" not in touch_marker_text.lower()
        assert not displayed(driver, '.desktop-marker-instruction')
        # Acquire the wall from the running renderer so this touch regression is
        # topology-independent. A small drag must still sample a second point.
        touch_drag(driver, '[data-touch="look"]', 24, 0, steps=1)
        marked_save = wait_for(driver, lambda current: (save if (save := read_save(current)) and len(save.get("marks", [])) >= 1 else False), timeout=12, message="persisted touch marker stroke")
        report["persistedMarks"] = len(marked_save.get("marks", []))
        checks.append("Marker arms from the mobile action and a raw Look touch gesture persists a SurfaceMark against current Generation 3 geometry")

        click_button(driver, '[data-action="touch-interact"]')
        click_button(driver, '[data-action="touch-use"]')
        time.sleep(0.3)
        checks.append("Interact and Use remain operable after the expanded mobile controls")

        final_save = wait_for(driver, lambda current: read_save(current), timeout=10, message="final schema-v2 save")
        assert final_save.get("version") == 2
        assert final_save.get("seed") == "threshold-001"
        assert driver.execute_script("return document.pointerLockElement === null") is True
        checks.append("expanded mobile controls preserve save schema v2 and the deterministic world seed")

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
