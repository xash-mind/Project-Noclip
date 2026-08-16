from __future__ import annotations
import json, math, shutil, statistics
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

OUT = Path('artifacts/boundary-profile-v3')
OUT.mkdir(parents=True, exist_ok=True)
URLS = {'before': 'http://127.0.0.1:4173', 'after': 'http://127.0.0.1:4174'}


def percentile(values, q):
    values = sorted(values)
    p = (len(values) - 1) * q
    lo, hi = math.floor(p), math.ceil(p)
    if lo == hi: return values[lo]
    return values[lo] * (hi - p) + values[hi] * (p - lo)


def stats(values):
    return {k: round(v, 3) for k, v in {
        'mean': statistics.fmean(values), 'median': statistics.median(values),
        'p95': percentile(values, .95), 'p99': percentile(values, .99), 'max': max(values)
    }.items()}


def driver():
    options = webdriver.ChromeOptions()
    for arg in ('--headless=new','--window-size=960,600','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage','--no-sandbox'):
        options.add_argument(arg)
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    binary = shutil.which('google-chrome') or shutil.which('chromium')
    if binary: options.binary_location = binary
    d = webdriver.Chrome(options=options)
    d.set_page_load_timeout(60); d.set_script_timeout(180)
    return d


def wait_game(d):
    WebDriverWait(d, 60).until(lambda x: x.execute_script("return !!(window.__testGame?.renderer&&window.__testGame?.camera&&!document.querySelector('[data-ui=hud]').hidden)"))


def gpu(d):
    return d.execute_script("""
      const c=document.querySelector('#game-canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),e=gl.getExtension('WEBGL_debug_renderer_info');
      return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:e?gl.getParameter(e.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};
    """)


def scenario(d, diagonal):
    result = d.execute_async_script(r"""
      const diagonal=arguments[0], done=arguments[arguments.length-1], g=window.__testGame, r=g.renderer, app=g.app;
      const blank=()=>({generateCalls:0,generateMs:0,cellBuildCalls:0,cellBuildMs:0,collisionRegistrationCalls:0,collisionRegistrationMs:0,archCalls:0,archMs:0,fixtureAttachCalls:0,fixtureAttachMs:0,staticBatchCalls:0,staticBatchMs:0,loadCalls:0,loadMs:0,unloadCalls:0,unloadMs:0,refreshCalls:0,refreshMs:0,regionRefreshCalls:0,regionRefreshMs:0,lightFieldCalls:0,lightFieldMs:0,batchDirtyCalls:0,batchDirtyGroups:[]});
      app.autoRender=false; g.paused=true;
      if(!window.__instanceProbeWrapped){
        window.__instanceProbeWrapped=true;
        const wrap=(obj,name,calls,ms)=>{const original=obj[name].bind(obj);obj[name]=function(...args){const t=performance.now();try{return original(...args)}finally{const m=window.__streamProfileMetrics;if(m){m[calls]++;m[ms]+=performance.now()-t}}}};
        wrap(r,'loadCell','loadCalls','loadMs'); wrap(r,'unloadCell','unloadCalls','unloadMs'); wrap(r,'refreshCell','refreshCalls','refreshMs');
        for(const [name,calls,ms] of [['refreshRegionExtent','regionRefreshCalls','regionRefreshMs'],['notifyRegionEntry','regionRefreshCalls','regionRefreshMs'],['refreshLightField','lightFieldCalls','lightFieldMs']]) wrap(g,name,calls,ms);
        const dirty=app.batcher.markGroupDirty.bind(app.batcher); app.batcher.markGroupDirty=function(id){const m=window.__streamProfileMetrics;if(m){m.batchDirtyCalls++;m.batchDirtyGroups.push(id)}return dirty(id)};
      }
      g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.regionExtentKey='';window.__streamProfileMetrics=blank();g.updateStreaming(true,3);
      window.__streamProfileMetrics=blank();
      const boundary=[], safety=[], prepMs=[]; let cx=0,cz=0,index=0;
      const next=()=>{
        if(index>=10){setTimeout(()=>{const m=window.__streamProfileMetrics;m.batchDirtyGroups=[...new Set(m.batchDirtyGroups)];app.autoRender=true;app.renderNextFrame=true;done({boundary,safety,prepMs,metrics:m,diagnostics:window.__noclipStreamingDiagnostics||null,loaded:r.loaded.size})},140);return}
        const nx=cx+1,nz=cz+(diagonal?1:0); const pt=performance.now();
        for(let s=1;s<=16;s++){
          const f=s/17;g.camera.setPosition(cx*14+(nx-cx)*14*f*.49,1.65,cz*14+(nz-cz)*14*f*.49);g.update(0);
        }
        prepMs.push(performance.now()-pt);
        g.camera.setPosition(nx*14,1.65,nz*14);g.currentCellX=nx;g.currentCellZ=nz;
        const t=performance.now();g.updateStreaming(false);boundary.push(performance.now()-t);
        const current=r.loaded.get(`${nx}:${nz}`),children=current?.root?.children||[];let activeComplete=true;
        for(let x=nx-3;x<=nx+3;x++)for(let z=nz-3;z<=nz+3;z++){const v=r.loaded.get(`${x}:${z}`);if(!v||!v.root.enabled)activeComplete=false}
        safety.push({cell:`${nx}:${nz}`,currentLoaded:!!current,currentEnabled:!!current?.root?.enabled,colliders:current?.colliders?.length||0,floor:children.some(e=>e.name==='floor'||String(e.name||'').startsWith('floor-piece:')),activeEnvelopeComplete:activeComplete,loadedCount:r.loaded.size});
        cx=nx;cz=nz;index++;setTimeout(next,115);
      };next();
    """, diagonal)
    b = [float(x) for x in result['boundary']]
    p = [float(x) for x in result['prepMs']]
    metrics = result['metrics']
    for key, value in list(metrics.items()):
        if isinstance(value, float): metrics[key] = round(value, 3)
    return {
        'mode': 'diagonal' if diagonal else 'straight', 'crossings': len(b),
        'boundaryBlockingMs': stats(b), 'boundarySamplesMs': [round(x,3) for x in b],
        'predictivePrepTotalMsPerCell': stats(p), 'safety': result['safety'],
        'workTotals': metrics, 'schedulerDiagnostics': result.get('diagnostics'), 'loadedAfter': result['loaded']
    }


