from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get('NOCLIP_BASE_URL', 'http://127.0.0.1:4173')
ARTIFACT_DIR = Path(os.environ.get('NOCLIP_DEV8_ARTIFACTS', 'artifacts/dev8-corrective'))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
SEED = os.environ.get('NOCLIP_DEV8_SEED', 'sparse-1')
SETTLE_SECONDS = float(os.environ.get('NOCLIP_DEV8_SETTLE_SECONDS', '2.4'))


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 60.0, message: str = 'condition') -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f'Timed out waiting for {message}') from error


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for argument in (
        '--headless=new', '--window-size=1440,900', '--use-angle=swiftshader', '--enable-webgl',
        '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-dev-shm-usage', '--no-sandbox',
    ):
        options.add_argument(argument)
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    binary = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if binary:
        options.binary_location = binary
    return webdriver.Chrome(options=options)


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ('favicon.ico', 'AudioContext was not allowed to start')
    return [
        entry for entry in driver.get_log('browser')
        if entry.get('level') == 'SEVERE' and not any(fragment in entry.get('message', '') for fragment in ignored)
    ]


def runtime_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script(
        "return window.__noclipRendererRuntimeDiagnostics ? window.__noclipRendererRuntimeDiagnostics.snapshot() : null;"
    )
    if not isinstance(value, dict):
        raise AssertionError('Dev.8 renderer runtime diagnostics are unavailable')
    return value


def render_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    return dict(driver.execute_script(
        "return {settings:window.__projectNoclipRenderSettings.get(),diagnostics:window.__projectNoclipRenderSettings.diagnostics()};"
    ))


def qa_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script('return window.__projectNoclipQa?.snapshot?.() ?? null;')
    return dict(value or {})


def metric_text(driver: webdriver.Chrome) -> str:
    return str(driver.execute_script("return document.querySelector('[data-ui=metrics]')?.textContent || '';"))


def toggle_lab(driver: webdriver.Chrome) -> None:
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")


def lab_visible(driver: webdriver.Chrome) -> bool:
    return 'visible' in driver.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute('class').split()


def set_lab_control(driver: webdriver.Chrome, selector: str, value: str | bool) -> None:
    driver.execute_script(
        """
        const element=document.querySelector(arguments[0]);
        if(!element) throw new Error(`Missing ${arguments[0]}`);
        if(element.type==='checkbox') element.checked=arguments[1]; else element.value=arguments[1];
        element.dispatchEvent(new Event('change',{bubbles:true}));
        """,
        selector,
        value,
    )


def locate(driver: webdriver.Chrome, region: str, depth: str) -> str:
    result = driver.execute_async_script(
        """
        const region=arguments[0], depth=arguments[1], done=arguments[arguments.length-1];
        Promise.resolve(window.__projectNoclipQa.locate(region,depth)).then(value=>done(value||null)).catch(error=>done({error:String(error)}));
        """,
        region,
        depth,
    )
    if isinstance(result, dict) and result.get('error'):
        raise AssertionError(result['error'])
    if not result:
        raise AssertionError(f'Unable to locate {region}/{depth}')
    time.sleep(1.6)
    return str(result)


def qa_place(driver: webdriver.Chrome, method: str) -> dict[str, Any]:
    value = driver.execute_script(f'return window.__projectNoclipQa.{method}?.() ?? null;')
    if not isinstance(value, dict):
        raise AssertionError(f'QA placement {method} unavailable')
    time.sleep(0.7)
    return value


def key_event(driver: webdriver.Chrome, down: bool, key: str, code: str) -> None:
    event = 'keydown' if down else 'keyup'
    driver.execute_script(
        f"window.dispatchEvent(new KeyboardEvent('{event}',{{key:arguments[0],code:arguments[1],bubbles:true}}));",
        key,
        code,
    )


def sprint(driver: webdriver.Chrome, seconds: float, backward: bool = False) -> None:
    key_event(driver, True, 'Shift', 'ShiftLeft')
    key_event(driver, True, 's' if backward else 'w', 'KeyS' if backward else 'KeyW')
    time.sleep(seconds)
    key_event(driver, False, 's' if backward else 'w', 'KeyS' if backward else 'KeyW')
    key_event(driver, False, 'Shift', 'ShiftLeft')


def screenshot(driver: webdriver.Chrome, name: str, report: dict[str, Any]) -> None:
    try:
        driver.save_screenshot(str(ARTIFACT_DIR / name))
    except WebDriverException as error:
        report.setdefault('warnings', []).append(f'{name} screenshot failed: {error.__class__.__name__}')


