from __future__ import annotations

import importlib.util
import time
from pathlib import Path
from typing import Any

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


def robust_click_button(driver: Any, selector: str) -> None:
    element = driver.find_element(smoke.By.CSS_SELECTOR, selector)
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", element)
    point = smoke.wait_for(driver, lambda current: hit_point(current, selector), timeout=5, message=f"{selector} usable hit target")
    touch = {"x": point["x"], "y": point["y"], "id": 9, "radiusX": 5, "radiusY": 5, "force": 1}
    smoke.touch_event(driver, "touchStart", [touch])
    time.sleep(0.08)
    smoke.touch_event(driver, "touchEnd", [])
    time.sleep(0.08)


def robust_touch_drag(driver: Any, selector: str, dx: float, dy: float, steps: int = 1) -> None:
    point = smoke.center_point(driver, selector, 2)
    x = float(point["x"])
    y = float(point["y"])
    move_steps = max(3, steps)
    smoke.touch_event(driver, "touchStart", [point])
    time.sleep(0.08)
    for index in range(1, move_steps + 1):
        smoke.touch_event(
            driver,
            "touchMove",
            [{**point, "x": x + dx * index / move_steps, "y": y + dy * index / move_steps}],
        )
        time.sleep(0.06)
    smoke.touch_event(driver, "touchEnd", [])
    time.sleep(0.08)


# Keep every original assertion and end-to-end journey intact. Only make the
# emulated input delivery resemble a real finger more closely: a usable point
# anywhere inside a button is valid, and drags have a short press plus several
# move frames instead of a same-tick start/move/end burst.
smoke.click_button = robust_click_button
smoke.touch_drag = robust_touch_drag
smoke.main()
