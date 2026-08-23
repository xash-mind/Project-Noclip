from __future__ import annotations

import base64
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

BASE_URL = os.environ.get("NOCLIP_BASE_URL", "http://127.0.0.1:4173")
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_BLACKOUT_UNIFORMITY_ARTIFACTS", "artifacts/blackout-uniformity"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
NATURAL_BLACKOUT_SEED = "dev9-black-2"
RENDER_DISTANCES = ("low", "medium", "high", "ultra")
DEFAULT_SENSITIVITY = 0.095


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
    data = base64.b64decode(encoded)
    if len(data) < 10_000:
        raise AssertionError(f"WebGL canvas capture unexpectedly small: {len(data)} bytes")
    (ARTIFACT_DIR / name).write_bytes(data)


def luminance_profile(driver: webdriver.Chrome) -> dict[str, float]:
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
          const pixels=context.getImageData(0,0,320,180).data;
          const all=[], outer=[], inner=[];
          const lum=(x,y)=>{const i=(y*320+x)*4;return 0.2126*pixels[i]+0.7152*pixels[i+1]+0.0722*pixels[i+2];};
          for(let y=30;y<150;y+=2){
            for(let x=42;x<278;x+=2){
              const v=lum(x,y); all.push(v);
              if(x<68||x>=252||y<48||y>=132) outer.push(v);
              if(x>=92&&x<228&&y>=58&&y<122) inner.push(v);
            }
          }
          all.sort((a,b)=>a-b);
          const mean=(values)=>values.reduce((sum,item)=>sum+item,0)/values.length;
          done({
            mean:mean(all),
            p90:all[Math.floor(all.length*0.90)],
            outerMean:mean(outer),
            innerMean:mean(inner),
            perimeterLift:mean(outer)-mean(inner)
          });
        } catch(error){done({error:String(error)});}
      },'image/png'));
    """)
    if not isinstance(value, dict) or value.get("error"):
        raise AssertionError(value)
    return {key: float(value[key]) for key in ("mean", "p90", "outerMean", "innerMean", "perimeterLift")}


def metrics_text(driver: webdriver.Chrome) -> str:
    return str(driver.execute_script("return document.querySelector('[data-ui=metrics]')?.textContent ?? '';"))


def blackout_strength(driver: webdriver.Chrome) -> float:
    match = re.search(r"/ blackout\s+([0-9.]+)", metrics_text(driver))
    if not match:
        raise AssertionError(f"Missing blackout strength metric: {metrics_text(driver)}")
    return float(match.group(1))


def enable_gate_bypass(driver: webdriver.Chrome) -> None:
    changed = driver.execute_script("""
      const element=document.querySelector('[data-lab="bypass"]');
      if(!element)return false;
      element.checked=true;
      element.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    """)
    if not changed:
        raise AssertionError("Missing World Lab gate bypass control")
    time.sleep(0.6)


def locate_natural_blackout(driver: webdriver.Chrome) -> None:
    located = driver.execute_script("""
      const button=document.querySelector('[data-action="locate-blackout"]');
      if(!button)return false;
      button.click();
      return true;
    """)
    if not located:
        raise AssertionError("Missing natural Blackout locator")
    wait_for(driver, lambda current: blackout_strength(current) >= 0.9995, timeout=15, message="natural full Blackout core")
    time.sleep(0.8)


def render_diagnostics(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script("return window.__projectNoclipRenderSettings?.diagnostics?.() ?? null;")
    if not isinstance(value, dict):
        raise AssertionError(f"Missing render settings diagnostics: {value}")
    return value


def set_render_distance(driver: webdriver.Chrome, level: str) -> None:
    changed = driver.execute_script("return window.__projectNoclipRenderSettings?.patch?.({renderDistance:arguments[0]}) ?? null;", level)
    if not isinstance(changed, dict):
        raise AssertionError(f"Unable to set Render Distance {level}: {changed}")
    wait_for(
        driver,
        lambda current: current.execute_script("return window.__projectNoclipRenderSettings?.get?.().renderDistance ?? '';" ) == level,
        timeout=8,
        message=f"Render Distance {level}",
    )
    time.sleep(1.0)


def assert_mf1_invariant(diagnostics: dict[str, Any], label: str) -> None:
    active = int(diagnostics.get("activeOmnis", -1))
    shadowed = int(diagnostics.get("shadowedOmnis", -2))
    if active != shadowed:
        raise AssertionError(f"{label}: active M-F1 Omnis {active} != shadowed M-F1 Omnis {shadowed}")


def qa_snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script("return window.__projectNoclipQa?.snapshot?.() ?? null;")
    if not isinstance(value, dict):
        raise AssertionError(f"Missing QA snapshot: {value}")
    return value


def ensure_pointer_lock(driver: webdriver.Chrome) -> None:
    if driver.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas');"):
        return
    resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
    if resume.is_displayed():
        resume.click()
    else:
        driver.find_element(By.CSS_SELECTOR, '#game-canvas').click()
    wait_for(
        driver,
        lambda current: current.execute_script("return document.pointerLockElement===document.querySelector('#game-canvas');"),
        timeout=8,
        message="pointer lock for stationary camera rotation",
    )


def rotate_yaw(driver: webdriver.Chrome, degrees: float) -> float:
    before = float(qa_snapshot(driver)["yaw"])
    movement_x = -degrees / DEFAULT_SENSITIVITY
    driver.execute_script("""
      const event=new MouseEvent('mousemove',{bubbles:true});
      Object.defineProperty(event,'movementX',{value:arguments[0]});
      Object.defineProperty(event,'movementY',{value:0});
      window.dispatchEvent(event);
    """, movement_x)
    time.sleep(0.35)
    after = float(qa_snapshot(driver)["yaw"])
    if abs((after - before) - degrees) > 4.0:
        raise AssertionError(f"Stationary yaw rotation did not apply deterministically: {before:.2f} -> {after:.2f}, expected +{degrees:.2f}")
    return after


def main() -> None:
    driver = driver_for_webgl()
    report: dict[str, Any] = {"seed": NATURAL_BLACKOUT_SEED}
    try:
        driver.get(BASE_URL)
        wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), message="new journey")
        seed_input = driver.find_element(By.CSS_SELECTOR, '[data-ui="seed"]')
        seed_input.clear()
        seed_input.send_keys(NATURAL_BLACKOUT_SEED)
        driver.find_element(By.CSS_SELECTOR, '[data-action="new"]').click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=35, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa && window.__projectNoclipRenderSettings)"), message="QA/render settings bridges")

        ordinary = luminance_profile(driver)
        capture_canvas(driver, "ordinary-reference.png")

        enable_gate_bypass(driver)
        locate_natural_blackout(driver)
        natural_strength = blackout_strength(driver)

        distance_evidence: dict[str, Any] = {}
        no_fixture_means: list[float] = []
        for level in RENDER_DISTANCES:
            set_render_distance(driver, level)
            wait_for(driver, lambda current: blackout_strength(current) >= 0.9995, timeout=8, message=f"Blackout retained at {level}")
            diagnostics = render_diagnostics(driver)
            assert_mf1_invariant(diagnostics, f"Blackout {level}")
            profile = luminance_profile(driver)
            capture_canvas(driver, f"blackout-{level}.png")
            active_omnis = int(diagnostics.get("activeOmnis", 0))
            if profile["mean"] <= 1.0:
                raise AssertionError(f"Blackout {level} collapsed below the accepted tiny survival floor: {profile}")
            if active_omnis == 0:
                no_fixture_means.append(profile["mean"])
                if profile["mean"] >= ordinary["mean"] * 0.9 and profile["p90"] >= ordinary["p90"] * 0.9:
                    raise AssertionError(f"Blackout {level} without a real fixture is not materially darker than Ordinary: {ordinary} -> {profile}")
            distance_evidence[level] = {"luminance": profile, "diagnostics": diagnostics}

        if len(no_fixture_means) >= 2:
            median_mean = statistics.median(no_fixture_means)
            allowed_spread = max(10.0, median_mean * 0.28)
            observed_spread = max(no_fixture_means) - min(no_fixture_means)
            if observed_spread > allowed_spread:
                raise AssertionError(
                    f"Deep Blackout brightness changed excessively when only Render Distance moved: "
                    f"means={no_fixture_means}, spread={observed_spread:.3f}, allowed={allowed_spread:.3f}"
                )

        set_render_distance(driver, "high")
        ensure_pointer_lock(driver)
        rotation_evidence: list[dict[str, Any]] = []
        start = qa_snapshot(driver)
        start_yaw = float(start["yaw"])
        start_position = (float(start["x"]), float(start["z"]))
        for index in range(5):
            snapshot = qa_snapshot(driver)
            position = (float(snapshot["x"]), float(snapshot["z"]))
            if math.hypot(position[0] - start_position[0], position[1] - start_position[1]) > 0.02:
                raise AssertionError(f"Camera rotation moved the player: {start_position} -> {position}")
            diagnostics = render_diagnostics(driver)
            assert_mf1_invariant(diagnostics, f"stationary yaw sample {index}")
            profile = luminance_profile(driver)
            capture_canvas(driver, f"blackout-yaw-{index}.png")
            rotation_evidence.append({"yaw": float(snapshot["yaw"]), "luminance": profile, "diagnostics": diagnostics})
            if index < 4:
                rotate_yaw(driver, 90.0)
        yaw_span = float(rotation_evidence[-1]["yaw"]) - start_yaw
        if abs(yaw_span) < 350:
            raise AssertionError(f"Stationary Blackout rotation did not cover 360 degrees: span={yaw_span:.2f}")
        no_fixture_rotation_means = [entry["luminance"]["mean"] for entry in rotation_evidence if int(entry["diagnostics"].get("activeOmnis", 0)) == 0]
        if len(no_fixture_rotation_means) >= 3:
            median_rotation = statistics.median(no_fixture_rotation_means)
            allowed_rotation_spread = max(12.0, median_rotation * 0.35)
            rotation_spread = max(no_fixture_rotation_means) - min(no_fixture_rotation_means)
            if rotation_spread > allowed_rotation_spread:
                raise AssertionError(
                    f"Deep Blackout gained a camera-direction brightness spike without a real fixture: "
                    f"means={no_fixture_rotation_means}, spread={rotation_spread:.3f}, allowed={allowed_rotation_spread:.3f}"
                )

        # Leave the Condition through existing QA tooling and prove a generated
        # M-F1 fixture still drives the authoritative active/shadowed renderer
        # counters. The old sourceOwned QA bit is intentionally not used here:
        # it reads a retired fixtureLightSourceIds bridge rather than current
        # fixtureLighting runtime ownership.
        fixture = driver.execute_script("return window.__projectNoclipQa?.placeAtFixtureState?.('on') ?? null;")
        if not isinstance(fixture, dict):
            raise AssertionError(f"Unable to locate a legitimate on M-F1 fixture: {fixture}")
        group_id = str(fixture.get("groupId", ""))
        fixture_snapshot = wait_for(
            driver,
            lambda current: current.execute_script("return window.__projectNoclipQa?.fixtureStateSnapshot?.(arguments[0]) ?? null;", group_id),
            timeout=8,
            message="real fixture state snapshot",
        )
        if fixture_snapshot.get("state") != "on" or float(fixture_snapshot.get("pulse", 0)) <= 0.001:
            raise AssertionError(f"Located fixture is not an actively emitting generated M-F1 source: {fixture_snapshot}")
        fixture_diagnostics = wait_for(
            driver,
            lambda current: (
                value if int((value := render_diagnostics(current)).get("activeOmnis", 0)) >= 1 else False
            ),
            timeout=8,
            message="fixture-owned active Omni diagnostics",
        )
        assert_mf1_invariant(fixture_diagnostics, "real fixture near view")
        fixture_near_luminance = luminance_profile(driver)
        capture_canvas(driver, "real-fixture-near.png")

        approach = driver.execute_script("return window.__projectNoclipQa?.placeAtFixtureApproach?.() ?? null;")
        if not isinstance(approach, dict):
            raise AssertionError(f"Unable to place outside a real fixture's physical light range: {approach}")
        fixture_point = approach.get("fixture") or {}
        start_point = approach.get("start") or {}
        physical_distance = math.hypot(float(fixture_point.get("x", 0)) - float(start_point.get("x", 0)), float(fixture_point.get("z", 0)) - float(start_point.get("z", 0)))
        if physical_distance <= 12.0:
            raise AssertionError(f"Fixture approach start did not leave the 12 m physical light range: {physical_distance:.3f} m")
        time.sleep(0.8)
        far_diagnostics = render_diagnostics(driver)
        assert_mf1_invariant(far_diagnostics, "real fixture far view")
        fixture_far_luminance = luminance_profile(driver)
        capture_canvas(driver, "real-fixture-beyond-range.png")

        report = {
            "seed": NATURAL_BLACKOUT_SEED,
            "naturalBlackoutStrength": natural_strength,
            "ordinaryReference": ordinary,
            "renderDistance": distance_evidence,
            "stationaryRotation": rotation_evidence,
            "yawSpan": yaw_span,
            "realFixture": {
                "near": fixture,
                "snapshot": fixture_snapshot,
                "nearDiagnostics": fixture_diagnostics,
                "nearLuminance": fixture_near_luminance,
                "beyondRange": approach,
                "physicalDistanceMeters": physical_distance,
                "farDiagnostics": far_diagnostics,
                "farLuminance": fixture_far_luminance,
            },
            "files": [
                "ordinary-reference.png",
                *[f"blackout-{level}.png" for level in RENDER_DISTANCES],
                *[f"blackout-yaw-{index}.png" for index in range(5)],
                "real-fixture-near.png",
                "real-fixture-beyond-range.png",
            ],
        }
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
