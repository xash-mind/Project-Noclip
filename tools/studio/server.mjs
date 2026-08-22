import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetLibrary, canonicalContext, canonicalProfiles, canonicalRegistry, canonicalTargets, commandsAfter, createStudioState, focusBridgeTarget, importAsset, latestBridgeState, listReceipts, projectStatus, queueBridgeCommand, readReceipt, recordBridgeState, revertStudioChange, runValidationAction, studioDiff } from './server-core.mjs';
import { canRevertStructuredReceipt, isStructuredSourceTarget, revertStructuredSourceChange, saveStructuredSourceChange } from './structured-authoring.mjs';
import { canonicalCall } from './canonical-client.mjs';

const ROOT=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const CLIENT_ROOT=resolve(ROOT,'tools/studio/client');
const PUBLIC_ROOT=resolve(ROOT,'public');
const token=process.env.NOCLIP_STUDIO_TOKEN;
if(!token)throw new Error('Noclip Studio server requires NOCLIP_STUDIO_TOKEN. Start it with npm run studio.');
const state=createStudioState(ROOT);
const PORT=4311;
const LOCAL_BRIDGE_HOSTS=new Set(['127.0.0.1','localhost','::1','[::1]']);
for(const addresses of Object.values(networkInterfaces()))for(const address of addresses??[])if(address.family==='IPv4'&&!address.internal)LOCAL_BRIDGE_HOSTS.add(address.address);

