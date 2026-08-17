import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const token = randomBytes(24).toString('hex');
const presentation = spawnSync(process.execPath, ['scripts/build-presentation-definitions.mjs'], { stdio: 'inherit' });
if (presentation.status !== 0) process.exit(presentation.status ?? 1);
const compile = spawnSync('npx', ['tsc', '-p', 'tsconfig.studio.json'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const server = spawn(process.execPath, ['tools/studio/server.mjs'], { stdio: 'inherit', env: { ...process.env, NOCLIP_STUDIO_TOKEN: token } });
const game = spawn(process.execPath, ['scripts/dev.mjs'], { stdio: 'inherit', env: { ...process.env, VITE_NOCLIP_STUDIO_TOKEN: token } });
console.log('\nNoclip Studio: http://127.0.0.1:4311');
console.log('Game: use the Vite URL printed above. World Lab → Open in Studio focuses the selected semantic target.\n');
let closing=false;
function close(code=0){if(closing)return;closing=true;server.kill('SIGTERM');game.kill('SIGTERM');setTimeout(()=>process.exit(code),100).unref();}
process.on('SIGINT',()=>close(0));process.on('SIGTERM',()=>close(0));server.on('exit',(code)=>close(code??1));game.on('exit',(code)=>close(code??1));
