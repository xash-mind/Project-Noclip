from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_INVENTORY_ARTIFACTS", "artifacts/inventory-ui-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
FALLBACK_KEY = "project-noclip-save-v2"
CHARACTER_ID = "inventory-ui-smoke-character"
NOTE_A = "item-inventory-ui-note-a"
NOTE_B = "item-inventory-ui-note-b"
FLASHLIGHT = "item-inventory-ui-flashlight"


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 25.0, message: str = "condition") -> Any:
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
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    return options


def build_driver(mobile: bool) -> webdriver.Chrome:
    width, height = (900, 450) if mobile else (1440, 900)
    driver = webdriver.Chrome(options=chrome_options(width, height))
    if mobile:
        driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 2, "mobile": True, "screenWidth": width, "screenHeight": height, "positionX": 0, "positionY": 0})
        driver.execute_cdp_cmd("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": [{"name": "pointer", "value": "coarse"}, {"name": "hover", "value": "none"}]})
    return driver


def item(instance_id: str, definition_id: str, quantity: int, charge: float | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {
        "instanceId": instance_id,
        "definitionId": definition_id,
        "condition": 1,
        "quantity": quantity,
        "owner": {"type": "character", "id": CHARACTER_ID},
        "origin": {"type": "starter", "sourceId": f"smoke:{instance_id}", "createdAt": 1000},
        "revision": 1,
    }
    if charge is not None:
        value["charge"] = charge
    return value


def seed_save() -> dict[str, Any]:
    return {
        "version": 2,
        "characterId": CHARACTER_ID,
        "seed": "threshold-001",
        "generationVersion": "gen3-v1",
        "createdAt": 1000,
        "starterRolled": True,
        "position": {"x": 0, "y": 1.65, "z": 0, "yaw": 0, "pitch": 0},
        "inventory": [item(NOTE_A, "paper-note", 1), item(NOTE_B, "paper-note", 3), item(FLASHLIGHT, "flashlight", 1, 0.62)],
        "selectedItemId": NOTE_A,
        "droppedItems": [],
        "pickedLootNodeIds": [],
        "marks": [],
        "hydration": 0.76,
        "exposure": {"novelUnits": 0, "repeatedUnits": 0, "stableSeconds": 0, "traversedEdges": {}},
        "shiftEpochs": {},
        "unloadCounts": {},
        "discoveredExits": [],
        "readNoteIds": [],
        "enteredZoneIds": [],
        "enteredRegionIds": ["ordinary-level-0"],
        "settings": {"sensitivity": 0.095, "reducedMotion": False, "reducedFlicker": False, "masterVolume": 0},
        "savedAt": 1000,
    }


def displayed(driver: webdriver.Chrome, selector: str) -> bool:
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).is_displayed()
    except Exception:
        return False


