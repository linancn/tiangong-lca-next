/**
 * Tests for LevelTextItemForm component
 * Path: src/components/LevelTextItem/form.tsx
 */

import LevelTextItemForm from '@/components/LevelTextItem/form';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mockGetILCDClassification = jest.fn();
const mockGetILCDFlowCategorization = jest.fn();
let latestTreeSelectProps: any = null;

jest.mock('@/services/classifications/api', () => ({
  getILCDClassification: (...args: any[]) => mockGetILCDClassification(...args),
  getILCDFlowCategorization: (...args: any[]) => mockGetILCDFlowCategorization(...args),
}));

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) => (
    <span>{defaultMessage ?? id}</span>
  ),
}));

jest.mock('antd', () => {
  const flattenSelectable = (nodes: any[] = []): any[] =>
    nodes.flatMap((node) => {
      const children = node.children ? flattenSelectable(node.children) : [];
      if (node.selectable === false) {
        return children;
      }
      return [node, ...children];
    });

  const TreeSelect = ({ treeData = [], onChange, filterTreeNode }: any) => {
    const options = flattenSelectable(treeData);
    latestTreeSelectProps = { treeData, onChange, filterTreeNode };
    return (
      <div>
        {options.map((option: any) => (
          <button
            key={option.id}
            type='button'
            onClick={() => onChange(option.id)}
            data-testid={`classification-option-${option.id}`}
          >
            {option.title || option.label || option.id}
          </button>
        ))}
      </div>
    );
  };

  const FormItem = ({ children, label, help, hidden }: any) => (
    <div data-testid='form-item' data-hidden={hidden ? 'true' : 'false'}>
      {label ? <label>{typeof label === 'string' ? label : label}</label> : null}
      <div>{children}</div>
      {help ? <div role='alert'>{help}</div> : null}
    </div>
  );

  const Form: any = () => null;
  Form.Item = FormItem;

  const Cascader = ({ options }: any) => (
    <div data-testid='cascader'>{JSON.stringify(options)}</div>
  );

  const Input = () => <input data-testid='hidden-input' type='hidden' aria-hidden='true' />;

  return {
    Cascader,
    Form,
    Input,
    TreeSelect,
  };
});

