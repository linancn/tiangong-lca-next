import DatasetClassificationFilter, {
  toDatasetClassificationOptions,
} from '@/components/DatasetClassificationFilter';
import { getILCDClassification, getILCDFlowCategorization } from '@/services/classifications/api';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';

let mockCascaderProps: any;
jest.mock('antd', () => {
  const React = require('react');
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    Cascader: function CaptureNativeCascader(props: any) {
      mockCascaderProps = props;
      return React.createElement(actual.Cascader, props);
    },
  };
});

jest.mock('@/services/classifications/api', () => ({
  getILCDClassification: jest.fn(),
  getILCDFlowCategorization: jest.fn(),
}));
let mockLocale = 'en-US';
jest.mock('umi', () => ({
  useIntl: () => ({ locale: mockLocale, formatMessage: ({ id }: { id: string }) => id }),
  FormattedMessage: ({ id }: { id: string }) => id,
}));

const classification = jest.mocked(getILCDClassification);
const elementary = jest.mocked(getILCDFlowCategorization);
const nodes = [
  {
    id: 'C',
    label: 'Manufacturing',
    value: 'Manufacturing',
    children: [{ id: '23', label: 'Mineral products', value: 'Mineral products', children: [] }],
  },
];
const label = 'pages.table.title.classification';

