import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

rmSync('dist', { recursive: true, force: true });
execFileSync('tsc', ['-p', 'tsconfig.local.json'], { stdio: 'inherit' });
mkdirSync('dist', { recursive: true });
const html = readFileSync('index.html', 'utf8').replace('/src/main.ts', '/src/main.js');
writeFileSync('dist/index.html', html);
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });
cpSync('src/styles.css', 'dist/src/styles.css');
console.log('Local fallback build completed in dist/.');
