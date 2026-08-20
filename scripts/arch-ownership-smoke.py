from __future__ import annotations

import base64
import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_ARCH_OWNERSHIP_ARTIFACTS", "artifacts/arch-ownership"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 30, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1200,720")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-webgl")
    options.add_argument("--ignore-gpu-blocklist")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(60)
    return driver


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def scene_only(driver: webdriver.Chrome) -> None:
    driver.execute_script("""
      if (document.querySelector('#arch-ownership-smoke-style')) return;
      const style=document.createElement('style');
      style.id='arch-ownership-smoke-style';
      style.textContent='[data-ui="hud"] > :not(canvas), .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; }';
      document.head.appendChild(style);
    """)


def capture_canvas(driver: webdriver.Chrome, path: Path) -> None:
    value = driver.execute_async_script("""
      const done = arguments[0];
      const canvas = document.querySelector('#game-canvas');
      if (!canvas) { done({error:'missing #game-canvas'}); return; }
      requestAnimationFrame(() => {
        try {
          canvas.toBlob((blob) => {
            if (!blob) { done({error:'canvas.toBlob returned null'}); return; }
            const reader = new FileReader();
            reader.onerror = () => done({error:String(reader.error)});
            reader.onload = () => done(String(reader.result));
            reader.readAsDataURL(blob);
          }, 'image/png');
        } catch (error) { done({error:String(error)}); }
      });
    """)
    if isinstance(value, dict):
        raise AssertionError(value.get("error", value))
    if not isinstance(value, str) or "," not in value:
        raise AssertionError("WebGL canvas capture did not return a PNG data URL")
    header, encoded = value.split(",", 1)
    if "image/png" not in header:
        raise AssertionError(f"Unexpected canvas capture header: {header}")
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f"WebGL canvas capture was unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def configure_lab(driver: webdriver.Chrome) -> None:
    result = driver.execute_script("""
      const set=(selector,value)=>{
        const element=document.querySelector(selector);
        if(!element)return false;
        if(element.type==='checkbox')element.checked=value;else element.value=value;
        element.dispatchEvent(new Event('change',{bubbles:true}));
        return true;
      };
      return {
        bypass:set('[data-lab="bypass"]',true),
        radius:set('[data-lab="radius"]','1'),
        condition:set('[data-lab="condition"]','clear'),
        carver:set('[data-lab="carver"]','none'),
        structure:set('[data-lab="structure"]','none')
      };
    """)
    if not all(result.values()):
        raise AssertionError(f"World Lab controls missing: {result}")


def qa_locate(driver: webdriver.Chrome, region: str, depth: str) -> str:
    result = driver.execute_async_script("""
      const region=arguments[0], depth=arguments[1], done=arguments[2], qa=window.__projectNoclipQa;
      if(!qa){done({error:'missing __projectNoclipQa'});return;}
      Promise.resolve(qa.locate(region,depth)).then((message)=>done({message})).catch((error)=>done({error:String(error)}));
    """, region, depth)
    if result.get("error"):
        raise AssertionError(result["error"])
    if not result.get("message"):
        raise AssertionError(f"Could not locate {region}/{depth}")
    return str(result["message"])


def qa_call(driver: webdriver.Chrome, method: str) -> dict[str, Any] | None:
    return driver.execute_script("return window.__projectNoclipQa?.[arguments[0]]?.() ?? null;", method)


def qa_snapshot(driver: webdriver.Chrome) -> dict[str, Any] | None:
    return driver.execute_script("return window.__projectNoclipQa?.snapshot?.() ?? null;")


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "cycles": [], "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey").click()
        wait_for(
            driver,
            lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"),
            timeout=35,
            message="journey HUD",
        )
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="runtime QA bridge")
        configure_lab(driver)
        scene_only(driver)

        for cycle in range(3):
            # Leave Arch territory first so each pass exercises the same locate ->
            # stream -> first-visible-frame lifecycle that exposed the physical defect.
            ordinary_message = qa_locate(driver, "ordinary-level-0", "nearest")
            arch_message = qa_locate(driver, "arch-rooms", "core")
            overview = qa_call(driver, "placeAtArchOverview")
            if not overview:
                raise AssertionError(f"Could not resolve Arch overview on cycle {cycle}")

            immediate_name = f"arch-teleport-{cycle}-immediate.png"
            early_name = f"arch-teleport-{cycle}-early.png"
            settled_name = f"arch-teleport-{cycle}-settled.png"
            capture_canvas(driver, ARTIFACT_DIR / immediate_name)
            immediate_snapshot = qa_snapshot(driver)
            time.sleep(0.15)
            capture_canvas(driver, ARTIFACT_DIR / early_name)
            early_snapshot = qa_snapshot(driver)
            time.sleep(1.35)
            capture_canvas(driver, ARTIFACT_DIR / settled_name)
            settled_snapshot = qa_snapshot(driver)

            # The same resolved overview must remain the observation anchor; camera
            # motion would make visual lifecycle evidence ambiguous.
            for label, snapshot in (("immediate", immediate_snapshot), ("early", early_snapshot), ("settled", settled_snapshot)):
                if not snapshot:
                    raise AssertionError(f"Missing {label} QA snapshot on cycle {cycle}")
            if abs(float(immediate_snapshot["x"]) - float(settled_snapshot["x"])) > 0.01 or abs(float(immediate_snapshot["z"]) - float(settled_snapshot["z"])) > 0.01:
                raise AssertionError(f"Arch lifecycle capture moved observation point on cycle {cycle}: {immediate_snapshot} -> {settled_snapshot}")

            decorative = qa_call(driver, "placeAtDecorativeArch")
            decorative_name = f"arch-teleport-{cycle}-decorative.png"
            if decorative:
                time.sleep(0.25)
                capture_canvas(driver, ARTIFACT_DIR / decorative_name)

            route = qa_call(driver, "placeAtArchRoute")
            if not route:
                raise AssertionError(f"No runtime-clear Arch route after settle on cycle {cycle}")

            errors = severe_errors(driver)
            report["browserErrors"].extend(errors)
            report["cycles"].append({
                "cycle": cycle,
                "ordinaryLocate": ordinary_message,
                "archLocate": arch_message,
                "overview": overview,
                "route": route,
                "immediate": {"file": immediate_name, "snapshot": immediate_snapshot},
                "early": {"file": early_name, "snapshot": early_snapshot},
                "settled": {"file": settled_name, "snapshot": settled_snapshot},
                "decorative": {"file": decorative_name, "evidence": decorative} if decorative else None,
            })

        if report["browserErrors"]:
            raise AssertionError(report["browserErrors"])
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
