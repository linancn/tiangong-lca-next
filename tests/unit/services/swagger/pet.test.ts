/**
 * Tests for swagger pet API (example/demo module)
 * Path: src/services/swagger/pet.ts
 */

describe('Swagger Pet API (src/services/swagger/pet.ts)', () => {
  it('should be a swagger example module', () => {
    const module = require('@/services/swagger/pet');
    expect(module).toBeDefined();
  });
});
