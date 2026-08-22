import { PROJECT_PRESENTATION_REGISTRY } from './projectPresentationRegistry.js';

const SHORT_ADDRESSES: Readonly<Record<string, string>> = Object.freeze({
  'architecture.a-a1': 'A-A1',
  'architecture.p-a1': 'P-A1',
  'material.level-0-wallpaper': 'M-W1',
  'material.arch-pale-wallpaper': 'M-A1',
  'material.level-0-carpet': 'M-C1',
  'material.level-0-ceiling': 'M-CE1',
  'material.fluorescent-panel': 'M-F1',
  'condition.blackout': 'C-B1',
  'carver.floor-hole-cluster': 'CV-H1'
});

export type StudioTargetGroup = 'Materials' | 'Features' | 'Carvers' | 'Architecture' | 'Conditions';

interface StudioTargetUxSpec {
  group: StudioTargetGroup;
  whereUsed: readonly string[];
  scopeNote?: string;
  readOnlyReason?: string;
  readOnlyOwner?: string;
}

const UX: Readonly<Record<string, StudioTargetUxSpec>> = Object.freeze({
  'material.level-0-wallpaper': {
    group: 'Materials',
    whereUsed: ['Ordinary Level 0 walls', 'Ordinary sparse pillars', 'Pillar Field walls and pillars', 'Arch Room normal walls'],
    scopeNote: 'Normal Arch Room wallpaper uses M-W1. A-A1 structural pieces do not; those use M-A1.'
  },
  'material.arch-pale-wallpaper': {
    group: 'Materials',
    whereUsed: ['A-A1 side piers', 'A-A1 upper / curved structural mass', 'A-A1 lower structural panel'],
    scopeNote: 'This is the A-A1 structural finish. It does not change normal Arch Room wallpaper.'
  },
  'material.level-0-carpet': {
    group: 'Materials',
    whereUsed: ['Ordinary Level 0 floors', 'Pillar Field floors', 'Arch Room floors']
  },
  'material.level-0-ceiling': {
    group: 'Materials',
    whereUsed: ['Ordinary Level 0 ceilings', 'Pillar Field ceilings', 'Arch Room ceilings']
  },
  'material.level-0-casing': {
    group: 'Materials',
    whereUsed: ['Ordinary Level 0 lower-wall casing / raceway strips']
  },
  'material.level-0-outlet': {
    group: 'Materials',
    whereUsed: ['Ordinary Level 0 wall outlet plates and visible slots']
  },
  'material.fluorescent-panel': {
    group: 'Materials',
    whereUsed: ['Visible M-F1 fluorescent panel surfaces in Ordinary Level 0, Pillar Field, and Arch Rooms'],
    scopeNote: 'Presentation only. These controls do not alter the physical Omni intensity, range, shadow participation, fixture allocation, or flicker law.'
  },
  'carver.floor-hole-cluster': {
    group: 'Carvers',
    whereUsed: ['CV-H1 visible upper, middle, deep, and void depth surfaces'],
    scopeNote: 'Visible material only. Hole placement, aperture size, lattice, collision, and Carver law remain read-only.'
  },
  'feature.medium-bucket': {
    group: 'Features',
    whereUsed: ['Medium Bucket presentation in Arch Rooms and Studio showcase']
  },
  'feature.small-grey-open-paint-can': {
    group: 'Features',
    whereUsed: ['Small Grey Open Paint Can presentation in Arch Rooms and Studio showcase']
  },
  'architecture.a-a1': {
    group: 'Architecture',
    whereUsed: ['A-A1 Arch divider geometry and openings'],
    readOnlyReason: 'Generation 3 topology, dimensions, openings, and collision are world / architecture law.',
    readOnlyOwner: 'src/world/gen3SpaceTopologyBuild.ts · src/world/gen3ArchitectureCore.ts'
  },
  'architecture.p-a1': {
    group: 'Architecture',
    whereUsed: ['P-A1 pillar geometry, placement, and density'],
    readOnlyReason: 'Generation 3 pillar geometry and placement are world / architecture law.',
    readOnlyOwner: 'src/world/gen3ArchitectureCore.ts · src/world/gen3SpaceTopologyBuild.ts'
  },
  'condition.blackout': {
    group: 'Conditions',
    whereUsed: ['C-B1 Blackout world Condition'],
    readOnlyReason: 'Blackout strength, geography, fog/clear behavior, and physical lighting response are world and renderer law.',
    readOnlyOwner: 'src/world/gen3.ts · src/world/lighting.ts · src/app/ProjectNoclipGame.ts'
  }
});

export interface StudioTargetMetadata {
  semanticTargetId: string;
  humanName: string;
  category: string;
  representationId: string;
  shortAddress?: string;
  structuredEditable: boolean;
  group: StudioTargetGroup;
  whereUsed: readonly string[];
  scopeNote?: string;
  readOnlyReason?: string;
  readOnlyOwner?: string;
}

function fallbackGroup(category: string): StudioTargetGroup {
  if (category === 'Feature') return 'Features';
  if (category === 'Carver') return 'Carvers';
  if (category === 'Condition') return 'Conditions';
  if (category === 'Architecture Pattern') return 'Architecture';
  return 'Materials';
}

export const STUDIO_TARGETS: readonly StudioTargetMetadata[] = PROJECT_PRESENTATION_REGISTRY.bindings
  .filter((binding) => binding.semanticTargetId !== 'subsystem.nal')
  .map((binding) => {
    const definition = PROJECT_PRESENTATION_REGISTRY.representations.find((candidate) => candidate.id === binding.representationId);
    const shortAddress = SHORT_ADDRESSES[binding.semanticTargetId];
    const ux = UX[binding.semanticTargetId];
    return {
      semanticTargetId: binding.semanticTargetId,
      humanName: binding.humanName,
      category: binding.category,
      representationId: binding.representationId,
      ...(shortAddress ? { shortAddress } : {}),
      structuredEditable: Boolean(definition && (definition.editableParameters.length > 0 || definition.assetSlots?.some((slot) => slot.editable))),
      group: ux?.group ?? fallbackGroup(binding.category),
      whereUsed: ux?.whereUsed ?? [],
      ...(ux?.scopeNote ? { scopeNote: ux.scopeNote } : {}),
      ...(ux?.readOnlyReason ? { readOnlyReason: ux.readOnlyReason } : {}),
      ...(ux?.readOnlyOwner ? { readOnlyOwner: ux.readOnlyOwner } : {})
    };
  });
