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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_DEV6_FLASHLIGHT_ARTIFACTS", "artifacts/dev6-flashlight"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
FIXED_FLASHLIGHT_NOW = 1_700_000_000_014


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 30, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def driver_for_webgl() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1200,720")
    options.add_argument("--use-angle=swiftshader")
    options.add_argument("--enable-webgl")
    options.add_argument("--ignore-gpu-blocklist")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(30)
    return driver


def capture_canvas(driver: webdriver.Chrome, name: str) -> None:
    value = driver.execute_async_script("""
      const done=arguments[0], canvas=document.querySelector('#game-canvas');
      if(!canvas){done({error:'missing canvas'});return;}
      requestAnimationFrame(()=>canvas.toBlob((blob)=>{
        if(!blob){done({error:'canvas.toBlob returned null'});return;}
        const reader=new FileReader(); reader.onerror=()=>done({error:String(reader.error)});
        reader.onload=()=>done(String(reader.result)); reader.readAsDataURL(blob);
      },'image/png'));
    """)
    if isinstance(value, dict):
        raise AssertionError(value)
    header, encoded = str(value).split(",", 1)
    if "image/png" not in header:
        raise AssertionError(header)
    (ARTIFACT_DIR / name).write_bytes(base64.b64decode(encoded))


def luminance(driver: webdriver.Chrome) -> dict[str, float]:
    value = driver.execute_async_script("""
      const done=arguments[0], canvas=document.querySelector('#game-canvas');
      if(!canvas){done({error:'missing canvas'});return;}
      requestAnimationFrame(()=>canvas.toBlob(async(blob)=>{
        try {
          if(!blob){done({error:'canvas.toBlob returned null'});return;}
          const bitmap=await createImageBitmap(blob), sample=document.createElement('canvas');
          sample.width=320; sample.height=180;
          const context=sample.getContext('2d',{willReadFrequently:true});
          context.drawImage(bitmap,0,0,320,180); bitmap.close();
          const pixels=context.getImageData(0,0,320,180).data, values=[];
          for(let y=34;y<146;y+=2) for(let x=52;x<268;x+=2){
            const i=(y*320+x)*4;
            values.push(0.2126*pixels[i]+0.7152*pixels[i+1]+0.0722*pixels[i+2]);
          }
          values.sort((a,b)=>a-b);
          const mean=values.reduce((sum,item)=>sum+item,0)/values.length;
          done({mean,p90:values[Math.floor(values.length*0.90)]});
        } catch(error){done({error:String(error)});}
      },'image/png'));
    """)
    if not isinstance(value, dict) or value.get("error"):
        raise AssertionError(value)
    return {"mean": float(value["mean"]), "p90": float(value["p90"])}


def set_condition(driver: webdriver.Chrome, value: str) -> None:
    changed = driver.execute_script("""
      const element=document.querySelector('[data-lab="condition"]');
      if(!element)return false; element.value=arguments[0];
      element.dispatchEvent(new Event('change',{bubbles:true})); return true;
    """, value)
    if not changed:
        raise AssertionError("Missing World Lab condition control")
    time.sleep(1.1)


def toggle_flashlight(driver: webdriver.Chrome) -> None:
    for event_type in ("keyDown", "keyUp"):
        driver.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": event_type, "key": "f", "code": "KeyF", "windowsVirtualKeyCode": 70, "nativeVirtualKeyCode": 70})
    time.sleep(0.7)


def visible_delta(off: dict[str, float], on: dict[str, float]) -> float:
    return max(on["mean"] - off["mean"], on["p90"] - off["p90"])


def main() -> None:
    driver = driver_for_webgl()
    report: dict[str, Any] = {}
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey")
        driver.execute_script("window.__realDateNow=Date.now; Date.now=()=>arguments[0];", FIXED_FLASHLIGHT_NOW)
        driver.find_element(By.CSS_SELECTOR, '[data-action="new"]').click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="journey HUD")
        driver.execute_script("Date.now=window.__realDateNow; delete window.__realDateNow;")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), message="QA bridge")
        inventory = str(driver.execute_script("return document.querySelector('[data-ui=inventory]')?.textContent ?? '';"))
        if "Flashlight" not in inventory:
            raise AssertionError(f"Deterministic starter did not contain Flashlight: {inventory}")
        driver.execute_script("""
          const style=document.createElement('style');
          style.textContent='[data-ui="hud"] > :not(canvas), .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; }';
          document.head.appendChild(style);
        """)

        set_condition(driver, "clear")
        ordinary_off = luminance(driver); capture_canvas(driver, "ordinary-off.png")
        toggle_flashlight(driver)
        ordinary_on = luminance(driver); capture_canvas(driver, "ordinary-on.png")
        ordinary_delta = visible_delta(ordinary_off, ordinary_on)
        if ordinary_delta <= 0.35:
            raise AssertionError(f"Flashlight did not affect ordinary geometry: {ordinary_off} -> {ordinary_on}")
        toggle_flashlight(driver)

        set_condition(driver, "blackout")
        blackout_off = luminance(driver); capture_canvas(driver, "blackout-off.png")
        if blackout_off["p90"] <= 0.4:
            raise AssertionError(f"Blackout collapsed to pitch black: {blackout_off}")
        if blackout_off["mean"] >= ordinary_off["mean"] * 0.90:
            raise AssertionError(f"Blackout is not substantially darker than ordinary Level 0: ordinary={ordinary_off}, blackout={blackout_off}")
        toggle_flashlight(driver)
        blackout_on = luminance(driver); capture_canvas(driver, "blackout-on.png")
        blackout_delta = visible_delta(blackout_off, blackout_on)
        if blackout_delta <= 0.35:
            raise AssertionError(f"Flashlight did not affect Blackout geometry: {blackout_off} -> {blackout_on}")

        report = {
            "ordinary": {"off": ordinary_off, "on": ordinary_on, "delta": ordinary_delta},
            "blackout": {"off": blackout_off, "on": blackout_on, "delta": blackout_delta},
        }
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
