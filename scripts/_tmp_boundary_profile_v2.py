from __future__ import annotations
import json, math, os, shutil, statistics, time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

OUT=Path('artifacts/boundary-profile-v2');OUT.mkdir(parents=True,exist_ok=True)
URLS={'before':'http://127.0.0.1:4173','after':'http://127.0.0.1:4174'}

def pct(v,q):
    s=sorted(v);p=(len(s)-1)*q;i=math.floor(p);j=math.ceil(p);return s[i] if i==j else s[i]*(j-p)+s[j]*(p-i)
def summ(v): return {k:round(x,3) for k,x in {'mean':statistics.fmean(v),'median':statistics.median(v),'p95':pct(v,.95),'p99':pct(v,.99),'max':max(v)}.items()}
def drv():
    o=webdriver.ChromeOptions()
    for a in ('--headless=new','--window-size=960,600','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage','--no-sandbox'):o.add_argument(a)
    o.set_capability('goog:loggingPrefs',{'browser':'ALL'})
    b=shutil.which('google-chrome') or shutil.which('chromium')
    if b:o.binary_location=b
    d=webdriver.Chrome(options=o);d.set_script_timeout(180);d.set_page_load_timeout(60);return d

def wait(d): WebDriverWait(d,60).until(lambda x:x.execute_script("return !!(window.__testGame?.renderer&&window.__testGame?.camera&&!document.querySelector('[data-ui=hud]').hidden)"))
def gpu(d): return d.execute_script("const c=document.querySelector('#game-canvas'),g=c.getContext('webgl2')||c.getContext('webgl'),e=g.getExtension('WEBGL_debug_renderer_info');return {renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR)}")

def cpu_categories(profile):
    pats={'generateCell':['generateCell'],'cellRenderer':['buildCell','loadCell'],'arch':['renderArchFrames','applyRegionPresentation','markNearbyArchCells'],'fixture':['attachFixture','fixtureLight','reconcileFixture'],'collision':['toWorldCollider','resolveCircleAgainstAabbs','resolveMovement'],'batching':['reconcileStaticWorldBatches','assignStaticVisuals'],'unload':['unloadCell'],'lightingRegion':['refreshLightField','refreshRegionExtent','notifyRegionEntry']}
    out={k:0.0 for k in pats};names={k:[] for k in pats}
    for n in profile.get('nodes',[]):
        fn=str((n.get('callFrame') or {}).get('functionName') or '');ms=float(n.get('hitCount') or 0)*.1
        if not ms:continue
        for k,words in pats.items():
            if any(w.lower() in fn.lower() for w in words):out[k]+=ms;names[k].append([fn,round(ms,3)])
    return {'selfMs':{k:round(v,3) for k,v in out.items()},'matches':names,'samplingIntervalUs':100}

