import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
export function canonicalCall(root,action,payload={}){const result=spawnSync(process.execPath,[resolve(root,'tools/studio/canonical-cli.mjs'),action],{cwd:root,input:JSON.stringify(payload),encoding:'utf8',maxBuffer:8*1024*1024});if(result.status!==0)throw new Error(result.stderr.trim()||`canonical ${action} failed`);return JSON.parse(result.stdout);}
