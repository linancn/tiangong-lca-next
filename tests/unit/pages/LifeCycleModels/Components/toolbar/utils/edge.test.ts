import { getEdgeLabel } from '@/pages/LifeCycleModels/Components/toolbar/utils/edge';

describe('toolbar/utils/edge', () => {
  const token = {
    colorText: '#111',
    colorPrimary: '#1677ff',
    colorBgBase: '#fff',
  } as any;

  it('returns an empty object when the unbalanced amount is missing', () => {
    expect(getEdgeLabel(token, undefined as any, 12)).toEqual({});
    expect(getEdgeLabel(token, null as any, 12)).toEqual({});
  });

  it('builds an output label when the edge is output-heavy', () => {
    const result = getEdgeLabel(token, 3, 10) as any;

    expect(result.attrs.labelText.text).toBe('O');
    expect(result.attrs.labelBody.title).toBe('(OUTPUT: 13) - (INPUT: 10) = 3');
  });

  it('builds input and balanced labels for negative and zero imbalances', () => {
    const inputResult = getEdgeLabel(token, -2, 10) as any;
    const balancedResult = getEdgeLabel(token, 0, 10) as any;

    expect(inputResult.attrs.labelText.text).toBe('I');
    expect(inputResult.attrs.labelBody.title).toBe('(OUTPUT: 10) - (INPUT: 12) = -2');
    expect(balancedResult.attrs.labelText.text).toBe('B');
    expect(balancedResult.attrs.labelBody.title).toBe('(OUTPUT: 10) - (INPUT: 10) = 0');
  });
});
