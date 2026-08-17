import type { DevelopmentContext } from '../presentation/developmentContext.js';
import type { PresentationValue } from '../presentation/types.js';
export type StudioBridgeCommandType = 'select-target'|'focus-target'|'isolate-target'|'locate-target'|'spawn-showcase'|'preview-parameters'|'preview-binding'|'refresh-presentation'|'clear-preview'|'clear-all-previews';
export interface StudioBridgeCommand { id:number; type:StudioBridgeCommandType; targetId?:string; payload?:{parameters?:Readonly<Record<string,PresentationValue>>;representationId?:string}; }
export interface StudioRuntimeSnapshot { clientId:string; connectedAt:string; selectedTargetId?:string; seed?:string; generationVersion?:string; regionId?:string; conditionIds:readonly string[]; cell?:{id:string;x:number;z:number}; playerPosition?:{x:number;y:number;z:number}; developmentContext?:DevelopmentContext; previewState:unknown; diagnostics:readonly string[]; }
export interface WorldLabStudioAction { type:'inspect'|'open'|'isolate'; targetId:string; }
export const WORLD_LAB_STUDIO_EVENT='noclip:world-lab-studio-action';
