import json, math, shutil, statistics
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

OUT=Path('artifacts/boundary-profile-v4');OUT.mkdir(parents=True,exist_ok=True)
URLS={'before':'http://127.0.0.1:4173','after':'http://127.0.0.1:4174'}
def q(v,p):
 s=sorted(v);x=(len(s)-1)*p;a=math.floor(x);b=math.ceil(x);return s[a] if a==b else s[a]*(b-x)+s[b]*(x-a)
def stats(v):return {k:round(x,3) for k,x in {'mean':statistics.fmean(v),'median':statistics.median(v),'p95':q(v,.95),'p99':q(v,.99),'max':max(v)}.items()}
def make_driver():
 o=webdriver.ChromeOptions()
 for a in ('--headless=new','--window-size=960,600','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage','--no-sandbox'):o.add_argument(a)
 o.set_capability('goog:loggingPrefs',{'browser':'ALL'});b=shutil.which('google-chrome') or shutil.which('chromium')
 if b:o.binary_location=b
 d=webdriver.Chrome(options=o);d.set_script_timeout(180);d.set_page_load_timeout(60);return d
def wait(d):WebDriverWait(d,60).until(lambda x:x.execute_script("return !!(window.__testGame?.renderer&&window.__testGame?.camera&&!document.querySelector('[data-ui=hud]').hidden)"))
def gpu(d):return d.execute_script("const c=document.querySelector('#game-canvas'),g=c.getContext('webgl2')||c.getContext('webgl'),e=g.getExtension('WEBGL_debug_renderer_info');return {renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR)}")
def scenario(d,diag):
 r=d.execute_async_script(r"""
 const diag=arguments[0],done=arguments[arguments.length-1],g=window.__testGame,w=g.renderer,app=g.app;
 const blank=()=>({generateCalls:0,generateMs:0,cellBuildCalls:0,cellBuildMs:0,collisionRegistrationCalls:0,collisionRegistrationMs:0,archCalls:0,archMs:0,fixtureAttachCalls:0,fixtureAttachMs:0,staticBatchCalls:0,staticBatchMs:0,loadCalls:0,loadMs:0,unloadCalls:0,unloadMs:0,refreshCalls:0,refreshMs:0,regionRefreshCalls:0,regionRefreshMs:0,lightFieldCalls:0,lightFieldMs:0,batchDirtyCalls:0,batchDirtyMs:0,batchDirtyGroups:[]});
 app.autoRender=false;g.paused=true;
 if(!window.__probe){window.__probe=true;const wrap=(o,n,c,m)=>{const f=o[n].bind(o);o[n]=function(...a){const t=performance.now();try{return f(...a)}finally{const x=window.__streamProfileMetrics;if(x){x[c]++;x[m]+=performance.now()-t}}}};wrap(w,'loadCell','loadCalls','loadMs');wrap(w,'unloadCell','unloadCalls','unloadMs');wrap(w,'refreshCell','refreshCalls','refreshMs');for(const [n,c,m] of [['refreshRegionExtent','regionRefreshCalls','regionRefreshMs'],['notifyRegionEntry','regionRefreshCalls','regionRefreshMs'],['refreshLightField','lightFieldCalls','lightFieldMs']])wrap(g,n,c,m);const md=app.batcher.markGroupDirty.bind(app.batcher);app.batcher.markGroupDirty=function(id){const t=performance.now();try{return md(id)}finally{const x=window.__streamProfileMetrics;if(x){x.batchDirtyCalls++;x.batchDirtyMs+=performance.now()-t;x.batchDirtyGroups.push(id)}}}}
 g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.regionExtentKey='';window.__streamProfileMetrics=blank();g.updateStreaming(true,3);window.__streamProfileMetrics=blank();
 const boundary=[],prep=[],safety=[];let cx=0,cz=0,i=0;
 function step(){if(i>=10){setTimeout(()=>{const m=window.__streamProfileMetrics;m.batchDirtyGroups=[...new Set(m.batchDirtyGroups)];app.autoRender=true;app.renderNextFrame=true;done({boundary,prep,safety,metrics:m,diag:window.__noclipStreamingDiagnostics||null,loaded:w.loaded.size})},150);return}const nx=cx+1,nz=cz+(diag?1:0),pt=performance.now();for(let s=1;s<=16;s++){const f=s/17;g.camera.setPosition(cx*14+(nx-cx)*14*f*.49,1.65,cz*14+(nz-cz)*14*f*.49);g.update(0)}prep.push(performance.now()-pt);g.camera.setPosition(nx*14,1.65,nz*14);g.currentCellX=nx;g.currentCellZ=nz;const t=performance.now();g.updateStreaming(false);boundary.push(performance.now()-t);const cur=w.loaded.get(`${nx}:${nz}`),children=cur?.root?.children||[];let complete=true;for(let x=nx-3;x<=nx+3;x++)for(let z=nz-3;z<=nz+3;z++){const v=w.loaded.get(`${x}:${z}`);if(!v||!v.root.enabled)complete=false}safety.push({cell:`${nx}:${nz}`,loaded:!!cur,enabled:!!cur?.root?.enabled,colliders:cur?.colliders?.length||0,floor:children.some(e=>e.name==='floor'||String(e.name||'').startsWith('floor-piece:')),activeEnvelopeComplete:complete,loadedCount:w.loaded.size});cx=nx;cz=nz;i++;setTimeout(step,115)}step();
 """,diag)
 b=[float(x) for x in r['boundary']];p=[float(x) for x in r['prep']];m=r['metrics']
 for k,v in list(m.items()):
  if isinstance(v,float):m[k]=round(v,3)
 return {'crossings':len(b),'boundaryBlockingMs':stats(b),'samplesMs':[round(x,3) for x in b],'prepWorkMs':stats(p),'safety':r['safety'],'workTotals':m,'schedulerDiagnostics':r.get('diag'),'loadedAfter':r['loaded']}
