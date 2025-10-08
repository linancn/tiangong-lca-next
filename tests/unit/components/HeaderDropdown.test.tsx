/**
 * Tests for HeaderDropdown component
 * Path: src/components/HeaderDropdown/index.tsx
 */

import HeaderDropdown from '@/components/HeaderDropdown';
import { render } from '@testing-library/react';

const mockDropdown = jest.fn();

jest.mock('antd', () => ({
  Dropdown: (props: any) => {
    mockDropdown(props);
    return <div data-testid='dropdown'>{props.children}</div>;
  },
}));

const mockStyles = { dropdown: 'generated-dropdown-class' };

jest.mock('antd-style', () => ({
  createStyles: jest.fn(() => () => ({ styles: mockStyles })),
}));

describe('HeaderDropdown', () => {
  beforeEach(() => {
    mockDropdown.mockClear();
  });

  it('applies generated overlay class along with provided overlayClassName', () => {
    render(
      <HeaderDropdown overlayClassName='custom-class' placement='bottomRight'>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    expect(mockDropdown).toHaveBeenCalledTimes(1);
    const props = mockDropdown.mock.calls[0][0];
    expect(props.overlayClassName).toContain('generated-dropdown-class');
    expect(props.overlayClassName).toContain('custom-class');
    expect(props.placement).toBe('bottomRight');
  });

  it('forwards additional props to Dropdown', () => {
    const menu = { items: [] };

    render(
      <HeaderDropdown overlayClassName='custom-class' trigger={['click']} menu={menu}>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    const props = mockDropdown.mock.calls[0][0];
    expect(props.menu).toBe(menu);
    expect(props.trigger).toEqual(['click']);
  });
});
