/**
 * Tests for UnitConvert component
 * Path: src/components/UnitConvert/index.tsx
 */

import UnitConvert from '@/components/UnitConvert';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@umijs/max', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

type UnitConvertProps = {
  visible: boolean;
  onCancel: () => void;
  onOk: (value: number) => void;
  units: { name: string; meanValue: number }[];
  value?: number;
  targetUnit: string;
};

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const React = jest.requireActual('react');

  const Modal = ({ open, children, onOk, onCancel, title }: any) => {
    if (!open) {
      return null;
    }

    return (
      <div data-testid='unit-convert-modal'>
        <div>{title}</div>
        <div>{children}</div>
        <button type='button' onClick={onOk}>
          OK
        </button>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  };

  const Select = ({ value, onChange, children, ...rest }: any) => (
    <select value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} {...rest}>
      {React.Children.map(children, (child: any) => child)}
    </select>
  );

  Select.Option = ({ value, children, ...optionRest }: any) => (
    <option value={value} {...optionRest}>
      {children}
    </option>
  );

  return {
    ...actual,
    Modal,
    Select,
  };
});

describe('UnitConvert Component', () => {
  const defaultUnits = [
    { name: 'kilogram', meanValue: 1 },
    { name: 'gram', meanValue: 0.001 },
  ];

  const renderComponent = (props: Partial<UnitConvertProps> = {}) => {
    const onCancel = props.onCancel ?? jest.fn();
    const onOk = props.onOk ?? jest.fn();

    const utils = render(
      <UnitConvert
        visible={props.visible ?? true}
        onCancel={onCancel}
        onOk={onOk}
        units={props.units ?? defaultUnits}
        targetUnit={props.targetUnit ?? 'kilogram'}
        value={props.value}
      />,
    );

    return { ...utils, onCancel, onOk };
  };

  const getValueInput = () => screen.getByLabelText(/Value/i) as HTMLInputElement;
  const getUnitSelect = () => screen.getByLabelText(/Unit/i) as HTMLSelectElement;
  const getResultInput = () => screen.getByTestId('unit-convert-result') as HTMLInputElement;
  const getOkButton = () => screen.getByRole('button', { name: 'OK' });
  const getCancelButton = () => screen.getByRole('button', { name: 'Cancel' });

  it('prefills value and unit when modal is visible', async () => {
    renderComponent({ value: 12, targetUnit: 'kilogram' });

    await waitFor(() => {
      expect(getValueInput().value).toBe('12');
      expect(getUnitSelect().value).toBe('kilogram');
    });
  });

  it('calculates result using selected unit mean value', async () => {
    renderComponent();

    await waitFor(() => {
      expect(getUnitSelect().value).toBe('kilogram');
    });

    fireEvent.change(getValueInput(), { target: { value: '2' } });
    fireEvent.change(getUnitSelect(), { target: { value: 'gram' } });
    fireEvent.change(getValueInput(), { target: { value: '2' } });

    await waitFor(() => {
      expect(getUnitSelect().value).toBe('gram');
    });

    await waitFor(() => {
      expect(getResultInput().value).toBe('0.002');
    });
  });

  it('calls onOk with the computed result and resets the form', async () => {
    const { onOk, onCancel } = renderComponent();

    await waitFor(() => {
      expect(getUnitSelect().value).toBe('kilogram');
    });

    fireEvent.change(getValueInput(), { target: { value: '2' } });
    fireEvent.change(getUnitSelect(), { target: { value: 'gram' } });
    fireEvent.change(getValueInput(), { target: { value: '2' } });

    await waitFor(() => {
      expect(getUnitSelect().value).toBe('gram');
    });

    fireEvent.click(getOkButton());

    await waitFor(() => {
      expect(onOk).toHaveBeenCalledWith(0.002);
      expect(onCancel).toHaveBeenCalled();
      expect(getValueInput().value).toBe('');
      expect(getResultInput().value).toBe('');
    });
  });

  it('resets the form and invokes cancel handler when cancelled', async () => {
    const { onCancel } = renderComponent();

    await waitFor(() => {
      expect(getUnitSelect().value).toBe('kilogram');
    });

    fireEvent.change(getValueInput(), { target: { value: '3' } });
    fireEvent.change(getUnitSelect(), { target: { value: 'gram' } });
    fireEvent.change(getValueInput(), { target: { value: '3' } });

    await waitFor(() => {
      expect(getUnitSelect().value).toBe('gram');
    });

    fireEvent.click(getCancelButton());

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
      expect(getValueInput().value).toBe('');
      expect(getResultInput().value).toBe('');
    });
  });

  it('restores latest props when reopened after being hidden', async () => {
    const { rerender, onCancel, onOk } = renderComponent({ visible: false });

    rerender(
      <UnitConvert
        visible={true}
        onCancel={onCancel}
        onOk={onOk}
        units={defaultUnits}
        targetUnit='gram'
        value={2}
      />,
    );

    await waitFor(() => {
      expect(getValueInput().value).toBe('2');
      expect(getUnitSelect().value).toBe('gram');
    });

    fireEvent.change(getValueInput(), { target: { value: '3' } });

    await waitFor(() => {
      expect(getResultInput().value).toBe('0.003');
    });

    fireEvent.click(getCancelButton());

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });

    rerender(
      <UnitConvert
        visible={false}
        onCancel={onCancel}
        onOk={onOk}
        units={defaultUnits}
        targetUnit='gram'
        value={2}
      />,
    );

    rerender(
      <UnitConvert
        visible={true}
        onCancel={onCancel}
        onOk={onOk}
        units={defaultUnits}
        targetUnit='kilogram'
        value={10}
      />,
    );

    await waitFor(() => {
      expect(getValueInput().value).toBe('10');
      expect(getUnitSelect().value).toBe('kilogram');
      expect(getResultInput().value).toBe('');
    });
  });

  it('calls onOk when the converted result equals zero', async () => {
    const { onOk } = renderComponent({ value: 0 });

    await waitFor(() => {
      expect(getValueInput().value).toBe('0');
      expect(getUnitSelect().value).toBe('kilogram');
    });

    fireEvent.change(getValueInput(), { target: { value: '0' } });
    fireEvent.change(getUnitSelect(), { target: { value: 'kilogram' } });

    await waitFor(() => {
      expect(getResultInput().value).toBe('0');
    });

    fireEvent.click(getOkButton());

    await waitFor(() => {
      expect(onOk).toHaveBeenCalledWith(0);
    });
  });
});
