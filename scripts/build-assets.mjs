import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const DEFINITIONS_ROOT = resolve(ROOT, 'assets/definitions');
const SOURCE_ROOT = resolve(ROOT, 'assets/source');
const RUNTIME_ROOT = resolve(ROOT, 'public/assets/runtime');
const GENERATED_JSON = resolve(ROOT, 'assets/generated/registry.json');
const GENERATED_TS = resolve(ROOT, 'src/presentation/generatedAssetRegistry.ts');
const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;
const TYPES = new Set(['image', 'audio', 'mesh']);
const PROFILES = new Map([
  ['Wall Texture', { type: 'image', roles: ['wall-texture'] }],
  ['Floor Texture', { type: 'image', roles: ['floor-texture'] }],
  ['Ceiling Texture', { type: 'image', roles: ['ceiling-texture'] }],
  ['Prop Texture', { type: 'image', roles: ['prop-texture', 'decal'] }],
  ['UI Image', { type: 'image', roles: ['ui'] }],
  ['Reference Image', { type: 'image', roles: ['reference-only'] }],
  ['Ambient Audio', { type: 'audio', roles: ['ambient-loop'] }],
  ['Spatial Audio', { type: 'audio', roles: ['spatial-loop', 'one-shot', 'fixture', 'entity', 'footstep', 'transition'] }],
  ['UI Audio', { type: 'audio', roles: ['ui'] }],
  ['Feature Mesh', { type: 'mesh', roles: ['feature-mesh'] }],
  ['Structure Mesh', { type: 'mesh', roles: ['structure-mesh'] }],
  ['Item Mesh', { type: 'mesh', roles: ['item-mesh'] }],
  ['Entity Mesh', { type: 'mesh', roles: ['entity-mesh'] }]
]);

function fail(message) { throw new Error(`[NAL] ${message}`); }
function posix(path) { return path.replaceAll('\\', '/'); }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function safeRuntimeName(id, hash, extension) { return `${id.replaceAll('.', '-')}-${hash.slice(0, 12)}${extension.toLowerCase()}`; }

function readDefinitions() {
  if (!existsSync(DEFINITIONS_ROOT)) return [];
  const definitions = [];
  for (const name of readdirSync(DEFINITIONS_ROOT).filter((entry) => entry.endsWith('.json')).sort()) {
    const parsed = JSON.parse(readFileSync(join(DEFINITIONS_ROOT, name), 'utf8'));
    if (parsed.schema !== 'nal-asset-definitions-v1' || !Array.isArray(parsed.assets)) fail(`${name} must use nal-asset-definitions-v1 with an assets array`);
    definitions.push(...parsed.assets);
  }
  return definitions;
}

function validate(definitions) {
  const ids = new Set();
  for (const definition of definitions) {
    if (!definition || typeof definition !== 'object') fail('asset definition must be an object');
    if (!ID_PATTERN.test(definition.id ?? '')) fail(`invalid Asset ID ${String(definition.id)}`);
    if (ids.has(definition.id)) fail(`duplicate Asset ID ${definition.id}`);
    ids.add(definition.id);
    if (!TYPES.has(definition.type)) fail(`invalid type ${definition.type} for ${definition.id}`);
    const profile = PROFILES.get(definition.profile);
    if (!profile || profile.type !== definition.type) fail(`profile ${definition.profile} does not accept ${definition.type} for ${definition.id}`);
    if (!profile.roles.includes(definition.role)) fail(`profile ${definition.profile} does not accept role ${definition.role} for ${definition.id}`);
    if (typeof definition.source !== 'string' || !definition.source.startsWith('assets/source/')) fail(`${definition.id} source must live under assets/source/`);
    const source = resolve(ROOT, definition.source);
    const sourceRelative = relative(SOURCE_ROOT, source);
    if (sourceRelative.startsWith('..') || isAbsolute(sourceRelative)) fail(`${definition.id} source escapes assets/source/`);
    if (!existsSync(source)) fail(`${definition.id} source does not exist: ${definition.source}`);
    if (definition.type === 'image' && definition.image?.worldScaleMeters !== undefined && (!(definition.image.worldScaleMeters > 0))) fail(`${definition.id} image.worldScaleMeters must be positive`);
    if (definition.type === 'audio' && definition.audio?.volume !== undefined && (definition.audio.volume < 0 || definition.audio.volume > 2)) fail(`${definition.id} audio.volume must be between 0 and 2`);
    if (definition.type === 'mesh' && extname(source).toLowerCase() !== '.glb') fail(`${definition.id} mesh source must be GLB in PAU Run 1`);
  }
  for (const definition of definitions) if (definition.fallback && !ids.has(definition.fallback)) fail(`${definition.id} fallback ${definition.fallback} is not defined`);
}

function build(definitions) {
  rmSync(RUNTIME_ROOT, { recursive: true, force: true });
  mkdirSync(RUNTIME_ROOT, { recursive: true });
  const prepared = definitions.map((definition) => {
    const source = resolve(ROOT, definition.source);
    const bytes = readFileSync(source);
    return { definition, source, bytes, contentHash: sha256(bytes) };
  });
  const idsByHash = new Map();
  for (const entry of prepared) {
    const list = idsByHash.get(entry.contentHash) ?? [];
    list.push(entry.definition.id);
    idsByHash.set(entry.contentHash, list);
  }
  const runtime = prepared.map(({ definition, source, contentHash }) => {
    const duplicateIds = idsByHash.get(contentHash) ?? [];
    const warnings = duplicateIds.length > 1 ? [`content duplicates Asset IDs: ${duplicateIds.join(', ')}`] : [];
    const extension = extname(source) || (definition.type === 'mesh' ? '.glb' : '');
    const typeDirectory = `${definition.type}s`;
    const runtimeDirectory = join(RUNTIME_ROOT, typeDirectory);
    mkdirSync(runtimeDirectory, { recursive: true });
    const output = join(runtimeDirectory, safeRuntimeName(definition.id, contentHash, extension));
    copyFileSync(source, output);
    return {
      ...definition,
      contentHash,
      runtimePath: `/${posix(relative(resolve(ROOT, 'public'), output))}`,
      runtimeStatus: 'ready',
      validation: { valid: true, warnings, errors: [] }
    };
  });
  mkdirSync(resolve(ROOT, 'assets/generated'), { recursive: true });
  writeFileSync(GENERATED_JSON, `${JSON.stringify({ schema: 'nal-asset-registry-v1', assets: runtime }, null, 2)}\n`);
  // JSON validation establishes the Asset ID shape before this serialization boundary;
  // branded TypeScript identity does not survive JSON and must be re-established explicitly.
  const source = `import type { RuntimeAssetDefinition } from './assets.js';\n\n// Generated by scripts/build-assets.mjs from assets/definitions/*.json.\nexport const GENERATED_ASSET_REGISTRY: readonly RuntimeAssetDefinition[] = Object.freeze(${JSON.stringify(runtime, null, 2)} as unknown as RuntimeAssetDefinition[]);\n`;
  writeFileSync(GENERATED_TS, source);
  for (const [hash, ids] of idsByHash) if (ids.length > 1) console.warn(`[NAL] duplicate content ${hash.slice(0, 12)}: ${ids.join(', ')}`);
  console.log(`[NAL] validated ${definitions.length} asset definition(s); generated ${runtime.length} runtime asset(s)`);
}

const definitions = readDefinitions();
validate(definitions);
build(definitions);
