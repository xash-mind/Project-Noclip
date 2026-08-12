const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { locateNearestRegion } = await import('../.test-dist/src/world/gen3.js');
const { DEFAULT_TUNING, CELL_SIZE, PLAYER_HEIGHT } = await import('../.test-dist/src/world/types.js');

const tuning = (regionOverride) => ({ ...DEFAULT_TUNING, regionOverride, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true });
function cell(seed, x, z, t) { return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning: t }); }
function collect(seed, cx, cz, radius, t) { const result=[]; for(let x=cx-radius;x<=cx+radius;x++) for(let z=cz-radius;z<=cz+radius;z++) result.push(cell(seed,x,z,t)); return result; }
function worldWall(entry, wall) {
  const bx=entry.address.cellX*CELL_SIZE, bz=entry.address.cellZ*CELL_SIZE;
  const horizontal=wall.orientation==='z';
  return { id:wall.id, materialId:wall.materialId, orientation:wall.orientation, fixed:horizontal?bz+wall.cz:bx+wall.cx, start:horizontal?bx+wall.cx-wall.sx/2:bz+wall.cz-wall.sz/2, end:horizontal?bx+wall.cx+wall.sx/2:bz+wall.cz+wall.sz/2, cy:wall.cy, sy:wall.sy };
}
function obstacles(cells) {
  return cells.flatMap((entry)=>[
    ...entry.walls.map((wall)=>({minX:entry.address.cellX*CELL_SIZE+wall.cx-wall.sx/2,maxX:entry.address.cellX*CELL_SIZE+wall.cx+wall.sx/2,minZ:entry.address.cellZ*CELL_SIZE+wall.cz-wall.sz/2,maxZ:entry.address.cellZ*CELL_SIZE+wall.cz+wall.sz/2})),
    ...entry.props.filter((prop)=>prop.solid).map((prop)=>({minX:entry.address.cellX*CELL_SIZE+prop.position.x-prop.scale.x/2,maxX:entry.address.cellX*CELL_SIZE+prop.position.x+prop.scale.x/2,minZ:entry.address.cellZ*CELL_SIZE+prop.position.z-prop.scale.z/2,maxZ:entry.address.cellZ*CELL_SIZE+prop.position.z+prop.scale.z/2}))
  ]);
}
function free(x,z,obs){const r=.48;return !obs.some((o)=>x+r>o.minX&&x-r<o.maxX&&z+r>o.minZ&&z-r<o.maxZ);}
function yawTo(cx,cz,tx,tz){return Math.atan2(-(tx-cx),-(tz-cz))*180/Math.PI;}
function cameraFor(tx,tz,obs,distance=1.55,pitch=8){
  const dirs=[[0,1],[1,0],[0,-1],[-1,0],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]];
  for(const [dx,dz] of dirs){const x=tx+dx*distance,z=tz+dz*distance;if(free(x,z,obs))return{x,y:PLAYER_HEIGHT,z,yaw:yawTo(x,z,tx,tz),pitch};}
  return{x:tx+distance,y:PLAYER_HEIGHT,z:tz+distance,yaw:yawTo(tx+distance,tz+distance,tx,tz),pitch};
}
function isBoundary(value){return Math.abs((value-CELL_SIZE/2)/CELL_SIZE-Math.round((value-CELL_SIZE/2)/CELL_SIZE))<.0002;}
function seamTarget(cells, material){
  const walls=cells.flatMap((entry)=>entry.walls.map((wall)=>worldWall(entry,wall))).filter((wall)=>!material||wall.materialId===material);
  for(let i=0;i<walls.length;i++)for(let j=i+1;j<walls.length;j++){
    const a=walls[i],b=walls[j]; if(a.orientation!==b.orientation||Math.abs(a.fixed-b.fixed)>.002||Math.abs(a.cy-b.cy)>.002||Math.abs(a.sy-b.sy)>.002)continue;
    const touch=Math.abs(a.end-b.start)<.002?a.end:Math.abs(b.end-a.start)<.002?b.end:undefined;
    if(touch===undefined||!isBoundary(touch))continue;
    return a.orientation==='z'?{x:touch,z:a.fixed,pair:[a.id,b.id]}:{x:a.fixed,z:touch,pair:[a.id,b.id]};
  }
}
function tJunction(cells){
  const walls=cells.flatMap((entry)=>entry.walls.map((wall)=>worldWall(entry,wall)));
  const xs=walls.filter((w)=>w.orientation==='x'&&Math.abs(w.cy-1.6)<.2), zs=walls.filter((w)=>w.orientation==='z'&&Math.abs(w.cy-1.6)<.2);
  for(const vertical of xs)for(const horizontal of zs){
    if(vertical.fixed<horizontal.start-.02||vertical.fixed>horizontal.end+.02||horizontal.fixed<vertical.start-.02||horizontal.fixed>vertical.end+.02)continue;
    const vEnd=Math.min(Math.abs(vertical.start-horizontal.fixed),Math.abs(vertical.end-horizontal.fixed));
    const hEnd=Math.min(Math.abs(horizontal.start-vertical.fixed),Math.abs(horizontal.end-vertical.fixed));
    if(vEnd<.08||hEnd<.08)return{x:vertical.fixed,z:horizontal.fixed,pair:[vertical.id,horizontal.id]};
  }
}