function json(res,status,value,headers={}){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store',...headers});res.end(body);}
function text(res,status,value,type='text/plain; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Content-Length':Buffer.byteLength(value),'Cache-Control':'no-store'});res.end(value);}
function isDevelopmentBridgeOrigin(origin){if(!origin)return false;try{const parsed=new URL(origin);return(parsed.protocol==='http:'||parsed.protocol==='https:')&&LOCAL_BRIDGE_HOSTS.has(parsed.hostname);}catch{return false;}}
function bridgeCors(req,path){const origin=req.headers.origin;if(!path.startsWith('/api/bridge/')||!isDevelopmentBridgeOrigin(origin))return{};const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, X-Noclip-Studio-Token','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin, Access-Control-Request-Private-Network'};if(req.headers['access-control-request-private-network']==='true')headers['Access-Control-Allow-Private-Network']='true';return headers;}
function sameOrigin(req){const origin=req.headers.origin;return!origin||origin===`http://127.0.0.1:${PORT}`||origin===`http://localhost:${PORT}`;}
function bridgeAuth(req){return req.headers['x-noclip-studio-token']===token;}
async function body(req,limit=35*1024*1024){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('Request body exceeds Studio limit');chunks.push(chunk);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
function safeStatic(root,path){const candidate=resolve(root,`.${path}`),rel=relative(root,candidate);if(rel.startsWith('..')||isAbsolute(rel))throw new Error('Unsafe static path');return candidate;}
function mime(path){return({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.m4a':'audio/mp4','.glb':'model/gltf-binary'})[extname(path).toLowerCase()]??'application/octet-stream';}
function contextPacket(targetId,observation,request,mode='CHANGE'){const runtime=latestBridgeState(state);if(runtime?.developmentContext?.designTarget?.semanticTargetId===targetId){const context=structuredClone(runtime.developmentContext);context.project.branchOrRef=projectStatus(state).branch||context.project.branchOrRef;if(observation)context.userObservation=observation;else delete context.userObservation;if(request)context.requestedChange=request;else delete context.requestedChange;return canonicalCall(ROOT,'context-packet',{context,mode});}return canonicalContext(state,targetId,{userObservation:observation,requestedChange:request,mode});}

const server=createServer(async(req,res)=>{
  const url=new URL(req.url??'/',`http://127.0.0.1:${PORT}`);const headers=bridgeCors(req,url.pathname);
  if(req.method==='OPTIONS'){if(!url.pathname.startsWith('/api/bridge/')||!isDevelopmentBridgeOrigin(req.headers.origin))return json(res,403,{error:'Studio bridge accepts only this machine\'s local development origins'});res.writeHead(204,headers);res.end();return;}
  try{
    if(url.pathname.startsWith('/api/bridge/')){
      if(!bridgeAuth(req))return json(res,403,{error:'Invalid local Studio bridge token'},headers);
      if(req.method==='POST'&&url.pathname==='/api/bridge/state')return json(res,200,recordBridgeState(state,await body(req)),headers);
      if(req.method==='GET'&&url.pathname==='/api/bridge/commands')return json(res,200,commandsAfter(state,Number(url.searchParams.get('after')??0)),headers);
      if(req.method==='POST'&&url.pathname==='/api/bridge/focus'){const input=await body(req);focusBridgeTarget(state,input.targetId);return json(res,200,{ok:true},headers);}
      return json(res,404,{error:'Unknown bridge endpoint'},headers);
    }
    if(url.pathname.startsWith('/api/')&&!sameOrigin(req))return json(res,403,{error:'Privileged Noclip Studio APIs are same-origin loopback only'});
    if(req.method==='GET'&&url.pathname==='/api/bootstrap')return json(res,200,{targets:canonicalTargets(state),registry:canonicalRegistry(state),profiles:canonicalProfiles(state),git:projectStatus(state),assets:assetLibrary(state),receipts:listReceipts(ROOT),runtime:latestBridgeState(state),focusTargetId:state.bridgeFocus});
    if(req.method==='GET'&&url.pathname==='/api/context'){const targetId=url.searchParams.get('target');if(!targetId)throw new Error('context target is required');return json(res,200,contextPacket(targetId,url.searchParams.get('observation')||undefined,url.searchParams.get('request')||undefined,url.searchParams.get('mode')||'CHANGE'));}
    if(req.method==='GET'&&url.pathname==='/api/git')return json(res,200,projectStatus(state));
    if(req.method==='GET'&&url.pathname==='/api/diff')return json(res,200,studioDiff(state));
    if(req.method==='GET'&&url.pathname==='/api/receipts')return json(res,200,listReceipts(ROOT));
    if(req.method==='GET'&&url.pathname==='/api/receipt')return json(res,200,readReceipt(ROOT,url.searchParams.get('id')??''));
    if(req.method==='GET'&&url.pathname==='/api/assets')return json(res,200,assetLibrary(state));
    if(req.method==='POST'&&url.pathname==='/api/command'){const input=await body(req);return json(res,200,queueBridgeCommand(state,{type:input.type,targetId:input.targetId,payload:input.payload}));}
    if(req.method==='POST'&&url.pathname==='/api/save'){
      const input=await body(req);if(!isStructuredSourceTarget(ROOT,input.targetId))throw new Error(`${input.targetId} is not a structured Studio authoring target`);
      const result=saveStructuredSourceChange(state,input);
      queueBridgeCommand(state,{type:'clear-preview',targetId:result.receipt.semanticTarget.semanticTargetId});queueBridgeCommand(state,{type:'refresh-presentation',targetId:result.receipt.semanticTarget.semanticTargetId});return json(res,200,result);
    }
    if(req.method==='POST'&&url.pathname==='/api/revert'){
      const input=await body(req),result=canRevertStructuredReceipt(ROOT,input.receiptId)?revertStructuredSourceChange(state,input.receiptId):revertStudioChange(state,input.receiptId);
      queueBridgeCommand(state,{type:'clear-all-previews'});queueBridgeCommand(state,{type:'refresh-presentation'});return json(res,200,result);
    }
    if(req.method==='POST'&&url.pathname==='/api/validation'){const input=await body(req);return json(res,200,runValidationAction(state,input.action,input.targetId));}
    if(req.method==='POST'&&url.pathname==='/api/assets/import')return json(res,200,importAsset(state,await body(req)));
    if(url.pathname.startsWith('/assets/runtime/')){const path=safeStatic(PUBLIC_ROOT,url.pathname);if(!existsSync(path))return text(res,404,'Asset runtime file not found');const bytes=readFileSync(path);res.writeHead(200,{'Content-Type':mime(path),'Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(bytes);return;}
    const requestPath=url.pathname==='/'?'/index.html':url.pathname,path=safeStatic(CLIENT_ROOT,requestPath);if(!existsSync(path))return text(res,404,'Noclip Studio resource not found');const bytes=readFileSync(path);res.writeHead(200,{'Content-Type':mime(path),'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; media-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"});res.end(bytes);
  }catch(error){console.error('[Studio]',error);json(res,400,{error:error instanceof Error?error.message:String(error)},headers);}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`Noclip Studio server listening on http://127.0.0.1:${PORT}; bridge origins: ${[...LOCAL_BRIDGE_HOSTS].join(', ')}`));
