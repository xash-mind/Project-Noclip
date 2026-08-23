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
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_CHARACTER_ARTIFACTS", "artifacts/character-creator-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_KEY = "project-noclip-player-profiles-v1"


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 20.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def chrome_options(width: int, height: int) -> webdriver.ChromeOptions:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument(f"--window-size={width},{height}")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-webgl")
    options.add_argument("--ignore-gpu-blocklist")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    return options


def build_desktop_driver() -> webdriver.Chrome:
    return webdriver.Chrome(options=chrome_options(1440, 900))


def build_mobile_driver() -> webdriver.Chrome:
    driver = webdriver.Chrome(options=chrome_options(900, 450))
    driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width": 900, "height": 450, "deviceScaleFactor": 2, "mobile": True, "screenWidth": 900, "screenHeight": 450, "positionX": 0, "positionY": 0})
    driver.execute_cdp_cmd("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": [{"name": "pointer", "value": "coarse"}, {"name": "hover", "value": "none"}]})
    return driver


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).is_displayed()
    except Exception:
        return False


def click(driver: webdriver.Chrome, selector: str) -> None:
    element = driver.find_element(By.CSS_SELECTOR, selector)
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", element)
    element.click()


def set_value(driver: webdriver.Chrome, selector: str, value: str) -> None:
    driver.execute_script(
        """
        const element = document.querySelector(arguments[0]);
        if (!element) throw new Error(`Missing ${arguments[0]}`);
        element.value = arguments[1];
        element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
        """,
        selector,
        value,
    )


def read_profile_store(driver: webdriver.Chrome) -> dict[str, Any] | None:
    raw = driver.execute_script("return localStorage.getItem(arguments[0]);", PROFILE_KEY)
    if not isinstance(raw, str) or not raw:
        return None
    value = json.loads(raw)
    return value if isinstance(value, dict) else None


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({error:String(request.error)});
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) { db.close(); done(null); return; }
          const read = db.transaction('journey', 'readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done({error:String(read.error)}); };
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) and "error" not in value else None


