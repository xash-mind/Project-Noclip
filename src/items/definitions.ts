export type ItemDefinitionId =
  | 'flashlight' | 'battery' | 'almond-water' | 'marker' | 'paper-note'
  | 'glow-stick' | 'string-spool' | 'empty-can' | 'pry-tool';

export interface ItemDefinitionPresentation {
  iconLabel: string;
  categoryLabel: string;
  stateLabel: string;
}

export interface ItemDefinition {
  id: ItemDefinitionId;
  name: string;
  description: string;
  presentation: ItemDefinitionPresentation;
  starterWeight: number;
  worldWeight: number;
  highValue: boolean;
  tradeable: boolean;
  color: [number, number, number];
  maxStackQuantity: number;
}

export const ITEM_DEFINITIONS: Record<ItemDefinitionId, ItemDefinition> = {
  flashlight: { id: 'flashlight', name: 'Flashlight', description: 'A battered torch. Its battery is never as full as it looks.', presentation: { iconLabel: 'FL', categoryLabel: 'Light', stateLabel: 'Charge' }, starterWeight: 8, worldWeight: 7, highValue: true, tradeable: true, color: [0.15, 0.16, 0.16], maxStackQuantity: 1 },
  battery: { id: 'battery', name: 'Battery', description: 'A compatible cell with uncertain remaining charge.', presentation: { iconLabel: 'BT', categoryLabel: 'Power', stateLabel: 'Charge' }, starterWeight: 11, worldWeight: 12, highValue: false, tradeable: true, color: [0.16, 0.19, 0.12], maxStackQuantity: 1 },
  'almond-water': { id: 'almond-water', name: 'Almond Water', description: 'A sealed bottle. It smells faintly sweet.', presentation: { iconLabel: 'AW', categoryLabel: 'Supply', stateLabel: 'Condition' }, starterWeight: 10, worldWeight: 8, highValue: true, tradeable: true, color: [0.74, 0.86, 0.9], maxStackQuantity: 1 },
  marker: { id: 'marker', name: 'Permanent Marker', description: 'Limited ink. Marks are less permanent than the label suggests.', presentation: { iconLabel: 'MK', categoryLabel: 'Tool', stateLabel: 'Ink' }, starterWeight: 10, worldWeight: 10, highValue: false, tradeable: true, color: [0.04, 0.04, 0.04], maxStackQuantity: 1 },
  'paper-note': { id: 'paper-note', name: 'Paper Note', description: 'Blank paper, dry enough to write on.', presentation: { iconLabel: 'NT', categoryLabel: 'Document', stateLabel: 'Condition' }, starterWeight: 18, worldWeight: 18, highValue: false, tradeable: true, color: [0.8, 0.78, 0.61], maxStackQuantity: 8 },
  'glow-stick': { id: 'glow-stick', name: 'Glow Stick', description: 'One-use chemical light. Useful until it is not.', presentation: { iconLabel: 'GS', categoryLabel: 'Light', stateLabel: 'Charge' }, starterWeight: 16, worldWeight: 17, highValue: false, tradeable: true, color: [0.25, 0.95, 0.42], maxStackQuantity: 1 },
  'string-spool': { id: 'string-spool', name: 'String Spool', description: 'A limited trail through a place that edits trails.', presentation: { iconLabel: 'SP', categoryLabel: 'Navigation', stateLabel: 'Remaining' }, starterWeight: 11, worldWeight: 11, highValue: false, tradeable: true, color: [0.68, 0.15, 0.12], maxStackQuantity: 1 },
  'empty-can': { id: 'empty-can', name: 'Empty Can', description: 'Light, noisy, and better than leaving nothing behind.', presentation: { iconLabel: 'CN', categoryLabel: 'Utility', stateLabel: 'Condition' }, starterWeight: 20, worldWeight: 22, highValue: false, tradeable: true, color: [0.42, 0.44, 0.42], maxStackQuantity: 4 },
  'pry-tool': { id: 'pry-tool', name: 'Pry Tool', description: 'Heavy enough to matter. Rarely fits the problem you have.', presentation: { iconLabel: 'PR', categoryLabel: 'Tool', stateLabel: 'Condition' }, starterWeight: 2, worldWeight: 3, highValue: true, tradeable: true, color: [0.32, 0.17, 0.08], maxStackQuantity: 1 }
};
