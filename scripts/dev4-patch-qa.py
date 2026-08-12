from pathlib import Path

# Mobile look: preserve total gesture/threshold, prevent hosted Chrome coalescing.
p = Path('scripts/mobile-smoke.py')
t = p.read_text(encoding='utf-8')
old = '''def touch_drag(driver: webdriver.Chrome, selector: str, dx: float, dy: float, steps: int = 1) -> None:\n    point = center_point(driver, selector, 2)\n    x = float(point["x"]); y = float(point["y"])\n    touch_event(driver, "touchStart", [point])\n    for index in range(1, steps + 1):\n        touch_event(driver, "touchMove", [{**point, "x": x + dx * index / steps, "y": y + dy * index / steps}])\n        time.sleep(0.04)\n    touch_event(driver, "touchEnd", [])\n'''
new = '''def touch_drag(driver: webdriver.Chrome, selector: str, dx: float, dy: float, steps: int = 6) -> None:\n    point = center_point(driver, selector, 2)\n    x = float(point["x"]); y = float(point["y"])\n    touch_event(driver, "touchStart", [point])\n    # A real finger crosses intermediate positions; doing the same prevents\n    # hosted Chrome from coalescing one large synthetic jump before the\n    # PointerEvent capture path sees it. Total displacement is unchanged.\n    time.sleep(0.06)\n    for index in range(1, steps + 1):\n        touch_event(driver, "touchMove", [{**point, "x": x + dx * index / steps, "y": y + dy * index / steps}])\n        time.sleep(0.04)\n    touch_event(driver, "touchEnd", [])\n'''
if old not in t:
    raise SystemExit('mobile touch_drag anchor missing')
p.write_text(t.replace(old, new, 1), encoding='utf-8')

# Visual QA: close-up captures only need the local 3x3 stream. Capture the
# WebGL canvas directly instead of a full-page SwiftShader compositor readback.
p = Path('scripts/dev4-visual-smoke.py')
t = p.read_text(encoding='utf-8')
t = t.replace('import json\n', 'import base64\nimport json\n', 1)
t = t.replace('options.add_argument("--window-size=1600,1000")', 'options.add_argument("--window-size=1200,720")', 1)
t = t.replace('driver.set_script_timeout(25)', 'driver.set_script_timeout(40)', 1)
t = t.replace('def apply_advanced_tuning(driver: webdriver.Chrome) -> None:', 'def apply_capture_tuning(driver: webdriver.Chrome, advanced: bool) -> None:', 1)
old = '''        bypass:set('[data-lab="bypass"]',true),\n        condition:set('[data-lab="condition"]','clear'),\n        carver:set('[data-lab="carver"]','none'),\n        structure:set('[data-lab="structure"]','none')\n'''
new = '''        bypass:set('[data-lab="bypass"]',advanced),\n        radius:set('[data-lab="radius"]','1'),\n        condition:set('[data-lab="condition"]','clear'),\n        carver:set('[data-lab="carver"]','none'),\n        structure:set('[data-lab="structure"]','none')\n'''
if old not in t:
    raise SystemExit('visual tuning anchor missing')
t = t.replace(old, new, 1)
t = t.replace('    """)\n    time.sleep(2.5)', '    """, advanced)\n    time.sleep(1.5)', 1)
marker = 'def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:\n'
helper = '''def capture_canvas(driver: webdriver.Chrome, path: Path) -> None:\n    value = driver.execute_async_script("""\n      const done = arguments[0];\n      const canvas = document.querySelector('#game-canvas');\n      if (!canvas) { done({error:'missing #game-canvas'}); return; }\n      requestAnimationFrame(() => {\n        try {\n          canvas.toBlob((blob) => {\n            if (!blob) { done({error:'canvas.toBlob returned null'}); return; }\n            const reader = new FileReader();\n            reader.onerror = () => done({error:String(reader.error)});\n            reader.onload = () => done(String(reader.result));\n            reader.readAsDataURL(blob);\n          }, 'image/png');\n        } catch (error) { done({error:String(error)}); }\n      });\n    """)\n    if isinstance(value, dict):\n        raise AssertionError(value.get('error', value))\n    if not isinstance(value, str) or ',' not in value:\n        raise AssertionError('WebGL canvas capture did not return a PNG data URL')\n    header, encoded = value.split(',', 1)\n    if 'image/png' not in header:\n        raise AssertionError(f'Unexpected canvas capture header: {header}')\n    data = base64.b64decode(encoded)\n    if len(data) < 10_000:\n        raise AssertionError(f'WebGL canvas capture was unexpectedly small: {len(data)} bytes')\n    path.write_bytes(data)\n\n\n'''
if marker not in t:
    raise SystemExit('visual helper anchor missing')
t = t.replace(marker, helper + marker, 1)
old = '''            if target['kind']=='advanced':\n                apply_advanced_tuning(driver)\n            time.sleep(3)\n            scene_only(driver)\n            file_name=f"{name}.png"\n            assert driver.save_screenshot(str(ARTIFACT_DIR/file_name))\n'''
new = '''            apply_capture_tuning(driver, target['kind']=='advanced')\n            time.sleep(1.5)\n            scene_only(driver)\n            file_name=f"{name}.png"\n            capture_canvas(driver, ARTIFACT_DIR/file_name)\n'''
if old not in t:
    raise SystemExit('visual loop anchor missing')
