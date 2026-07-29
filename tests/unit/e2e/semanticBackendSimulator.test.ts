import {
  CONTROLLED_REQUEST_PHASES,
  createControlledResponseGate,
  HARNESS_PERSONAS,
  semanticPersonaRoleProjection,
} from '../../e2e/i18n/harness-contract';

describe('semantic release harness contracts', () => {
  it('projects exactly the anonymous, standard-user, and data-product-manager personas', () => {
    expect(Object.keys(HARNESS_PERSONAS)).toEqual([
      'anonymous',
      'standard_user',
      'data_product_manager',
    ]);
    expect(semanticPersonaRoleProjection('anonymous')).toEqual([]);
    expect(semanticPersonaRoleProjection('standard_user')).toEqual([]);
    expect(semanticPersonaRoleProjection('data_product_manager')).toEqual([
      {
        role: 'data_product_manager',
        user_id: '70400000-0000-4000-8000-000000000704',
      },
    ]);
  });

  it('uses named request phases instead of global ordinal or timeout assumptions', async () => {
    expect(CONTROLLED_REQUEST_PHASES).toEqual([
      'registered',
      'request_started',
      'response_held',
      'released',
      'settled',
    ]);
    const gate = createControlledResponseGate();
    expect(gate.phase).toBe('registered');
    gate.markStarted();
    await gate.started;
    expect(gate.phase).toBe('response_held');
    gate.release();
    await gate.released;
    expect(gate.phase).toBe('released');
    gate.settle();
    expect(gate.phase).toBe('settled');
  });
});
