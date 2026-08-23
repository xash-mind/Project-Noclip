from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_GAMEPLAY_ARTIFACTS", "artifacts/gameplay-functional"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 25, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).is_displayed()
    except Exception:
        return False


def click(driver: webdriver.Chrome, selector: str) -> None:
    element = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, selector), message=selector)
    wait_for(driver, lambda _current: element.is_displayed() and element.is_enabled(), message=f"clickable {selector}")
    element.click()


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({error:String(request.error)});
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) { db.close(); done(null); return; }
          const read = db.transaction('journey','readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done({error:String(read.error)}); };
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) and "error" not in value else None


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for argument in (
        "--headless=new",
        "--window-size=1440,900",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--disable-dev-shm-usage",
        "--no-sandbox",
    ):
        options.add_argument(argument)
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    return webdriver.Chrome(options=options)


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "checks": []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(30)
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="title screen")
        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="Character Creator")
        driver.execute_script(
            """
            const input=document.querySelector('[data-character="name"]');
            if(!input) throw new Error('Missing Character Creator name input');
            input.value='Verification';
            input.dispatchEvent(new Event('input',{bubbles:true}));
            """
        )
        click(driver, '[data-action="character-begin"]')
        wait_for(
            driver,
            lambda current: not displayed(current, '[data-ui="character-creator"]') and displayed(current, '[data-ui="hud"]'),
            timeout=35,
            message="Level 0 HUD after Begin Journey",
        )
        save = wait_for(driver, lambda current: read_save(current), timeout=20, message="Journey save")
        assert save.get("version") == 2, save
        assert save.get("seed"), save
        character_id = save.get("characterId")
        assert character_id, save
        report["checks"].append("New Game -> Character Creator -> Begin Journey -> Level 0")
        driver.save_screenshot(str(ARTIFACT_DIR / "level0.png"))

        driver.refresh()
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="title after refresh")
        click(driver, '[data-action="continue"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="hud"]'), timeout=35, message="continued Level 0 HUD")
        continued = wait_for(driver, lambda current: read_save(current), timeout=15, message="continued Journey save")
        assert continued.get("characterId") == character_id, (character_id, continued)
        report["checks"].append("refresh -> Continue preserves Journey identity")

        severe = [
            entry for entry in driver.get_log("browser")
            if entry.get("level") == "SEVERE" and "favicon.ico" not in entry.get("message", "")
        ]
        assert not severe, severe
        report["browserErrors"] = severe
    finally:
        driver.quit()

    (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