t = t.replace(old, new, 1)
old = '''        write_save(driver,save); launch_saved(driver); time.sleep(2)\n        resume=driver.find_element(By.CSS_SELECTOR,'[data-action="resume"]')\n'''
new = '''        write_save(driver,save); launch_saved(driver); apply_capture_tuning(driver, False); time.sleep(1.5)\n        resume=driver.find_element(By.CSS_SELECTOR,'[data-action="resume"]')\n'''
if old not in t:
    raise SystemExit('lighting setup anchor missing')
t = t.replace(old, new, 1)
t = t.replace("scene_only(driver); driver.save_screenshot(str(ARTIFACT_DIR/'lighting-before.png'))", "scene_only(driver); capture_canvas(driver, ARTIFACT_DIR/'lighting-before.png')", 1)
t = t.replace("driver.save_screenshot(str(ARTIFACT_DIR/'lighting-after.png'))", "capture_canvas(driver, ARTIFACT_DIR/'lighting-after.png')", 1)
p.write_text(t, encoding='utf-8')

# Production-profile summary: consume dev4 benchmark schema.
p = Path('.github/workflows/profile-production.yml')
t = p.read_text(encoding='utf-8')
old = '''          pillar = benchmark["pillarField"]\n          blackout = benchmark["blackout"]\n          holes = benchmark["holeCarver"]\n          crossing = benchmark["regionCrossingMinutes"]\n'''
new = '''          pillar = benchmark["pillar"]\n          navigation = benchmark["navigation"]\n          arch = benchmark["arch"]\n          normal_first = benchmark["normalFirst"]\n          blackout = benchmark["blackout"]\n          holes = benchmark["holeCarver"]\n          runtime_us = float(generation["runtimeMicrosecondsPerCell"])\n          cells_per_second = 1_000_000 / runtime_us\n'''
if old not in t:
    raise SystemExit('profile schema anchor missing')
t = t.replace(old, new, 1)
old = '''              f"- Generation `{generation['version']}` benchmark: `{generation['cells']}` Cells / `{generation['microsecondsPerCell']:.2f} µs/Cell` / `{generation['cellsPerSecond']:.2f} Cells/s`.",\n              f"- Fidelity gates: forbidden ordinary motifs `{generation['forbiddenOrdinary']}`, placement errors `{generation['placementErrors']}`, Pillar walls/Cell `{pillar['wallsPerCell']}`, Blackout fixtures `{blackout['localFixtures']}`, hole overlaps `{holes['overlaps']}`.",\n              f"- Region travel: Pillar P50 `{crossing['pillarP50']}` min / P90 `{crossing['pillarP90']}` min; Arch P50 `{crossing['archP50']}` min; boundary max Δ `{benchmark['geographyBoundaryDelta']}`.",\n'''
new = '''              f"- Generation `{generation['version']}` benchmark: `{generation['cells']}` Cells / `{runtime_us:.2f} µs/Cell` runtime / `{cells_per_second:.2f} Cells/s`; validation `{generation['validationMicrosecondsPerCell']:.2f} µs/Cell` separately.",\n              f"- Navigation: reachable area `{navigation['ordinaryReachableAreaRatio']:.4f}`, isolated `{navigation['ordinaryIsolatedAreaRatio']:.4f}` / `{navigation['ordinaryIsolatedPockets']}` pockets, open-space P50/P90 `{navigation['ordinaryOpenAreaP50']:.2f}/{navigation['ordinaryOpenAreaP90']:.2f} m²`, mean `{navigation['ordinaryCellsCrossed']:.1f}` Cells crossed.",\n              f"- Pillar: exact width scale `{pillar['widthScale']:.2f}` (`{pillar['generatedWidthRange'][0]:.3f}–{pillar['generatedWidthRange'][1]:.4f} m`), common `{pillar['common']['wallsPerCell']:.3f}` walls / `{pillar['common']['columnsPerCell']:.3f}` pillars per Cell; deep sample rate `{pillar['extentDistribution']['deepSampleRate']:.4f}`, max deep run `{pillar['extentDistribution']['maxDeepMeters']}` m.",\n              f"- Arch: `{arch['dividerSamples']}` divider samples, irregular rate `{arch['irregularRate']:.4f}`, `{arch['distinctBayWidths']}` distinct intentional bay widths. Normal-first disorienting rate `{normal_first['disorientingRate']:.4f}` / flicker-group rate `{normal_first['flickerGroupRate']:.4f}`.",\n              f"- Placement errors `{generation['placementErrors']}`, Blackout fixtures `{blackout['localFixtures']}`, hole overlaps `{holes['overlaps']}`, boundary max Δ `{benchmark['geographyBoundaryDelta']}`.",\n'''
if old not in t:
    raise SystemExit('profile summary anchor missing')
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')
