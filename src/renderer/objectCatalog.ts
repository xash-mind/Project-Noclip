import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import { PROP_KINDS, type PropKind } from '../world/types.js';

export const OBJECT_CATALOG_CATEGORIES = [
  { id: 'items', label: 'Items' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'storage', label: 'Storage' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'environment', label: 'Environment' }
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
  { label: 'Table', categoryId: 'furniture', propKind: 'table', searchTerms: ['desk', 'surface'] },
  { label: 'Chair', categoryId: 'furniture', propKind: 'chair', searchTerms: ['seat'] },
  { label: 'Bench', categoryId: 'furniture', propKind: 'bench', searchTerms: ['seat'] },
  { label: 'Cabinet', categoryId: 'storage', propKind: 'cabinet', searchTerms: ['locker', 'cupboard'] },
  { label: 'Cardboard Box', categoryId: 'storage', propKind: 'box', searchTerms: ['crate', 'container'] },
  { label: 'Divider', categoryId: 'architecture', propKind: 'divider', searchTerms: ['partition', 'wall'] },
  { label: 'Pipe', categoryId: 'architecture', propKind: 'pipe', searchTerms: ['utility'] },
  { label: 'Column', categoryId: 'architecture', propKind: 'column', searchTerms: ['pillar'] },
  { label: 'Wall Panel', categoryId: 'architecture', propKind: 'wall-panel', searchTerms: ['arch', 'panel'] },
  { label: 'Ceiling Gap', categoryId: 'architecture', propKind: 'ceiling-gap', searchTerms: ['void', 'tile'] },
  { label: 'Sign', categoryId: 'architecture', propKind: 'sign', searchTerms: ['placard', 'label'] },
  { label: 'Book', categoryId: 'environment', propKind: 'book', searchTerms: ['ledger', 'document'] },
  { label: 'Stain', categoryId: 'environment', propKind: 'stain', searchTerms: ['mark', 'damp'] },
  { label: 'Carpet Patch', categoryId: 'environment', propKind: 'carpet-patch', searchTerms: ['floor', 'carpet'] }
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
  for (const propKind of PROP_KINDS) {
    if (!OBJECT_CATALOG.some((entry) => entry.propKind === propKind)) errors.push(`Missing prop ${propKind}`);
  }
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