def click(driver: webdriver.Chrome, selector: str) -> None:
    element = driver.find_element(By.CSS_SELECTOR, selector)
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", element)
    element.click()


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done(null);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('journey')) { db.close(); done(null); return; }
          const read = db.transaction('journey', 'readonly').objectStore('journey').get('local-character');
          read.onerror = () => { db.close(); done(null); };
          read.onsuccess = () => { const result = read.result ?? null; db.close(); done(result); };
        };
        """
    )
    return value if isinstance(value, dict) else None


def load_known_inventory(driver: webdriver.Chrome) -> None:
    driver.get(BASE_URL)
    wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="title screen")
    driver.execute_async_script(
        """
        const done = arguments[0];
        const request = indexedDB.deleteDatabase('project-noclip');
        request.onsuccess = () => done(true);
        request.onerror = () => done(false);
        request.onblocked = () => done(false);
        """
    )
    driver.execute_script("localStorage.setItem(arguments[0], arguments[1]);", FALLBACK_KEY, json.dumps(seed_save()))
    driver.refresh()
    wait_for(driver, lambda current: not current.find_element(By.CSS_SELECTOR, '[data-action="continue"]').get_attribute("disabled"), message="Continue availability")
    click(driver, '[data-action="continue"]')
    wait_for(driver, lambda current: not current.find_element(By.CSS_SELECTOR, '[data-ui="hud"]').get_attribute("hidden"), timeout=40, message="Level 0 HUD")


def control_size(driver: webdriver.Chrome, selector: str) -> tuple[float, float]:
    element = driver.find_element(By.CSS_SELECTOR, selector)
    rect = driver.execute_script("const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};", element)
    return float(rect["width"]), float(rect["height"])


def assert_floor(driver: webdriver.Chrome, selector: str) -> None:
    width, height = control_size(driver, selector)
    assert width >= 44 and height >= 44, f"{selector} measured {width}x{height}, expected >=44x44"


def grid_item(instance_id: str) -> str:
    return f'[data-ui="inventory-grid"] [data-item-instance-id="{instance_id}"]'


def open_inventory(driver: webdriver.Chrome, mobile: bool) -> None:
    if mobile:
        click(driver, '[data-action="touch-inventory"]')
    else:
        # Desktop gameplay normally owns pointer lock. Exercise the real keyboard
        # contract instead of synthesizing a pointer click through pointer lock.
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.I)
    wait_for(driver, lambda current: displayed(current, '[data-ui="inventory-overlay"]'), message=f"{'mobile' if mobile else 'desktop'} inventory overlay")


def inventory_journey(mobile: bool, report: dict[str, Any]) -> None:
    driver = build_driver(mobile)
    driver.set_script_timeout(25)
    label = "mobile" if mobile else "desktop"
    checks: list[str] = report[label]
    try:
        load_known_inventory(driver)
        opener = '[data-action="touch-inventory"]' if mobile else '[data-action="open-inventory"]'
        assert_floor(driver, opener)
        open_inventory(driver, mobile)
        assert_floor(driver, '[data-action="close-inventory"]')
        assert_floor(driver, grid_item(NOTE_A))
        assert_floor(driver, grid_item(NOTE_B))
        keys = driver.execute_script("return [...document.querySelectorAll('[data-ui=inventory-grid] [data-item-instance-id]')].map(el=>el.dataset.uiKey);")
        assert NOTE_A in keys and NOTE_B in keys and NOTE_A != NOTE_B
        assert driver.find_element(By.CSS_SELECTOR, f'{grid_item(NOTE_B)} .inventory-quantity').get_attribute("textContent") == "×3"
        checks.append("distinct same-Definition Item Instances render with instance-keyed slots and stack quantity")

        click(driver, grid_item(NOTE_B))
        wait_for(driver, lambda current: NOTE_B in current.find_element(By.CSS_SELECTOR, '[data-ui="inventory-detail"]').get_attribute("textContent"), message="selected instance detail")
        assert_floor(driver, '[data-action="inventory-move-earlier"]')
        assert_floor(driver, '[data-action="inventory-move-later"]')
        click(driver, '[data-action="inventory-move-earlier"]')
        persisted = wait_for(
            driver,
            lambda current: (lambda save: save if isinstance(save, dict) and [entry.get("instanceId") for entry in save.get("inventory", [])][:2] == [NOTE_B, NOTE_A] else False)(read_save(current)),
            message="persisted inventory reorder",
        )
        assert persisted.get("selectedItemId") == NOTE_B
        checks.append("button reorder preserves selection and persists exact Item Instance order")

        viewport = driver.execute_script("return {innerWidth:window.innerWidth, scrollWidth:document.documentElement.scrollWidth};")
        assert viewport["scrollWidth"] <= viewport["innerWidth"], f"horizontal overflow: {viewport}"
        driver.save_screenshot(str(ARTIFACT_DIR / f"{label}-inventory.png"))
        click(driver, '[data-action="close-inventory"]')
        wait_for(driver, lambda current: not displayed(current, '[data-ui="inventory-overlay"]'), message="inventory close")
        checks.append("Inventory closes without horizontal overflow and all intended controls meet the 44px floor")

        driver.refresh()
        wait_for(driver, lambda current: not current.find_element(By.CSS_SELECTOR, '[data-action="continue"]').get_attribute("disabled"), message="Continue after reload")
        click(driver, '[data-action="continue"]')
        wait_for(driver, lambda current: not current.find_element(By.CSS_SELECTOR, '[data-ui="hud"]').get_attribute("hidden"), timeout=40, message="continued Level 0")
        open_inventory(driver, mobile)
        restored_keys = driver.execute_script("return [...document.querySelectorAll('[data-ui=inventory-grid] [data-item-instance-id]')].map(el=>el.dataset.itemInstanceId);")
        assert restored_keys[:2] == [NOTE_B, NOTE_A]
        selected = driver.find_element(By.CSS_SELECTOR, '[data-ui="inventory-grid"] .inventory-grid-slot.selected').get_attribute("data-item-instance-id")
        assert selected == NOTE_B
        checks.append("reload/Continue restores reordered Item Instance identity and selected instance")
    finally:
        driver.quit()


def main() -> None:
    report: dict[str, Any] = {"desktop": [], "mobile": []}
    inventory_journey(False, report)
    inventory_journey(True, report)
    (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
