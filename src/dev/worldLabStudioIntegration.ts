import { STUDIO_TARGETS } from '../presentation/studioTargets.js';
import { WORLD_LAB_STUDIO_EVENT, type WorldLabStudioAction } from './studioBridgeProtocol.js';
function dispatch(action:WorldLabStudioAction):void{window.dispatchEvent(new CustomEvent<WorldLabStudioAction>(WORLD_LAB_STUDIO_EVENT,{detail:action}));}
export function installWorldLabStudioIntegration():void{
  const lab=document.querySelector<HTMLElement>('.world-lab'); if(!lab||lab.querySelector('[data-ui="studio-integration"]'))return;
  const section=document.createElement('section');section.className='lab-section';section.dataset.ui='studio-integration';
  const options=STUDIO_TARGETS.map((target)=>`<option value="${target.semanticTargetId}">${target.shortAddress?`${target.shortAddress} — `:''}${target.humanName}${target.structuredEditable?' · PAU editable':' · inspect only'}</option>`).join('');
  section.innerHTML=`<div class="lab-section-heading"><h3>Noclip Studio</h3><span>local development only</span></div><p class="lab-copy">World Lab remains runtime QA. Studio owns source-backed authoring, diffs, assets and ChangeReceipts.</p><div class="lab-grid"><label class="full">Current target<select data-lab="studio-target">${options}</select></label><button data-action="studio-inspect">Inspect</button><button data-action="studio-isolate">Isolate</button><button class="full" data-action="open-in-studio">Open in Studio</button></div>`;
  const metrics=lab.querySelector('[data-ui="metrics"]');lab.insertBefore(section,metrics??null);const select=section.querySelector<HTMLSelectElement>('[data-lab="studio-target"]')!;
  section.querySelector('[data-action="studio-inspect"]')?.addEventListener('click',()=>dispatch({type:'inspect',targetId:select.value}));
  section.querySelector('[data-action="studio-isolate"]')?.addEventListener('click',()=>dispatch({type:'isolate',targetId:select.value}));
  section.querySelector('[data-action="open-in-studio"]')?.addEventListener('click',()=>{dispatch({type:'open',targetId:select.value});window.open(`http://127.0.0.1:4311/?target=${encodeURIComponent(select.value)}`,'noclip-studio');});
}