def churn(d):
    return d.execute_script(r"""
      const g=window.__testGame,r=g.renderer,app=g.app;app.autoRender=false;g.paused=true;g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.updateStreaming(true,3);
      let loads=0,unloads=0;const ol=r.loadCell.bind(r),ou=r.unloadCell.bind(r);r.loadCell=(...a)=>{loads++;return ol(...a)};r.unloadCell=(...a)=>{unloads++;return ou(...a)};
      for(let i=0;i<8;i++){const nx=i%2===0?1:0;g.camera.setPosition(nx*14,1.65,0);g.currentCellX=nx;g.currentCellZ=0;g.updateStreaming(false)}
      app.autoRender=true;app.renderNextFrame=true;return {loadCalls:loads,unloadCalls:unloads,loadedCells:r.loaded.size};
    """)


def run(label, url):
    d=driver(); out={'label':label,'url':url}
    try:
        d.get(url+'?autostart=1');wait_game(d);out['gpu']=gpu(d)
        out['straight']=scenario(d,False)
        # fresh deterministic page for diagonal so prior retained Cells cannot help it
        d.get(url+'?autostart=1');wait_game(d);out['diagonal']=scenario(d,True)
        d.get(url+'?autostart=1');wait_game(d);out['churn']=churn(d)
        out['browserErrors']=[e for e in d.get_log('browser') if e.get('level')=='SEVERE' and 'favicon.ico' not in e.get('message','')]
        return out
    finally: d.quit()


def main():
    report={'method': 'Exact pre-change and candidate production bundles in the same Ubuntu/Chrome/SwiftShader runner. Raster auto-render is disabled only while timing so boundary numbers measure main-thread streaming transition blocking rather than software-GPU shadow cost. Each 14 m transition receives 16 predictive update ticks; a real 5.15 m/s sprint at 60 Hz would provide ~163 update opportunities per Cell.'}
    for label,url in URLS.items():
        report[label]=run(label,url)
        (OUT/'partial.json').write_text(json.dumps(report,indent=2)+'\n')
    report['comparison']={}
    for mode in ('straight','diagonal'):
        before=report['before'][mode]['boundaryBlockingMs'];after=report['after'][mode]['boundaryBlockingMs']
        report['comparison'][mode]={key:round((before[key]-after[key])/before[key]*100,2) for key in ('median','p95','p99','max')}
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__': main()