def clear_local_state(driver: webdriver.Chrome) -> None:
    driver.execute_script("localStorage.removeItem(arguments[0]);", PROFILE_KEY)
    driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.deleteDatabase('project-noclip');
        request.onsuccess = () => done(true);
        request.onerror = () => done(false);
        request.onblocked = () => done(false);
        """
    )


def active_profile(store: dict[str, Any]) -> dict[str, Any]:
    profile_id = store.get("activeProfileId")
    profiles = store.get("profiles") or {}
    profile = profiles.get(profile_id) if isinstance(profiles, dict) else None
    if not isinstance(profile_id, str) or not isinstance(profile, dict):
        raise AssertionError(f"Invalid active profile envelope: {store}")
    assert profile.get("profileId") == profile_id
    return profile


def desktop_journey(report: dict[str, Any]) -> None:
    driver = build_desktop_driver()
    driver.set_script_timeout(20)
    checks: list[str] = report["desktopChecks"]
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="title New Game action")
        clear_local_state(driver)
        driver.refresh()
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="clean title screen")
        driver.save_screenshot(str(ARTIFACT_DIR / "01-title.png"))

        assert read_save(driver) is None
        assert read_profile_store(driver) is None
        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="Character Creator")
        assert not displayed(driver, '[data-ui="title"]')
        assert read_save(driver) is None, "Opening Character Creator created a Journey"
        assert read_profile_store(driver) is None, "Opening Character Creator persisted a profile"
        checks.append("New Game opens Character Creator without creating a Journey or profile")
        driver.save_screenshot(str(ARTIFACT_DIR / "02-creator-default.png"))

        click(driver, '[data-action="character-back"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="Back to title")
        assert read_save(driver) is None
        assert read_profile_store(driver) is None
        checks.append("Back returns to title with no Journey creation")

        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="Character Creator reopened")
        set_value(driver, '[data-character="name"]', "")
        click(driver, '[data-action="character-begin"]')
        error = wait_for(
            driver,
            lambda current: current.find_element(By.CSS_SELECTOR, '[data-character="error"]').get_attribute("textContent") or False,
            message="invalid profile error",
        )
        assert "required" in str(error).lower()
        assert displayed(driver, '[data-ui="character-creator"]')
        assert read_save(driver) is None
        assert read_profile_store(driver) is None
        checks.append("invalid Character Profile cannot persist or begin a Journey")

        values = {
            '[data-character="name"]': "Avery",
            '[data-character="body-frame"]': "solid",
            '[data-character="skin-tone"]': "tone-5",
            '[data-character="hair-preset"]': "tied-back",
            '[data-character="hair-color"]': "auburn",
            '[data-character="upper-clothing"]': "hoodie",
            '[data-character="upper-color"]': "navy",
            '[data-character="lower-clothing"]': "cargo",
            '[data-character="lower-color"]': "olive",
        }
        for selector, value in values.items():
            set_value(driver, selector, value)
        assert driver.find_element(By.CSS_SELECTOR, '[data-character="preview-name"]').get_attribute("textContent") == "Avery"
        assert read_profile_store(driver) is None, "Editing creator values persisted before confirmation"
        driver.save_screenshot(str(ARTIFACT_DIR / "03-creator-modified.png"))

        click(driver, '[data-action="character-begin"]')
        wait_for(
            driver,
            lambda current: not displayed(current, '[data-ui="character-creator"]') and not current.find_element(By.CSS_SELECTOR, '[data-ui="hud"]').get_attribute("hidden"),
            timeout=35,
            message="Level 0 after Begin Journey",
        )
        save = wait_for(driver, lambda current: read_save(current), timeout=20, message="Journey save")
        store = read_profile_store(driver)
        assert isinstance(store, dict)
        profile = active_profile(store)
        assert profile.get("version") == 1
        assert str(profile.get("profileId", "")).startswith("pcp_")
        assert profile.get("displayName") == "Avery"
        appearance = profile.get("appearance") or {}
        assert appearance.get("bodyFrame") == "solid"
        assert appearance.get("skinTone") == "tone-5"
        assert appearance.get("hairPreset") == "tied-back"
        assert appearance.get("hairColor") == "auburn"
        assert appearance.get("upperClothing") == "hoodie"
        assert appearance.get("upperColor") == "navy"
        assert appearance.get("lowerClothing") == "cargo"
        assert appearance.get("lowerColor") == "olive"
        assert save.get("seed") == "threshold-001"
        assert save.get("version") == 2
        assert "profileId" not in save
        profile_id = profile["profileId"]
        journey_character_id = save.get("characterId")
        checks.append("Begin Journey persists the profile, preserves Journey schema v2, and enters the existing Level 0 path")
        driver.save_screenshot(str(ARTIFACT_DIR / "04-level0.png"))

        driver.refresh()
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), timeout=20, message="title after restart")
        store_after_restart = read_profile_store(driver)
        assert isinstance(store_after_restart, dict)
        restored = active_profile(store_after_restart)
        assert restored.get("profileId") == profile_id
        assert restored.get("displayName") == "Avery"
        continue_button = driver.find_element(By.CSS_SELECTOR, '[data-action="continue"]')
        wait_for(driver, lambda current: not current.find_element(By.CSS_SELECTOR, '[data-action="continue"]').get_attribute("disabled"), timeout=15, message="Continue availability")

        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="restored Character Creator")
        assert driver.find_element(By.CSS_SELECTOR, '[data-character="name"]').get_attribute("value") == "Avery"
        assert driver.find_element(By.CSS_SELECTOR, '[data-character="upper-clothing"]').get_attribute("value") == "hoodie"
        assert driver.find_element(By.CSS_SELECTOR, '[data-character="lower-clothing"]').get_attribute("value") == "cargo"
        driver.save_screenshot(str(ARTIFACT_DIR / "05-creator-restored.png"))
        driver.find_element(By.CSS_SELECTOR, '[data-character="name"]').send_keys(Keys.ESCAPE)
        wait_for(driver, lambda current: displayed(current, '[data-ui="title"]'), message="Escape returns to title")
        checks.append("restart restores the stable active profile and Escape/keyboard navigation returns to title")

        click(driver, '[data-action="continue"]')
        wait_for(driver, lambda current: not current.find_element(By.CSS_SELECTOR, '[data-ui="hud"]').get_attribute("hidden"), timeout=35, message="Continue Level 0")
        continued = wait_for(driver, lambda current: read_save(current), timeout=15, message="continued Journey save")
        assert continued.get("seed") == "threshold-001"
        assert continued.get("characterId") == journey_character_id
        checks.append("Continue remains functional and preserves the pre-existing Journey identity")
        driver.save_screenshot(str(ARTIFACT_DIR / "06-continue-level0.png"))

        severe = [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE" and "favicon.ico" not in entry.get("message", "")]
        assert not severe, severe
    finally:
        driver.quit()


def mobile_creator(report: dict[str, Any]) -> None:
    driver = build_mobile_driver()
    checks: list[str] = report["mobileChecks"]
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="mobile title")
        click(driver, '[data-action="new"]')
        wait_for(driver, lambda current: displayed(current, '[data-ui="character-creator"]'), message="mobile Character Creator")
        metrics = driver.execute_script(
            """
            const card = document.querySelector('.character-creator-card');
            const back = document.querySelector('[data-action="character-back"]');
            const begin = document.querySelector('[data-action="character-begin"]');
            const rect = (node) => { const r=node.getBoundingClientRect(); return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
            return {innerWidth, scrollWidth:document.documentElement.scrollWidth, card:rect(card), back:rect(back), begin:rect(begin)};
            """
        )
        assert float(metrics["scrollWidth"]) <= float(metrics["innerWidth"]) + 1, metrics
        for key in ("back", "begin"):
            assert float(metrics[key]["width"]) >= 44 and float(metrics[key]["height"]) >= 44, metrics[key]
        assert displayed(driver, '[data-character="preview"]')
        checks.append("landscape mobile creator fits the viewport horizontally with 44px-plus final actions and visible preview")
        driver.save_screenshot(str(ARTIFACT_DIR / "07-mobile-creator.png"))
    finally:
        driver.quit()


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "desktopChecks": [], "mobileChecks": []}
    desktop_journey(report)
    mobile_creator(report)
    (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
