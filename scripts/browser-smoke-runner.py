from __future__ import annotations

import importlib.util
import sys
import time
from pathlib import Path
from types import ModuleType
from typing import Any

SCRIPT = Path(__file__).with_name("browser-smoke-ci.py")
spec = importlib.util.spec_from_file_location("project_noclip_browser_smoke", SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load {SCRIPT}")
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class NativeChromeActions:
    """Minimal ActionChains-compatible adapter using Chrome DevTools key events."""

    def __init__(self, driver: Any) -> None:
        self.driver = driver
        self.duration = 0.0

    def key_down(self, key: str) -> "NativeChromeActions":
        if key.lower() != "w":
            raise ValueError(f"Unsupported smoke-test key: {key}")
        self.driver.execute_cdp_cmd(
            "Input.dispatchKeyEvent",
            {
                "type": "keyDown",
                "key": "w",
                "code": "KeyW",
                "text": "w",
                "unmodifiedText": "w",
                "windowsVirtualKeyCode": 87,
                "nativeVirtualKeyCode": 87,
            },
        )
        return self

    def pause(self, seconds: float) -> "NativeChromeActions":
        self.duration = seconds
        return self

    def key_up(self, key: str) -> "NativeChromeActions":
        if key.lower() != "w":
            raise ValueError(f"Unsupported smoke-test key: {key}")
        return self

    def perform(self) -> None:
        time.sleep(self.duration)
        self.driver.execute_cdp_cmd(
            "Input.dispatchKeyEvent",
            {
                "type": "keyUp",
                "key": "w",
                "code": "KeyW",
                "windowsVirtualKeyCode": 87,
                "nativeVirtualKeyCode": 87,
            },
        )


module.ActionChains = NativeChromeActions
module.main()
