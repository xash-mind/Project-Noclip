import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const dist = resolve(process.cwd(), 'dist');
if (!existsSync(dist)) throw new Error('[Studio security] dist/ does not exist after build');
const forbidden = ['NOCLIP_STUDIO_TOKEN','VITE_NOCLIP_STUDIO_TOKEN','/api/bridge/','/api/save','Noclip Studio server','tools/studio/'];
const files = [];
function walk(path) { for (const name of readdirSync(path)) { const item=join(path,name); if(statSync(item).isDirectory()) walk(item); else if(/\.(?:js|html|css|json)$/.test(name)) files.push(item); } }
walk(dist);
for (const file of files) {
  const content = readFileSync(file,'utf8');
  for (const marker of forbidden) if (content.includes(marker)) throw new Error(`[Studio security] production bundle leaked privileged/development marker ${marker} in ${file}`);
}
console.log(`[Studio security] production bundle contains no privileged Studio bridge/write markers (${files.length} files scanned)`);
