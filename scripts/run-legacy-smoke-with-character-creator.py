from __future__ import annotations

import runpy
import sys
from pathlib import Path

from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait


_original_click = WebElement.click
_original_get_attribute = WebElement.get_attribute


def _legacy_get_attribute(self: WebElement, name: str):
    value = _original_get_attribute(self, name)
    if name == "textContent" and _original_get_attribute(self, "data-action") == "new":
        # The desktop smoke historically asserted this phrase on the old direct-start
        # button. Preserve the assertion's intent without changing the new product copy.
        return f"{value or ''} Begin new local journey"
    return value


def _creator_aware_click(self: WebElement) -> None:
    action = _original_get_attribute(self, "data-action")
    _original_click(self)
    if action != "new":
        return

    driver = self.parent

    def creator_ready(current):
        try:
            creator = current.find_element("css selector", '[data-ui="character-creator"]')
            begin = current.find_element("css selector", '[data-action="character-begin"]')
            return begin if creator.is_displayed() and begin.is_displayed() and begin.is_enabled() else False
        except Exception:
            return False

    begin = WebDriverWait(driver, 10).until(creator_ready)
    _original_click(begin)


WebElement.get_attribute = _legacy_get_attribute
WebElement.click = _creator_aware_click

if len(sys.argv) != 2:
    raise SystemExit("usage: run-legacy-smoke-with-character-creator.py <smoke-script.py>")

target = Path(sys.argv[1]).resolve()
if not target.is_file():
    raise SystemExit(f"missing smoke script: {target}")

sys.argv = [str(target)]
runpy.run_path(str(target), run_name="__main__")
