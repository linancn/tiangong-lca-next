import type { MenuDataItem } from '@ant-design/pro-components';
import type { ReactNode } from 'react';

const dataScopes = ['tgdata', 'codata', 'mydata', 'tedata'] as const;
const dataKinds = [
  'models',
  'processes',
  'flows',
  'sources',
  'contacts',
  'flowproperties',
  'unitgroups',
];
const supportingKinds = ['sources', 'contacts', 'flowproperties', 'unitgroups'];

const splitDestination = (destination: string) => {
  const hashIndex = destination.indexOf('#');
  const hash = hashIndex < 0 ? '' : destination.slice(hashIndex);
  const beforeHash = hashIndex < 0 ? destination : destination.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  return {
    pathname: queryIndex < 0 ? beforeHash : beforeHash.slice(0, queryIndex),
    query: queryIndex < 0 ? '' : beforeHash.slice(queryIndex + 1),
    hash,
  };
};

const getScope = (destination?: string) => {
  const pathname = destination && splitDestination(destination).pathname;
  return dataScopes.find((scope) => pathname === `/${scope}`);
};

const isAvailable = (item: MenuDataItem) =>
  !item.hideInMenu &&
  !item.unaccessible &&
  !item.disabled &&
  item.menu !== false &&
  item.access !== false;

const withTeam = (destination: string, tid: string) => {
  const { pathname, query, hash } = splitDestination(destination);
  const params = new URLSearchParams(query);
  params.set('tid', tid);
  return `${pathname}?${params.toString()}${hash}`;
};

const copyWithTeam = (item: MenuDataItem, tid: string): MenuDataItem => {
  if (item.children?.length) {
    return { ...item, children: item.children.map((child) => copyWithTeam(child, tid)) };
  }
  return item.path ? { ...item, path: withTeam(item.path, tid) } : { ...item };
};

/** Shape only the native menu; routes, permissions and scope identities remain authoritative. */
export function buildDataNavigation(
  menuData: MenuDataItem[],
  options: { supportingLabel: string; supportingIcon?: ReactNode; search: string },
): MenuDataItem[] {
  const tid = new URLSearchParams(options.search).get('tid');
  return menuData
    .filter((item) => !tid || ['/tgdata', '/codata'].includes(item.path ?? ''))
    .map((item) => {
      const scope = getScope(item.path);
      if (!scope) return item;

      const supportingKey = `data-navigation:${scope}:supporting`;
      const children = item.children ?? [];
      // Accept an already-shaped tree without nesting or duplicating its submenu.
      const ungrouped = children.flatMap((child) =>
        child.key === supportingKey ? (child.children ?? []) : [child],
      );
      const supporting = supportingKinds.flatMap((kind) =>
        ungrouped.filter(
          (child) => child.path && splitDestination(child.path).pathname === `/${scope}/${kind}`,
        ),
      );
      const grouped = supporting.some(isAvailable)
        ? [
            ...ungrouped.filter((child) => !supporting.includes(child)),
            {
              key: supportingKey,
              name: options.supportingLabel,
              locale: false as const,
              icon: options.supportingIcon,
              children: supporting,
            },
          ]
        : ungrouped;
      return {
        ...item,
        ...(item.children
          ? { children: tid ? grouped.map((child) => copyWithTeam(child, tid)) : grouped }
          : {}),
      };
    });
}

const findLeaf = (items: MenuDataItem[], pathname: string): MenuDataItem | undefined => {
  for (const item of items) {
    if (!isAvailable(item)) continue;
    if (item.children?.length) {
      if (item.hideChildrenInMenu) continue;
      const child = findLeaf(item.children, pathname);
      if (child) return child;
    } else if (item.path && splitDestination(item.path).pathname === pathname) {
      return item;
    }
  }
  return undefined;
};

/** Header copies omit children, so consult the complete transformed menu for destinations. */
export function resolveDataScopeLink(
  menuItem: MenuDataItem,
  pathname: string,
  search: string,
  menuData: MenuDataItem[],
): string | undefined {
  const scope = getScope(menuItem.path);
  if (!scope || !isAvailable(menuItem)) return menuItem.path;
  const root = menuData.find((item) => getScope(item.path) === scope && isAvailable(item));
  if (!root) return menuItem.path;

  const tid = new URLSearchParams(search).get('tid');
  if (tid && scope !== 'tgdata' && scope !== 'codata') return menuItem.path;

  const currentParts = splitDestination(pathname).pathname.split('/');
  const knownSource = [...dataScopes, 'exampledata'].some(
    (candidate) => currentParts[1] === candidate,
  );
  const knownPage =
    currentParts.length === 3 ||
    (currentParts.length === 4 &&
      currentParts[2] === 'processes' &&
      currentParts[3] === 'analysis');
  const kind = knownSource && knownPage ? currentParts[2] : undefined;
  const destinations = root.hideChildrenInMenu ? [] : (root.children ?? []);
  const sameKind =
    kind && dataKinds.includes(kind) ? findLeaf(destinations, `/${scope}/${kind}`) : undefined;
  const target = sameKind ?? findLeaf(destinations, `/${scope}/models`);
  // A scope redirect remains the fallback when its menu has no available model leaf.
  const destination = target?.path ?? root.path ?? menuItem.path;
  if (!destination) return destination;
  const parts = splitDestination(destination);
  // Data scopes carry team context only; record selection belongs to the previous page.
  const params = new URLSearchParams(parts.query);
  ['id', 'version', 'mode', 'tid'].forEach((key) => params.delete(key));
  if (tid) params.set('tid', tid);
  const query = params.toString();
  return `${parts.pathname}${query ? `?${query}` : ''}${parts.hash}`;
}
