import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const token = randomBytes(24).toString('hex');
const server = spawn(process.execPath, ['tools/studio/server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, NOCLIP_STUDIO_TOKEN: token },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
server.stdout.on('data', (chunk) => { output += chunk; });
server.stderr.on('data', (chunk) => { output += chunk; });

async function waitFor(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Studio server did not become ready.\n${output}`);
}

try {
  const bootstrap = await (await waitFor('http://127.0.0.1:4311/api/bootstrap')).json();
  if (!Array.isArray(bootstrap.targets) || !bootstrap.targets.some((target) => target.semanticTargetId === 'feature.medium-bucket')) {
    throw new Error('Studio bootstrap did not expose the Medium Bucket semantic target');
  }
  const page = await (await waitFor('http://127.0.0.1:4311/')).text();
  if (!page.includes('NOCLIP STUDIO') || !page.includes('Development context')) throw new Error('Studio client shell is incomplete');
  const context = await (await waitFor('http://127.0.0.1:4311/api/context?target=feature.medium-bucket&mode=CHANGE')).json();
  if (context.context?.schema !== 'development-context-v1' || context.context?.representation?.id !== 'bucket.default') {
    throw new Error('Studio context endpoint is not consuming canonical PAU DevelopmentContext');
  }
  console.log('[Studio smoke] bootstrap, client shell and canonical context endpoint PASS');
} finally {
  server.kill('SIGTERM');
}