describe('LevelTextItemForm', () => {
  const createFormRef = (initialStore: Record<string, any> = {}) => {
    const store: Record<string, any> = JSON.parse(JSON.stringify(initialStore));

    const setValueAtPath = (path: any[], value: any) => {
      let node = store;
      for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        if (!node[key]) {
          node[key] = {};
        }
        node = node[key];
      }
      node[path[path.length - 1]] = value;
    };

    const getValueAtPath = (path: any[]): any => {
      let node: any = store;
      for (const key of path) {
        node = node?.[key];
        if (node === undefined) {
          return undefined;
        }
      }
      return node;
    };

    const getFieldValue = jest.fn((path: any) =>
      getValueAtPath(Array.isArray(path) ? path : [path]),
    );
    const setFieldValue = jest.fn(async (path: any, value: any) => {
      const finalPath = Array.isArray(path) ? path : [path];
      setValueAtPath(finalPath, value);
    });

    return {
      current: {
        getFieldValue,
        setFieldValue,
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    latestTreeSelectProps = null;
  });

  it('shows validation help when classification is required but missing', async () => {
    mockGetILCDClassification.mockResolvedValue({ data: [], success: true });
    const formRef = createFormRef();

    render(
      <LevelTextItemForm
        name={['classification']}
        lang='en'
        dataType='Process'
        flowType='Product flow'
        formRef={formRef}
        hidden={false}
        onData={jest.fn()}
        rules={[]}
        showRules
      />,
    );

    await waitFor(() => {
      expect(mockGetILCDClassification).toHaveBeenCalledWith('Process', 'en', ['all']);
    });

    expect(screen.getByText('Classification')).toBeInTheDocument();
    expect(screen.getByText('Please input classification')).toBeInTheDocument();
  });

  it('fetches flow categorization when requesting elementary flow data', async () => {
    mockGetILCDFlowCategorization.mockResolvedValue({ data: [], success: true });
    const formRef = createFormRef();

    render(
      <LevelTextItemForm
        name={['classification']}
        lang='en'
        dataType='Flow'
        flowType='Elementary flow'
        formRef={formRef}
        hidden={false}
        onData={jest.fn()}
        rules={[]}
        showRules={false}
      />,
    );

    await waitFor(() => {
      expect(mockGetILCDFlowCategorization).toHaveBeenCalledWith('en', ['all']);
    });
  });

  it('updates form fields and clears validation once a classification is selected', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [
        {
          id: 'level-1',
          label: 'Root',
          value: 'root',
          children: [
            {
              id: 'level-2',
              label: 'Leaf',
              value: 'leaf',
            },
          ],
        },
      ],
      success: true,
    });

    const formRef = createFormRef();
    const onData = jest.fn();

    render(
      <LevelTextItemForm
        name={['classification']}
        lang='en'
        dataType='Process'
        formRef={formRef}
        hidden={false}
        flowType='Product flow'
        onData={onData}
        rules={[]}
        showRules
      />,
    );

    await waitFor(() => {
      expect(mockGetILCDClassification).toHaveBeenCalled();
    });

    const optionButton = await screen.findByRole('button', { name: 'Root/Leaf' });
    fireEvent.click(optionButton);

    await waitFor(() => {
      expect(onData).toHaveBeenCalledTimes(1);
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'id'],
        ['level-1', 'level-2'],
      );
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'value'],
        ['root', 'leaf'],
      );
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'showValue'],
        'level-2',
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Please input classification')).not.toBeInTheDocument();
    });
  });

  it('uses default props and skips flow classification fetch when flowType is missing', async () => {
    const formRef = createFormRef();

    render(
      <LevelTextItemForm
        name={['classification']}
        lang='en'
        dataType='Flow'
        formRef={formRef}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockGetILCDClassification).not.toHaveBeenCalled();
      expect(mockGetILCDFlowCategorization).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('Please input classification')).not.toBeInTheDocument();
  });

  it('derives the show value from stored classification values and supports tree filtering', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [
        {
          id: 'level-1',
          label: 'Root',
          value: 'root',
          children: [
            {
              id: 'level-2',
              title: 'Leaf without label',
            },
          ],
        },
      ],
      success: true,
    });

    const formRef = createFormRef({
      classification: {
        value: ['Root/'],
      },
    });

    render(
      <LevelTextItemForm
        name={['classification']}
        lang='en'
        dataType='Process'
        flowType='Product flow'
        formRef={formRef}
        hidden={false}
        onData={jest.fn()}
        rules={[]}
        showRules={false}
      />,
    );

    await waitFor(() => {
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'showValue'],
        'level-2',
      );
    });

    expect(latestTreeSelectProps.filterTreeNode('root', { title: 'Root/' })).toBe(true);
    expect(latestTreeSelectProps.filterTreeNode('zzz', { title: undefined })).toBeUndefined();

    fireEvent.click(await screen.findByRole('button', { name: 'Root/' }));

    await waitFor(() => {
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'id'],
        ['level-1', 'level-2'],
      );
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'value'],
        ['root', 'Root/'],
      );
    });
  });

  it('falls back when stored values and selected ids cannot be resolved', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [
        {
          id: 'level-1',
          label: 'Root',
          value: 'root',
        },
      ],
      success: true,
    });

    const formRef = createFormRef({
      classification: {
        value: ['unknown-leaf'],
      },
    });
    const onData = jest.fn();

    render(
      <LevelTextItemForm
        name={['classification']}
        lang='en'
        dataType='Process'
        flowType='Product flow'
        formRef={formRef}
        hidden={false}
        onData={onData}
        rules={[]}
        showRules
      />,
    );

    await waitFor(() => {
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'showValue'],
        '',
      );
    });

    await act(async () => {
      await latestTreeSelectProps.onChange('missing-id');
    });

    await waitFor(() => {
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(['classification', 'id'], []);
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(['classification', 'value'], []);
      expect(formRef.current?.setFieldValue).toHaveBeenCalledWith(
        ['classification', 'showValue'],
        undefined,
      );
      expect(onData).toHaveBeenCalled();
    });

    expect(screen.getByText('Please input classification')).toBeInTheDocument();
  });
});
