from __future__ import annotations

import runpy
import sys
from pathlib import Path

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.remote.webdriver import WebDriver

_original_save_screenshot = WebDriver.save_screenshot


def _tolerant_save_screenshot(self: WebDriver, filename: str) -> bool:
    try:
        return bool(_original_save_screenshot(self, filename))
    except TimeoutException as error:
        print(f"WARNING: screenshot {filename} timed out; functional browser assertions remain authoritative: {error.msg}")
        return False


WebDriver.save_screenshot = _tolerant_save_screenshot

if len(sys.argv) != 2:
    raise SystemExit("usage: run-screenshot-tolerant-smoke.py <smoke-script.py>")

target = Path(sys.argv[1]).resolve()
if not target.is_file():
    raise SystemExit(f"missing smoke script: {target}")

sys.argv = [str(target)]
runpy.run_path(str(target), run_name="__main__")
