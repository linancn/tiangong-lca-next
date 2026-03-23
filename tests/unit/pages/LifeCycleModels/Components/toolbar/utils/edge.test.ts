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

    expect(result.attrs.labelText.text).toBe('Sur');
    expect(result.attrs.labelBody.title).toBe('(Output: 13) - (Input: 10) = 3');
    expect(result.attrs.labelBody.strokeWidth).toBe(1);
  });

  it('builds input and balanced labels for negative and zero imbalances', () => {
    const inputResult = getEdgeLabel(token, -2, 10) as any;
    const balancedResult = getEdgeLabel(token, 0, 10) as any;

    expect(inputResult.attrs.labelText.text).toBe('Def');
    expect(inputResult.attrs.labelBody.title).toBe('(Output: 10) - (Input: 12) = -2');
    expect(balancedResult.attrs.labelText.text).toBe('Bal');
    expect(balancedResult.attrs.labelBody.title).toBe('(Output: 10) - (Input: 10) = 0');
  });

  it('supports localized edge labels and tooltip titles', () => {
    const result = getEdgeLabel(token, 0, 8, {
      balanced: '平',
      deficit: '亏',
      surplus: '余',
      input: '流入',
      output: '流出',
    }) as any;

    expect(result.attrs.labelText.text).toBe('平');
    expect(result.attrs.labelBody.title).toBe('(流出: 8) - (流入: 8) = 0');
  });
});