def scenario(d,diag):
    d.execute_cdp_cmd('Profiler.enable',{})
    try:d.execute_cdp_cmd('Profiler.setSamplingInterval',{'interval':100})
    except:pass
    d.execute_cdp_cmd('Profiler.start',{})
    res=d.execute_async_script(r"""
      const diagonal=arguments[0],done=arguments[arguments.length-1],g=window.__testGame,r=g.renderer;
      const app=g.app,rendering=app; rendering.autoRender=false; g.paused=true;
      const blank=()=>({loadCalls:0,loadMs:0,unloadCalls:0,unloadMs:0,refreshCalls:0,refreshMs:0,regionMs:0,lightFieldMs:0,batchDirtyCalls:0,batchDirtyGroups:[]});
      if(!window.__probeWrapped){
        window.__probeWrapped=true;
        const wrap=(obj,name,calls,ms)=>{const orig=obj[name].bind(obj);obj[name]=function(...a){const t=performance.now();try{return orig(...a)}finally{const m=window.__probeMetrics;m[calls]++;m[ms]+=performance.now()-t}}};
        wrap(r,'loadCell','loadCalls','loadMs');wrap(r,'unloadCell','unloadCalls','unloadMs');wrap(r,'refreshCell','refreshCalls','refreshMs');
        for(const [name,key] of [['refreshRegionExtent','regionMs'],['notifyRegionEntry','regionMs'],['refreshLightField','lightFieldMs']]){const orig=g[name].bind(g);g[name]=function(...a){const t=performance.now();try{return orig(...a)}finally{window.__probeMetrics[key]+=performance.now()-t}}}
        const bm=app.batcher,md=bm.markGroupDirty.bind(bm);bm.markGroupDirty=function(id){const m=window.__probeMetrics;m.batchDirtyCalls++;m.batchDirtyGroups.push(id);return md(id)};
      }
      window.__probeMetrics=blank();
      g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.regionExtentKey='';g.updateStreaming(true,3);
      window.__probeMetrics=blank();
      const times=[],safety=[];let cx=0,cz=0,index=0;
      const tick=()=>{
        if(index>=10){setTimeout(()=>{const m=window.__probeMetrics;m.batchDirtyGroups=[...new Set(m.batchDirtyGroups)];rendering.autoRender=true;rendering.renderNextFrame=true;done({times,safety,metrics:m,diagnostics:window.__noclipStreamingDiagnostics||null,loaded:r.loaded.size})},120);return}
        const nx=cx+1,nz=cz+(diagonal?1:0);
        // Sixteen conservative prep ticks: far fewer than a real 60 Hz sprint gets per 14 m Cell.
        for(let s=1;s<=16;s++){const f=s/17;g.camera.setPosition(cx*14+(nx-cx)*14*f*.49,1.65,cz*14+(nz-cz)*14*f*.49);g.update(0)}
        g.camera.setPosition(nx*14,1.65,nz*14);g.currentCellX=nx;g.currentCellZ=nz;
        const t=performance.now();g.updateStreaming(false);times.push(performance.now()-t);
        const cur=r.loaded.get(`${nx}:${nz}`),children=cur?.root?.children||[];let activeComplete=true;
        for(let x=nx-3;x<=nx+3;x++)for(let z=nz-3;z<=nz+3;z++){const v=r.loaded.get(`${x}:${z}`);if(!v||!v.root.enabled)activeComplete=false}
        safety.push({cell:`${nx}:${nz}`,currentLoaded:!!cur,currentEnabled:!!cur?.root?.enabled,colliders:cur?.colliders?.length||0,floor:children.some(e=>e.name==='floor'||String(e.name||'').startsWith('floor-piece:')),activeEnvelopeComplete:activeComplete,loadedCount:r.loaded.size});
        cx=nx;cz=nz;index++;setTimeout(tick,80)
      };tick();
    """,diag)
    prof=d.execute_cdp_cmd('Profiler.stop',{}).get('profile',{})
    vals=[float(x) for x in res['times']]
    return {'mode':'diagonal' if diag else 'straight','crossings':len(vals),'boundaryMainThreadMs':summ(vals),'samples':[round(x,3) for x in vals],'safety':res['safety'],'metrics':{k:(round(v,3) if isinstance(v,float) else v) for k,v in res['metrics'].items()},'diagnostics':res.get('diagnostics'),'loadedAfter':res['loaded'],'cpu':cpu_categories(prof)}

def churn(d):
    return d.execute_script(r"""
      const g=window.__testGame,r=g.renderer;g.paused=true;g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.updateStreaming(true,3);
      let loads=0,unloads=0;const ol=r.loadCell.bind(r),ou=r.unloadCell.bind(r);r.loadCell=(...a)=>{loads++;return ol(...a)};r.unloadCell=(...a)=>{unloads++;return ou(...a)};
      for(let i=0;i<8;i++){const next=i%2?0:1;g.camera.setPosition((next?6.9:7.1),1.65,0);g.currentCellX=next;g.currentCellZ=0;g.updateStreaming(false)}
      return {loadCalls:loads,unloadCalls:unloads,loadedCells:r.loaded.size};
    """)

