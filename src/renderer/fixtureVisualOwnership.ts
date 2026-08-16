export interface MFluorescentPanelVisualAddress {
  name: string;
  x: number;
  z: number;
}

export const M_F1_PANEL_POSITION_TOLERANCE = 0.035;

export function isMFluorescentPanelVisualName(name: string): boolean {
  return /^fixture:\d+$/.test(name) || name.includes(':fixture:');
}

export function findMFluorescentPanelVisualIndex(
  candidates: readonly MFluorescentPanelVisualAddress[],
  fixtureX: number,
  fixtureZ: number
): number {
  return candidates.findIndex((candidate) =>
    isMFluorescentPanelVisualName(candidate.name)
    && Math.abs(candidate.x - fixtureX) <= M_F1_PANEL_POSITION_TOLERANCE
    && Math.abs(candidate.z - fixtureZ) <= M_F1_PANEL_POSITION_TOLERANCE
  );
}
