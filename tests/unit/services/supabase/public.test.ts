import { PUBLIC_ENTITY_TABLES, publicEntity } from '@/services/supabase/public';

const mockSchema = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    schema: (...args: unknown[]) => mockSchema(...args),
  },
}));

describe('public entity schema boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchema.mockReturnValue({ from: mockFrom });
  });

  it.each(PUBLIC_ENTITY_TABLES)('routes %s through the explicit public schema', (table) => {
    publicEntity(table);

    expect(mockSchema).toHaveBeenCalledWith('public');
    expect(mockFrom).toHaveBeenCalledWith(table);
  });

  it('rejects non-core relations before constructing a query', () => {
    expect(() => publicEntity('roles')).toThrow('Unsupported public entity table: roles');
    expect(mockSchema).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
