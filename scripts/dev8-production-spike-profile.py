from __future__ import annotations

import json
import math
import os
import re
import shutil
import statistics
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get('NOCLIP_BASE_URL', 'https://project-noclip.vercel.app')
ARTIFACT_DIR = Path(os.environ.get('NOCLIP_DEV8_BEFORE_ARTIFACTS', 'artifacts/dev8-production-before'))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
SEED = 'sparse-1'


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 60.0, message: str = 'condition') -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f'Timed out waiting for {message}') from error


def driver_for() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for arg in ('--headless=new','--window-size=1440,900','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage','--no-sandbox'):
        options.add_argument(arg)
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    binary = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if binary: options.binary_location = binary
    return webdriver.Chrome(options=options)


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ('favicon.ico', 'AudioContext was not allowed to start')
    return [e for e in driver.get_log('browser') if e.get('level') == 'SEVERE' and not any(x in e.get('message','') for x in ignored)]


def percentile(values: list[float], fraction: float) -> float:
    values = sorted(values)
    if not values: return 0.0
    index = min(len(values)-1, max(0, math.ceil(len(values)*fraction)-1))
    return values[index]


def key_event(driver: webdriver.Chrome, down: bool, key: str, code: str) -> None:
    name = 'keydown' if down else 'keyup'
    driver.execute_script(f"window.dispatchEvent(new KeyboardEvent('{name}',{{key:arguments[0],code:arguments[1],bubbles:true}}));", key, code)


def sprint(driver: webdriver.Chrome, seconds: float, backward: bool = False) -> None:
    key_event(driver, True, 'Shift', 'ShiftLeft')
    key_event(driver, True, 's' if backward else 'w', 'KeyS' if backward else 'KeyW')
    time.sleep(seconds)
    key_event(driver, False, 's' if backward else 'w', 'KeyS' if backward else 'KeyW')
    key_event(driver, False, 'Shift', 'ShiftLeft')


def locate(driver: webdriver.Chrome, region: str, depth: str) -> None:
    result = driver.execute_async_script("const done=arguments[arguments.length-1];Promise.resolve(window.__projectNoclipQa.locate(arguments[0],arguments[1])).then(v=>done(v||null)).catch(e=>done({error:String(e)}));", region, depth)
    if not result or (isinstance(result, dict) and result.get('error')): raise AssertionError(f'locate {region}/{depth}: {result}')
    time.sleep(1.5)


def place(driver: webdriver.Chrome, method: str) -> dict[str, Any]:
    result = driver.execute_script(f'return window.__projectNoclipQa.{method}?.() ?? null;')
    if not isinstance(result, dict): raise AssertionError(f'{method} unavailable')
    time.sleep(0.6)
    return result


def metrics_text(driver: webdriver.Chrome) -> str:
    return str(driver.execute_script("return document.querySelector('[data-ui=metrics]')?.textContent||'';"))


def real_fixture_count(text: str) -> int | None:
    match = re.search(r'^fixture lights\s+(\d+)/(\d+) active/real', text, flags=re.MULTILINE)
    return int(match.group(2)) if match else None


def begin_probe(driver: webdriver.Chrome) -> None:
    driver.execute_script("""
      window.__dev8Probe={frames:[],queues:[],coldStart:window.__noclipStreamingDiagnostics?.coldBoundaryLoads||0,boundaryStart:window.__noclipStreamingDiagnostics?.maxBoundaryFrameMs||0,stop:false,last:undefined};
      const p=window.__dev8Probe;
      function tick(t){
        if(p.last!==undefined) p.frames.push(t-p.last); p.last=t;
        p.queues.push(window.__noclipStreamingDiagnostics?.queueDepth||0);
        if(!p.stop) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    """)


