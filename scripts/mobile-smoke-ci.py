from __future__ import annotations

import importlib.util
import math
from pathlib import Path
from typing import Any

from selenium.webdriver.remote.command import Command

SOURCE = Path(__file__).with_name("mobile-smoke.py")
spec = importlib.util.spec_from_file_location("noclip_mobile_smoke", SOURCE)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load {SOURCE}")
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def hit_point(driver: Any, selector: str) -> dict[str, float] | None:
    value = driver.execute_script(
        """
        const element = document.querySelector(arguments[0]);
        if (!element) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;
        const fractions = [
          [0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75],
          [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]
        ];
        for (const [fx, fy] of fractions) {
          const x = rect.left + rect.width * fx;
          const y = rect.top + rect.height * fy;
          if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          if (hit === element || element.contains(hit)) return {x, y};
        }
        return null;
        """,
        selector,
    )
    if not isinstance(value, dict):
        return None
    return {"x": float(value["x"]), "y": float(value["y"])}


def pointer_move(x: float, y: float, duration: int = 0) -> dict[str, Any]:
    return {"type": "pointerMove", "duration": duration, "x": round(x), "y": round(y), "origin": "viewport"}


def pointer_source(name: str, actions: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "pointer", "id": name, "parameters": {"pointerType": "touch"}, "actions": actions}


def perform_touch_actions(driver: Any, sources: list[dict[str, Any]]) -> None:
    try:
        driver.execute(Command.W3C_ACTIONS, {"actions": sources})
    finally:
        # The sequences below all release their pointers. Clearing afterward also
        # guarantees a failed journey cannot leak a pressed synthetic finger.
        driver.execute(Command.W3C_CLEAR_ACTIONS)


def robust_click_button(driver: Any, selector: str) -> None:
    element = driver.find_element(smoke.By.CSS_SELECTOR, selector)
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", element)
    point = smoke.wait_for(driver, lambda current: hit_point(current, selector), timeout=5, message=f"{selector} usable hit target")
    perform_touch_actions(driver, [pointer_source("tap", [
        pointer_move(point["x"], point["y"]),
        {"type": "pointerDown", "button": 0},
        {"type": "pause", "duration": 90},
        {"type": "pointerUp", "button": 0},
    ])])


def robust_touch_move_until(
    driver: Any,
    selector: str,
    dx: float,
    dy: float,
    start_position: tuple[float, float],
    threshold: float,
    timeout: float,
) -> tuple[float, float]:
    point = smoke.center_point(driver, selector, 1)
    x = float(point["x"]); y = float(point["y"])
    perform_touch_actions(driver, [pointer_source("move-finger", [
        pointer_move(x, y),
        {"type": "pointerDown", "button": 0},
        pointer_move(x + dx, y + dy, 220),
        {"type": "pause", "duration": 850},
        {"type": "pointerUp", "button": 0},
    ])])
    return smoke.wait_for(
        driver,
        lambda current: (
            pos if (pos := smoke.metrics_position(current))
            and math.hypot(pos[0] - start_position[0], pos[1] - start_position[1]) > threshold
            else False
        ),
        timeout=min(timeout, 4),
        message="touch movement through W3C pointer actions",
    )


def robust_touch_sprint_move_until(
    driver: Any,
    start_position: tuple[float, float],
    threshold: float = 0.2,
    timeout: float = 10,
) -> tuple[float, float]:
    sprint = smoke.center_point(driver, '[data-action="touch-sprint"]', 3)
    move = smoke.center_point(driver, '[data-touch="move"]', 4)
    sx = float(sprint["x"]); sy = float(sprint["y"])
    mx = float(move["x"]); my = float(move["y"])
    perform_touch_actions(driver, [
        pointer_source("sprint-finger", [
            pointer_move(sx, sy),
            {"type": "pointerDown", "button": 0},
            {"type": "pause", "duration": 220},
            {"type": "pause", "duration": 850},
            {"type": "pointerUp", "button": 0},
        ]),
        pointer_source("move-finger", [
            pointer_move(mx, my),
            {"type": "pointerDown", "button": 0},
            pointer_move(mx, my - 43, 220),
            {"type": "pause", "duration": 850},
            {"type": "pointerUp", "button": 0},
        ]),
    ])
    position = smoke.wait_for(
        driver,
        lambda current: (
            pos if (pos := smoke.metrics_position(current))
            and math.hypot(pos[0] - start_position[0], pos[1] - start_position[1]) > threshold
            else False
        ),
        timeout=min(timeout, 4),
        message="Sprint plus movement through simultaneous W3C touch pointers",
    )
    smoke.wait_for(
        driver,
        lambda current: current.find_element(smoke.By.CSS_SELECTOR, '[data-action="touch-sprint"]').get_attribute("aria-pressed") == "false",
        timeout=3,
        message="Sprint released state",
    )
    return position


def robust_touch_drag(driver: Any, selector: str, dx: float, dy: float, steps: int = 1) -> None:
    point = smoke.center_point(driver, selector, 2)
    x = float(point["x"]); y = float(point["y"])
    duration = max(180, 70 * max(1, steps))
    perform_touch_actions(driver, [pointer_source("drag-finger", [
        pointer_move(x, y),
        {"type": "pointerDown", "button": 0},
        pointer_move(x + dx, y + dy, duration),
        {"type": "pause", "duration": 80},
        {"type": "pointerUp", "button": 0},
    ])])


def robust_touch_tap(driver: Any, selector: str, pointer_id: int) -> None:
    point = smoke.center_point(driver, selector, pointer_id)
    x = float(point["x"]); y = float(point["y"])
    perform_touch_actions(driver, [pointer_source(f"tap-{pointer_id}", [
        pointer_move(x, y),
        {"type": "pointerDown", "button": 0},
        {"type": "pause", "duration": 80},
        {"type": "pointerUp", "button": 0},
    ])])


# Chrome's DevTools Input.dispatchTouchEvent stream has proven non-deterministic
# on the hosted runner. Keep the original end-to-end assertions, but deliver the
# same touch interactions through Selenium's W3C touch-pointer API, which is the
# WebDriver path intended for virtualized touch input.
smoke.click_button = robust_click_button
smoke.touch_move_until = robust_touch_move_until
smoke.touch_sprint_move_until = robust_touch_sprint_move_until
smoke.touch_drag = robust_touch_drag
smoke.touch_tap = robust_touch_tap
smoke.main()
