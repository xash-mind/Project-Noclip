import type { RegionId } from './types.js';

/**
 * Human-facing short addresses used in conversation, documentation, issues, and
 * bounded work prompts. They never replace stable runtime/save IDs.
 */
export const WORLD_SHORT_ADDRESSES = {
  L0: { stableId: 'level-0', label: 'Level 0', kind: 'Level' },
  O: { stableId: 'ordinary-level-0', label: 'Ordinary Level 0', kind: 'Region' },
  P: { stableId: 'pillar-field', label: 'Pillar Field', kind: 'Region' },
  A: { stableId: 'arch-rooms', label: 'Arch Rooms', kind: 'Region' },
  'O-V1': { stableId: 'ordinary-default', label: 'Default', kind: 'Variant' },
  'G-E': { stableId: 'euclidean', label: 'Euclidean', kind: 'Geometry' },
  'G-N': { stableId: 'non-euclidean', label: 'Non-Euclidean', kind: 'Geometry' },
  'M-W1': { stableId: 'level-0-wallpaper', label: 'Level 0 wallpaper', kind: 'Material' },
  'M-A1': { stableId: 'arch-pale-wallpaper', label: 'Arch pale finish', kind: 'Material' },
  'M-C1': { stableId: 'level-0-carpet', label: 'Level 0 carpet', kind: 'Material' },
  'M-CE1': { stableId: 'level-0-ceiling', label: 'Level 0 ceiling', kind: 'Material' },
  'M-F1': { stableId: 'fluorescent-panel', label: 'Fluorescent panel', kind: 'Material' },
  'C-D1': { stableId: 'damp-carpet', label: 'Damp carpet', kind: 'Condition' },
  'C-D2': { stableId: 'deep-wet-carpet', label: 'Deep wet carpet', kind: 'Condition' },
  'C-S1': { stableId: 'shallow-dry-carpet', label: 'Shallow carpet', kind: 'Condition' },
  'C-B1': { stableId: 'blackout', label: 'Blackout', kind: 'Condition' },
  'CV-H1': { stableId: 'floor-hole-cluster', label: 'Floor-hole cluster', kind: 'Carver' },
  'S-M1': { stableId: 'manila-room', label: 'Manila Room', kind: 'Structure' },
  'S-E1': { stableId: 'exit-structure', label: 'Exit Structure', kind: 'Structure' },
  'S-R1': { stableId: 'red-rooms', label: 'Red Rooms', kind: 'Structure' }
} as const;

export type WorldShortAddress = keyof typeof WORLD_SHORT_ADDRESSES;

export type ArchitecturePatternId = 'O-A1' | 'P-A1' | 'A-A1';
export type ArchitecturePieceAddress =
  | 'O-A1.wall-span'
  | 'O-A1.solved-opening'
  | 'P-A1.pier'
  | 'A-A1.pier'
  | 'A-A1.upper-mass'
  | 'A-A1.curve'
  | 'A-A1.lower-panel'
  | 'A-A1.termination';

export interface ArchitecturePatternDefinition {
  id: ArchitecturePatternId;
  stableId: string;
  label: string;
  regionId: RegionId;
  description: string;
  pieces: readonly ArchitecturePieceAddress[];
}

/**
 * Architecture Pattern is subordinate to Region. It names reusable Region
 * architecture without abusing Structure (Manila/Exit/Red Rooms) or Geometry
 * (Euclidean/Non-Euclidean).
 */
export const ARCHITECTURE_PATTERNS: readonly ArchitecturePatternDefinition[] = [
  {
    id: 'O-A1',
    stableId: 'ordinary-a1-default-wall',
    label: 'Default Wall',
    regionId: 'ordinary-level-0',
    description: 'The normal solved Level 0 partition wall and its route openings.',
    pieces: ['O-A1.wall-span', 'O-A1.solved-opening']
  },
  {
    id: 'P-A1',
    stableId: 'pillar-a1-pier',
    label: 'Pillar Pier',
    regionId: 'pillar-field',
    description: 'The canonical wallpaper-clad floor-to-ceiling Pillar Field pier on the 7.2 m lattice.',
    pieces: ['P-A1.pier']
  },
  {
    id: 'A-A1',
    stableId: 'arch-a1-divider',
    label: 'Arch Divider',
    regionId: 'arch-rooms',
    description: 'The repeated Arch Rooms divider architecture, addressed as one pattern even when rendered from several pieces.',
    pieces: ['A-A1.pier', 'A-A1.upper-mass', 'A-A1.curve', 'A-A1.lower-panel', 'A-A1.termination']
  }
] as const;

export const WORK_MODES = ['LOOK', 'AUDIT', 'CHANGE', 'RELEASE'] as const;
export type WorkMode = typeof WORK_MODES[number];
export const ACCEPTANCE_STATES = ['PASS', 'PASS WITH GAP', 'FAIL', 'UNVERIFIED'] as const;
export type AcceptanceState = typeof ACCEPTANCE_STATES[number];

export function architecturePattern(id: ArchitecturePatternId): ArchitecturePatternDefinition {
  const pattern = ARCHITECTURE_PATTERNS.find((entry) => entry.id === id);
  if (!pattern) throw new Error(`Unknown Architecture Pattern: ${id}`);
  return pattern;
}
