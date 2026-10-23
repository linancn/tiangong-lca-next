import { renderDataNavigationText } from '@/components/DataNavigation/menuText';
import type { MenuDataItem } from '@ant-design/pro-components';
import { render, screen } from '@testing-library/react';
import React from 'react';

const source = (): MenuDataItem => ({
  key: '/tgdata/sources',
  path: '/tgdata/sources',
  icon: <svg data-testid='original-source-icon' />,
});
const supporting = (children: MenuDataItem[]): MenuDataItem => ({
  key: 'data-navigation:tgdata:supporting',
  path: '',
  icon: <svg data-testid='native-book-icon' />,
  children,
});
const scope = (children: MenuDataItem[]): MenuDataItem => ({
  key: '/tgdata',
  path: '/tgdata',
  icon: <svg data-testid='scope-icon' />,
  children,
});
const text = <strong data-testid='localized-label'>Localized label</strong>;

describe('renderDataNavigationText', () => {
  it.each([
    { layout: 'mix' as const, collapsed: false },
    { layout: 'mix' as const, collapsed: true },
  ])('restores a split-menu supporting leaf in expanded and popup states: %p', (state) => {
    const item = source();
    const nativeIcon = item.icon;
    // Full-route parent keys remain even though the split Menu starts at the object level.
    item.pro_layout_parentKeys = ['/tgdata', 'data-navigation:tgdata:supporting'];
    const result = renderDataNavigationText(item, text, {
      ...state,
      menuData: [supporting([item])],
    }) as React.ReactElement<{ children: React.ReactNode[] }>;
    const { container } = render(result);

    expect(container.firstElementChild).toHaveClass('tg-data-navigation-label');
    expect(screen.getByTestId('original-source-icon').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByTestId('original-source-icon').parentElement).toHaveClass(
      'tg-data-navigation-label-icon',
    );
    expect(screen.getAllByTestId('original-source-icon')).toHaveLength(1);
    expect(screen.getByTestId('localized-label')).toHaveTextContent('Localized label');
    expect(
      (result.props.children[0] as React.ReactElement<{ children: React.ReactNode }>).props
        .children,
    ).toBe(nativeIcon);
    expect(result.props.children[1]).toBe(text);
  });

  it.each([
    { layout: 'side' as const, collapsed: false },
    { layout: 'side' as const, collapsed: true },
    { layout: 'top' as const, collapsed: false },
    { layout: 'mix' as const, isMobile: true, collapsed: false },
  ])('restores the nested group and original leaf in a complete native tree: %p', (state) => {
    const item = source();
    const group = supporting([item]);
    const props = { ...state, menuData: [scope([group])] };
    const { container } = render(
      <>
        {renderDataNavigationText(group, 'Supporting Data', props)}
        {renderDataNavigationText(item, 'Sources', props)}
      </>,
    );
    expect(container.querySelectorAll('.tg-data-navigation-label')).toHaveLength(2);
    expect(screen.getAllByTestId('native-book-icon')).toHaveLength(1);
    expect(screen.getAllByTestId('original-source-icon')).toHaveLength(1);
    expect(container).toHaveTextContent('Supporting DataSources');
  });

  it('retains the native root-group label so the split Menu supplies its book icon once', () => {
    const group = supporting([source()]);
    expect(renderDataNavigationText(group, text, { layout: 'mix', menuData: [group] })).toBe(text);
  });

  it.each(['side', 'mix'] as const)(
    'retains the native group-mode submenu icon for %s',
    (layout) => {
      const group = supporting([source()]);
      expect(
        renderDataNavigationText(group, text, {
          layout,
          menu: { type: 'group' },
          menuData: [scope([group])],
        }),
      ).toBe(text);
    },
  );

  it('restores a nested submenu icon in top layout even when group mode is requested', () => {
    const group = supporting([source()]);
    const { container } = render(
      renderDataNavigationText(group, text, {
        layout: 'top',
        menu: { type: 'group' },
        menuData: [scope([group])],
      }),
    );
    expect(container.querySelector('.tg-data-navigation-label')).toBeInTheDocument();
    expect(screen.getAllByTestId('native-book-icon')).toHaveLength(1);
  });

  it('does not duplicate group-mode leaf icons at rendered depth one, including top layout', () => {
    const item = source();
    expect(
      renderDataNavigationText(item, text, {
        layout: 'top',
        menu: { type: 'group' },
        menuData: [supporting([item])],
      }),
    ).toBe(text);
  });

  it('restores group-mode leaf icons at depth two even when the native menu is collapsed', () => {
    const item = source();
    const { container } = render(
      renderDataNavigationText(item, text, {
        layout: 'side',
        collapsed: true,
        menu: { type: 'group' },
        menuData: [scope([supporting([item])])],
      }),
    );
    expect(container.querySelector('.tg-data-navigation-label')).toBeInTheDocument();
  });

  it('matches a path-only leaf without changing its existing encoded destination', () => {
    const item = { ...source(), key: undefined, path: '/tgdata/sources?tid=team%2Bname#refs' };
    const { container } = render(
      renderDataNavigationText(item, text, {
        menuData: [supporting([{ ...item, key: 'native-source-key' }])],
      }),
    );
    expect(container.querySelector('.tg-data-navigation-label')).toBeInTheDocument();
    expect(item.path).toBe('/tgdata/sources?tid=team%2Bname#refs');
  });

  it('finds supporting entries after unrelated siblings and preserves the supplied icon and label', () => {
    const item = source();
    const props = {
      menuData: [
        scope([{ key: '/tgdata/models' }, supporting([{ key: '/tgdata/contacts' }, item])]),
      ],
    };
    expect(renderDataNavigationText({ ...item }, text, props)).not.toBe(text);
    expect(item.icon).toBeDefined();
  });

  it.each([
    { menuData: undefined },
    { menuData: [] },
    { menuData: [{ key: 'unrelated', children: [] }] },
    { menuData: [{ key: 'other-scope', children: [{ key: 'unrelated' }] }] },
  ])('passes through when the rendered item cannot be established: %p', (props) => {
    expect(renderDataNavigationText(source(), text, props)).toBe(text);
  });

  it('passes through missing icons, anonymous items, and ordinary entries', () => {
    const item = source();
    const group = supporting([item]);
    expect(
      renderDataNavigationText({ ...item, icon: undefined }, text, { menuData: [group] }),
    ).toBe(text);
    expect(renderDataNavigationText({ icon: item.icon }, text, { menuData: [group] })).toBe(text);
    expect(renderDataNavigationText(item, text, { menuData: [scope([item])] })).toBe(text);
    expect(renderDataNavigationText(item, text, { menuData: [item] })).toBe(text);
  });

  it('does not treat unknown or routed groups as the synthetic Supporting Data group', () => {
    const item = source();
    const unknown = { ...supporting([item]), key: 'ordinary-group' };
    const routed = { ...supporting([item]), path: '/tgdata/resources' };
    const keyless = { ...supporting([item]), key: undefined };
    for (const group of [unknown, routed, keyless]) {
      expect(renderDataNavigationText(item, text, { menuData: [group] })).toBe(text);
    }
    const emptyGroup = supporting([]);
    expect(renderDataNavigationText(emptyGroup, text, { menuData: [scope([emptyGroup])] })).toBe(
      text,
    );
  });

  it('does not decorate an unknown nested submenu or its unrelated grandchildren', () => {
    const item = source();
    const unknownSubmenu = { key: 'extra-group', icon: item.icon, children: [item] };
    const props = { menuData: [supporting([unknownSubmenu])] };
    expect(renderDataNavigationText(unknownSubmenu, text, props)).toBe(text);
    expect(renderDataNavigationText(item, text, props)).toBe(text);
  });
});
