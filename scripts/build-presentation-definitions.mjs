import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = process.cwd();
const SOURCES = Object.freeze([
  {
    source: 'src/presentation/definitions/level0-features.json',
    output: 'src/presentation/generatedLevel0FeatureDefinitions.ts',
    exportName: 'LEVEL0_FEATURE_DEFINITION_SOURCE'
  },
  {
    source: 'src/presentation/definitions/level0-materials.json',
    output: 'src/presentation/generatedLevel0MaterialDefinitions.ts',
    exportName: 'LEVEL0_MATERIAL_DEFINITION_SOURCE'
  }
]);
const PRESENTATION_CATEGORIES = new Set(['Region','Architecture Pattern','Feature','Material','Condition','Carver','Structure','Item','Transition','renderer/runtime subsystem']);
const COLLISION_MODES = new Set(['none','box','capsule','simple-hull','authored-simple']);
const LCG = new Set(['LCG-0','LCG-1','LCG-2','LCG-3','LCG-X']);
const VALUE_TYPES = new Set(['string','number','boolean']);
const EDITABLE_KINDS = new Set(['number','boolean','text','enum','color']);
const ASSET_TYPES = new Set(['image','audio','mesh']);
const COLOR = /^#[0-9a-f]{6}$/i;

function fail(message) { throw new Error(`[PAU] ${message}`); }
function cleanPath(path) {
  if (typeof path !== 'string' || path.length === 0) fail('source path must be a non-empty string');
  const candidate = resolve(ROOT, path);
  const rel = relative(ROOT, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) fail(`source path escapes repository: ${path}`);
  return path.replaceAll('\\', '/');
}

