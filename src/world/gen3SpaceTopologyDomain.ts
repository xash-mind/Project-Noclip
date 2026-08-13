import { sampleWorldFieldChannels } from './fields.js';
import { stableId, unitFloat } from './hash.js';
import type { MaterialId, WorldTuning } from './types.js';
import { linePosition, sampleGen3RegionInfluence, strength, type Gen3RegionInfluence } from './gen3ArchitectureCore.js';

export const TOPOLOGY_GRID = 4.2;
export const DOMAIN_MAJOR_SPANS = 4;
export const DOMAIN_FINE_SPANS = DOMAIN_MAJOR_SPANS * 2;
export const TOPOLOGY_LOOP_MIN = 0.16;
export const TOPOLOGY_LOOP_MAX = 0.32;
export const TOPOLOGY_ARCH_MAX_SHARE = 0.42;

export type SpaceClass = 'pocket' | 'small' | 'medium' | 'large' | 'open';
export type PortalKind = 'tight' | 'normal' | 'wide' | 'exceptional';
export interface TopologyRect { minX:number; maxX:number; minZ:number; maxZ:number; }
export interface TopologyPortal { id:string; kind:PortalKind; center:number; width:number; mandatory:boolean; }
export interface TopologyWall {
  id:string; runAxis:'x'|'z'; fixed:number; start:number; end:number; portal?:TopologyPortal; extraPortals:TopologyPortal[];
  arch:boolean; materialId:MaterialId;
}
export interface TopologySpace {
  id:string; rect:TopologyRect; class:SpaceClass; area:number; influence:Gen3RegionInfluence;
}
export interface TopologyDomain { id:string; domainX:number; domainZ:number; rect:TopologyRect; spaces:TopologySpace[]; walls:TopologyWall[]; }
export interface DomainContext { seed:string; worldDay:number; exposure:number; tuning:WorldTuning; }
export interface WorldBounds2D { minX:number; maxX:number; minZ:number; maxZ:number; }