describe('DatasetClassificationFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCascaderProps = undefined;
    mockLocale = 'en-US';
    classification.mockResolvedValue({ success: true, data: nodes });
    elementary.mockResolvedValue({
      success: true,
      data: [{ id: 'air', label: 'Emissions to air', value: 'Emissions to air', children: [] }],
    });
  });

  it('keeps labels and query identities separate from complete localized hierarchy titles', () => {
    const options = toDatasetClassificationOptions(nodes, 'classification');
    expect(options[0]).toMatchObject({
      label: 'Manufacturing',
      title: 'Manufacturing',
      value: 'classification:C',
      filter: { scope: 'classification', code: 'C', path: ['C'] },
    });
    expect(options[0].children?.[0]).toEqual({
      label: 'Mineral products',
      title: 'Manufacturing / Mineral products',
      value: 'classification:23',
      filter: { scope: 'classification', code: '23', path: ['C', '23'] },
    });
  });

  it('shows full option names in visible body tooltips while preserving native search highlighting', async () => {
    const user = userEvent.setup();
    const root = 'Manufacturing with a very long localized classification name';
    const first = 'Mineral products with a shared long prefix and distinct first ending';
    const second = 'Mineral products with a shared long prefix and distinct second ending';
    classification.mockResolvedValue({
      success: true,
      data: [
        {
          ...nodes[0],
          label: root,
          children: [
            { ...nodes[0].children[0], label: first },
            { ...nodes[0].children[0], id: '24', label: second },
          ],
        },
      ],
    });
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    const rootOption = await screen.findByRole('menuitemcheckbox', {
      name: new RegExp(`^${root}`),
    });
    expect(rootOption).toHaveAttribute('title', root);
    await user.hover(within(rootOption).getByText(root));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(root);
    expect(screen.getByRole('tooltip').closest('.ant-cascader-dropdown')).toBeNull();
    expect(input).toHaveFocus();
    await user.unhover(within(rootOption).getByText(root));
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    await user.click(within(rootOption).getByText(root));
    const leaf = await screen.findByRole('menuitemcheckbox', { name: first });
    expect(leaf).toHaveAttribute('title', `${root} / ${first}`);
    await user.hover(within(leaf).getByText(first));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(`${root} / ${first}`);
    await user.unhover(within(leaf).getByText(first));
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    fireEvent.change(input, { target: { value: 'second' } });
    const searched = await screen.findByRole('menuitemcheckbox', { name: `${root} / ${second}` });
    expect(searched).toHaveAttribute('title', `${root} / ${second}`);
    const highlighted = searched.querySelector('.ant-cascader-menu-item-keyword');
    expect(highlighted).toHaveTextContent('second');
    await user.hover(highlighted!);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(`${root} / ${second}`);
    expect(tooltip).toHaveStyle({ whiteSpace: 'normal', overflowWrap: 'anywhere' });
    expect(tooltip.parentElement).toHaveStyle({ maxWidth: 'min(480px, calc(100vw - 16px))' });
    expect(input).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    await user.unhover(highlighted!);
    await user.click(searched);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { scope: 'classification', code: '24', path: ['C', '24'] },
    ]);
  });

  it('shows the complete selected path on hover and native input focus and refreshes after locale changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const props = {
      datasetKind: 'process' as const,
      value: [{ scope: 'classification' as const, code: '23', path: ['C', '23'] }],
      onChange,
    };
    const { container, rerender } = render(
      <>
        <DatasetClassificationFilter {...props} lang='en' />
        <button type='button'>Outside</button>
      </>,
    );
    const fullPath = 'Manufacturing / Mineral products';
    await screen.findByText(fullPath);
    const input = screen.getByRole('combobox', { name: label });
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
    await user.tab();
    expect(input).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(fullPath);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.click(input);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'pages.button.cancel' }));
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await user.hover(within(container).getByText(fullPath));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(fullPath);
    await user.unhover(within(container).getByText(fullPath));
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    classification.mockResolvedValue({
      success: true,
      data: [
        {
          ...nodes[0],
          label: '制造业完整本地化名称',
          children: [{ ...nodes[0].children[0], label: '非金属矿物制品完整本地化名称' }],
        },
      ],
    });
    mockLocale = 'zh-CN';
    rerender(
      <>
        <DatasetClassificationFilter {...props} lang='zh' />
        <button type='button'>Outside</button>
      </>,
    );
    const translatedPath = '制造业完整本地化名称 / 非金属矿物制品完整本地化名称';
    await within(container).findByText(translatedPath);
    await user.hover(within(container).getByText(translatedPath));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(translatedPath);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the complete code fallback available when a controlled selected path is missing from the taxonomy', async () => {
    const user = userEvent.setup();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'missing-leaf', path: ['C', 'missing-leaf'] }]}
        onChange={jest.fn()}
      />,
    );
    const fallback = 'Manufacturing / classification:missing-leaf';
    await screen.findByText(fallback);
    await user.hover(screen.getByText(fallback));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(fallback);
  });

  it('keeps native search keyboard selection staged for cancel and confirmation without moving focus', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: label });
    for (const [action, expectedCalls] of [
      ['cancel', 0],
      ['confirm', 1],
    ] as const) {
      await user.click(input);
      fireEvent.change(input, { target: { value: 'mineral' } });
      expect(
        await screen.findByRole('menuitemcheckbox', {
          name: 'Manufacturing / Mineral products',
        }),
      ).toHaveAttribute('title', 'Manufacturing / Mineral products');
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
      fireEvent.keyUp(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(onChange).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: `pages.button.${action}` }));
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).toHaveBeenCalledTimes(expectedCalls);
    }
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { scope: 'classification', code: '23', path: ['C', '23'] },
    ]);
  });

  it('keeps native popup content internal when a configured prefix changes the popup classname', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ConfigProvider prefixCls='classification-proof'>
        <DatasetClassificationFilter
          datasetKind='process'
          lang='en'
          value={[]}
          onChange={onChange}
        />
      </ConfigProvider>,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Manufacturing'));
    await user.click(await screen.findByText('Mineral products'));
    expect(document.querySelector('.ant-cascader-dropdown')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledWith([
      { scope: 'classification', code: '23', path: ['C', '23'] },
    ]);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('retains the pending filter for trigger text-node events and non-dismissal keyboard input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { container } = render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'C', path: ['C'] }]}
        onChange={onChange}
      />,
    );
    await screen.findByText('Manufacturing');
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    const text = document.createTreeWalker(container, NodeFilter.SHOW_TEXT).nextNode();
    expect(text).toBeInstanceOf(Text);
    fireEvent.mouseDown(text!);
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.cancel' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('accepts a controlled native close without a selection and ignores late callbacks after unmount', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { unmount } = render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await act(async () => {
      mockCascaderProps.onOpenChange(false);
    });
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    await user.click(input);
    const lateNativeCallback = mockCascaderProps.onOpenChange;
    unmount();
    await act(async () => {
      lateNativeCallback(false);
      lateNativeCallback(true);
    });
    expect(screen.queryByRole('combobox', { name: label })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('searches taxonomy labels and codes without changing the active server filter', async () => {
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'mineral' } });
    await waitFor(() =>
      expect(document.querySelector('.ant-cascader-dropdown')).toHaveTextContent(
        'Mineral products',
      ),
    );
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '23' } });
    await waitFor(() =>
      expect(document.querySelector('.ant-cascader-dropdown')).toHaveTextContent(
        'Mineral products',
      ),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(classification).toHaveBeenCalledTimes(1);
  });

  it('hydrates a code-only selector and submits native clear only after confirmation', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { container } = render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'C' }]}
        onChange={onChange}
      />,
    );
    await screen.findByText('Manufacturing');
    const clear = container.querySelector('.ant-select-clear');
    expect(clear).not.toBeNull();
    await user.click(clear!);
    expect(onChange).not.toHaveBeenCalled();
    const input = screen.getByRole('combobox', { name: label });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([]);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('selects an ancestor using stable codes, then a complete descendant path', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalledWith('Process', 'en', ['all']));
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Manufacturing'));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(await screen.findByText('Mineral products'));
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'classification', code: '23', path: ['C', '23'] },
    ]);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    await user.click(input);
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /^Manufacturing/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'classification', code: 'C', path: ['C'] },
    ]);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('offers both flow scopes without mixing localized labels into the query', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter datasetKind='flow' lang='zh' value={[]} onChange={onChange} />,
    );
    await waitFor(() => expect(elementary).toHaveBeenCalledWith('zh', ['all']));
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Emissions to air'));
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'elementary', code: 'air', path: ['air'] },
    ]);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('does not load CPC options for an elementary-only selector', async () => {
    render(
      <DatasetClassificationFilter
        datasetKind='flow'
        flowType='Elementary flow'
        lang='en'
        value={[]}
        onChange={jest.fn()}
      />,
    );
    await waitFor(() => expect(elementary).toHaveBeenCalled());
    expect(classification).not.toHaveBeenCalled();
  });

  it('ignores a stale language response and retains the controlled code path', async () => {
    let resolveOld!: (value: { success: boolean; data: typeof nodes }) => void;
    classification.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const props = { datasetKind: 'process' as const, value: [], onChange: jest.fn() };
    const { rerender } = render(<DatasetClassificationFilter {...props} lang='en' />);
    rerender(<DatasetClassificationFilter {...props} lang='zh' />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
    await screen.findByText('Manufacturing');
    resolveOld({ success: true, data: [{ ...nodes[0], label: 'Stale label' }] });
    await waitFor(() => expect(screen.queryByText('Stale label')).not.toBeInTheDocument());
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
  });

  it('shows a retry action when the taxonomy fails, without clearing an applied filter', async () => {
    classification.mockResolvedValueOnce({ success: false, data: [] });
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'C', path: ['C'] }]}
        onChange={onChange}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
    fireEvent.click(await screen.findByText('pages.classification.retry'));
    await waitFor(() => expect(classification).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText('pages.classification.retry')).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText('Manufacturing').length).toBeGreaterThan(0);
    expect(onChange).not.toHaveBeenCalled();
  });
  it.each(['cancel', 'outside', 'escape'] as const)(
    'discards a leaf draft on %s and accepts the first dismissal',
    async (dismissal) => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(
        <>
          <DatasetClassificationFilter
            datasetKind='process'
            lang='en'
            value={[]}
            onChange={onChange}
          />
          <button type='button'>Outside</button>
        </>,
      );
      await waitFor(() => expect(classification).toHaveBeenCalled());
      const input = screen.getByRole('combobox', { name: label });
      await user.click(input);
      await user.click(await screen.findByText('Manufacturing'));
      await user.click(await screen.findByText('Mineral products'));
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(onChange).not.toHaveBeenCalled();
      if (dismissal === 'cancel')
        await user.click(screen.getByRole('button', { name: 'pages.button.cancel' }));
      if (dismissal === 'outside')
        await user.click(screen.getByRole('button', { name: 'Outside' }));
      if (dismissal === 'escape')
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27 });
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).not.toHaveBeenCalled();
      await user.click(input);
      await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it('confirms an unchanged code-only filter without submitting a hydrated path', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'C' }]}
        onChange={onChange}
      />,
    );
    await screen.findByText('Manufacturing');
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /^Manufacturing/ }));
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('discards pending footer clear on cancel and submits it once on confirm', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'C', path: ['C'] }]}
        onChange={onChange}
      />,
    );
    await screen.findByText('Manufacturing');
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(screen.getByRole('button', { name: 'pages.button.clear' }));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.cancel' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(input);
    await user.click(screen.getByRole('button', { name: 'pages.button.clear' }));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it.each(['scope', 'language', 'locale', 'value'] as const)(
    'invalidates pending selection when external %s changes',
    async (change) => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const props = { datasetKind: 'process' as const, lang: 'en', value: [], onChange };
      const { rerender } = render(<DatasetClassificationFilter {...props} />);
      await waitFor(() => expect(classification).toHaveBeenCalled());
      await user.click(screen.getByRole('combobox', { name: label }));
      await user.click(await screen.findByText('Manufacturing'));
      await user.click(await screen.findByText('Mineral products'));
      const next = {
        ...props,
        ...(change === 'scope'
          ? { datasetKind: 'flow' as const, flowType: 'Elementary flow' }
          : {}),
        ...(change === 'language' ? { lang: 'zh' } : {}),
        ...(change === 'value'
          ? { value: [{ scope: 'classification' as const, code: 'C', path: ['C'] }] }
          : {}),
      };
      if (change === 'locale') mockLocale = 'zh-CN';
      rerender(<DatasetClassificationFilter {...next} />);
      const input = screen.getByRole('combobox', { name: label });
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).not.toHaveBeenCalled();
      await user.click(input);
      await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).not.toHaveBeenCalled();
    },
  );
  it('does not swallow an immediate first outside dismissal when it replaces a queued native leaf close', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <>
        <DatasetClassificationFilter
          datasetKind='process'
          lang='en'
          value={[]}
          onChange={onChange}
        />
        <div data-testid='outside-area'>Outside area</div>
      </>,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Manufacturing'));
    fireEvent.click(await screen.findByText('Mineral products'));
    await user.click(screen.getByTestId('outside-area'));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(input);
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('releases its outside-interaction listeners on unmount without applying a pending selection', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const remove = jest.spyOn(document, 'removeEventListener');
    try {
      const { unmount } = render(
        <DatasetClassificationFilter
          datasetKind='process'
          lang='en'
          value={[]}
          onChange={onChange}
        />,
      );
      await waitFor(() => expect(classification).toHaveBeenCalled());
      await user.click(screen.getByRole('combobox', { name: label }));
      await user.click(await screen.findByText('Manufacturing'));
      await user.click(await screen.findByText('Mineral products'));
      unmount();
      expect(remove).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
      expect(remove).toHaveBeenCalledWith('focusin', expect.any(Function), true);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      remove.mockRestore();
    }
  });

  it('keeps a pending draft when native popup chrome receives the scrollbar interaction', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Manufacturing'));
    await user.click(await screen.findByText('Mineral products'));
    const popup = document.querySelector('.ant-cascader-dropdown');
    expect(popup).not.toBeNull();
    fireEvent.mouseDown(popup!);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledWith([
      { scope: 'classification', code: '23', path: ['C', '23'] },
    ]);
  });

  it('retains a leaf draft while refocusing the search input, and cancels it with the native suffix toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { container } = render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Manufacturing'));
    fireEvent.click(await screen.findByText('Mineral products'));
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(onChange).not.toHaveBeenCalled();
    const suffix = container.querySelector('.ant-select-suffix');
    expect(suffix).not.toBeNull();
    await user.click(suffix!);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cancels a pending draft when the window loses focus without applying it', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Manufacturing'));
    await user.click(await screen.findByText('Mineral products'));
    fireEvent.blur(window);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps successive searched leaves pending after native asynchronous work, then cancels on keyboard focus leaving the selector', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <>
        <DatasetClassificationFilter
          datasetKind='process'
          lang='en'
          value={[]}
          onChange={onChange}
        />
        <button type='button'>Focus outside</button>
      </>,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    fireEvent.change(input, { target: { value: 'mineral' } });
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: /Manufacturing.*Mineral products/ }),
    );
    await act(async () => {
      await new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          channel.port1.close();
          channel.port2.close();
          resolve();
        };
        channel.port2.postMessage(null);
      });
    });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.cancel' }));
    await user.click(input);
    fireEvent.change(input, { target: { value: '23' } });
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: /Manufacturing.*Mineral products/ }),
    );
    await act(async () => {
      screen.getByRole('button', { name: 'Focus outside' }).focus();
    });
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores a stale failed taxonomy request after the language changes', async () => {
    const user = userEvent.setup();
    let rejectOld!: (error: Error) => void;
    classification.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject;
        }),
    );
    const onChange = jest.fn();
    const props = {
      datasetKind: 'process' as const,
      value: [{ scope: 'classification' as const, code: 'C', path: ['C'] }],
      onChange,
    };
    const { rerender } = render(<DatasetClassificationFilter {...props} lang='en' />);
    rerender(<DatasetClassificationFilter {...props} lang='zh' />);
    await waitFor(() => expect(classification).toHaveBeenCalledTimes(2));
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await screen.findByRole('menuitemcheckbox', { name: /^Manufacturing/ });
    await act(async () => {
      rejectOld(new Error('stale taxonomy failure'));
    });
    expect(screen.queryByText('pages.classification.loadFailed')).not.toBeInTheDocument();
    expect(screen.queryByText('pages.classification.retry')).not.toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: /^Manufacturing/ })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.cancel' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('submits a changed ancestor path even when the leaf code is unchanged', async () => {
    const user = userEvent.setup();
    classification.mockResolvedValue({
      success: true,
      data: [
        ...nodes,
        {
          id: 'D',
          label: 'Energy',
          value: 'Energy',
          children: [
            {
              id: '23',
              label: 'Other mineral products',
              value: 'Other mineral products',
              children: [],
            },
          ],
        },
      ],
    });
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: '23', path: ['C', '23'] }]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalled());
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByText('Energy'));
    await user.click(await screen.findByText('Other mineral products'));
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'pages.button.confirm' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'classification', code: '23', path: ['D', '23'] },
    ]);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });
});
