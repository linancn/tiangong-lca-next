export function ensureFirstMissingProcessInstanceConnectionsArray<T>(orderedJson: T): T {
  if (!orderedJson || typeof orderedJson !== 'object') {
    return orderedJson;
  }

  const processInstances = (orderedJson as any)?.lifeCycleModelDataSet?.lifeCycleModelInformation
    ?.technology?.processes?.processInstance;

  if (!Array.isArray(processInstances) || processInstances.length === 0) {
    return orderedJson;
  }

  for (const processInstance of processInstances) {
    if (!processInstance || typeof processInstance !== 'object' || Array.isArray(processInstance)) {
      continue;
    }

    if (processInstance.connections !== undefined) {
      continue;
    }

    processInstance.connections = [];
    break;
  }

  return orderedJson;
}
