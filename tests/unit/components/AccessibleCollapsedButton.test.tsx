import { renderAccessibleCollapsedButton } from '@/components/AccessibleCollapsedButton';
import { ProLayout, type ProLayoutProps } from '@ant-design/pro-components';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isValidElement, useState, type ReactNode } from 'react';

describe('accessible native ProLayout collapse control', () => {
  it('preserves the actual native callback component and toggles layout with mouse and keyboard', async () => {
    const user = userEvent.setup();
    const onCollapse = jest.fn();
    const nativeCallbacks: { collapsed?: boolean; defaultDom: ReactNode }[] = [];
    const collapsedButtonRender: ProLayoutProps['collapsedButtonRender'] = (
      collapsed,
      defaultDom,
    ) => {
      nativeCallbacks.push({ collapsed, defaultDom });
      return renderAccessibleCollapsedButton('Navigationsmodus', defaultDom, collapsed);
    };

    const Layout = () => {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <ProLayout
          collapsed={collapsed}
          onCollapse={(next) => {
            onCollapse(next);
            setCollapsed(next);
          }}
          collapsedButtonRender={collapsedButtonRender}
          siderWidth={256}
          menu={{ collapsedWidth: 64 }}
          layout='side'
          headerRender={false}
          logo={false}
          title={false}
          route={{ routes: [{ path: '/catalog', name: 'Catalog' }] }}
          location={{ pathname: '/catalog' }}
        >
          <div>Catalog content</div>
        </ProLayout>
      );
    };

    const { container } = render(<Layout />);
    const trigger = await screen.findByRole('button', { name: 'Navigationsmodus' });
    const sider = container.querySelector('.ant-layout-sider');
    expect(sider).not.toBeNull();
    expect(sider).toHaveStyle({ width: '256px', flex: '0 0 256px' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('tabindex', '0');
    expect(trigger.querySelector('svg')).toBeVisible();
    expect(trigger).toHaveClass('ant-pro-sider-collapsed-button');
    expect(container.querySelectorAll('[data-tg-pro-layout-collapse-trigger]')).toHaveLength(1);

    const nativeDom = nativeCallbacks[nativeCallbacks.length - 1].defaultDom;
    expect(isValidElement(nativeDom)).toBe(true);
    if (!isValidElement<{ children?: ReactNode; className?: string }>(nativeDom)) {
      throw new Error('ProLayout must pass its native collapse component');
    }
    expect(typeof nativeDom.type).toBe('function');
    expect(nativeDom.props.children).toBeUndefined();
    expect(nativeDom.props.className).toBe('ant-pro-sider-collapsed-button');

    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expect(trigger).toHaveClass('ant-pro-sider-collapsed-button-collapsed');
    expect(trigger.querySelector('svg')).toBeVisible();
    expect(sider).toHaveStyle({ width: '64px', flex: '0 0 64px' });
    expect(onCollapse).toHaveBeenLastCalledWith(true);

    trigger.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    expect(trigger).toHaveFocus();
    expect(trigger).not.toHaveClass('ant-pro-sider-collapsed-button-collapsed');
    expect(sider).toHaveStyle({ width: '256px', flex: '0 0 256px' });
    expect(onCollapse).toHaveBeenLastCalledWith(false);

    await user.keyboard(' ');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expect(sider).toHaveStyle({ width: '64px', flex: '0 0 64px' });
    expect(onCollapse).toHaveBeenLastCalledWith(true);

    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    expect(onCollapse.mock.calls).toEqual([[true], [false], [true], [false]]);
    expect(nativeCallbacks.some((call) => call.collapsed === true)).toBe(true);
  });

  it.each([null, undefined, false, 'upstream placeholder'])(
    'keeps non-element fallback %p',
    (dom) => {
      expect(renderAccessibleCollapsedButton('Navigation Mode', dom)).toBe(dom);
    },
  );

  it('preserves element identity, props and children without inventing an expanded state', () => {
    const onClick = jest.fn();
    const nativeDom = (
      <div key='native-trigger' className='native-collapse' onClick={onClick}>
        <svg aria-hidden='true' />
      </div>
    );
    const accessibleDom = renderAccessibleCollapsedButton('导航模式', nativeDom);
    expect(isValidElement(accessibleDom) && accessibleDom.type).toBe(nativeDom.type);
    expect(isValidElement(accessibleDom) && accessibleDom.key).toBe(nativeDom.key);
    render(accessibleDom);
    const trigger = screen.getByRole('button', { name: '导航模式' });
    expect(trigger).toHaveClass('native-collapse');
    expect(trigger).not.toHaveAttribute('aria-expanded');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('preserves existing keyboard handlers, cancellation and ignores unrelated or repeated keys', () => {
    const onClick = jest.fn();
    const onKeyDown = jest.fn((event) => {
      if (event.key === 'Enter') event.preventDefault();
    });
    render(
      renderAccessibleCollapsedButton(
        'Navigation Mode',
        <div onClick={onClick} onKeyDown={onKeyDown} />,
        true,
      ),
    );
    const trigger = screen.getByRole('button', { name: 'Navigation Mode' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: 'ArrowLeft' });
    fireEvent.keyDown(trigger, { key: ' ', repeat: true });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(4);
  });
});
