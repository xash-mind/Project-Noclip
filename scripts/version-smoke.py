from __future__ import annotations

import os
import shutil
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
EXPECTED_VERSION = os.environ.get("NOCLIP_EXPECTED_VERSION") or Path("VERSION").read_text(encoding="utf-8").strip()
WAIT_SECONDS = float(os.environ.get("NOCLIP_VERSION_WAIT_SECONDS", "30"))
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_VERSION_ARTIFACTS", "artifacts/version-smoke"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,720")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    return webdriver.Chrome(options=options)


def visible_version(driver: webdriver.Chrome) -> str | None:
    try:
        element = WebDriverWait(driver, 8).until(
            lambda current: current.find_element(By.CSS_SELECTOR, '[data-ui="version-indicator"]')
        )
    except TimeoutException:
        return None
    value = (element.get_attribute("textContent") or "").strip()
    return value or None


def main() -> None:
    expected = f"v{EXPECTED_VERSION}"
    deadline = time.monotonic() + WAIT_SECONDS
    last_seen: str | None = None
    driver = build_driver()
    try:
        while time.monotonic() < deadline:
            try:
                driver.get(BASE_URL)
                last_seen = visible_version(driver)
                if last_seen == expected:
                    driver.save_screenshot(str(ARTIFACT_DIR / "version.png"))
                    (ARTIFACT_DIR / "version.txt").write_text(last_seen + "\n", encoding="utf-8")
                    print(f"Verified visible version {last_seen} at {BASE_URL}")
                    return
            except Exception as error:
                last_seen = f"{type(error).__name__}: {error}"
            time.sleep(5)
        raise AssertionError(f"Expected visible version {expected} at {BASE_URL}; last observed {last_seen!r}")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
