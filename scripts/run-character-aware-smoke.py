from __future__ import annotations

import runpy
import sys
from pathlib import Path

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait


_original_click = WebElement.click
_original_get_attribute = WebElement.get_attribute
_original_execute_script = WebDriver.execute_script


def _complete_character_creator(driver: WebDriver) -> None:
    def creator_ready(current: WebDriver):
        try:
            creator = current.find_element("css selector", '[data-ui="character-creator"]')
            begin = current.find_element("css selector", '[data-action="character-begin"]')
            return begin if creator.is_displayed() and begin.is_displayed() and begin.is_enabled() else False
        except Exception:
            return False

    begin = WebDriverWait(driver, 12).until(creator_ready)
    _original_click(begin)


def _character_aware_click(self: WebElement) -> None:
    action = _original_get_attribute(self, "data-action")
    _original_click(self)
    if action == "new":
        _complete_character_creator(self.parent)


def _character_aware_execute_script(self: WebDriver, script: str, *args):
    action = None
    if args and isinstance(args[0], WebElement):
        try:
            action = _original_get_attribute(args[0], "data-action")
        except Exception:
            action = None

    result = _original_execute_script(self, script, *args)
    if action == "new" and "arguments[0].click()" in "".join(script.split()):
        _complete_character_creator(self)
    return result


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: run-character-aware-smoke.py <smoke-script.py>")
    target = Path(sys.argv[1]).resolve()
    if not target.is_file():
        raise SystemExit(f"missing smoke script: {target}")

    WebElement.click = _character_aware_click
    WebDriver.execute_script = _character_aware_execute_script
    try:
        sys.argv = [str(target)]
        runpy.run_path(str(target), run_name="__main__")
    finally:
        WebElement.click = _original_click
        WebDriver.execute_script = _original_execute_script


if __name__ == "__main__":
    main()
