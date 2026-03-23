import {
  getPortLabelWithAllocation,
  getPortTextColor,
  getPortTextStyle,
  nodeTitleTool,
} from '@/pages/LifeCycleModels/Components/toolbar/utils/node';

const mockGenNodeLabel = jest.fn(
  (title: string, lang: string, width: number) => `${title}:${lang}:${width}`,
);

jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genNodeLabel: (title: string, lang: string, width: number) =>
    mockGenNodeLabel(title, lang, width),
}));

describe('toolbar/utils/node', () => {
  const token = {
    colorPrimary: '#1677ff',
    colorTextDescription: '#999',
  } as any;

  it('formats allocation labels only for positive output allocations', () => {
    expect(
      getPortLabelWithAllocation(
        'Electricity',
        { allocation: { '@allocatedFraction': '25%' } } as any,
        'OUTPUT',
      ),
    ).toBe('[25%]Electricity');

    expect(
      getPortLabelWithAllocation(
        'Steam',
        { allocation: { '@allocatedFraction': '25%' } } as any,
        'INPUT',
      ),
    ).toBe('Steam');

    expect(getPortLabelWithAllocation('Heat', undefined, 'OUTPUT')).toBe('Heat');
  });

  it('derives text color and style from allocation and quantitative reference state', () => {
    expect(getPortTextColor(false, undefined, token)).toBe('#999');
    expect(
      getPortTextColor(false, { allocation: { '@allocatedFraction': '10%' } } as any, token),
    ).toBe('#1677ff');
    expect(getPortTextColor(true, undefined, token)).toBe('#1677ff');

    expect(getPortTextStyle(true)).toBe('bold');
    expect(getPortTextStyle(false)).toBe('normal');
  });

  it('builds the node title tool payload with the generated label and tooltip title', () => {
    const result = nodeTitleTool(180, 'Process A', token, 'en');

    expect(mockGenNodeLabel).toHaveBeenCalledWith('Process A', 'en', 180);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'nodeTitle',
        name: 'button',
        args: expect.objectContaining({
          markup: expect.arrayContaining([
            expect.objectContaining({
              tagName: 'rect',
              attrs: expect.objectContaining({
                'pointer-events': 'none',
              }),
            }),
            expect.objectContaining({
              tagName: 'text',
              textContent: 'Process A:en:180',
            }),
            expect.objectContaining({
              tagName: 'title',
              textContent: 'Process A',
            }),
          ]),
        }),
      }),
    );
  });
});
