import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalCall } from './canonical-client.mjs';

const PROTECTED_BRANCHES = new Set(['main', 'master']);
const LOCAL_STATE_DIRECTORY = '.noclip-studio';
const SOURCES = Object.freeze([
  {
    source: 'src/presentation/definitions/level0-features.json',
    generated: 'src/presentation/generatedLevel0FeatureDefinitions.ts'
  },
  {
    source: 'src/presentation/definitions/level0-materials.json',
    generated: 'src/presentation/generatedLevel0MaterialDefinitions.ts'
  }
]);
const COLOR = /^#[0-9a-f]{6}$/i;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const posix = (value) => value.replaceAll('\\', '/');

function exec(root, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
function git(root, args, { allowFailure = false } = {}) {
  const result = exec(root, 'git', args);
  if (!allowFailure && result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result;
}
function branch(root) {
  const result = git(root, ['branch', '--show-current'], { allowFailure: true });
  const value = result.status === 0 ? result.stdout.trim() : '';
  if (!value) throw new Error('Studio project writes require a named Git working branch. Detached HEAD is blocked.');
  if (PROTECTED_BRANCHES.has(value)) throw new Error(`Studio project writes are blocked on protected branch ${value}. Create or switch to a working branch first.`);
  return value;
}
function porcelain(root) {
  const result = git(root, ['status', '--porcelain=v1', '--untracked-files=all'], { allowFailure: true });
  if (result.status !== 0) return [];
  return result.stdout.split('\n').filter(Boolean).map((line) => ({ status: line.slice(0, 2), path: line.slice(3).trim().replace(/^"|"$/g, '') }));
}
function assertInside(root, candidate) {
  const base = resolve(root), absolute = resolve(base, candidate), rel = relative(base, absolute);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return absolute;
  throw new Error(`Studio path escapes Project Noclip workspace: ${candidate}`);
}
function allowedStructuredPath(root, candidate) {
  const absolute = assertInside(root, candidate), rel = posix(relative(resolve(root), absolute));
  const known = SOURCES.some((entry) => rel === entry.source || rel === entry.generated) || rel.startsWith(`${LOCAL_STATE_DIRECTORY}/receipts/`);
  if (!known) throw new Error(`Studio structured authoring is not allowed to write ${rel}`);
  return absolute;
}
function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.studio-tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}
function compileStudio(root) {
  const result = exec(root, 'npx', ['tsc', '-p', 'tsconfig.studio.json'], { shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Studio canonical compilation failed');
}
function buildPresentation(root) {
  const result = exec(root, process.execPath, [resolve(root, 'scripts/build-presentation-definitions.mjs')]);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'presentation definition build failed');
}
function diffFor(root, paths) {
  return paths.length ? git(root, ['diff', '--no-ext-diff', '--', ...paths], { allowFailure: true }).stdout : '';
}
function sourceCatalog(root) {
  return SOURCES.map((entry) => ({ ...entry, parsed: readJson(resolve(root, entry.source)) }));
}
function locateTarget(root, targetId) {
  for (const entry of sourceCatalog(root)) {
    const binding = entry.parsed.bindings.find((item) => item.semanticTargetId === targetId);
    if (!binding) continue;
    const definition = entry.parsed.representations.find((item) => item.id === binding.representationId);
    if (!definition) throw new Error(`Target ${targetId} binding points to missing Representation ${binding.representationId}`);
    return { entry, binding, definition };
  }
  throw new Error(`Target ${targetId} is not a structured PAU source target`);
}
function validateParameterPatch(definition, patch) {
  const editable = new Map((definition.editableParameters ?? []).map((item) => [item.key, item]));
  for (const [key, value] of Object.entries(patch ?? {})) {
    const meta = editable.get(key);
    if (!meta) throw new Error(`${key} is not a PAU-owned editable parameter for ${definition.id}`);
    if (meta.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a finite number`);
      if (meta.min !== undefined && value < meta.min) throw new Error(`${key} must be >= ${meta.min}`);
      if (meta.max !== undefined && value > meta.max) throw new Error(`${key} must be <= ${meta.max}`);
    } else if (meta.kind === 'boolean' && typeof value !== 'boolean') throw new Error(`${key} must be boolean`);
    else if (meta.kind === 'color' && (typeof value !== 'string' || !COLOR.test(value))) throw new Error(`${key} must be a #RRGGBB colour`);
    else if ((meta.kind === 'text' || meta.kind === 'enum') && typeof value !== 'string') throw new Error(`${key} must be text`);
    if (meta.kind === 'enum' && meta.values && !meta.values.includes(value)) throw new Error(`${key} is not an allowed value`);
  }
}
function assetDefinitions(root) {
  const dir = resolve(root, 'assets/definitions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort().flatMap((name) => {
    const parsed = readJson(resolve(dir, name));
    return Array.isArray(parsed.assets) ? parsed.assets : [];
  });
}
function runtimeAssets(root) {
  const path = resolve(root, 'assets/generated/registry.json');
  return existsSync(path) ? (readJson(path).assets ?? []) : [];
}
function validateAssetSlotPatch(root, definition, patch) {
  const slots = new Map((definition.assetSlots ?? []).map((slot) => [slot.key, slot]));
  const sourceAssets = assetDefinitions(root);
  const runtime = runtimeAssets(root);
  for (const [key, requested] of Object.entries(patch ?? {})) {
    const slot = slots.get(key);
    if (!slot || !slot.editable) throw new Error(`${key} is not an editable Asset slot for ${definition.id}`);
    if (requested === '' && slot.optional) continue;
    if (typeof requested !== 'string' || !requested) throw new Error(`${key} requires a stable Asset ID`);
    const source = sourceAssets.find((asset) => asset.id === requested);
    if (!source) throw new Error(`Asset ${requested} is not defined in NAL`);
    if (source.type !== slot.assetType) throw new Error(`Asset ${requested} is ${source.type}; ${slot.label} requires ${slot.assetType}`);
    if (source.profile !== slot.profile) throw new Error(`Asset ${requested} uses ${source.profile}; ${slot.label} requires ${slot.profile}`);
    if (!slot.roles.includes(source.role)) throw new Error(`Asset ${requested} role ${source.role} is not allowed for ${slot.label}`);
    const built = runtime.find((asset) => asset.id === requested);
    if (!built || built.runtimeStatus !== 'ready') throw new Error(`Asset ${requested} is not runtime-ready; rebuild NAL before binding it`);
  }
}
function synchronizeAssetIds(definition) {
  const slotIds = (definition.assetSlots ?? []).flatMap((slot) => slot.assetId ? [slot.assetId] : []);
  if (definition.assetSlots) definition.assetIds = [...new Set(slotIds)];
}
function summary(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => before[key] !== after[key])
    .map((key) => `${key}: ${String(before[key])} -> ${String(after[key])}`)
    .join('; ') || 'No parameter value changed';
}
function receiptPath(root, id) { return allowedStructuredPath(root, `${LOCAL_STATE_DIRECTORY}/receipts/${id}.json`); }
function storeReceipt(root, envelope) { const path = receiptPath(root, envelope.id); atomicWrite(path, `${JSON.stringify(envelope, null, 2)}\n`); }
function runValidation(root, targetId) {
  const result = exec(root, process.execPath, [resolve(root, 'tools/studio/validate-target.mjs'), targetId]);
  const passed = result.status === 0;
  return {
    passed,
    validations: [{ name: 'presentation schema + targeted Studio/PAU tests', status: passed ? 'PASS' : 'FAIL', detail: (passed ? result.stdout : result.stderr || result.stdout).trim().slice(-1800) }],
    targetedTests: ['tests/presentation-architecture.test.mjs', 'tests/studio-foundation.test.mjs', 'tests/dev9-6-studio-material-authoring.test.mjs'],
    deterministicIdentity: passed ? 'PASS' : 'FAIL',
    saveCompatibility: passed ? 'PASS' : 'FAIL',
    warnings: []
  };
}

export function isStructuredSourceTarget(root, targetId) {
  try { locateTarget(root, targetId); return true; } catch { return false; }
}

export function saveStructuredSourceChange(root, input) {
  const activeBranch = branch(root);
  const { entry, binding, definition } = locateTarget(root, input.targetId);
  const sourceRel = entry.source, generatedRel = entry.generated;
  const dirty = new Set(porcelain(root).map((item) => item.path));
  for (const path of [sourceRel, generatedRel]) if (dirty.has(path)) throw new Error(`Studio will not overwrite a pre-existing worktree change: ${path}`);
  const sourcePath = allowedStructuredPath(root, sourceRel), generatedPath = allowedStructuredPath(root, generatedRel);
  const beforeFile = readFileSync(sourcePath, 'utf8'), beforeGenerated = existsSync(generatedPath) ? readFileSync(generatedPath, 'utf8') : '';
  const source = JSON.parse(beforeFile), sourceBefore = structuredClone(source);
  const liveBinding = source.bindings.find((item) => item.semanticTargetId === input.targetId);
  const liveDefinition = source.representations.find((item) => item.id === liveBinding?.representationId);
  if (!liveBinding || !liveDefinition) throw new Error(`Structured source changed while resolving ${input.targetId}`);
  const parameterPatch = input.parameterPatch ?? {}, assetSlotPatch = input.assetSlotPatch ?? {};
  validateParameterPatch(liveDefinition, parameterPatch);
  validateAssetSlotPatch(root, liveDefinition, assetSlotPatch);
  const beforeValues = Object.fromEntries(Object.keys(parameterPatch).map((key) => [key, liveDefinition.parameters[key]]));
  for (const [key, value] of Object.entries(parameterPatch)) liveDefinition.parameters[key] = value;
  const beforeAssetSlots = Object.fromEntries((liveDefinition.assetSlots ?? []).map((slot) => [slot.key, slot.assetId ?? '']));
  for (const [key, value] of Object.entries(assetSlotPatch)) {
    const slot = (liveDefinition.assetSlots ?? []).find((candidate) => candidate.key === key);
    if (!slot) continue;
    if (value === '' && slot.optional) delete slot.assetId;
    else slot.assetId = value;
  }
  synchronizeAssetIds(liveDefinition);
  const representationBefore = liveBinding.representationId;
  let representationAfter = representationBefore;
  if (input.representationId && input.representationId !== representationBefore) {
    if (!source.representations.some((item) => item.id === input.representationId)) throw new Error(`Unknown Representation ${input.representationId} in ${sourceRel}`);
    liveBinding.representationId = input.representationId;
    representationAfter = input.representationId;
  }
  if (JSON.stringify(source) === JSON.stringify(sourceBefore)) throw new Error('Save to Project has no structured change to persist');
  try {
    atomicWrite(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
    buildPresentation(root);
    compileStudio(root);
  } catch (error) {
    atomicWrite(sourcePath, beforeFile);
    if (beforeGenerated) atomicWrite(generatedPath, beforeGenerated);
    throw error;
  }
  const validation = runValidation(root, input.targetId);
  const afterAssetSlots = Object.fromEntries((liveDefinition.assetSlots ?? []).map((slot) => [slot.key, slot.assetId ?? '']));
  const afterValues = { ...beforeValues, ...parameterPatch };
  const assetSummary = summary(beforeAssetSlots, afterAssetSlots);
  const valueSummary = summary(beforeValues, afterValues);
  const diff = diffFor(root, [sourceRel, generatedRel]);
  const context = canonicalCall(root, 'context', { targetId: input.targetId, options: { branchOrRef: activeBranch, userObservation: input.observation, requestedChange: input.requestedChange }, mode: 'CHANGE' }).context;
  const beforeAssetIds = (definition.assetIds ?? []).map(String);
  const afterAssetIds = (liveDefinition.assetIds ?? []).map(String);
  const change = {
    timestamp: new Date().toISOString(),
    mode: Object.keys(assetSlotPatch).length ? 'asset-replacement' : (input.representationId && input.representationId !== representationBefore ? 'representation-rebind' : 'structured-project-change'),
    beforeValues,
    afterValues,
    representationBefore,
    representationAfter,
    assetIdsBefore: beforeAssetIds,
    assetIdsAfter: afterAssetIds,
    filesChanged: [sourceRel, generatedRel],
    generatedFilesChanged: [generatedRel],
    sourceDefinitionsChanged: [sourceRel],
    activePreviewState: parameterPatch,
    persisted: true,
    validation: validation.validations,
    targetedTests: validation.targetedTests,
    deterministicIdentity: validation.deterministicIdentity,
    saveCompatibility: validation.saveCompatibility,
    warnings: validation.warnings,
    diffSummary: [valueSummary, assetSummary].filter((item) => item !== 'No parameter value changed').join('; ') || 'Structured representation changed',
    actor: { identity: 'local-developer', tool: 'Noclip Studio' },
    revert: { kind: 'values', reference: 'Studio targeted structured revert' }
  };
  const canonical = canonicalCall(root, 'receipt', { context, change });
  const id = `${Date.now()}-${input.targetId.replace(/[^a-z0-9_-]+/gi, '-')}`;
  storeReceipt(root, {
    id,
    createdAt: new Date().toISOString(),
    receipt: canonical.receipt,
    human: canonical.human,
    json: canonical.json,
    diff,
    authoringKind: 'structured-source-v2',
    localRevert: {
      files: [
        { path: sourceRel, beforeContent: beforeFile, afterHash: hash(readFileSync(sourcePath)) },
        { path: generatedRel, beforeContent: beforeGenerated, afterHash: existsSync(generatedPath) ? hash(readFileSync(generatedPath)) : '' }
      ]
    }
  });
  return { id, ...canonical, diff, validation };
}

export function canRevertStructuredReceipt(root, id) {
  const path = receiptPath(root, id);
  if (!existsSync(path)) return false;
  try { return readJson(path).authoringKind === 'structured-source-v2'; } catch { return false; }
}

export function revertStructuredSourceChange(root, id) {
  branch(root);
  const path = receiptPath(root, id);
  if (!existsSync(path)) throw new Error(`Unknown Studio receipt ${id}`);
  const item = readJson(path), files = item.localRevert?.files ?? [];
  if (item.authoringKind !== 'structured-source-v2' || !files.length) throw new Error('This receipt is not a structured-source-v2 change');
  for (const file of files) {
    const absolute = allowedStructuredPath(root, file.path);
    if (!existsSync(absolute) || hash(readFileSync(absolute)) !== file.afterHash) throw new Error(`Targeted revert refused: ${file.path} changed after this Studio operation. Review the diff manually.`);
  }
  for (const file of files) atomicWrite(allowedStructuredPath(root, file.path), file.beforeContent);
  compileStudio(root);
  return { reverted: files.map((file) => file.path), diff: diffFor(root, files.map((file) => file.path)) };
}
