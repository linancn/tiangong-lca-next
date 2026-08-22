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

  it('passes semantic root class name and placement to Dropdown', () => {
    render(
      <HeaderDropdown classNames={{ root: 'custom-class' }} placement='bottomRight'>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    expect(mockDropdown).toHaveBeenCalledTimes(1);
    const props = mockDropdown.mock.calls[0][0];
    expect(props.classNames).toEqual({ root: 'custom-class' });
    expect(props.placement).toBe('bottomRight');
  });

  it('forwards additional props to Dropdown', () => {
    const menu = { items: [] };

    render(
      <HeaderDropdown classNames={{ root: 'custom-class' }} trigger={['click']} menu={menu}>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    const props = mockDropdown.mock.calls[0][0];
    expect(props.menu).toBe(menu);
    expect(props.trigger).toEqual(['click']);
  });

  it('works without a semantic root class name', () => {
    render(
      <HeaderDropdown placement='bottomLeft'>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    const props = mockDropdown.mock.calls[0][0];
    expect(props.classNames).toBeUndefined();
    expect(props.placement).toBe('bottomLeft');
  });

  it('constrains overlay width to the viewport', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
      writable: true,
    });

    render(
      <HeaderDropdown placement='bottomLeft'>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    const props = mockDropdown.mock.calls[0][0];
    expect(props.styles).toEqual({
      root: {
        minWidth: 168,
        maxWidth: 'calc(100vw - 24px)',
      },
    });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWidth,
      writable: true,
    });
  });

  it('merges viewport constraints into styles returned by a resolver', () => {
    const styleResolver = jest
      .fn()
      .mockReturnValueOnce({
        root: { color: 'red' },
        item: { fontWeight: 600 },
      })
      .mockReturnValueOnce(undefined);

    render(
      <HeaderDropdown styles={styleResolver}>
        <span>Trigger</span>
      </HeaderDropdown>,
    );

    const styles = mockDropdown.mock.calls[0][0].styles;
    const styleInfo = { open: true };
    expect(styles(styleInfo)).toEqual({
      root: {
        minWidth: 168,
        maxWidth: 'calc(100vw - 24px)',
        color: 'red',
      },
      item: { fontWeight: 600 },
    });
    expect(styleResolver).toHaveBeenCalledWith(styleInfo);
    expect(styles({ open: false })).toEqual({
      root: {
        minWidth: 168,
        maxWidth: 'calc(100vw - 24px)',
      },
    });
  });
});