def visual(d):
    d.execute_script(r"""
      const g=window.__testGame,r=g.renderer;g.paused=true;for(const id of [...r.loaded.keys()])r.unloadCell(id);
      g.tuning={...g.tuning,regionOverride:'arch-rooms',gateBypass:true,conditionOverride:'clear',carverOverride:'none',structureOverride:'none'};g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.regionExtentKey='';g.updateStreaming(true,2);
    """);time.sleep(2)
    data=d.execute_script(r"""
      const g=window.__testGame,arches=[],props=[];for(const v of g.renderer.loaded.values()){for(const e of(v.root.children||[])){if(String(e.name||'').includes('arch-frame:')){const p=e.getPosition();arches.push({name:e.name,x:p.x,y:p.y,z:p.z})}}for(const p of v.descriptor.props||[])if(p.kind==='bucket'||p.kind==='paint-can')props.push({kind:p.kind,cell:v.descriptor.id,x:v.descriptor.address.cellX*14+p.position.x,y:p.position.y,z:v.descriptor.address.cellZ*14+p.position.z})}return {arches,props}
    """)
    shots={}
    if data['arches']:
      t=min(data['arches'],key=lambda e:e['x']**2+e['z']**2)
      views={'front':(t['x'],1.5,t['z']+4),'oblique':(t['x']+3,1.45,t['z']+3),'underside':(t['x']+.3,.75,t['z']+1.5),'shared-pier':(t['x']-2.7,1.4,t['z']+2.5),'cell-boundary':(7,1.5,t['z']+3)}
      for name,(x,y,z) in views.items():
        d.execute_script("const g=window.__testGame;g.camera.setPosition(arguments[0],arguments[1],arguments[2]);g.camera.lookAt(arguments[3],arguments[4],arguments[5]);g.app.renderNextFrame=true",x,y,z,t['x'],2.25,t['z']);time.sleep(.4);p=OUT/f'arch-{name}.png';d.save_screenshot(str(p));shots[name]=p.name
    for kind in ('bucket','paint-can'):
      ps=[p for p in data['props'] if p['kind']==kind]
      if ps:
        p=ps[0];d.execute_script("const g=window.__testGame;g.camera.setPosition(arguments[0]+1.25,1.05,arguments[1]+1.25);g.camera.lookAt(arguments[0],.3,arguments[1]);g.app.renderNextFrame=true",p['x'],p['z']);time.sleep(.4);f=OUT/f'prop-{kind}.png';d.save_screenshot(str(f));shots[kind]=f.name
    return {'archEntityCount':len(data['arches']),'naturalArchProps':data['props'],'shots':shots}

def run(label,url):
  d=drv();out={'label':label,'url':url}
  try:
    d.get(url+'?autostart=1');wait(d);out['gpu']=gpu(d);out['straight']=scenario(d,False);out['diagonal']=scenario(d,True);out['churn']=churn(d)
    if label=='after':out['visual']=visual(d)
    out['browserErrors']=[x for x in d.get_log('browser') if x.get('level')=='SEVERE' and 'favicon.ico' not in x.get('message','')]
    return out
  finally:d.quit()

def main():
  report={'method':'Same-runner headless Chrome/SwiftShader. Full raster rendering is disabled only during transition timing so measurements isolate the main-thread Cell-boundary spike; rendering is re-enabled for visual captures. Each crossing gets 16 predictive prep ticks, substantially fewer than a real 60 Hz 5.15 m/s sprint has across a 14 m Cell.'}
  for k,u in URLS.items():report[k]=run(k,u)
  report['comparison']={}
  for mode in ('straight','diagonal'):
    b=report['before'][mode]['boundaryMainThreadMs'];a=report['after'][mode]['boundaryMainThreadMs'];report['comparison'][mode]={x:round((b[x]-a[x])/b[x]*100,2) for x in ('p95','p99','max')}
  (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
