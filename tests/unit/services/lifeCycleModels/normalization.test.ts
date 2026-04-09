import { ensureFirstMissingProcessInstanceConnectionsArray } from '@/services/lifeCycleModels/normalization';

describe('ensureFirstMissingProcessInstanceConnectionsArray', () => {
  it('returns non-object inputs unchanged', () => {
    expect(ensureFirstMissingProcessInstanceConnectionsArray(null)).toBeNull();
    expect(ensureFirstMissingProcessInstanceConnectionsArray(undefined)).toBeUndefined();
    expect(ensureFirstMissingProcessInstanceConnectionsArray('model')).toBe('model');
  });

  it('returns the original payload when processInstance is not an array', () => {
    const orderedJson = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          technology: {
            processes: {
              processInstance: { id: 'proc-1' },
            },
          },
        },
      },
    };

    expect(ensureFirstMissingProcessInstanceConnectionsArray(orderedJson)).toBe(orderedJson);
    expect(
      orderedJson.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes
        .processInstance,
    ).toEqual({ id: 'proc-1' });
  });

  it('returns the original payload when processInstance is an empty array', () => {
    const orderedJson = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          technology: {
            processes: {
              processInstance: [],
            },
          },
        },
      },
    };

    expect(ensureFirstMissingProcessInstanceConnectionsArray(orderedJson)).toBe(orderedJson);
    expect(
      orderedJson.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes
        .processInstance,
    ).toEqual([]);
  });

  it('skips non-plain entries until it finds the first process instance missing connections', () => {
    const orderedJson = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          technology: {
            processes: {
              processInstance: [
                ['unexpected'],
                {
                  id: 'proc-2',
                },
                {
                  id: 'proc-3',
                },
              ],
            },
          },
        },
      },
    };
    const processInstances = orderedJson.lifeCycleModelDataSet.lifeCycleModelInformation.technology
      .processes.processInstance as any[];

    expect(ensureFirstMissingProcessInstanceConnectionsArray(orderedJson)).toBe(orderedJson);
    expect(processInstances[0]).toEqual(['unexpected']);
    expect(processInstances[1].connections).toEqual([]);
    expect(processInstances[2].connections).toBeUndefined();
  });

  it('returns the original payload when every process instance already has connections', () => {
    const orderedJson = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          technology: {
            processes: {
              processInstance: [
                {
                  id: 'proc-1',
                  connections: {
                    outputExchange: [],
                  },
                },
              ],
            },
          },
        },
      },
    };

    expect(ensureFirstMissingProcessInstanceConnectionsArray(orderedJson)).toBe(orderedJson);
    expect(
      orderedJson.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes
        .processInstance[0].connections,
    ).toEqual({
      outputExchange: [],
    });
  });

  it('adds an empty connections array only to the first missing process instance', () => {
    const orderedJson = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          technology: {
            processes: {
              processInstance: [
                {
                  id: 'proc-1',
                  connections: {
                    outputExchange: [],
                  },
                },
                {
                  id: 'proc-2',
                },
                {
                  id: 'proc-3',
                },
              ],
            },
          },
        },
      },
    };

    const result = ensureFirstMissingProcessInstanceConnectionsArray(orderedJson);
    const processInstances = orderedJson.lifeCycleModelDataSet.lifeCycleModelInformation.technology
      .processes.processInstance as any[];

    expect(result).toBe(orderedJson);
    expect(processInstances[0].connections).toEqual({
      outputExchange: [],
    });
    expect(processInstances[1].connections).toEqual([]);
    expect(processInstances[2].connections).toBeUndefined();
  });
});
