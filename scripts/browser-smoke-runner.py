from __future__ import annotations

import importlib.util
import sys
import time
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).with_name("browser-smoke-ci.py")
spec = importlib.util.spec_from_file_location("project_noclip_browser_smoke", SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load {SCRIPT}")
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class WindowKeyActions:
    """Minimal ActionChains-compatible adapter for the game's window key listener."""

    def __init__(self, driver: Any) -> None:
        self.driver = driver
        self.duration = 0.0

    def key_down(self, key: str) -> "WindowKeyActions":
        if key.lower() != "w":
            raise ValueError(f"Unsupported smoke-test key: {key}")
        self.driver.execute_script(
            "window.dispatchEvent(new KeyboardEvent('keydown', {key: 'w', code: 'KeyW', bubbles: true}));"
        )
        return self

    def pause(self, seconds: float) -> "WindowKeyActions":
        self.duration = seconds
        return self

    def key_up(self, key: str) -> "WindowKeyActions":
        if key.lower() != "w":
            raise ValueError(f"Unsupported smoke-test key: {key}")
        return self

    def perform(self) -> None:
        time.sleep(self.duration)
        self.driver.execute_script(
            "window.dispatchEvent(new KeyboardEvent('keyup', {key: 'w', code: 'KeyW', bubbles: true}));"
        )


module.ActionChains = WindowKeyActions
module.main()
