export type WorldVocabularyCategory =
  | 'Levels'
  | 'Regions'
  | 'Variants'
  | 'Geometry'
  | 'Materials'
  | 'Conditions'
  | 'Features'
  | 'Structures'
  | 'Carvers'
  | 'Anomalies'
  | 'Entities'
  | 'Items'
  | 'Transitions';

export type WorldCatalogStatus = 'implemented' | 'reference-approved' | 'design-required' | 'not-present';
export type WorldLabAction = 'locate' | 'sample' | 'preview' | 'isolated-test' | 'spawn' | 'trigger' | 'diagnostic' | 'none';

export interface WorldCatalogEntry {
  id: string;
  label: string;
  category: WorldVocabularyCategory;
  status: WorldCatalogStatus;
  labAction: WorldLabAction;
  description: string;
}

export const WORLD_VOCABULARY_CATEGORIES: readonly WorldVocabularyCategory[] = [
  'Levels', 'Regions', 'Variants', 'Geometry', 'Materials', 'Conditions', 'Features',
  'Structures', 'Carvers', 'Anomalies', 'Entities', 'Items', 'Transitions'
];

/**
 * One shared semantic registry for Generation 3 runtime diagnostics and World Lab.
 * Compatibility-only Gen2 Zones, districts, room archetypes, and components are
 * deliberately absent.
 */
export const WORLD_CATALOG: readonly WorldCatalogEntry[] = [
  { id: 'level-0', label: 'Level 0', category: 'Levels', status: 'implemented', labAction: 'locate', description: 'The current deterministic Level.' },
  { id: 'ordinary-level-0', label: 'Ordinary Level 0', category: 'Regions', status: 'implemented', labAction: 'locate', description: 'The dominant yellow wallpaper, damp carpet, and fluorescent rooms.' },
  { id: 'pillar-field', label: 'Pillar Field', category: 'Regions', status: 'implemented', labAction: 'locate', description: 'Long open Fields of wallpaper-clad rectangular pillars with few walls.' },
  { id: 'arch-rooms', label: 'Arch Rooms', category: 'Regions', status: 'implemented', labAction: 'locate', description: 'Stable pale rooms divided by continuous walls with repeated arch-shaped openings.' },
  { id: 'ordinary-default', label: 'Default', category: 'Variants', status: 'implemented', labAction: 'sample', description: 'Ordinary Level 0 without an overriding Condition, Carver, or Structure.' },
  { id: 'euclidean', label: 'Euclidean', category: 'Geometry', status: 'implemented', labAction: 'diagnostic', description: 'Current world Geometry; streaming Cells never alter topology.' },
  { id: 'level-0-wallpaper', label: 'Level 0 wallpaper', category: 'Materials', status: 'implemented', labAction: 'preview', description: 'Pale patterned yellow wallpaper shared by ordinary walls and pillars.' },
  { id: 'arch-pale-wallpaper', label: 'Arch pale wallpaper', category: 'Materials', status: 'implemented', labAction: 'preview', description: 'The paler finish used on Arch Room dividers.' },
  { id: 'level-0-carpet', label: 'Level 0 carpet', category: 'Materials', status: 'implemented', labAction: 'preview', description: 'Brown-beige carpet read through yellow fluorescent illumination.' },
  { id: 'level-0-ceiling', label: 'Level 0 ceiling', category: 'Materials', status: 'implemented', labAction: 'preview', description: 'Suspended ceiling grid and panels.' },
  { id: 'fluorescent-panel', label: 'Fluorescent panel', category: 'Materials', status: 'implemented', labAction: 'preview', description: 'Spatial fluorescent fixture with visible glow outside Blackouts.' },
  { id: 'damp-carpet', label: 'Damp carpet', category: 'Conditions', status: 'implemented', labAction: 'sample', description: 'The ordinary wet-floor Condition.' },
  { id: 'deep-wet-carpet', label: 'Deep wet carpet', category: 'Conditions', status: 'implemented', labAction: 'sample', description: 'Deeper carpet in Arch Rooms.' },
  { id: 'shallow-dry-carpet', label: 'Shallow carpet', category: 'Conditions', status: 'implemented', labAction: 'sample', description: 'Shallower, less wet carpet in Pillar Fields.' },
  { id: 'blackout', label: 'Blackout', category: 'Conditions', status: 'implemented', labAction: 'locate', description: 'Region-scale absence of local light and local fluorescent buzz with a distant escape cue.' },
  { id: 'sparse-furniture', label: 'Sparse furniture', category: 'Features', status: 'implemented', labAction: 'spawn', description: 'Rare ordinary tables, chairs, and cabinets.' },
  { id: 'manila-room', label: 'Manila Room', category: 'Structures', status: 'implemented', labAction: 'isolated-test', description: 'A rare deterministic single Structure, never a Region.' },
  { id: 'red-rooms', label: 'Red Rooms', category: 'Structures', status: 'design-required', labAction: 'none', description: 'Reference-approved closed-loop Structure awaiting an approved deterministic non-Euclidean design.' },
  { id: 'floor-hole-cluster', label: 'Floor-hole cluster', category: 'Carvers', status: 'implemented', labAction: 'preview', description: 'Extremely rare lattice or near-lattice pits carved through ordinary floor.' },
  { id: 'closed-loop', label: 'Closed-loop topology', category: 'Anomalies', status: 'design-required', labAction: 'none', description: 'Reserved for Red Rooms; not used by current Euclidean Geometry.' },
  { id: 'none', label: 'No Level 0 Entities', category: 'Entities', status: 'not-present', labAction: 'none', description: 'No Entity is currently approved for ordinary Level 0.' },
  { id: 'world-items', label: 'Registered journey Items', category: 'Items', status: 'implemented', labAction: 'spawn', description: 'Independently seeded collectible and carried Items.' },
  { id: 'level-exit', label: 'Level exit', category: 'Transitions', status: 'implemented', labAction: 'trigger', description: 'Exit architecture belongs to a Transition and optional local Structure, never a Region.' }
] as const;

export function worldCatalogByCategory(): Map<WorldVocabularyCategory, WorldCatalogEntry[]> {
  const grouped = new Map<WorldVocabularyCategory, WorldCatalogEntry[]>();
  for (const category of WORLD_VOCABULARY_CATEGORIES) grouped.set(category, []);
  for (const entry of WORLD_CATALOG) grouped.get(entry.category)!.push(entry);
  return grouped;
}
