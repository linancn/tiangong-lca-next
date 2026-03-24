export const lifeCycleModelConnectionOptions = {
  snap: true,
  allowBlank: false,
  allowLoop: false,
  allowMulti: 'withPort' as const,
  allowNode: false,
  allowEdge: false,
  router: {
    name: 'manhattan',
    args: {
      padding: 24,
      step: 10,
      startDirections: ['right'],
      endDirections: ['left'],
    },
  },
  connector: {
    name: 'rounded',
    args: {
      radius: 4,
    },
  },
};
