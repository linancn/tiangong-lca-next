import type { ProcessFlowGraphLayoutName, ProcessFlowGraphSelection } from './graphTypes';

export function shouldRenderProcessFlowBaseEdges(
  layoutMode: ProcessFlowGraphLayoutName,
  selection: ProcessFlowGraphSelection,
): boolean {
  if (layoutMode !== 'geoMap2d') {
    return true;
  }

  return Boolean(selection.selectedNodeId);
}
