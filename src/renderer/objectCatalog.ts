import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import type { PropKind } from '../world/types.js';

export const OBJECT_CATALOG_CATEGORIES = [
  { id: 'items', label: 'Items' },
  { id: 'features', label: 'Features' }
] as const;

export type ObjectCatalogCategoryId = typeof OBJECT_CATALOG_CATEGORIES[number]['id'];

export interface ObjectCatalogEntry {
  id: string;
  label: string;
  categoryId: ObjectCatalogCategoryId;
  kind: 'item' | 'prop';
  itemDefinitionId?: ItemDefinitionId;
  propKind?: PropKind;
  searchTerms: readonly string[];
}

const PROP_CATALOG: ReadonlyArray<Omit<ObjectCatalogEntry, 'id' | 'kind'>> = [
  { label: 'Table Feature', categoryId: 'features', propKind: 'table', searchTerms: ['desk', 'surface', 'sparse furniture'] },
  { label: 'Chair Feature', categoryId: 'features', propKind: 'chair', searchTerms: ['seat', 'sparse furniture'] },
  { label: 'Cabinet Feature', categoryId: 'features', propKind: 'cabinet', searchTerms: ['locker', 'cupboard', 'sparse furniture'] }
];

const itemEntries: ObjectCatalogEntry[] = Object.values(ITEM_DEFINITIONS).map((definition) => ({
  id: `item:${definition.id}`,
  label: definition.name,
  categoryId: 'items',
  kind: 'item',
  itemDefinitionId: definition.id,
  searchTerms: [definition.id, definition.description]
}));

const propEntries: ObjectCatalogEntry[] = PROP_CATALOG.map((entry) => ({
  ...entry,
  id: `prop:${entry.propKind}`,
  kind: 'prop'
}));

export const OBJECT_CATALOG: readonly ObjectCatalogEntry[] = [...itemEntries, ...propEntries];
export const OBJECT_CATALOG_BY_ID: ReadonlyMap<string, ObjectCatalogEntry> = new Map(OBJECT_CATALOG.map((entry) => [entry.id, entry]));

export function filterObjectCatalog(query: string, categoryId = ''): ObjectCatalogEntry[] {
  const normalized = query.trim().toLowerCase();
  return OBJECT_CATALOG.filter((entry) => {
    if (categoryId && entry.categoryId !== categoryId) return false;
    if (!normalized) return true;
    return [entry.id, entry.label, entry.categoryId, ...entry.searchTerms].some((value) => value.toLowerCase().includes(normalized));
  });
}

export function validateObjectCatalog(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of OBJECT_CATALOG) {
    if (ids.has(entry.id)) errors.push(`Duplicate catalog id ${entry.id}`);
    ids.add(entry.id);
  }
  for (const definition of Object.values(ITEM_DEFINITIONS)) {
    if (!OBJECT_CATALOG.some((entry) => entry.itemDefinitionId === definition.id)) errors.push(`Missing item ${definition.id}`);
  }
  for (const propKind of ['table', 'chair', 'cabinet'] as const) if (!OBJECT_CATALOG.some((entry) => entry.propKind === propKind)) errors.push(`Missing implemented Feature ${propKind}`);
  return errors;
}

export interface ObjectCatalogShowcaseHost {
  spawn(entries: readonly ObjectCatalogEntry[]): number;
  clear(): void;
}

let activeShowcaseHost: ObjectCatalogShowcaseHost | undefined;

export function registerObjectCatalogShowcaseHost(host: ObjectCatalogShowcaseHost): void {
  activeShowcaseHost?.clear();
  activeShowcaseHost = host;
}

export function spawnObjectCatalogEntries(entryIds: readonly string[]): number {
  if (!activeShowcaseHost) return 0;
  const entries = entryIds.flatMap((id) => {
    const entry = OBJECT_CATALOG_BY_ID.get(id);
    return entry ? [entry] : [];
  });
  return activeShowcaseHost.spawn(entries);
}

export function clearObjectCatalogShowcase(): boolean {
  if (!activeShowcaseHost) return false;
  activeShowcaseHost.clear();
  return true;
}
