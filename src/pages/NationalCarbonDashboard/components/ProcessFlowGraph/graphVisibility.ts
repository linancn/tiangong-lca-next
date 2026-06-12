import type { ProcessFlowGraphLayoutName, ProcessFlowGraphSelection } from './graphTypes';

export function shouldRenderProcessFlowBaseEdges(
  layoutMode: ProcessFlowGraphLayoutName,
  selection: ProcessFlowGraphSelection,
): boolean {
  if (selection.selectedNodeId) {
    return layoutMode === 'sphere3d';
  }

  if (layoutMode !== 'geoMap2d') {
    return true;
  }

  return false;
}
