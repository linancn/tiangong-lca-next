import type { MenuDataItem, ProLayoutProps } from '@ant-design/pro-components';

type NativeMenuTextRender = Exclude<ProLayoutProps['menuTextRender'], boolean | undefined>;
type RenderedContext = { depth: number; supporting: boolean; submenu: boolean };

const isSupportingGroup = (item: MenuDataItem) =>
  /^data-navigation:(tgdata|codata|mydata|tedata):supporting$/.test(item.key ?? '') && !item.path;

const findRenderedContext = (
  items: MenuDataItem[] | undefined,
  target: MenuDataItem,
  depth = 0,
  supportingParent = false,
): RenderedContext | undefined => {
  if (!Array.isArray(items)) return undefined;
  for (const item of items) {
    const submenu = Array.isArray(item.children) && item.children.length > 0;
    const supportingGroup = submenu && isSupportingGroup(item);
    const matches =
      item.key && target.key
        ? item.key === target.key
        : Boolean(target.path) && item.path === target.path;
    if (matches) {
      return {
        depth,
        supporting: supportingGroup || (supportingParent && !submenu),
        submenu,
      };
    }
    if (submenu) {
      const found = findRenderedContext(item.children, target, depth + 1, supportingGroup);
      if (found) return found;
    }
  }
  return undefined;
};

/** Restore only supporting icons omitted by the installed native Menu's depth rules. */
export const renderDataNavigationText: NativeMenuTextRender = (item, defaultText, menuProps) => {
  if (!item.icon) return defaultText;
  // Split menus remove a rendered scope level while retaining its ancestor keys.
  const context = findRenderedContext(menuProps.menuData, item);
  if (!context?.supporting) return defaultText;

  // ProComponents 3.1.14-6 uses different group-mode rules for leaves and submenus.
  const nativeGroupIcon =
    menuProps.menu?.type === 'group' && (!context.submenu || menuProps.layout !== 'top');
  const nativeIcon = context.depth === 0 || (context.depth === 1 && nativeGroupIcon);
  if (nativeIcon) return defaultText;

  return (
    <span className='tg-data-navigation-label'>
      <span aria-hidden='true' className='tg-data-navigation-label-icon'>
        {item.icon}
      </span>
      {defaultText}
    </span>
  );
};