export function validateRepresentationSource(parsed) {
  if (!parsed || parsed.schema !== 'representation-source-v1') fail('presentation definition source must use representation-source-v1');
  if (!Array.isArray(parsed.representations) || !Array.isArray(parsed.bindings)) fail('representation source needs representations and bindings arrays');
  const ids = new Set();
  for (const definition of parsed.representations) {
    if (!definition || typeof definition !== 'object') fail('representation definition must be an object');
    if (typeof definition.id !== 'string' || !definition.id.includes('.')) fail(`invalid Representation ID ${String(definition.id)}`);
    if (ids.has(definition.id)) fail(`duplicate Representation ID ${definition.id}`);
    ids.add(definition.id);
    if (!PRESENTATION_CATEGORIES.has(definition.category)) fail(`invalid category ${definition.category} for ${definition.id}`);
    if (!Array.isArray(definition.materialIds) || !Array.isArray(definition.assetIds)) fail(`${definition.id} needs materialIds and assetIds arrays`);
    if (!definition.parameters || typeof definition.parameters !== 'object' || Array.isArray(definition.parameters)) fail(`${definition.id} parameters must be an object`);
    for (const [key, value] of Object.entries(definition.parameters)) if (!VALUE_TYPES.has(typeof value)) fail(`${definition.id}.${key} is not a presentation scalar`);
    if (!Array.isArray(definition.editableParameters)) fail(`${definition.id} editableParameters must be an array`);
    const editableKeys = new Set();
    for (const parameter of definition.editableParameters) {
      if (!parameter || typeof parameter.key !== 'string' || !(parameter.key in definition.parameters)) fail(`${definition.id} editable parameter must reference a canonical parameter`);
      if (editableKeys.has(parameter.key)) fail(`${definition.id} duplicate editable parameter ${parameter.key}`);
      editableKeys.add(parameter.key);
      if (!EDITABLE_KINDS.has(parameter.kind)) fail(`${definition.id}.${parameter.key} has unsupported editable kind`);
      if (parameter.kind === 'number') {
        const value = definition.parameters[parameter.key];
        if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${definition.id}.${parameter.key} must be a finite number`);
        if (parameter.min !== undefined && value < parameter.min) fail(`${definition.id}.${parameter.key} is below min`);
        if (parameter.max !== undefined && value > parameter.max) fail(`${definition.id}.${parameter.key} is above max`);
      }
      if (parameter.kind === 'enum') {
        const value = definition.parameters[parameter.key];
        if (!Array.isArray(parameter.values) || !parameter.values.includes(value)) fail(`${definition.id}.${parameter.key} enum value is not allowed`);
      }
      if (parameter.kind === 'color' && (typeof definition.parameters[parameter.key] !== 'string' || !COLOR.test(definition.parameters[parameter.key]))) fail(`${definition.id}.${parameter.key} must be a #RRGGBB colour`);
    }
    const slotKeys = new Set();
    for (const slot of definition.assetSlots ?? []) {
      if (!slot || typeof slot.key !== 'string' || !slot.key) fail(`${definition.id} asset slot needs a key`);
      if (slotKeys.has(slot.key)) fail(`${definition.id} duplicate asset slot ${slot.key}`);
      slotKeys.add(slot.key);
      if (!ASSET_TYPES.has(slot.assetType)) fail(`${definition.id}.${slot.key} has invalid asset type`);
      if (typeof slot.profile !== 'string' || !slot.profile) fail(`${definition.id}.${slot.key} needs an Asset Profile`);
      if (!Array.isArray(slot.roles) || slot.roles.length === 0) fail(`${definition.id}.${slot.key} needs at least one allowed role`);
      if (!slot.optional && !slot.assetId) fail(`${definition.id}.${slot.key} requires a canonical Asset ID`);
      if (typeof slot.editable !== 'boolean') fail(`${definition.id}.${slot.key} needs explicit editable state`);
    }
    if (!COLLISION_MODES.has(definition.collisionMode)) fail(`${definition.id} has invalid collisionMode`);
    if (definition.lcg && !LCG.has(definition.lcg.classification)) fail(`${definition.id} has invalid LCG classification`);
    definition.sourcePaths = (definition.sourcePaths ?? []).map(cleanPath);
    definition.relevantTests = (definition.relevantTests ?? []).map(cleanPath);
  }
  const bindingIds = new Set();
  for (const binding of parsed.bindings) {
    if (!binding || typeof binding.semanticTargetId !== 'string') fail('binding semanticTargetId must be a string');
    if (bindingIds.has(binding.semanticTargetId)) fail(`duplicate binding ${binding.semanticTargetId}`);
    bindingIds.add(binding.semanticTargetId);
    if (!ids.has(binding.representationId)) fail(`binding ${binding.semanticTargetId} points at missing representation ${binding.representationId}`);
    if (binding.fallbackRepresentationId && !ids.has(binding.fallbackRepresentationId)) fail(`binding ${binding.semanticTargetId} fallback is missing`);
  }
  for (const definition of parsed.representations) if (definition.fallback && !ids.has(definition.fallback)) fail(`${definition.id} fallback ${definition.fallback} is missing`);
  return parsed;
}

export function generateRepresentationModule(parsed, exportName = 'PRESENTATION_DEFINITION_SOURCE') {
  return `// Generated by scripts/build-presentation-definitions.mjs. Edit src/presentation/definitions/*.json instead.\nexport const ${exportName} = ${JSON.stringify(parsed)} as const;\n`;
}

export function buildPresentationDefinitions() {
  const built = [];
  for (const entry of SOURCES) {
    const source = resolve(ROOT, entry.source);
    const output = resolve(ROOT, entry.output);
    const parsed = validateRepresentationSource(JSON.parse(readFileSync(source, 'utf8')));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, generateRepresentationModule(parsed, entry.exportName));
    built.push({ ...entry, representations: parsed.representations.length, bindings: parsed.bindings.length });
  }
  return built;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const built = buildPresentationDefinitions();
  console.log(`[PAU] validated ${built.reduce((sum, item) => sum + item.representations, 0)} representation(s), ${built.reduce((sum, item) => sum + item.bindings, 0)} binding(s) across ${built.length} source file(s)`);
}
