import { renderDataNavigationHeader } from '@/components/DataNavigation/header';
import { render, screen } from '@testing-library/react';
import React from 'react';

const nativeProps = {
  layout: 'mix' as const,
  splitMenus: true,
  isMobile: false,
  hasSiderMenu: true,
  siderWidth: 256,
};

it.each([
  { props: nativeProps, width: '256px', collapsed: 'false' },
  { props: { ...nativeProps, siderWidth: 215 }, width: '215px', collapsed: 'false' },
  { props: { ...nativeProps, collapsed: true }, width: '64px', collapsed: 'true' },
  {
    props: { ...nativeProps, collapsed: true, menu: { collapsedWidth: 80 } },
    width: '80px',
    collapsed: 'true',
  },
])('uses the native current sidebar width: %p', ({ props, width, collapsed }) => {
  const { container } = render(renderDataNavigationHeader(props, <nav>Native scopes</nav>));
  const header = container.firstElementChild as HTMLElement;
  expect(header).toHaveClass('tg-data-navigation-header-aligned');
  expect(header.style.getPropertyValue('--tg-header-sider-width')).toBe(width);
  expect(header).toHaveAttribute('data-collapsed', collapsed);
  expect(screen.getByRole('navigation')).toHaveTextContent('Native scopes');
});

it.each([
  { layout: 'side' as const },
  { layout: 'top' as const },
  { splitMenus: false },
  { isMobile: true },
  { hasSiderMenu: false },
  { siderWidth: undefined },
])('keeps native spacing when no aligned desktop sidebar exists: %p', (override) => {
  const { container } = render(
    renderDataNavigationHeader({ ...nativeProps, ...override }, <nav>Native scopes</nav>),
  );
  const header = container.firstElementChild as HTMLElement;
  expect(header).not.toHaveClass('tg-data-navigation-header-aligned');
  expect(header.style.getPropertyValue('--tg-header-sider-width')).toBe('');
  expect(screen.getByRole('navigation')).toHaveTextContent('Native scopes');
});

it('retains the same native header controls when collapsing or entering a route without a sider', () => {
  const control = <button type='button'>Existing task monitor</button>;
  const { rerender } = render(renderDataNavigationHeader(nativeProps, control));
  const originalControl = screen.getByRole('button');
  rerender(renderDataNavigationHeader({ ...nativeProps, collapsed: true }, control));
  expect(screen.getByRole('button')).toBe(originalControl);
  rerender(renderDataNavigationHeader({ ...nativeProps, hasSiderMenu: false }, control));
  expect(screen.getByRole('button')).toBe(originalControl);
});
