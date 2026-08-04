from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Any

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_BROWSER_ARTIFACTS", "artifacts/browser-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Any, timeout: float = 20.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    return driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({ error: String(request.error) });
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) {
            db.close();
            done(null);
            return;
          }
          const read = db.transaction('journey', 'readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done({ error: String(read.error) }); };
          read.onsuccess = () => { const value = read.result ?? null; db.close(); done(value); };
        };
        """
    )


def browser_log_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    entries = driver.get_log("browser")
    ignored_fragments = (
        "favicon.ico",
        "AudioContext was not allowed to start",
    )
    return [
        entry
        for entry in entries
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored_fragments)
    ]


def save_screenshot(driver: webdriver.Chrome, name: str) -> None:
    driver.save_screenshot(str(ARTIFACT_DIR / name))


def main() -> None:
    report: dict[str, Any] = {
        "baseUrl": BASE_URL,
        "checks": [],
        "warnings": [],
        "browser": {},
    }

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

    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(20)

    try:
        report["browser"] = {
            "userAgent": driver.execute_script("return navigator.userAgent"),
            "chromeBinary": chrome_binary,
        }
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.execute_script("return document.readyState") == "complete", message="document load")
        new_button = wait_for(
            driver,
            lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'),
            message="new journey button",
        )
        assert "Begin new local journey" in new_button.text
        report["checks"].append("title screen and new-journey action rendered")
        save_screenshot(driver, "01-title.png")

        new_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=30,
            message="Level 0 HUD",
        )
        wait_for(driver, lambda current: current.find_elements(By.CSS_SELECTOR, "#game-canvas"), message="PlayCanvas canvas")
        time.sleep(4)

        canvas = driver.find_element(By.CSS_SELECTOR, "#game-canvas")
        canvas_size = canvas.size
        assert canvas_size["width"] > 0 and canvas_size["height"] > 0
        webgl_available = driver.execute_script(
            """
            const canvas = document.querySelector('#game-canvas');
            return Boolean(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
            """
        )
        assert webgl_available, "No WebGL context was available after journey startup"
        watch_text = driver.find_element(By.CSS_SELECTOR, '[data-ui="watch"]').text
        assert "PROJECT NOCLIP" in watch_text and "LEVEL 0" in watch_text
        inventory_slots = driver.find_elements(By.CSS_SELECTOR, '[data-ui="inventory"] .slot')
        assert len(inventory_slots) == 6
        report["checks"].append("new journey launched with WebGL, HUD, watch and six inventory slots")
        save_screenshot(driver, "02-journey.png")

        initial_save = wait_for(driver, lambda current: read_save(current), timeout=15, message="IndexedDB save creation")
        assert initial_save.get("version") == 2
        assert initial_save.get("seed") == "threshold-001"
        assert initial_save.get("starterRolled") is True
        character_id = initial_save.get("characterId")
        initial_position = dict(initial_save.get("position") or {})
        report["checks"].append("version 2 journey persisted to IndexedDB")

        resume_button = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
        if resume_button.is_displayed():
            resume_button.click()
        pointer_locked = False
        try:
            wait_for(
                driver,
                lambda current: current.execute_script(
                    "return document.pointerLockElement === document.querySelector('#game-canvas')"
                ),
                timeout=7,
                message="pointer lock",
            )
            pointer_locked = True
        except AssertionError:
            report["warnings"].append("Headless Chromium did not grant pointer lock; startup and persistence checks continued.")

        if pointer_locked:
            actions = ActionChains(driver)
            actions.key_down("w").pause(0.9).key_up("w").perform()
            time.sleep(2.2)
            moved_save = read_save(driver)
            assert moved_save and moved_save.get("characterId") == character_id
            moved_position = moved_save.get("position") or {}
            distance = ((float(moved_position.get("x", 0)) - float(initial_position.get("x", 0))) ** 2 + (float(moved_position.get("z", 0)) - float(initial_position.get("z", 0))) ** 2) ** 0.5
            assert distance > 0.05, f"Movement did not persist; distance={distance}"
            report["checks"].append(f"pointer lock and keyboard movement persisted ({distance:.2f} m)")

        driver.execute_script(
            "window.dispatchEvent(new KeyboardEvent('keydown', {key: '`', code: 'Backquote', bubbles: true}));"
        )
        wait_for(
            driver,
            lambda current: "visible" in current.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split(),
            message="World Lab",
        )
        metrics_text = wait_for(
            driver,
            lambda current: current.find_element(By.CSS_SELECTOR, '[data-ui="metrics"]').text,
            message="World Lab metrics",
        )
        assert "loaded cells" in metrics_text and "draw calls" in metrics_text and "position" in metrics_text
        report["metrics"] = metrics_text
        report["checks"].append("World Lab exposed loaded-cell, draw-call and position diagnostics")
        save_screenshot(driver, "03-world-lab.png")

        driver.refresh()
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="continue"]'), message="continue action after refresh")
        continue_button = driver.find_element(By.CSS_SELECTOR, '[data-action="continue"]')
        wait_for(driver, lambda current: not continue_button.get_attribute("disabled"), timeout=15, message="saved journey availability")
        continue_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=30,
            message="continued journey HUD",
        )
        time.sleep(3)
        continued_save = read_save(driver)
        assert continued_save and continued_save.get("characterId") == character_id
        assert continued_save.get("seed") == "threshold-001"
        report["checks"].append("direct refresh exposed Continue and restored the same journey")
        save_screenshot(driver, "04-continued.png")

        memory = driver.execute_script(
            "return performance.memory ? {usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit} : null"
        )
        report["memory"] = memory
        errors = browser_log_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser console errors: {errors}"
        report["checks"].append("no blocking browser-console errors were recorded")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            save_screenshot(driver, "failure.png")
            report["browserErrors"] = browser_log_errors(driver)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
