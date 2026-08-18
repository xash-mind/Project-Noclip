from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one replacement, found {count}: {old[:140]!r}')
    write(path, text.replace(old, new, 1))


def insert_before(path: str, marker: str, content: str) -> None:
    text = read(path)
    index = text.find(marker)
    if index < 0:
        raise RuntimeError(f'{path}: missing marker {marker!r}')
    write(path, text[:index] + content + text[index:])


# PlayCanvas Entity exposes the scene parent at runtime, but the installed type
# surface does not declare it on Entity. Keep the lifecycle assertion explicit
# without weakening strict TypeScript.
replace_once(
    'src/app/ProjectNoclipGame.ts',
    '      if (visual.root.parent) attachedCellRootCount += 1;',
    "      if ((visual.root as unknown as { parent?: unknown }).parent) attachedCellRootCount += 1;"
)

insert_before(
    'src/renderer/fixtureLighting.ts',
    'function suspendFixtureRuntime(runtime: FixtureRuntime): void {',
    """function entityParent(entity: pc.Entity): pc.Entity | undefined {
  return (entity as unknown as { parent?: pc.Entity }).parent;
}

"""
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    '    if (!visual || runtime.light.parent !== visual.root) {',
    '    if (!visual || entityParent(runtime.light) !== visual.root) {'
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    '      if (runtime.light.parent) runtime.light.destroy();',
    '      if (entityParent(runtime.light)) runtime.light.destroy();'
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    '    if (!visual || runtime.light.parent !== visual.root) detachedLightIds.push(runtime.id);',
    '    if (!visual || entityParent(runtime.light) !== visual.root) detachedLightIds.push(runtime.id);'
)

# Current studio-test has two noUncheckedIndexedAccess errors in UUID fallback.
# Fix that existing strict boundary while also teaching the DEV-only bridge the
# explicit presentation-refresh contract introduced by this recovery.
replace_once(
    'src/dev/studioBridgeClient.ts',
    "import type { CellDescriptor, RegionId } from '../world/types.js';",
    "import type { StreamingRequest } from '../renderer/streamingScheduler.js';\nimport type { CellDescriptor, RegionId } from '../world/types.js';"
)
replace_once(
    'src/dev/studioBridgeClient.ts',
    'interface StudioGameAccess{save?:{seed:string;generationVersion:string};currentCell?:CellDescriptor;camera?:{getPosition():{x:number;y:number;z:number}};updateStreaming(force?:boolean):void;locateRegion(regionId:RegionId):void;locateBlackout():void;locateHoleCluster():void;}',
    'interface StudioGameAccess{save?:{seed:string;generationVersion:string};currentCell?:CellDescriptor;camera?:{getPosition():{x:number;y:number;z:number}};updateStreaming(request?:StreamingRequest):void;locateRegion(regionId:RegionId):void;locateBlackout():void;locateHoleCluster():void;}'
)
replace_once(
    'src/dev/studioBridgeClient.ts',
    '    const bytes=new Uint8Array(16);cryptoApi.getRandomValues(bytes);bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;',
    '    const bytes=new Uint8Array(16);cryptoApi.getRandomValues(bytes);bytes[6]=((bytes[6]??0)&0x0f)|0x40;bytes[8]=((bytes[8]??0)&0x3f)|0x80;'
)
replace_once(
    'src/dev/studioBridgeClient.ts',
    '  const refresh=():void=>access.updateStreaming(true);',
    "  const refresh=():void=>access.updateStreaming({reason:'presentation-refresh',refreshUnchanged:true});"
)

print('Arch lifecycle recovery v4 TypeScript/Studio bridge refinement applied successfully.')
