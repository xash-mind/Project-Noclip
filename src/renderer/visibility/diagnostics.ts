import type {
  VisibilityDiagnosticReport,
  VisibilitySnapshot,
  VisibilitySpaceDiagnostic,
  VisibilitySpaceEvidence
} from './types.js';

function openingChainFor(
  target: VisibilitySpaceEvidence,
  bySpace: ReadonlyMap<string, VisibilitySpaceEvidence>
): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: VisibilitySpaceEvidence | undefined = target;
  while (current?.viaOpeningId && current.fromSpaceId && !seen.has(current.spaceId)) {
    seen.add(current.spaceId);
    chain.push(current.viaOpeningId);
    current = bySpace.get(current.fromSpaceId);
  }
  chain.reverse();
  return chain;
}

export function visibilityDiagnosticReport(snapshot: VisibilitySnapshot): VisibilityDiagnosticReport {
  const bySpace = new Map(snapshot.evidence.map((item) => [item.spaceId, item] as const));
  const spaces: VisibilitySpaceDiagnostic[] = snapshot.evidence
    .map((item) => ({
      spaceId: item.spaceId,
      depth: item.depth,
      reason: item.reason,
      conservative: item.conservative,
      openingChain: openingChainFor(item, bySpace)
    }))
    .sort((left, right) => left.depth - right.depth || left.spaceId.localeCompare(right.spaceId));
  return {
    topology: { ...snapshot.topology },
    observer: {
      ...snapshot.observer,
      position: { ...snapshot.observer.position },
      direction: snapshot.observer.direction ? { ...snapshot.observer.direction } : undefined
    },
    visibleSpaceIds: [...snapshot.visibleSpaces],
    visibleCellIds: [...snapshot.visibleCells],
    spaces,
    frontier: [...snapshot.frontier],
    conservativeInclusions: [...snapshot.conservativeInclusions],
    topologyConservativeReasons: [...snapshot.topologyConservativeReasons],
    termination: {
      ...snapshot.termination,
      reasons: [...snapshot.termination.reasons]
    }
  };
}

export function formatVisibilityDiagnostic(snapshot: VisibilitySnapshot): string {
  const report = visibilityDiagnosticReport(snapshot);
  const lines = [
    `visibility source=${report.topology.source}${report.topology.seed ? ` seed=${report.topology.seed}` : ''}`,
    `observer cell=${report.observer.cellId} space=${report.observer.spaceId ?? 'unresolved'} position=${report.observer.position.x.toFixed(3)},${report.observer.position.z.toFixed(3)}`,
    `visibleSpaces=${report.visibleSpaceIds.join(',') || '(none)'}`,
    `visibleCells=${report.visibleCellIds.join(',') || '(none)'}`
  ];
  for (const space of report.spaces) {
    lines.push(
      `space ${space.spaceId} depth=${space.depth} reason=${space.reason}${space.conservative ? ' conservative' : ''} chain=${space.openingChain.join('>') || '(observer)'}`
    );
  }
  for (const frontier of report.frontier) {
    lines.push(`frontier ${frontier.openingId} ${frontier.fromSpaceId}->${frontier.toSpaceId} depth=${frontier.depth} reason=${frontier.reason}`);
  }
  for (const reason of report.topologyConservativeReasons) {
    lines.push(`topology-conservative ${reason.code} ${reason.detail}`);
  }
  lines.push(`termination=${report.termination.primaryReason} depth=${report.termination.maxDepthReached} states=${report.termination.frontierStatesProcessed}`);
  return lines.join('\n');
}
