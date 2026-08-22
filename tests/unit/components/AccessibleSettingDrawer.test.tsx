import AccessibleSettingDrawer from '@/components/AccessibleSettingDrawer';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@ant-design/icons', () => ({
  CloseOutlined: () => <span>close</span>,
  SettingOutlined: () => <span>setting</span>,
}));

jest.mock('@ant-design/pro-components', () => ({
  SettingDrawer: ({ collapse, onCollapseChange, prefixCls }: any) => (
    <button
      data-collapse={String(collapse)}
      data-prefix-cls={prefixCls}
      data-testid='upstream-setting-drawer'
      type='button'
      onClick={() => onCollapseChange?.(false)}
    >
      upstream drawer
    </button>
  ),
}));

describe('AccessibleSettingDrawer', () => {
  it('controls the hidden upstream trigger through one semantic button', () => {
    render(
      <AccessibleSettingDrawer
        closeLabel='Close page style setting'
        openLabel='Open page style setting'
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Open page style setting' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('upstream-setting-drawer')).toHaveAttribute(
      'data-prefix-cls',
      'tg-pro',
    );

    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: 'Close page style setting' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByTestId('upstream-setting-drawer')).toHaveAttribute('data-collapse', 'true');

    fireEvent.click(screen.getByTestId('upstream-setting-drawer'));

    expect(screen.getByRole('button', { name: 'Open page style setting' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