const DOMAIN_CACHE=new Map<string,TopologyDomain>();
const DOMAIN_CACHE_LIMIT=2048;
function clamp01(v:number):number{return Math.max(0,Math.min(1,v));}
export function topologyLinePosition(seed:string,axis:'x'|'z',index:number):number{
  if(index%2===0)return linePosition(seed,axis,index/2);
  const major=Math.floor(index/2),start=linePosition(seed,axis,major),end=linePosition(seed,axis,major+1);
  return start+(end-start)*(.47+unitFloat(`${seed}:gen3-v5:topology-split:${axis}:${major}`)*.06);
}
export function rectWorldArea(seed:string,rect:TopologyRect):number{
  return (topologyLinePosition(seed,'x',rect.maxX)-topologyLinePosition(seed,'x',rect.minX))*(topologyLinePosition(seed,'z',rect.maxZ)-topologyLinePosition(seed,'z',rect.minZ));
}
export function domainRect(domainX:number,domainZ:number):TopologyRect{return{minX:domainX*DOMAIN_FINE_SPANS,maxX:(domainX+1)*DOMAIN_FINE_SPANS,minZ:domainZ*DOMAIN_FINE_SPANS,maxZ:(domainZ+1)*DOMAIN_FINE_SPANS};}
export function domainWorldBounds(seed:string,domainX:number,domainZ:number){const r=domainRect(domainX,domainZ);return{minX:topologyLinePosition(seed,'x',r.minX),maxX:topologyLinePosition(seed,'x',r.maxX),minZ:topologyLinePosition(seed,'z',r.minZ),maxZ:topologyLinePosition(seed,'z',r.maxZ)};}
function rectCenter(seed:string,rect:TopologyRect){return{x:(topologyLinePosition(seed,'x',rect.minX)+topologyLinePosition(seed,'x',rect.maxX))/2,z:(topologyLinePosition(seed,'z',rect.minZ)+topologyLinePosition(seed,'z',rect.maxZ))/2};}
function classForArea(area:number):SpaceClass{return area<=30?'pocket':area<=55?'small':area<=120?'medium':area<=250?'large':'open';}
function portalWidth(seed:string,key:string,length:number):{kind:PortalKind;width:number}{const roll=unitFloat(`${seed}:portal-kind:${key}`),w=unitFloat(`${seed}:portal-width:${key}`);let kind:PortalKind,width:number;if(roll<.20){kind='tight';width=2.0+w*.25;}else if(roll<.75){kind='normal';width=2.25+w*.60;}else if(roll<.95){kind='wide';width=2.85+w*.60;}else{kind='exceptional';width=3.45+w*.75;}return{kind,width:Math.min(width,Math.max(1.45,length-.9))};}
function targetParcels(ctx:DomainContext,path:string,f:{openness:number;partitionPressure:number;roomScale:number},inf:Gen3RegionInfluence):number{
  const roll=unitFloat(`${ctx.seed}:gen3-v5:space-target:${path}`);
  let target=roll<.15?1:roll<.35?2:roll<.70?3+Math.floor(unitFloat(`${ctx.seed}:gen3-v5:space-mid:${path}`)*4):roll<.90?7+Math.floor(unitFloat(`${ctx.seed}:gen3-v5:space-large:${path}`)*7):14+Math.floor(unitFloat(`${ctx.seed}:gen3-v5:space-open:${path}`)*12);
  target=Math.max(1,Math.round(target*2.0*(.70+f.openness*.38+f.roomScale*.32-f.partitionPressure*.28)));
  if(inf.pillarDepth>0)target=Math.max(target,Math.round(target*(1+inf.pillarDepth*4.2+inf.deepPillar*3.2)));
  if(inf.arch>.35)target=Math.max(3,Math.min(12,Math.round(target*.98)));
  return target;
}
function splitRect(ctx:DomainContext,rect:TopologyRect,path:string,depth:number,spaces:TopologySpace[],walls:TopologyWall[],f:{openness:number;partitionPressure:number;axisFlow:number;roomScale:number;regularity:number;connectivityPressure:number},inf:Gen3RegionInfluence,clip?:WorldBounds2D):void{
  if(clip){const wb={minX:topologyLinePosition(ctx.seed,'x',rect.minX),maxX:topologyLinePosition(ctx.seed,'x',rect.maxX),minZ:topologyLinePosition(ctx.seed,'z',rect.minZ),maxZ:topologyLinePosition(ctx.seed,'z',rect.maxZ)};if(wb.maxX<clip.minX||wb.minX>clip.maxX||wb.maxZ<clip.minZ||wb.minZ>clip.maxZ)return;}
  const width=rect.maxX-rect.minX,height=rect.maxZ-rect.minZ,parcelArea=width*height;
  const finish=()=>{if(clip)return;const area=rectWorldArea(ctx.seed,rect);spaces.push({id:stableId('gen3-v5-space',ctx.seed,path),rect,class:classForArea(area),area,influence:inf});};
  if(parcelArea<=1||depth>=10){finish();return;}
  const target=targetParcels(ctx,path,f,inf),stopThreshold=target*(.82+unitFloat(`${ctx.seed}:gen3-v5:space-stop:${path}`)*.34);if(parcelArea<=stopThreshold){finish();return;}
  let splitAlongX:boolean;if(width>height*1.25)splitAlongX=true;else if(height>width*1.25)splitAlongX=false;else splitAlongX=unitFloat(`${ctx.seed}:gen3-v5:split-axis:${path}`)<(.5+(f.axisFlow-.5)*.42);
  if((splitAlongX?width:height)<=1)splitAlongX=!splitAlongX;const actualSpan=splitAlongX?width:height;if(actualSpan<=1){finish();return;}
  const pocketEdge=f.partitionPressure>.48&&unitFloat(`${ctx.seed}:gen3-v5:pocket-edge:${path}`)<.11;let offset:number;if(pocketEdge&&actualSpan>=3){offset=unitFloat(`${ctx.seed}:gen3-v5:pocket-side:${path}`)<.5?1:actualSpan-1;}else{const jitter=(1-f.regularity)*.22,ratio=.5+(unitFloat(`${ctx.seed}:gen3-v5:split-ratio:${path}`)-.5)*jitter*2;offset=Math.max(1,Math.min(actualSpan-1,Math.round(actualSpan*ratio)));}
  const left:TopologyRect=splitAlongX?{...rect,maxX:rect.minX+offset}:{...rect,maxZ:rect.minZ+offset},right:TopologyRect=splitAlongX?{...rect,minX:rect.minX+offset}:{...rect,minZ:rect.minZ+offset};
  const fixed=topologyLinePosition(ctx.seed,splitAlongX?'x':'z',splitAlongX?left.maxX:left.maxZ),start=topologyLinePosition(ctx.seed,splitAlongX?'z':'x',splitAlongX?rect.minZ:rect.minX),end=topologyLinePosition(ctx.seed,splitAlongX?'z':'x',splitAlongX?rect.maxZ:rect.maxX),length=end-start,key=`${path}:partition`,pw=portalWidth(ctx.seed,key,length),margin=pw.width/2+.45,available=Math.max(0,length-margin*2),centerAlong=available>0?start+margin+available*(.20+unitFloat(`${ctx.seed}:gen3-v5:portal-center:${key}`)*.60):(start+end)/2;
  const arch=inf.arch>.46&&length>=15&&unitFloat(`${ctx.seed}:gen3-v5:arch-partition:${key}`)<strength(inf.arch,.46,.92)*TOPOLOGY_ARCH_MAX_SHARE,paleChance=strength(inf.arch,.12,.88),materialId:MaterialId=unitFloat(`${ctx.seed}:gen3-v5:partition-material:${key}`)<paleChance?'arch-pale-wallpaper':'level-0-wallpaper';
  const portal:TopologyPortal={id:stableId('gen3-v5-portal',ctx.seed,key),kind:pw.kind,width:pw.width,center:centerAlong,mandatory:true},extraPortals:TopologyPortal[]=[];const loopChance=Math.max(length>20?.44:0,Math.min(TOPOLOGY_LOOP_MAX,TOPOLOGY_LOOP_MIN+f.connectivityPressure*.10+(1-f.regularity)*.06));if(length>13&&unitFloat(`${ctx.seed}:gen3-v5:partition-loop:${key}`)<loopChance){const ew=portalWidth(ctx.seed,`${key}:extra`,length),side=unitFloat(`${ctx.seed}:gen3-v5:partition-loop-side:${key}`)<.5?.26:.74,ec=Math.max(start+ew.width/2+.4,Math.min(end-ew.width/2-.4,start+length*side));if(Math.abs(ec-centerAlong)>ew.width+pw.width/2+1.2)extraPortals.push({id:stableId('gen3-v5-portal',ctx.seed,`${key}:extra`),kind:ew.kind,width:ew.width,center:ec,mandatory:false});}
  const topologyWall={id:stableId('gen3-v5-partition',ctx.seed,key),runAxis:splitAlongX?'z':'x' as 'x'|'z',fixed,start,end,portal,extraPortals,arch,materialId};const intersects=!clip||(topologyWall.runAxis==='x'?(topologyWall.fixed>=clip.minZ&&topologyWall.fixed<=clip.maxZ&&topologyWall.end>=clip.minX&&topologyWall.start<=clip.maxX):(topologyWall.fixed>=clip.minX&&topologyWall.fixed<=clip.maxX&&topologyWall.end>=clip.minZ&&topologyWall.start<=clip.maxZ));if(intersects)walls.push(topologyWall);splitRect(ctx,left,`${path}:0`,depth+1,spaces,walls,f,inf,clip);splitRect(ctx,right,`${path}:1`,depth+1,spaces,walls,f,inf,clip);
}
function cacheKey(ctx:DomainContext,dx:number,dz:number){return`${ctx.seed}|${ctx.worldDay}|${ctx.exposure}|${ctx.tuning.regionOverride??'natural'}|${ctx.tuning.gateBypass?1:0}|${dx}:${dz}`;}
export function generateTopologyDomain(ctx:DomainContext,domainX:number,domainZ:number):TopologyDomain{const ck=cacheKey(ctx,domainX,domainZ),cached=DOMAIN_CACHE.get(ck);if(cached)return cached;const rect=domainRect(domainX,domainZ),center=rectCenter(ctx.seed,rect),fields=sampleWorldFieldChannels(ctx.seed,center.x,center.z,['openness','partitionPressure','axisFlow','roomScale','regularity','connectivityPressure']),influence=sampleGen3RegionInfluence(ctx.seed,center.x,center.z,ctx.worldDay,ctx.exposure,ctx.tuning),spaces:TopologySpace[]=[],walls:TopologyWall[]=[];splitRect(ctx,rect,`domain:${domainX}:${domainZ}`,0,spaces,walls,fields,influence);const domain={id:`domain:${domainX}:${domainZ}`,domainX,domainZ,rect,spaces,walls};if(DOMAIN_CACHE.size>=DOMAIN_CACHE_LIMIT)DOMAIN_CACHE.clear();DOMAIN_CACHE.set(ck,domain);return domain;}