def churn(d):return d.execute_script("const g=window.__testGame,w=g.renderer,a=g.app;a.autoRender=false;g.paused=true;g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.updateStreaming(true,3);let l=0,u=0;const ol=w.loadCell.bind(w),ou=w.unloadCell.bind(w);w.loadCell=(...x)=>{l++;return ol(...x)};w.unloadCell=(...x)=>{u++;return ou(...x)};for(let i=0;i<8;i++){const n=i%2===0?1:0;g.camera.setPosition(n*14,1.65,0);g.currentCellX=n;g.currentCellZ=0;g.updateStreaming(false)}a.autoRender=true;a.renderNextFrame=true;return {loadCalls:l,unloadCalls:u,loadedCells:w.loaded.size}")
def run(label,url):
 d=make_driver();o={'gpu':None}
 try:
  d.get(url+'?autostart=1');wait(d);o['gpu']=gpu(d);o['straight']=scenario(d,False)
  d.get(url+'?autostart=1');wait(d);o['diagonal']=scenario(d,True)
  d.get(url+'?autostart=1');wait(d);o['churn']=churn(d);o['browserErrors']=[e for e in d.get_log('browser') if e.get('level')=='SEVERE' and 'favicon.ico' not in e.get('message','')];return o
 finally:d.quit()
def main():
 report={'method':'Exact pre-change 2a183c9 and source candidate 04d89e8, same Chrome/SwiftShader runner. autoRender=false only during timing to isolate main-thread streaming blocking from non-representative software-GPU shadow raster. 16 predictive update ticks are allowed per 14 m Cell versus ~163 at a real 5.15 m/s 60 Hz sprint.'}
 for k,u in URLS.items():report[k]=run(k,u);(OUT/'partial.json').write_text(json.dumps(report,indent=2)+'\n')
 report['comparison']={}
 for mode in ('straight','diagonal'):
  b=report['before'][mode]['boundaryBlockingMs'];a=report['after'][mode]['boundaryBlockingMs'];report['comparison'][mode]={x:round((b[x]-a[x])/b[x]*100,2) for x in ('median','p95','p99','max')}
 (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
