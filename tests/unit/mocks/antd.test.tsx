import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { createAntdMock } from '../../mocks/antd';

const { Form } = createAntdMock();
const MockForm = Form as any;

describe('Ant Design test mock', () => {
  it('keeps useForm instances stable across parent rerenders', async () => {
    const observedInstances = new Set<any>();

    const Harness = () => {
      const [renderCount, setRenderCount] = React.useState(0);
      const [form] = MockForm.useForm();
      observedInstances.add(form);

      return (
        <>
          <MockForm form={form}>
            <MockForm.Item name='name'>
              <input aria-label='Name' />
            </MockForm.Item>
          </MockForm>
          <span data-testid='render-count'>{renderCount}</span>
          <button type='button' onClick={() => setRenderCount((count: number) => count + 1)}>
            Rerender parent
          </button>
        </>
      );
    };

    render(<Harness />);

    await waitFor(() =>
      expect(typeof Array.from(observedInstances)[0]?.validateFields).toBe('function'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rerender parent' }));

    expect(screen.getByTestId('render-count')).toHaveTextContent('1');
    expect(observedInstances.size).toBe(1);
    await expect(Array.from(observedInstances)[0].validateFields()).resolves.toEqual({});
  });
});