export function generateTopologyDomainSlice(ctx:DomainContext,domainX:number,domainZ:number,clip:WorldBounds2D):TopologyWall[]{
  const rect=domainRect(domainX,domainZ),center=rectCenter(ctx.seed,rect),fields=sampleWorldFieldChannels(ctx.seed,center.x,center.z,['openness','partitionPressure','axisFlow','roomScale','regularity','connectivityPressure']),influence=sampleGen3RegionInfluence(ctx.seed,center.x,center.z,ctx.worldDay,ctx.exposure,ctx.tuning),walls:TopologyWall[]=[];
  splitRect(ctx,rect,`domain:${domainX}:${domainZ}`,0,[],walls,fields,influence,clip);return walls;
}
export function domainParent(seed:string,node:{x:number;z:number}):{x:number;z:number}|undefined{if(node.x===0&&node.z===0)return undefined;if(node.x===0)return{x:0,z:node.z-Math.sign(node.z)};if(node.z===0)return{x:node.x-Math.sign(node.x),z:0};return unitFloat(`${seed}:gen3-v4:nav-parent:${node.x}:${node.z}`)<.5?{x:node.x-Math.sign(node.x),z:node.z}:{x:node.x,z:node.z-Math.sign(node.z)};}
export function sameDomain(a:{x:number;z:number}|undefined,b:{x:number;z:number}){return Boolean(a&&a.x===b.x&&a.z===b.z);}