def end_probe(driver: webdriver.Chrome) -> dict[str, Any]:
    raw = driver.execute_script("""
      const p=window.__dev8Probe;p.stop=true;
      return {frames:p.frames,queues:p.queues,coldStart:p.coldStart,boundaryStart:p.boundaryStart,streaming:window.__noclipStreamingDiagnostics||null,render:window.__projectNoclipRenderSettings.diagnostics()};
    """)
    frames = [float(v) for v in raw.get('frames',[]) if float(v)>0]
    streaming = raw.get('streaming') or {}
    return {
        'sampleCount': len(frames),
        'p50FrameMs': round(statistics.median(frames),3) if frames else 0,
        'p95FrameMs': round(percentile(frames,0.95),3),
        'maxFrameMs': round(max(frames),3) if frames else 0,
        'queueDepthPeak': max([int(v) for v in raw.get('queues',[])], default=0),
        'coldBoundaryLoads': int(streaming.get('coldBoundaryLoads',0))-int(raw.get('coldStart',0)),
        'maxBoundaryFrameMs': round(float(streaming.get('maxBoundaryFrameMs',0)),3),
        'render': raw.get('render') or {},
        'streaming': streaming,
    }


def scenario(driver: webdriver.Chrome, report: dict[str, Any], label: str, action: Callable[[], None] | None = None) -> None:
    begin_probe(driver)
    if action: action()
    time.sleep(2.2)
    result = end_probe(driver)
    text = metrics_text(driver)
    real = real_fixture_count(text)
    result['metricsText'] = text
    result['realFixtureLights'] = real
    # Original Dev.8 rewrites color/range/castShadows/shadowResolution/bias/normalOffset every fixture every frame.
    result['invariantFixturePropertyWritesPerFrame'] = real * 6 if real is not None else None
    render = result['render']
    assert int(render.get('activeCells',49)) == 49, f'{label}: High Cell cardinality changed'
    assert int(render.get('activeOmnis',0)) == int(render.get('shadowedOmnis',0)), f'{label}: light/shadow invariant failed'
    errors = browser_errors(driver)
    assert not errors, f'{label}: {errors}'
    report['scenarios'].append({'label':label, **result})


def startup(driver: webdriver.Chrome) -> None:
    driver.get(BASE_URL)
    wait_for(driver, lambda d:d.execute_script('return document.readyState')=='complete', message='production load')
    seed = wait_for(driver, lambda d:d.find_element(By.CSS_SELECTOR,'[data-ui="seed"]'), message='seed')
    driver.execute_script('arguments[0].value=arguments[1];',seed,SEED)
    driver.find_element(By.CSS_SELECTOR,'[data-action="new"]').click()
    wait_for(driver, lambda d:d.execute_script("return document.querySelector('[data-ui=title]').hidden&&!document.querySelector('[data-ui=hud]').hidden"), message='HUD')
    wait_for(driver, lambda d:d.execute_script('return Boolean(window.__projectNoclipQa&&window.__projectNoclipRenderSettings&&window.__noclipStreamingDiagnostics)'), message='production QA/streaming bridges')
    driver.execute_script("window.__projectNoclipRenderSettings.preset('high');")
    wait_for(driver, lambda d:int(d.execute_script('return window.__projectNoclipRenderSettings.diagnostics().activeCells'))==49, message='High scope')
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")
    wait_for(driver, lambda d:'visible' in d.find_element(By.CSS_SELECTOR,'[data-ui="lab"]').get_attribute('class').split(), message='lab')
    driver.execute_script("const e=document.querySelector('[data-lab=bypass]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));")
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")
    time.sleep(1)


def main() -> None:
    report: dict[str, Any]={'baseUrl':BASE_URL,'seed':SEED,'preset':'high','scenarios':[],'browserErrors':[]}
    driver=driver_for(); driver.set_page_load_timeout(60); driver.set_script_timeout(120)
    try:
        startup(driver)
        place(driver,'placeAtFixtureApproach')
        scenario(driver,report,'ordinary-continuous-sprint',lambda:sprint(driver,6.0))
        locate(driver,'arch-rooms','core'); place(driver,'placeAtArchRoute')
        scenario(driver,report,'arch-repeated-fast-traversal',lambda:[sprint(driver,0.9,backward=bool(i%2)) for i in range(8)])
        locate(driver,'pillar-field','deep-core'); place(driver,'placeAtFixtureApproach')
        scenario(driver,report,'pillar-rapid-reversals',lambda:[sprint(driver,0.8,backward=bool(i%2)) for i in range(8)])
        report['browserErrors']=browser_errors(driver); assert not report['browserErrors'],report['browserErrors']
    except Exception as error:
        report['failure']=f'{type(error).__name__}: {error}'
        raise
    finally:
        (ARTIFACT_DIR/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report,indent=2))
        driver.quit()

if __name__=='__main__': main()
