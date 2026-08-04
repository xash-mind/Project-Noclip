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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_BROWSER_ARTIFACTS", "artifacts/browser-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(
    driver: webdriver.Chrome,
    predicate: Callable[[webdriver.Chrome], Any],
    timeout: float = 20.0,
    message: str = "condition",
) -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def text_content(driver: webdriver.Chrome, selector: str) -> str:
    return str(
        driver.execute_script(
            "const element = document.querySelector(arguments[0]); return element ? element.textContent || '' : '';",
            selector,
        )
        or ""
    )


def wait_for_text(
    driver: webdriver.Chrome,
    selector: str,
    required_fragments: tuple[str, ...],
    timeout: float = 20.0,
    message: str = "text content",
) -> str:
    def predicate(current: webdriver.Chrome) -> str | bool:
        value = text_content(current, selector)
        return value if all(fragment in value for fragment in required_fragments) else False

    return str(wait_for(driver, predicate, timeout=timeout, message=message))


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
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
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) else None


def browser_log_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored_fragments = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry
        for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored_fragments)
    ]


def screenshot(driver: webdriver.Chrome, name: str) -> None:
    driver.save_screenshot(str(ARTIFACT_DIR / name))


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


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "checks": [], "warnings": [], "browser": {}}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(20)

    try:
        report["browser"] = {
            "userAgent": driver.execute_script("return navigator.userAgent"),
            "chromeDriver": driver.capabilities.get("chrome", {}).get("chromedriverVersion"),
        }

        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.execute_script("return document.readyState") == "complete", message="document load")
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey action")
        assert "Begin new local journey" in str(new_button.get_attribute("textContent"))
        report["checks"].append("title screen and new-journey action rendered")
        screenshot(driver, "01-title.png")

        new_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=30,
            message="Level 0 HUD",
        )
        time.sleep(2)

        canvas = driver.find_element(By.CSS_SELECTOR, "#game-canvas")
        assert canvas.size["width"] > 0 and canvas.size["height"] > 0
        assert driver.execute_script(
            "const canvas = document.querySelector('#game-canvas'); return Boolean(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')));"
        ), "No WebGL context was available after journey startup"

        watch_text = wait_for_text(
            driver,
            '[data-ui="watch"]',
            ("PROJECT NOCLIP", "LEVEL 0"),
            timeout=15,
            message="timeline watch content",
        )
        report["watch"] = watch_text
        inventory_slots = driver.find_elements(By.CSS_SELECTOR, '[data-ui="inventory"] .slot')
        assert len(inventory_slots) == 6
        report["checks"].append("new journey launched with WebGL, HUD, watch and six inventory slots")
        screenshot(driver, "02-journey.png")

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
            report["checks"].append("headless Chromium granted pointer lock to the game canvas")
        except AssertionError:
            report["warnings"].append("Headless Chromium did not grant pointer lock; manual pointer-lock coverage remains required.")

        if pointer_locked:
            driver.execute_script(
                "window.dispatchEvent(new KeyboardEvent('keydown', {key: 'w', code: 'KeyW', bubbles: true}));"
            )
            time.sleep(0.9)
            driver.execute_script(
                "window.dispatchEvent(new KeyboardEvent('keyup', {key: 'w', code: 'KeyW', bubbles: true}));"
            )
            time.sleep(2.2)
            moved_save = read_save(driver)
            if moved_save and moved_save.get("characterId") == character_id:
                moved_position = moved_save.get("position") or {}
                distance = (
                    (float(moved_position.get("x", 0)) - float(initial_position.get("x", 0))) ** 2
                    + (float(moved_position.get("z", 0)) - float(initial_position.get("z", 0))) ** 2
                ) ** 0.5
                if distance > 0.05:
                    report["checks"].append(f"synthetic KeyW movement persisted ({distance:.2f} m)")
                else:
                    report["warnings"].append(
                        "Headless synthetic KeyW did not move the player; native keyboard movement remains a manual regression check."
                    )

        driver.execute_script(
            "window.dispatchEvent(new KeyboardEvent('keydown', {key: '`', code: 'Backquote', bubbles: true}));"
        )
        wait_for(
            driver,
            lambda current: "visible" in current.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute("class").split(),
            message="World Lab",
        )
        metrics_text = wait_for_text(
            driver,
            '[data-ui="metrics"]',
            ("loaded cells", "draw calls", "position"),
            timeout=15,
            message="World Lab metrics",
        )
        report["metrics"] = metrics_text
        report["checks"].append("World Lab exposed loaded-cell, draw-call and position diagnostics")
        screenshot(driver, "03-world-lab.png")

        driver.refresh()
        continue_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="continue"]'), message="continue action after refresh")
        wait_for(driver, lambda _current: not continue_button.get_attribute("disabled"), timeout=15, message="saved journey availability")
        continue_button.click()
        wait_for(
            driver,
            lambda current: current.execute_script(
                "return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"
            ),
            timeout=30,
            message="continued journey HUD",
        )
        wait_for_text(driver, '[data-ui="watch"]', ("PROJECT NOCLIP", "LEVEL 0"), timeout=15, message="continued timeline watch")
        continued_save = wait_for(driver, lambda current: read_save(current), timeout=15, message="continued IndexedDB save")
        assert continued_save.get("characterId") == character_id
        assert continued_save.get("seed") == "threshold-001"
        report["checks"].append("direct refresh exposed Continue and restored the same journey")
        screenshot(driver, "04-continued.png")

        report["memory"] = driver.execute_script(
            "return performance.memory ? {usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit} : null"
        )
        errors = browser_log_errors(driver)
        report["browserErrors"] = errors
        assert not errors, f"Blocking browser console errors: {errors}"
        report["checks"].append("no blocking browser-console errors were recorded")
    except Exception as error:
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            screenshot(driver, "failure.png")
            report["browserErrors"] = browser_log_errors(driver)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
