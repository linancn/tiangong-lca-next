import ClassificationSystemsForm from '@/components/LevelTextItem/form';
import TidasRepeatedField from '@/components/TidasRepeatedField';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Form, Input } from 'antd';

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));
jest.mock('@/services/classifications/api', () => ({
  getILCDClassification: jest.fn(async () => ({ success: true, data: [] })),
  getILCDFlowCategorization: jest.fn(async () => ({ success: true, data: [] })),
}));

it('edits, appends and removes repeated entries without changing the untouched entry', async () => {
  let form: any;
  const changed = jest.fn();
  function Harness() {
    [form] = Form.useForm();
    return (
      <Form form={form} initialValues={{ parameters: { '@name': 'first', meanValue: '0' } }}>
        <TidasRepeatedField name={['parameters']} onChange={changed}>
          {(path) => (
            <Form.Item name={[...path, '@name']} label='Parameter'>
              <Input />
            </Form.Item>
          )}
        </TidasRepeatedField>
      </Form>
    );
  }
  render(<Harness />);
  expect(screen.getByLabelText('Parameter')).toHaveValue('first');
  fireEvent.click(screen.getByRole('button', { name: /Add/ }));
  await waitFor(() => expect(screen.getAllByLabelText('Parameter')).toHaveLength(2));
  fireEvent.change(screen.getAllByLabelText('Parameter')[1], { target: { value: 'second' } });
  expect(form.getFieldsValue(true).parameters).toEqual([
    { '@name': 'first', meanValue: '0' },
    { '@name': 'second' },
  ]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
  await waitFor(() => expect(screen.getAllByLabelText('Parameter')).toHaveLength(1));
  expect(form.getFieldsValue(true).parameters).toEqual([{ '@name': 'second' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(form.getFieldValue('parameters')).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: /Add/ }));
  await waitFor(() => expect(screen.getByLabelText('Parameter')).toBeInTheDocument());
  expect(changed).toHaveBeenCalledTimes(4);
});

it('edits classes in the second named system while preserving both system identities', async () => {
  let form: any;
  const systems = [
    {
      '@name': 'A',
      '@classes': 'https://example.org/a',
      'common:class': [{ '@level': '2', '@classId': 'a', '#text': 'Alpha' }],
    },
    {
      '@name': 'B',
      '@classes': 'https://example.org/b',
      'common:class': [{ '@level': '0', '@classId': 'b', '#text': 'Beta' }],
    },
  ];
  function Harness() {
    [form] = Form.useForm();
    return (
      <Form form={form} initialValues={{ classification: systems }}>
        <ClassificationSystemsForm
          name={['classification', 'common:class']}
          lang='en'
          dataType='Process'
          formRef={{ current: form }}
          onData={() => {}}
        />
      </Form>
    );
  }
  render(<Harness />);
  await act(async () => {
    fireEvent.change(screen.getAllByLabelText('Class name')[1], {
      target: { value: 'Updated beta' },
    });
  });
  const result = form.getFieldsValue(true).classification;
  expect(result[0]).toEqual(systems[0]);
  expect(result[1]['@name']).toBe('B');
  expect(result[1]['@classes']).toBe(systems[1]['@classes']);
  expect(result[1]['common:class'][0]).toEqual({
    '@level': '0',
    '@classId': 'b',
    '#text': 'Updated beta',
  });
});

it.each([undefined, { '@level': '0', '#text': 'Alpha' }])(
  'normalizes array-only classes before editing (%p)',
  async (initial) => {
    let form: any;
    function Harness() {
      [form] = Form.useForm();
      return (
        <Form form={form} initialValues={{ classes: initial }}>
          <TidasRepeatedField name={['classes']} arrayOnly onChange={() => {}}>
            {(path) => (
              <Form.Item name={[...path, '#text']} label='Class'>
                <Input />
              </Form.Item>
            )}
          </TidasRepeatedField>
        </Form>
      );
    }
    render(<Harness />);
    await waitFor(() => expect(form.getFieldValue('classes')).toEqual(initial ? [initial] : []));
  },
);

it('can change a pinned singleton classification to a named system and back', async () => {
  let form: any;
  function Harness() {
    [form] = Form.useForm();
    return (
      <Form
        form={form}
        initialValues={{ classification: { 'common:class': { id: ['a'], value: ['Alpha'] } } }}
      >
        <ClassificationSystemsForm
          name={['classification', 'common:class']}
          lang='en'
          dataType='Process'
          formRef={{ current: form }}
          onData={() => {}}
        />
      </Form>
    );
  }
  await act(async () => {
    render(<Harness />);
  });
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Classification system'), {
      target: { value: 'Custom' },
    });
  });
  expect(form.getFieldValue(['classification', 'common:class'])).toEqual({
    '@level': '0',
    '@classId': 'a',
    '#text': 'Alpha',
  });
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Classification system'), { target: { value: '' } });
  });
  expect(form.getFieldValue(['classification', 'common:class']).value).toEqual(['Alpha']);
});