const seed='threshold-001';
const ordinary=collect(seed,0,0,9,tuning('ordinary-level-0'));
const ordinaryObs=obstacles(ordinary);
const ordinaryWalls=ordinary.flatMap((entry)=>entry.walls.map((wall)=>worldWall(entry,wall))).filter((w)=>w.materialId==='level-0-wallpaper'&&w.sy>2.8);
const baseWall=ordinaryWalls.find((w)=>w.orientation==='z'&&w.end-w.start>4)??ordinaryWalls[0];
const basePoint=baseWall.orientation==='z'?{x:(baseWall.start+baseWall.end)/2,z:baseWall.fixed}:{x:baseWall.fixed,z:(baseWall.start+baseWall.end)/2};
const seam=seamTarget(ordinary,'level-0-wallpaper');
const tj=tJunction(ordinary);
if(!baseWall||!seam||!tj)throw new Error('Could not resolve ordinary visual targets');

const pillarOccurrence=locateNearestRegion({seed,originX:0,originZ:0,target:'pillar-field',worldDay:40,exposure:10,tuning:DEFAULT_TUNING,maxDistanceMeters:12000});
const archOccurrence=locateNearestRegion({seed,originX:0,originZ:0,target:'arch-rooms',worldDay:40,exposure:10,tuning:DEFAULT_TUNING,maxDistanceMeters:12000});
if(!pillarOccurrence||!archOccurrence)throw new Error('Missing natural advanced Region targets');
const pCx=Math.floor((pillarOccurrence.worldX+CELL_SIZE/2)/CELL_SIZE), pCz=Math.floor((pillarOccurrence.worldZ+CELL_SIZE/2)/CELL_SIZE);
const pillarCells=collect(seed,pCx,pCz,5,{...DEFAULT_TUNING,conditionOverride:'clear',carverOverride:'none',structureOverride:'none',gateBypass:true});
const pObs=obstacles(pillarCells);
const column=pillarCells.flatMap((entry)=>entry.props.filter((prop)=>prop.kind==='column').map((prop)=>({x:entry.address.cellX*CELL_SIZE+prop.position.x,z:entry.address.cellZ*CELL_SIZE+prop.position.z}))).sort((a,b)=>Math.hypot(a.x-pillarOccurrence.worldX,a.z-pillarOccurrence.worldZ)-Math.hypot(b.x-pillarOccurrence.worldX,b.z-pillarOccurrence.worldZ))[0];
if(!column)throw new Error('No Pillar visual target');

const aCx=Math.floor((archOccurrence.worldX+CELL_SIZE/2)/CELL_SIZE), aCz=Math.floor((archOccurrence.worldZ+CELL_SIZE/2)/CELL_SIZE);
const archCells=collect(seed,aCx,aCz,7,{...DEFAULT_TUNING,conditionOverride:'clear',carverOverride:'none',structureOverride:'none',gateBypass:true});
const aObs=obstacles(archCells);
const archSeam=seamTarget(archCells,'arch-pale-wallpaper');
if(!archSeam)throw new Error('No Arch cross-Cell seam target');

const result={seed,targets:{
  wallBase:{...cameraFor(basePoint.x,basePoint.z,ordinaryObs,1.25,22),kind:'ordinary',lookAt:basePoint,wallId:baseWall.id},
  tJunction:{...cameraFor(tj.x,tj.z,ordinaryObs,2.2,6),kind:'ordinary',lookAt:{x:tj.x,z:tj.z},pair:tj.pair},
  cellSeam:{...cameraFor(seam.x,seam.z,ordinaryObs,1.35,12),kind:'ordinary',lookAt:{x:seam.x,z:seam.z},pair:seam.pair},
  pillarMixed:{...cameraFor(column.x,column.z,pObs,2.7,5),kind:'advanced',lookAt:column,regionCenter:pillarOccurrence},
  archSeam:{...cameraFor(archSeam.x,archSeam.z,aObs,2.35,5),kind:'advanced',lookAt:{x:archSeam.x,z:archSeam.z},pair:archSeam.pair,regionCenter:archOccurrence}
}};
console.log(JSON.stringify(result,null,2));
