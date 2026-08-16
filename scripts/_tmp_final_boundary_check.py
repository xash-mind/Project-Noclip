import json, math, shutil, statistics
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

OUT=Path('artifacts/final-boundary-check'); OUT.mkdir(parents=True,exist_ok=True)

def pct(v,p):
 s=sorted(v); x=(len(s)-1)*p; a=math.floor(x); b=math.ceil(x); return s[a] if a==b else s[a]*(b-x)+s[b]*(x-a)
def stat(v): return {k:round(x,3) for k,x in {'median':statistics.median(v),'p95':pct(v,.95),'p99':pct(v,.99),'max':max(v)}.items()}
def drv():
 o=webdriver.ChromeOptions()
 for a in ('--headless=new','--window-size=960,600','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage','--no-sandbox'):o.add_argument(a)
 b=shutil.which('google-chrome') or shutil.which('chromium')
 if b:o.binary_location=b
 d=webdriver.Chrome(options=o); d.set_script_timeout(180); d.set_page_load_timeout(60); return d
def wait(d): WebDriverWait(d,60).until(lambda x:x.execute_script("return !!(window.__testGame?.renderer&&window.__testGame?.camera&&!document.querySelector('[data-ui=hud]').hidden)"))
def run_case(d,diag):
 r=d.execute_async_script(r"""
 const diag=arguments[0],done=arguments[arguments.length-1],g=window.__testGame,w=g.renderer,a=g.app;a.autoRender=false;g.paused=true;
 g.currentCellX=0;g.currentCellZ=0;g.camera.setPosition(0,1.65,0);g.regionExtentKey='';g.updateStreaming(true,3);
 const tms=[],safe=[];let cx=0,cz=0,i=0;
 function go(){if(i===10){a.autoRender=true;a.renderNextFrame=true;done({tms,safe,diag:window.__noclipStreamingDiagnostics||null,loaded:w.loaded.size});return}const nx=cx+1,nz=cz+(diag?1:0);for(let s=1;s<=16;s++){const f=s/17;g.camera.setPosition(cx*14+(nx-cx)*14*f*.49,1.65,cz*14+(nz-cz)*14*f*.49);g.update(0)}g.camera.setPosition(nx*14,1.65,nz*14);g.currentCellX=nx;g.currentCellZ=nz;const t=performance.now();g.updateStreaming(false);tms.push(performance.now()-t);const cur=w.loaded.get(`${nx}:${nz}`),children=cur?.root?.children||[];let active=true;for(let x=nx-3;x<=nx+3;x++)for(let z=nz-3;z<=nz+3;z++){const v=w.loaded.get(`${x}:${z}`);if(!v||!v.root.enabled)active=false}safe.push({loaded:!!cur,enabled:!!cur?.root?.enabled,floor:children.some(e=>e.name==='floor'||String(e.name||'').startsWith('floor-piece:')),active});cx=nx;cz=nz;i++;setTimeout(go,40)}go();
 """,diag)
 vals=[float(x) for x in r['tms']]
 return {'timing':stat(vals),'samples':[round(x,3) for x in vals],'safe':all(x['loaded'] and x['enabled'] and x['floor'] and x['active'] for x in r['safe']),'diagnostics':r.get('diag'),'loadedAfter':r['loaded']}
def run(url):
 d=drv()
 try:
  d.get(url+'?autostart=1');wait(d);straight=run_case(d,False)
  d.get(url+'?autostart=1');wait(d);diag=run_case(d,True)
  return {'straight':straight,'diagonal':diag}
 finally:d.quit()
def main():
 report={'method':'Exact pre-change and final source, same Chrome/SwiftShader runner, autoRender disabled during transition timing; 16 predictive update ticks per 14 m Cell.'}
 report['before']=run('http://127.0.0.1:4173'); report['after']=run('http://127.0.0.1:4174')
 report['comparison']={}
 for mode in ('straight','diagonal'):
  b=report['before'][mode]['timing'];a=report['after'][mode]['timing'];report['comparison'][mode]={k:round((b[k]-a[k])/b[k]*100,2) for k in ('median','p95','p99','max')}
 (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
