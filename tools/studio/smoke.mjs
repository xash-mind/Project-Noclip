import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const token = randomBytes(24).toString('hex');
const server = spawn(process.execPath, ['tools/studio/server.mjs'], { cwd: process.cwd(), env: { ...process.env, NOCLIP_STUDIO_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', (chunk) => { output += chunk; });
server.stderr.on('data', (chunk) => { output += chunk; });
async function waitFor(url) { for (let attempt = 0; attempt < 40; attempt += 1) { try { const response = await fetch(url); if (response.ok) return response; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`Studio server did not become ready.\n${output}`); }
function sameHostDevOrigin() { for (const addresses of Object.values(networkInterfaces())) for (const address of addresses ?? []) if (address.family === 'IPv4' && !address.internal) return `http://${address.address}:5173`; return 'http://127.0.0.1:5173'; }
async function command(input) { return fetch('http://127.0.0.1:4311/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); }

try {
  const bootstrap = await (await waitFor('http://127.0.0.1:4311/api/bootstrap')).json();
  if (!Array.isArray(bootstrap.targets) || !bootstrap.targets.some((target) => target.semanticTargetId === 'feature.medium-bucket')) throw new Error('Studio bootstrap did not expose the Medium Bucket semantic target');
  const wallpaperTarget = bootstrap.targets.find((target) => target.semanticTargetId === 'material.level-0-wallpaper');
  if (!wallpaperTarget?.structuredEditable || wallpaperTarget.group !== 'Materials' || !wallpaperTarget.whereUsed?.some((item) => item.includes('Ordinary sparse pillars'))) throw new Error('Studio bootstrap did not expose human M-W1 authoring metadata');
  const archTarget = bootstrap.targets.find((target) => target.semanticTargetId === 'architecture.a-a1');
  if (archTarget?.structuredEditable || !archTarget?.readOnlyReason?.includes('topology')) throw new Error('Studio bootstrap did not explain A-A1 read-only ownership');
  const panelTarget = bootstrap.targets.find((target) => target.semanticTargetId === 'material.fluorescent-panel');
  if (!panelTarget?.structuredEditable || !panelTarget.scopeNote?.includes('physical Omni')) throw new Error('M-F1 did not expose its visual-only ownership boundary');

  const page = await (await waitFor('http://127.0.0.1:4311/')).text();
  for (const required of ['NOCLIP STUDIO', 'Saved Project Value', 'Temporary Preview', 'Unsaved Editor Change', 'Basic', 'Advanced controls', 'Asset Library']) if (!page.includes(required)) throw new Error(`Studio client shell is missing ${required}`);
  const context = await (await waitFor('http://127.0.0.1:4311/api/context?target=feature.medium-bucket&mode=CHANGE')).json();
  if (context.context?.schema !== 'development-context-v1' || context.context?.representation?.id !== 'bucket.default') throw new Error('Studio context endpoint is not consuming canonical PAU DevelopmentContext');
  const wallpaper = await (await waitFor('http://127.0.0.1:4311/api/context?target=material.level-0-wallpaper&mode=CHANGE')).json();
  if (wallpaper.context?.representation?.id !== 'level0.wallpaper.default') throw new Error('M-W1 context did not resolve the canonical material representation');
  if (wallpaper.context?.representation?.assetSlots?.length !== 3) throw new Error('M-W1 context did not expose A/B/C Asset slots');
  if (!wallpaper.context.representation.editableParameters.includes('saturation') || !wallpaper.context.representation.editableParameters.includes('patternSizeMeters')) throw new Error('M-W1 context did not expose image-treatment controls');

  const invalidParameter = await command({ type: 'preview-parameters', targetId: 'material.level-0-wallpaper', payload: { parameters: { saturation: 99 } } });
  if (invalidParameter.status !== 400) throw new Error(`Invalid preview parameter was not rejected (${invalidParameter.status})`);
  const invalidAsset = await command({ type: 'preview-assets', targetId: 'material.level-0-wallpaper', payload: { assetSlots: { familyA: 'missing.asset' } } });
  if (invalidAsset.status !== 400) throw new Error(`Incompatible/missing preview Asset was not rejected (${invalidAsset.status})`);
  const arbitraryRebind = await command({ type: 'preview-binding', targetId: 'material.level-0-wallpaper', payload: { representationId: 'level0.carpet.default' } });
  if (arbitraryRebind.status !== 400) throw new Error(`Arbitrary Representation rebind was not rejected (${arbitraryRebind.status})`);
  const validPreview = await command({ type: 'preview-parameters', targetId: 'material.level-0-wallpaper', payload: { parameters: { saturation: 0.9 } } });
  if (!validPreview.ok) throw new Error(`Valid M-W1 preview command was rejected (${validPreview.status})`);

  const origin = sameHostDevOrigin();
  const preflight = await fetch('http://127.0.0.1:4311/api/bridge/state', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-noclip-studio-token', 'Access-Control-Request-Private-Network': 'true' } });
  if (preflight.status !== 204) throw new Error(`Studio LAN bridge preflight returned ${preflight.status}`);
  if (preflight.headers.get('access-control-allow-origin') !== origin) throw new Error('Studio LAN bridge did not echo the same-host development origin');
  if (preflight.headers.get('access-control-allow-private-network') !== 'true') throw new Error('Studio LAN bridge did not allow Chrome private-network access');
  const bridge = await fetch('http://127.0.0.1:4311/api/bridge/state', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Noclip-Studio-Token': token }, body: JSON.stringify({ clientId: 'studio-smoke-client', conditionIds: [], previewState: {}, diagnostics: [] }) });
  if (!bridge.ok || bridge.headers.get('access-control-allow-origin') !== origin) throw new Error('Studio LAN bridge state request was not accepted');
  console.log(`[Studio smoke] human authoring metadata, preview validation and same-host LAN bridge PASS (${origin})`);
} finally { server.kill('SIGTERM'); }
