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
TARGETS_PATH = Path(os.environ.get("NOCLIP_DEV4_TARGETS", "artifacts/dev4-visual/targets.json"))
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_DEV4_VISUAL_ARTIFACTS", "artifacts/dev4-visual"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 25, message: str = "condition") -> Any:
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
    driver.set_script_timeout(40)
    return driver


def read_save(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_async_script("""
        const done = arguments[0];
        const request = indexedDB.open('project-noclip', 2);
        request.onerror = () => done({error:String(request.error)});
        request.onsuccess = () => {
          const db=request.result;
          if(!db.objectStoreNames.contains('journey')){db.close();done(null);return;}
          const read=db.transaction('journey','readonly').objectStore('journey').get('local-character');
          read.onerror=()=>{db.close();done({error:String(read.error)});};
          read.onsuccess=()=>{const result=read.result??null;db.close();done(result);};
        };
    """)
    return value if isinstance(value, dict) else None


def write_save(driver: webdriver.Chrome, save: dict[str, Any]) -> None:
    result = driver.execute_async_script("""
        const save=arguments[0], done=arguments[1];
        const request=indexedDB.open('project-noclip',2);
        request.onerror=()=>done(String(request.error));
        request.onsuccess=()=>{
          const db=request.result;
          const tx=db.transaction('journey','readwrite');
          tx.objectStore('journey').put(save,'local-character');
          tx.oncomplete=()=>{db.close();done(null);};
          tx.onerror=()=>{const error=String(tx.error);db.close();done(error);};
        };
    """, save)
    if result:
        raise AssertionError(result)


def launch_saved(driver: webdriver.Chrome) -> None:
    driver.refresh()
    button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="continue"]'), message="continue action")
    wait_for(driver, lambda _current: not button.get_attribute("disabled"), timeout=15, message="continue enabled")
    button.click()
    wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="saved journey HUD")


def toggle_lab(driver: webdriver.Chrome) -> None:
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")


def apply_capture_tuning(driver: webdriver.Chrome, advanced: bool) -> None:
    toggle_lab(driver)
    wait_for(driver, lambda current: 'visible' in current.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute('class').split(), message="World Lab open")
    driver.execute_script("""
      const advanced = Boolean(arguments[0]);
      const set=(selector,value)=>{const element=document.querySelector(selector);if(!element)return false;if(element.type==='checkbox')element.checked=value;else element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));return true;};
      return {
        bypass:set('[data-lab="bypass"]',advanced),
        radius:set('[data-lab="radius"]','1'),
        condition:set('[data-lab="condition"]','clear'),
        carver:set('[data-lab="carver"]','none'),
        structure:set('[data-lab="structure"]','none')
      };
    """, advanced)
    time.sleep(1.5)
    toggle_lab(driver)
    wait_for(driver, lambda current: 'visible' not in current.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute('class').split(), message="World Lab close")


def scene_only(driver: webdriver.Chrome) -> None:
    driver.execute_script("""
      const style=document.createElement('style');
      style.id='dev4-visual-style';
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
        raise AssertionError(value.get('error', value))
    if not isinstance(value, str) or ',' not in value:
        raise AssertionError('WebGL canvas capture did not return a PNG data URL')
    header, encoded = value.split(',', 1)
    if 'image/png' not in header:
        raise AssertionError(f'Unexpected canvas capture header: {header}')
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f'WebGL canvas capture was unexpectedly small: {len(data)} bytes')
    path.write_bytes(data)


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored=("favicon.ico","AudioContext was not allowed to start")
    return [entry for entry in driver.get_log('browser') if entry.get('level')=='SEVERE' and not any(fragment in entry.get('message','') for fragment in ignored)]


def main() -> None:
    target_data=json.loads(TARGETS_PATH.read_text(encoding='utf-8'))
    targets=target_data['targets']
    report: dict[str, Any]={"baseUrl":BASE_URL,"targets":target_data,"captures":{},"browserErrors":[]}
    driver=build_driver()
    try:
        driver.get(BASE_URL)
        new_button=wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey")
        new_button.click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="initial HUD")
        base_save=wait_for(driver, lambda current: read_save(current), timeout=15, message="initial save")
        assert base_save and base_save.get('generationVersion')=='gen3-v1'

        for name in ('wallBase','tJunction','cellSeam','pillarMixed','archSeam'):
            target=targets[name]
            save=dict(base_save)
            save['position']={"x":target['x'],"y":target['y'],"z":target['z'],"yaw":target['yaw'],"pitch":target['pitch']}
            save['savedAt']=int(time.time()*1000)
            write_save(driver,save)
            launch_saved(driver)
            apply_capture_tuning(driver, target['kind']=='advanced')
            time.sleep(1.5)
            scene_only(driver)
            file_name=f"{name}.png"
            capture_canvas(driver, ARTIFACT_DIR/file_name)
            report['captures'][name]={"file":file_name,"position":save['position'],"target":target.get('lookAt'),"size":driver.get_window_size()}
            errors=severe_errors(driver)
            if errors: report['browserErrors'].extend(errors)

        # Movement lighting evidence: keep one browser/renderer session alive while crossing fixture-order boundaries.
        save=dict(base_save); save['position']={"x":0,"y":base_save['position']['y'],"z":0,"yaw":0,"pitch":0}; save['savedAt']=int(time.time()*1000)
        write_save(driver,save); launch_saved(driver); apply_capture_tuning(driver, False); time.sleep(1.5)
        resume=driver.find_element(By.CSS_SELECTOR,'[data-action="resume"]')
        if resume.is_displayed(): resume.click()
        try:
            wait_for(driver, lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas')"), timeout=7, message="pointer lock")
        except AssertionError:
            report['lightingWarning']='Headless Chrome did not grant pointer lock; deterministic movement lighting regression remains authoritative.'
        scene_only(driver); capture_canvas(driver, ARTIFACT_DIR/'lighting-before.png')
        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true}));")
        time.sleep(2.0)
        driver.execute_script("window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',bubbles:true}));")
        time.sleep(1.5)
        capture_canvas(driver, ARTIFACT_DIR/'lighting-after.png')
        moved=read_save(driver)
        report['lightingMovement']={"before":save['position'],"after":moved.get('position') if moved else None}
        report['browserErrors'].extend(severe_errors(driver))
        assert not report['browserErrors'], report['browserErrors']
    finally:
        (ARTIFACT_DIR/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        driver.quit()


if __name__=='__main__':
    main()