def delta_map(before: dict[str, Any], after: dict[str, Any], keys: tuple[str, ...]) -> dict[str, float]:
    result: dict[str, float] = {}
    for key in keys:
        left, right = before.get(key), after.get(key)
        if isinstance(left, (int, float)) and isinstance(right, (int, float)):
            result[key] = round(float(right) - float(left), 4)
    return result


def record_scenario(driver: webdriver.Chrome, report: dict[str, Any], label: str, action: Callable[[], None] | None = None) -> dict[str, Any]:
    before = runtime_snapshot(driver)
    driver.execute_script('window.__noclipRendererRuntimeDiagnostics.beginScenario(arguments[0]);', label)
    if action:
        action()
    time.sleep(SETTLE_SECONDS)
    after = runtime_snapshot(driver)
    render = render_snapshot(driver)
    assert render['settings']['preset'] == 'high', f'{label}: expected High preset, got {render["settings"]["preset"]}'
    assert after['activeOmnis'] == after['shadowedOmnis'], f'{label}: active/shadowed Omni mismatch'
    assert after['activeCells'] == 49, f'{label}: High active Cell scope changed: {after["activeCells"]}'
    errors = browser_errors(driver)
    assert not errors, f'{label}: blocking browser errors: {errors}'
    entry = {
        'label': label,
        'camera': qa_snapshot(driver),
        'metricsText': metric_text(driver),
        'runtime': after,
        'render': render,
        'deltaFixture': delta_map(before.get('fixture', {}), after.get('fixture', {}), (
            'lightsCreated', 'lightsDestroyed', 'shadowDirtyScans', 'shadowDirtyMarks', 'shadowUpdateRequests', 'selectionChanges', 'shadowResolutionChanges'
        )),
        'deltaBatching': delta_map(before.get('batching', {}), after.get('batching', {}), (
            'reconcilePasses', 'allocations', 'removals', 'dirtyCalls'
        )),
        'deltaArch': delta_map(before.get('arch', {}), after.get('arch', {}), (
            'reconstructionCalls', 'reconstructedCells', 'reconstructionMs'
        )),
    }
    report.setdefault('scenarios', []).append(entry)
    return entry


def ensure_playing(driver: webdriver.Chrome) -> None:
    resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    if resume.is_displayed():
        driver.execute_script('arguments[0].click();', resume)
        time.sleep(0.5)
    try:
        driver.find_element(By.CSS_SELECTOR, '#game-canvas').click()
    except WebDriverException:
        pass


def startup(driver: webdriver.Chrome) -> None:
    driver.get(BASE_URL)
    wait_for(driver, lambda d: d.execute_script('return document.readyState') == 'complete', message='document load')
    seed = wait_for(driver, lambda d: d.find_element(By.CSS_SELECTOR, '[data-ui="seed"]'), message='seed input')
    driver.execute_script('arguments[0].value=arguments[1];', seed, SEED)
    driver.find_element(By.CSS_SELECTOR, '[data-action="new"]').click()
    wait_for(driver, lambda d: d.execute_script("return document.querySelector('[data-ui=title]').hidden&&!document.querySelector('[data-ui=hud]').hidden"), message='journey HUD')
    wait_for(driver, lambda d: d.execute_script('return Boolean(window.__projectNoclipQa&&window.__projectNoclipRenderSettings&&window.__noclipRendererRuntimeDiagnostics)'), message='QA/renderer bridges')
    driver.execute_script("window.__projectNoclipRenderSettings.preset('high');")
    wait_for(driver, lambda d: render_snapshot(d)['diagnostics']['activeCells'] == 49, message='High active Cell scope')
    toggle_lab(driver)
    wait_for(driver, lambda d: lab_visible(d), message='World Lab')
    set_lab_control(driver, '[data-lab="bypass"]', True)
    set_lab_control(driver, '[data-lab="condition"]', 'clear')
    set_lab_control(driver, '[data-lab="carver"]', 'none')
    toggle_lab(driver)
    wait_for(driver, lambda d: not lab_visible(d), message='World Lab close')
    ensure_playing(driver)
    time.sleep(1.2)


