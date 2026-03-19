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
  theme: {
    useToken: () => ({ token: { screenXS: 480 } }),
  },
}));

describe('HeaderDropdown', () => {
  beforeEach(() => {
    mockDropdown.mockClear();
  });

  it('passes overlayClassName and placement to Dropdown', () => {
    render(
      <HeaderDropdown overlayClassName='custom-class' placement='bottomRight'>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    expect(mockDropdown).toHaveBeenCalledTimes(1);
    const props = mockDropdown.mock.calls[0][0];
    expect(props.overlayClassName).toBe('custom-class');
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

  it('works without overlayClassName', () => {
    render(
      <HeaderDropdown placement='bottomLeft'>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    const props = mockDropdown.mock.calls[0][0];
    expect(props.overlayClassName).toBeUndefined();
    expect(props.placement).toBe('bottomLeft');
  });
});
