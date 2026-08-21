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
ARTIFACT_DIR = Path(os.environ.get("NOCLIP_WALLPAPER_ARTIFACTS", "artifacts/wallpaper"))
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
    driver.set_script_timeout(50)
    return driver


def capture_canvas(driver: webdriver.Chrome, path: Path) -> None:
    value = driver.execute_async_script("""
      const done = arguments[0];
      const canvas = document.querySelector('#game-canvas');
      if (!canvas) { done({error:'missing #game-canvas'}); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try {
          canvas.toBlob((blob) => {
            if (!blob) { done({error:'canvas.toBlob returned null'}); return; }
            const reader = new FileReader();
            reader.onerror = () => done({error:String(reader.error)});
            reader.onload = () => done(String(reader.result));
            reader.readAsDataURL(blob);
          }, 'image/png');
        } catch (error) { done({error:String(error)}); }
      }));
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
        raise AssertionError(f"Wallpaper capture was unexpectedly small: {len(data)} bytes")
    path.write_bytes(data)


def canvas_pixel_stats(driver: webdriver.Chrome, crop: tuple[float, float, float, float] = (0.35, 0.25, 0.65, 0.75)) -> dict[str, float]:
    result = driver.execute_async_script("""
      const crop=arguments[0], done=arguments[1];
      const canvas=document.querySelector('#game-canvas');
      if(!canvas){done({error:'missing #game-canvas'});return;}
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        try {
          const image=new Image();
          image.onerror=()=>done({error:'could not decode rendered canvas'});
          image.onload=()=>{
            const copy=document.createElement('canvas');
            copy.width=image.naturalWidth; copy.height=image.naturalHeight;
            const context=copy.getContext('2d',{willReadFrequently:true});
            if(!context){done({error:'render pixel canvas unavailable'});return;}
            context.drawImage(image,0,0);
            const x=Math.max(0,Math.floor(copy.width*crop[0]));
            const y=Math.max(0,Math.floor(copy.height*crop[1]));
            const w=Math.max(1,Math.floor(copy.width*(crop[2]-crop[0])));
            const h=Math.max(1,Math.floor(copy.height*(crop[3]-crop[1])));
            const pixels=context.getImageData(x,y,w,h).data;
            const total=w*h;
            const stride=Math.max(1,Math.floor(total/12000));
            let count=0,sum=0,sumSq=0,min=255,max=0;
            for(let pixel=0;pixel<total;pixel+=stride){
              const i=pixel*4;
              const luma=0.2126*pixels[i]+0.7152*pixels[i+1]+0.0722*pixels[i+2];
              count++; sum+=luma; sumSq+=luma*luma; min=Math.min(min,luma); max=Math.max(max,luma);
            }
            const mean=sum/count;
            done({mean,min,max,stdDev:Math.sqrt(Math.max(0,sumSq/count-mean*mean)),width:w,height:h});
          };
          image.src=canvas.toDataURL('image/png');
        } catch(error){done({error:String(error)});}
      }));
    """, list(crop))
    if not isinstance(result, dict) or result.get("error"):
        raise AssertionError(result)
    return {key: float(value) for key, value in result.items()}


def assert_textured_render(label: str, stats: dict[str, float]) -> None:
    assert stats["mean"] >= 70, (label, "render too dark", stats)
    assert stats["max"] - stats["min"] >= 24, (label, "render too flat", stats)
    assert stats["stdDev"] >= 5, (label, "texture variation missing", stats)


def assert_nonblack_render(label: str, stats: dict[str, float]) -> None:
    assert stats["mean"] >= 55, (label, "render unexpectedly black", stats)
    assert stats["max"] >= 85, (label, "no readable lit surface", stats)


def severe_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ("favicon.ico", "AudioContext was not allowed to start")
    return [
        entry for entry in driver.get_log("browser")
        if entry.get("level") == "SEVERE"
        and not any(fragment in entry.get("message", "") for fragment in ignored)
    ]


def diagnostics(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_script("return window.__projectNoclipWallpaper?.diagnostics?.() ?? null;")
    return value if isinstance(value, dict) else None


def renderer_diagnostics(driver: webdriver.Chrome) -> dict[str, Any] | None:
    value = driver.execute_script("return window.__noclipRendererRuntimeDiagnostics?.snapshot?.() ?? null;")
    return value if isinstance(value, dict) else None


def source_pixel_stats(driver: webdriver.Chrome, asset_states: dict[str, Any]) -> dict[str, Any]:
    paths = {family: str(asset_states[family]["runtimePath"]) for family in ("A", "B", "C")}
    result = driver.execute_async_script("""
      const paths=arguments[0], done=arguments[1];
      (async () => {
        const output={};
        for (const [family,path] of Object.entries(paths)) {
          const image=new Image(); image.src=path; await image.decode();
          const canvas=document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
          const context=canvas.getContext('2d',{willReadFrequently:true});
          if(!context) throw new Error('source pixel canvas unavailable');
          context.drawImage(image,0,0);
          const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
          let count=0,sum=0,sumSq=0,min=255,max=0;
          const stride=Math.max(1,Math.floor((canvas.width*canvas.height)/8192));
          for(let pixel=0; pixel<canvas.width*canvas.height; pixel+=stride){
            const i=pixel*4; const luma=0.2126*pixels[i]+0.7152*pixels[i+1]+0.0722*pixels[i+2];
            count++; sum+=luma; sumSq+=luma*luma; min=Math.min(min,luma); max=Math.max(max,luma);
          }
          const mean=sum/count; output[family]={width:canvas.width,height:canvas.height,mean,min,max,stdDev:Math.sqrt(Math.max(0,sumSq/count-mean*mean))};
        }
        done(output);
      })().catch((error)=>done({error:String(error)}));
    """, paths)
    if not isinstance(result, dict) or result.get("error"):
        raise AssertionError(result)
    return result


def has_real_a_wall(driver: webdriver.Chrome) -> dict[str, Any] | bool:
    snapshot = diagnostics(driver)
    ordinary = (snapshot or {}).get("regions", {}).get("ordinary-level-0", {})
    if not snapshot or snapshot.get("wallA", 0) <= 0 or ordinary.get("suppliedTextureBindings", 0) <= 0:
        return False
    return snapshot


def qa_call(driver: webdriver.Chrome, method: str, *args: Any) -> Any:
    value = driver.execute_script("""
      const method=arguments[0], args=Array.from(arguments).slice(1), qa=window.__projectNoclipQa;
      if(!qa || typeof qa[method] !== 'function') return null;
      return qa[method](...args) ?? null;
    """, method, *args)
    return value


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
    time.sleep(1.2)
    return str(result["message"])


def region_snapshot(driver: webdriver.Chrome, region: str) -> dict[str, Any]:
    snapshot = diagnostics(driver)
    if not snapshot:
        raise AssertionError("Missing wallpaper diagnostics")
    value = snapshot.get("regions", {}).get(region, {})
    if int(value.get("suppliedTextureBindings", 0)) <= 0:
        raise AssertionError(f"{region} has no supplied wallpaper texture binding: {snapshot}")
    return snapshot


def capture_verified(driver: webdriver.Chrome, name: str, textured: bool = True) -> dict[str, float]:
    time.sleep(0.8)
    stats = canvas_pixel_stats(driver)
    if textured:
        assert_textured_render(name, stats)
    else:
        assert_nonblack_render(name, stats)
    capture_canvas(driver, ARTIFACT_DIR / f"{name}.png")
    return stats


def main() -> None:
    report: dict[str, Any] = {"baseUrl": BASE_URL, "regions": {}, "renderPixels": {}, "browserErrors": []}
    driver = build_driver()
    try:
        driver.get(BASE_URL)
        new_button = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-action="new"]'), timeout=35, message="New journey after wallpaper preload")
        new_button.click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=40, message="journey HUD")
        wait_for(driver, lambda current: current.execute_script("return Boolean(window.__projectNoclipQa)"), timeout=25, message="runtime QA bridge")
        initial = wait_for(driver, lambda current: diagnostics(current), timeout=20, message="wallpaper QA bridge")
        assets = initial.get("assets", {})
        assert assets.get("prepared") is True, assets
        assert assets.get("fallbackUsed") == 0, assets
        asset_states = assets.get("assets", {})
        for family in ("A", "B", "C"):
            state = asset_states.get(family, {})
            assert state.get("ready") is True, (family, state)
            assert state.get("fetched") is True, (family, state)
            assert state.get("hashVerified") is True, (family, state)
            assert state.get("decoded") is True, (family, state)
            assert int(state.get("width", 0)) > 0 and int(state.get("height", 0)) > 0, (family, state)
            assert str(state.get("runtimePath", "")).startswith("/assets/runtime/images/"), (family, state)

        report["sourcePixels"] = source_pixel_stats(driver, asset_states)
        for family, stats in report["sourcePixels"].items():
            assert float(stats["max"]) - float(stats["min"]) >= 18, (family, stats)
            assert float(stats["stdDev"]) >= 2.5, (family, stats)

        driver.execute_script("""
          const style=document.createElement('style');
          style.id='wallpaper-smoke-style';
          style.textContent='[data-ui="hud"], .pause-overlay, [data-ui="version-indicator"] { opacity:0 !important; pointer-events:none !important; }';
          document.head.appendChild(style);
        """)

        ordinary = wait_for(driver, has_real_a_wall, timeout=15, message="real A wallpaper material on normal Ordinary wall")
        assert ordinary.get("assets", {}).get("fallbackUsed") == 0, ordinary
        assert 0.15 <= float(ordinary.get("casingSetbackFraction", 0)) <= 0.20, ordinary
        assert int(ordinary.get("casingStrips", 0)) == int(ordinary.get("casingRuns", 0)) * 2, ordinary
        marker = qa_call(driver, "placeAtMarkerWall")
        assert marker, "Could not face a real Ordinary wall"
        report["regions"]["ordinary-level-0"] = {"diagnostics": ordinary, "marker": marker}
        report["renderPixels"]["ordinary-wallpaper"] = capture_verified(driver, "ordinary-wallpaper")

        driver.execute_script("return window.__projectNoclipWallpaper.showcase();")
        time.sleep(1.0)
        report["showcase"] = diagnostics(driver)
        assert report["showcase"]["assets"]["fallbackUsed"] == 0, report["showcase"]
        report["renderPixels"]["split-wallpaper"] = capture_verified(driver, "wallpaper-showcase")
        driver.execute_script("window.__projectNoclipWallpaper.clearShowcase();")

        # New journeys intentionally begin before advanced Region gates. Reuse the
        # existing QA fixture placer because it establishes the canonical local
        # gateBypass tuning without changing world generation or production state.
        gate_probe = qa_call(driver, "placeAtFixtureState", "on")
        assert gate_probe, "Could not establish advanced-Region QA gate bypass"
        time.sleep(0.8)

        pillar_message = qa_locate(driver, "pillar-field", "core")
        pillar = region_snapshot(driver, "pillar-field")
        pillar_marker = qa_call(driver, "placeAtMarkerWall")
        assert pillar_marker, "Could not face a real Pillar Field wall"
        report["regions"]["pillar-field"] = {"message": pillar_message, "diagnostics": pillar, "marker": pillar_marker}
        report["renderPixels"]["pillar-wallpaper"] = capture_verified(driver, "pillar-wallpaper")

        arch_message = qa_locate(driver, "arch-rooms", "core")
        arch = region_snapshot(driver, "arch-rooms")
        arch_region = arch.get("regions", {}).get("arch-rooms", {})
        assert int(arch_region.get("paleBindings", 0)) > 0, arch
        arch_marker = qa_call(driver, "placeAtMarkerWall")
        assert arch_marker, "Could not face a real Arch Room wall"
        report["regions"]["arch-rooms"] = {"message": arch_message, "diagnostics": arch, "marker": arch_marker}
        report["renderPixels"]["arch-wallpaper"] = capture_verified(driver, "arch-wallpaper")

        arch_overview = qa_call(driver, "placeAtArchOverview")
        assert arch_overview, "Could not frame authoritative A-A1 divider"
        report["regions"]["arch-rooms"]["dividerOverview"] = arch_overview
        report["renderPixels"]["arch-divider-pale"] = capture_verified(driver, "arch-divider-pale", textured=False)

        report["renderer"] = renderer_diagnostics(driver)
        if report["renderer"]:
            batching = report["renderer"].get("batching", {})
            assert int(batching.get("activeGroups", 0)) > 0, report["renderer"]

        errors = severe_errors(driver)
        report["browserErrors"] = errors
        assert not errors, errors
    finally:
        (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        driver.quit()


if __name__ == "__main__":
    main()