def forced_context_loss(report: dict[str, Any]) -> None:
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(30)
    try:
        driver.get(BASE_URL + ('&' if '?' in BASE_URL else '?') + 'rendererDiagnosticTest=context-loss')
        wait_for(driver, lambda d: d.execute_script('return document.readyState') == 'complete', message='context-loss document')
        driver.find_element(By.CSS_SELECTOR, '[data-action="new"]').click()
        wait_for(driver, lambda d: d.execute_script('return Boolean(window.__noclipRendererRuntimeDiagnostics?.testContextLoss)'), timeout=30, message='context-loss test hook')
        driver.execute_script('window.__noclipRendererRuntimeDiagnostics.testContextLoss();')
        event = wait_for(
            driver,
            lambda d: next((e for e in (d.execute_script('return window.__noclipRendererRuntimeDiagnostics.snapshot().recentEvents') or []) if e.get('kind') in ('webgl-context-lost','graphics-device-lost')), False),
            timeout=12,
            message='forced WebGL/device loss event',
        )
        report['forcedContextLoss'] = {'supported': True, 'event': event}
        screenshot(driver, 'context-loss.png', report)
    except Exception as error:
        report['forcedContextLoss'] = {'supported': False, 'error': f'{type(error).__name__}: {error}'}
    finally:
        driver.quit()


def main() -> None:
    report: dict[str, Any] = {'baseUrl': BASE_URL, 'seed': SEED, 'preset': 'high', 'scenarios': [], 'checks': [], 'warnings': []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    driver.set_script_timeout(120)
    try:
        startup(driver)

        qa_place(driver, 'placeAtMarkerWall')
        record_scenario(driver, report, 'ordinary-enclosed')
        screenshot(driver, '01-ordinary-enclosed.png', report)

        approach = qa_place(driver, 'placeAtFixtureApproach')
        report['ordinarySightline'] = approach
        record_scenario(driver, report, 'ordinary-long-sightline')
        screenshot(driver, '02-ordinary-sightline.png', report)
        record_scenario(driver, report, 'ordinary-continuous-sprint', lambda: sprint(driver, 6.0))

        locate(driver, 'arch-rooms', 'core')
        qa_place(driver, 'placeAtArchOverview')
        record_scenario(driver, report, 'arch-core-overview')
        screenshot(driver, '03-arch-overview.png', report)
        route = qa_place(driver, 'placeAtArchRoute')
        report['archRoute'] = route
        screenshot(driver, '04-arch-route-before.png', report)
        record_scenario(driver, report, 'arch-repeated-fast-traversal', lambda: [sprint(driver, 0.9, backward=bool(i % 2)) for i in range(8)])
        screenshot(driver, '05-arch-route-after-reversal.png', report)

        locate(driver, 'pillar-field', 'interior')
        record_scenario(driver, report, 'pillar-interior')
        screenshot(driver, '06-pillar-interior.png', report)

        locate(driver, 'pillar-field', 'deep-core')
        qa_place(driver, 'placeAtFixtureApproach')
        record_scenario(driver, report, 'pillar-deep-core-open')
        screenshot(driver, '07-pillar-deep-core.png', report)
        record_scenario(driver, report, 'pillar-rapid-reversals', lambda: [sprint(driver, 0.8, backward=bool(i % 2)) for i in range(8)])

        # Required relocation sequence after the traversal stress path.
        for region, depth, label in (
            ('ordinary-level-0', 'nearest', 'relocate-ordinary'),
            ('arch-rooms', 'interior', 'relocate-arch-1'),
            ('pillar-field', 'interior', 'relocate-pillar'),
            ('arch-rooms', 'core', 'relocate-arch-2'),
            ('ordinary-level-0', 'nearest', 'relocate-ordinary-final'),
        ):
            locate(driver, region, depth)
            record_scenario(driver, report, label)

        report['checks'].extend([
            'High remained the 49-active-Cell square-distance renderer in every scenario',
            'active M-F1 Omnis equalled shadowed Omnis in every scenario',
            'Ordinary, Arch and Pillar deterministic scenarios completed without blocking browser errors',
            'continuous sprint, repeated Arch reversals and retained-boundary relocation were exercised',
        ])
        report['browserErrors'] = browser_errors(driver)
        assert not report['browserErrors'], report['browserErrors']
    except Exception as error:
        report['failure'] = f'{type(error).__name__}: {error}'
        try:
            screenshot(driver, 'failure.png', report)
            report['browserErrors'] = browser_errors(driver)
        except Exception:
            pass
        raise
    finally:
        driver.quit()

    forced_context_loss(report)
    (ARTIFACT_DIR / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
