from __future__ import annotations

import json
import math
import os
import re
import shutil
import statistics
import time
from pathlib import Path
from typing import Any

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

URLS = {
    "before": os.environ.get("NOCLIP_BEFORE_URL", "http://127.0.0.1:4173"),
    "after": os.environ.get("NOCLIP_AFTER_URL", "http://127.0.0.1:4174"),
}
OUT = Path(os.environ.get("NOCLIP_RUNTIME_PROFILE_OUT", "artifacts/arch-streaming-runtime"))
OUT.mkdir(parents=True, exist_ok=True)


def percentile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return math.nan
    pos = (len(ordered) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    if lo == hi:
        return ordered[lo]
    w = pos - lo
    return ordered[lo] * (1 - w) + ordered[hi] * w


def summary(values: list[float]) -> dict[str, float]:
    return {
        "mean": round(statistics.fmean(values), 3),
        "median": round(statistics.median(values), 3),
        "p95": round(percentile(values, 0.95), 3),
        "p99": round(percentile(values, 0.99), 3),
        "max": round(max(values), 3),
    }


def driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    for arg in (
        "--headless=new", "--window-size=1440,900", "--use-angle=swiftshader", "--enable-webgl",
        "--ignore-gpu-blocklist", "--enable-precise-memory-info", "--disable-dev-shm-usage", "--no-sandbox",
    ):
        options.add_argument(arg)
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if binary:
        options.binary_location = binary
    value = webdriver.Chrome(options=options)
    value.set_page_load_timeout(60)
    value.set_script_timeout(90)
    return value


def wait_game(d: webdriver.Chrome) -> None:
    WebDriverWait(d, 45).until(lambda x: x.execute_script(
        "return Boolean(window.__testGame && window.__testGame.renderer && window.__testGame.camera && !document.querySelector('[data-ui=hud]').hidden);"
    ))
    d.execute_script("window.__testGame.paused=false;")


def webgl(d: webdriver.Chrome) -> dict[str, Any]:
    return dict(d.execute_script("""
      const c=document.querySelector('#game-canvas'); const gl=c&&(c.getContext('webgl2')||c.getContext('webgl'));
      if(!gl)return {available:false}; const ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {available:true,vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
    """))


def category_profile(profile: dict[str, Any]) -> dict[str, Any]:
    patterns = {
        "generateCell": re.compile(r"generateCell", re.I),
        "cellRendererConstruction": re.compile(r"buildCell|loadCell", re.I),
        "archReconstruction": re.compile(r"renderArchFrames|applyRegionPresentation|markNearbyArchCells", re.I),
        "fixtureEntityLightCreation": re.compile(r"attachFixtureLights|ensureFixture|reconcileFixture", re.I),
        "collisionRegistrationOrResolution": re.compile(r"toWorldCollider|resolveCircleAgainstAabbs|resolveMovement", re.I),
        "staticBatching": re.compile(r"reconcileStaticWorldBatches|assignStaticVisuals", re.I),
        "cellUnload": re.compile(r"unloadCell", re.I),
        "lightingRegionRefresh": re.compile(r"refreshLightField|refreshRegionExtent|notifyRegionEntry", re.I),
    }
    interval_us = 100
    totals = {key: 0.0 for key in patterns}
    matches: dict[str, list[dict[str, Any]]] = {key: [] for key in patterns}
    for node in profile.get("nodes", []):
        fn = str((node.get("callFrame") or {}).get("functionName") or "")
        hits = int(node.get("hitCount") or 0)
        if hits <= 0:
            continue
        self_ms = hits * interval_us / 1000.0
        for key, pattern in patterns.items():
            if pattern.search(fn):
                totals[key] += self_ms
                matches[key].append({"function": fn, "selfMs": round(self_ms, 3), "hits": hits})
    return {
        "samplingIntervalUs": interval_us,
        "selfMs": {key: round(value, 3) for key, value in totals.items()},
        "matches": matches,
        "note": "Chrome CPU sampling self-time; nested work is attributed to the nested named function rather than its caller."
    }


def run_motion(d: webdriver.Chrome, diagonal: bool) -> dict[str, Any]:
    d.execute_cdp_cmd("Profiler.enable", {})
    try:
        d.execute_cdp_cmd("Profiler.setSamplingInterval", {"interval": 100})
    except Exception:
        pass
    d.execute_cdp_cmd("Profiler.start", {})
    result = d.execute_async_script("""
      const diagonal=Boolean(arguments[0]), done=arguments[arguments.length-1];
      const g=window.__testGame; const r=g.renderer; const camera=g.camera;
      if(!g||!r||!camera){done({error:'test game not exposed'});return;}
      r.resolveMovement=(_cx,_cz,dx,dz)=>[dx,dz];
      g.paused=false; g.yaw=diagonal?-45:0; g.pitch=0; if(g.updateCameraRotation)g.updateCameraRotation();
      camera.setPosition(0,1.65,0); g.currentCellX=0; g.currentCellZ=0; g.regionExtentKey=''; g.updateStreaming(true,3);
      const intervals=[], boundaryIntervals=[], boundaryStates=[]; let last=performance.now();
      let cx=g.currentCellX, cz=g.currentCellZ, crossings=0, finished=false;
      const key=(type,key,code)=>window.dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true}));
      const stop=()=>{if(finished)return;finished=true;key('keyup','w','KeyW');key('keyup','Shift','ShiftLeft');if(diagonal)key('keyup','d','KeyD');
        done({intervals,boundaryIntervals,boundaryStates,crossings,diagnostics:window.__noclipStreamingDiagnostics||null,loaded:r.loaded.size,walls:r.walls.size});};
      key('keydown','Shift','ShiftLeft'); key('keydown','w','KeyW'); if(diagonal)key('keydown','d','KeyD');
      const timeout=setTimeout(stop,70000);
      function frame(now){
        const dt=now-last; last=now; if(dt>0)intervals.push(dt);
        if(g.currentCellX!==cx||g.currentCellZ!==cz){
          cx=g.currentCellX;cz=g.currentCellZ;crossings++;boundaryIntervals.push(dt);
          const id=`${cx}:${cz}`, visual=r.loaded.get(id); const children=visual?.root?.children||[];
          boundaryStates.push({cell:id,dt,loaded:Boolean(visual),enabled:Boolean(visual?.root?.enabled),colliders:visual?.colliders?.length||0,hasFloor:children.some(e=>e.name==='floor'||String(e.name||'').startsWith('floor-piece:')),loadedCount:r.loaded.size});
          if(crossings>=10){clearTimeout(timeout);setTimeout(stop,100);return;}
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    """, diagonal)
    profile = d.execute_cdp_cmd("Profiler.stop", {}).get("profile", {})
    if result.get("error"):
        raise AssertionError(result["error"])
    if int(result.get("crossings", 0)) < 10:
        raise AssertionError(f"Only {result.get('crossings')} crossings completed")
    intervals = [float(x) for x in result["intervals"] if float(x) > 0]
    boundary = [float(x) for x in result["boundaryIntervals"] if float(x) > 0]
    states = list(result["boundaryStates"])
    return {
        "mode": "diagonal" if diagonal else "straight",
        "crossings": result["crossings"],
        "frameMs": summary(intervals),
        "boundaryFrameMs": summary(boundary),
        "boundaryFrames": [round(x, 3) for x in boundary],
        "boundarySafety": {
            "allCurrentCellsLoaded": all(x.get("loaded") for x in states),
            "allCurrentRootsEnabled": all(x.get("enabled") for x in states),
            "allCurrentCellsHaveColliders": all(int(x.get("colliders", 0)) > 0 for x in states),
            "allCurrentCellsHaveFloor": all(x.get("hasFloor") for x in states),
            "states": states,
        },
        "diagnostics": result.get("diagnostics"),
        "loadedAfter": result.get("loaded"),
        "wallsAfter": result.get("walls"),
        "cpuProfile": category_profile(profile),
    }


def churn(d: webdriver.Chrome) -> dict[str, Any]:
    return dict(d.execute_script("""
      const g=window.__testGame,r=g.renderer,c=g.camera; g.paused=true;
      const unloadSum=()=>Object.values(g.save.unloadCounts||{}).reduce((a,b)=>a+Number(b||0),0);
      c.setPosition(6.8,1.65,0);g.currentCellX=0;g.currentCellZ=0;g.updateStreaming(true,3);
      const before={unloads:unloadSum(),loaded:r.loaded.size};
      for(let i=0;i<8;i++){const x=i%2===0?7.2:6.8;c.setPosition(x,1.65,0);g.currentCellX=i%2===0?1:0;g.currentCellZ=0;g.updateStreaming(false);}
      const after={unloads:unloadSum(),loaded:r.loaded.size};
      return {before,after,unloadDelta:after.unloads-before.unloads,loadedDelta:after.loaded-before.loaded,diagnostics:window.__noclipStreamingDiagnostics||null};
    """))


def severe(d: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored=("favicon.ico","AudioContext was not allowed to start")
    return [x for x in d.get_log("browser") if x.get("level")=="SEVERE" and not any(v in x.get("message","") for v in ignored)]


def capture_candidate_views(d: webdriver.Chrome) -> dict[str, Any]:
    # Force only the bounded Arch Region in the verification harness, without changing repository generation defaults.
    d.execute_script("""
      const g=window.__testGame; g.tuning={...g.tuning,regionOverride:'arch-rooms',gateBypass:true,activeRadius:1,conditionOverride:'clear',carverOverride:'none',structureOverride:'none'};
      g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.regionExtentKey='';g.updateStreaming(true,1);
    """)
    time.sleep(2)
    entities = d.execute_script("""
      const g=window.__testGame,out=[]; for(const v of g.renderer.loaded.values()) for(const e of (v.root.children||[])){
        const n=String(e.name||''); if(n.includes('arch-frame:')){const p=e.getPosition(),s=e.getLocalScale();out.push({name:n,x:p.x,y:p.y,z:p.z,sx:s.x,sy:s.y,sz:s.z});}
      } return out;
    """)
    if not entities:
        return {"warning":"No Arch frame entities found in forced radius-1 sample"}
    # Choose a shoulder/curve-ish entity near the origin and capture multiple inspection angles around it.
    target=min(entities,key=lambda e: e["x"]**2+e["z"]**2)
    views={
        "front": (target["x"],1.55,target["z"]+4.2),
        "oblique": (target["x"]+3.2,1.5,target["z"]+3.2),
        "underside": (target["x"]+0.4,0.85,target["z"]+1.6),
        "shared-pier": (target["x"]-2.8,1.35,target["z"]+2.8),
        "cell-boundary": (7.0,1.5,target["z"]+3.2),
    }
    captures={}
    for name,(x,y,z) in views.items():
        d.execute_script("""
          const g=window.__testGame;g.camera.setPosition(arguments[0],arguments[1],arguments[2]);g.camera.lookAt(arguments[3],arguments[4],arguments[5]);
        """,x,y,z,target["x"],max(1.7,target["y"]),target["z"])
        time.sleep(.35)
        path=OUT/f"arch-{name}.png"; d.save_screenshot(str(path)); captures[name]=path.name
    # World Lab showcase provides canonical close inspection of both new prop renderers.
    d.execute_script("window.dispatchEvent(new KeyboardEvent('keydown',{key:'`',code:'Backquote',bubbles:true}));")
    WebDriverWait(d,15).until(lambda x:'visible' in x.find_element(By.CSS_SELECTOR,'[data-ui="lab"]').get_attribute('class').split())
    options=d.find_elements(By.CSS_SELECTOR,'[data-lab="object-select"] option')
    prop_options=[str(o.get_attribute('textContent') or '').strip() for o in options if 'Bucket' in str(o.get_attribute('textContent') or '') or 'Paint Can' in str(o.get_attribute('textContent') or '')]
    d.execute_script("arguments[0].click();",d.find_element(By.CSS_SELECTOR,'[data-action="spawn-all-objects"]'))
    time.sleep(1)
    path=OUT/'world-lab-props.png';d.save_screenshot(str(path))
    return {"target":target,"archEntityCount":len(entities),"captures":captures,"worldLabPropOptions":prop_options,"worldLabCapture":path.name}


def profile(label: str, url: str) -> dict[str, Any]:
    d=driver(); report={"label":label,"url":url}
    try:
        d.get(url+'?autostart=1')
        wait_game(d)
        report["webgl"]=webgl(d)
        report["straight"]=run_motion(d,False)
        report["diagonal"]=run_motion(d,True)
        report["churn"]=churn(d)
        if label=="after": report["visualEvidence"]=capture_candidate_views(d)
        report["browserErrors"]=severe(d)
        if report["browserErrors"]: raise AssertionError(report["browserErrors"])
        return report
    finally:
        d.quit()


def main() -> None:
    report={"environment":{"browser":"Chrome headless","gpu":"SwiftShader","viewport":"1440x900","profileNote":"Collision resolution is replaced with pass-through only for repeatable straight/diagonal sprint traversal; all streaming, Cell construction, fixtures, Arch reconstruction, batching and render work remain live."}}
    for label,url in URLS.items():
        report[label]=profile(label,url)
    for mode in ("straight","diagonal"):
        before=report["before"][mode]["boundaryFrameMs"]
        after=report["after"][mode]["boundaryFrameMs"]
        report.setdefault("comparison",{})[mode]={
            "p95ReductionPct":round((before["p95"]-after["p95"])/before["p95"]*100,2) if before["p95"] else None,
            "p99ReductionPct":round((before["p99"]-after["p99"])/before["p99"]*100,2) if before["p99"] else None,
            "maxReductionPct":round((before["max"]-after["max"])/before["max"]*100,2) if before["max"] else None,
        }
    (OUT/'runtime-profile.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__': main()
