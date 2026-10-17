import type { MenuDataItem } from '@ant-design/pro-components';
import { buildDataNavigation, resolveDataScopeLink } from '@/components/DataNavigation/navigation';

const scopeMenu = (scope: string): MenuDataItem => ({
  key: `/${scope}`,
  path: `/${scope}`,
  name: scope,
  children: [
    'models',
    'processes',
    'flows',
    'flowproperties',
    'unitgroups',
    'sources',
    'contacts',
  ].map((kind) => ({ key: `/${scope}/${kind}`, path: `/${scope}/${kind}`, name: kind })),
});

const options = { supportingLabel: 'Supporting Data', search: '' };
const freezeMenu = (items: MenuDataItem[]): MenuDataItem[] => {
  items.forEach((item) => {
    if (item.children) freezeMenu(item.children);
    Object.freeze(item);
  });
  return Object.freeze(items) as unknown as MenuDataItem[];
};

describe('buildDataNavigation', () => {
  it('preserves the supplied supporting-record order instead of imposing a kind order', () => {
    const root = scopeMenu('tgdata');
    root.children = [...root.children!].reverse();
    const input = freezeMenu([root]);
    const [output] = buildDataNavigation(input, options);
    expect(output.children?.[3].children?.map((child) => child.path)).toEqual([
      '/tgdata/contacts',
      '/tgdata/sources',
      '/tgdata/unitgroups',
      '/tgdata/flowproperties',
    ]);
  });
  it('keeps native scope identities and core objects while adding a pathless supporting submenu', () => {
    const input = freezeMenu([scopeMenu('mydata')]);
    const [root] = buildDataNavigation(input, { ...options, supportingIcon: 'supporting-icon' });

    expect(root).toMatchObject({ key: '/mydata', path: '/mydata', name: 'mydata' });
    expect(root.children?.slice(0, 3).map((child) => child.path)).toEqual([
      '/mydata/models',
      '/mydata/processes',
      '/mydata/flows',
    ]);
    const supporting = root.children?.[3];
    expect(supporting).toMatchObject({
      key: 'data-navigation:mydata:supporting',
      name: 'Supporting Data',
      locale: false,
      icon: 'supporting-icon',
    });
    expect(supporting).not.toHaveProperty('path');
    expect(supporting?.children?.map((child) => child.path)).toEqual([
      '/mydata/flowproperties',
      '/mydata/unitgroups',
      '/mydata/sources',
      '/mydata/contacts',
    ]);
    expect(input[0].children).toHaveLength(7);
  });

  it('preserves access metadata, hidden examples, and unrelated menus without inventing routes', () => {
    const root = scopeMenu('tgdata');
    root.children![5] = { ...root.children![5], unaccessible: true, access: 'canReadSources' };
    root.children![6] = { ...root.children![6], hideInMenu: true };
    const example = { ...scopeMenu('exampledata'), hideInMenu: true };
    const other = { path: '/dataset-display-settings', access: 'canDataProductManager' };
    const input = freezeMenu([root, example, other]);
    const output = buildDataNavigation(input, options);

    expect(output[1]).toBe(example);
    expect(output[2]).toBe(other);
    expect(output[0].children?.[3].children?.[2]).toEqual(root.children![5]);
    expect(output[0].children?.[3].children?.[3]).toEqual(root.children![6]);
  });

  it('does not add an empty visible supporting submenu when all supporting objects are unavailable', () => {
    const root = scopeMenu('mydata');
    root.children = root.children!.map((child) =>
      ['models', 'processes', 'flows'].includes(child.name!)
        ? child
        : { ...child, hideInMenu: true },
    );
    const [output] = buildDataNavigation([root], options);
    expect(output.children).toHaveLength(7);
    expect(output.children?.some((child) => child.key?.endsWith(':supporting'))).toBe(false);
  });

  it('keeps submenu keys stable across translation, repeated shaping, and team context', () => {
    const first = buildDataNavigation([scopeMenu('tgdata')], options);
    const second = buildDataNavigation(first, {
      supportingLabel: '基础数据',
      search: '?tid=team-1',
    });
    expect(second[0].key).toBe(first[0].key);
    expect(second[0].path).toBe(first[0].path);
    expect(second[0].children).toHaveLength(4);
    expect(second[0].children?.[3].key).toBe(first[0].children?.[3].key);
    expect(second[0].children?.[3].name).toBe('基础数据');
    expect(second[0].children?.[3].children).toHaveLength(4);
  });

  it('restricts a nonempty tid to the existing tgdata/codata scopes and updates nested leaf links safely', () => {
    const root = scopeMenu('tgdata');
    root.children![5].path = '/tgdata/sources?view=table&tid=old#citations';
    const input = freezeMenu([
      root,
      scopeMenu('codata'),
      scopeMenu('mydata'),
      scopeMenu('tedata'),
      { path: '/welcome' },
    ]);
    const output = buildDataNavigation(input, {
      ...options,
      search: '?tid=team%2B%26%2F%20%E4%B8%AD',
    });

    expect(output.map((item) => item.path)).toEqual(['/tgdata', '/codata']);
    const supporting = output[0].children![3];
    expect(supporting).not.toHaveProperty('path');
    expect(supporting.children![2].path).toBe(
      '/tgdata/sources?view=table&tid=team%2B%26%2F+%E4%B8%AD#citations',
    );
    expect(output[0].children![0].path).toContain('?tid=');
    expect(input[0].children![5].path).toBe('/tgdata/sources?view=table&tid=old#citations');
  });

  it('preserves all scopes when tid is empty and leaves scopes without child data intact', () => {
    const input = [{ key: '/mydata', path: '/mydata' }, scopeMenu('tedata')];
    expect(buildDataNavigation(input, { ...options, search: '?tid=' })[0]).toEqual(input[0]);
    expect(buildDataNavigation(input, { ...options, search: '?tid=' })).toHaveLength(2);
  });

  it('retains pathless native child metadata while filtering pathless roots in team context', () => {
    const nativeChild = { key: 'native-divider', type: 'divider' };
    const root = scopeMenu('tgdata');
    root.children!.push(nativeChild);
    const outputMenus = buildDataNavigation([root, { key: 'unrelated-root' }], {
      ...options,
      search: '?tid=team-1',
    });
    expect(outputMenus).toHaveLength(1);
    const [output] = outputMenus;
    expect(output.children?.find((child) => child.key === nativeChild.key)).toEqual(nativeChild);
    expect(output.children?.find((child) => child.key === nativeChild.key)).not.toBe(nativeChild);
    expect(output.children?.[0].path).toBe('/tgdata/models?tid=team-1');
  });

  it('removes an empty previously shaped supporting group without inventing a destination', () => {
    const root = scopeMenu('tgdata');
    root.children = [root.children![0], { key: 'data-navigation:tgdata:supporting' }];
    const [output] = buildDataNavigation([root], options);
    expect(output.children).toEqual([root.children[0]]);
  });
});

describe('resolveDataScopeLink', () => {
  const transformed = () =>
    buildDataNavigation(['tgdata', 'codata', 'mydata', 'tedata'].map(scopeMenu), options);

  it.each(['models', 'processes', 'flows', 'sources', 'contacts', 'flowproperties', 'unitgroups'])(
    'preserves the current %s object when the header copy has no children',
    (kind) => {
      expect(
        resolveDataScopeLink(
          { path: '/codata', key: '/codata' },
          `/mydata/${kind}`,
          '',
          transformed(),
        ),
      ).toBe(`/codata/${kind}`);
    },
  );

  it.each([
    { hideInMenu: true },
    { unaccessible: true },
    { disabled: true },
    { menu: false },
    { access: false },
  ])('falls back to models for unavailable matching leaves: %p', (unavailable) => {
    const roots = transformed();
    roots[1].children![2] = { ...roots[1].children![2], ...unavailable };
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', roots)).toBe(
      '/codata/models',
    );
  });

  it('does not select a supporting leaf hidden by an unavailable ancestor', () => {
    const roots = transformed();
    roots[1].children![3].hideChildrenInMenu = true;
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/sources', '', roots)).toBe(
      '/codata/models',
    );
  });

  it('uses the existing scope redirect when models and the matching type are unavailable', () => {
    const roots = transformed();
    roots[1].children = [];
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', roots)).toBe('/codata');
  });

  it('keeps a native scope-only destination when child menu data is absent', () => {
    expect(
      resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', [{ path: '/codata' }]),
    ).toBe('/codata');
  });

  it.each(['/welcome', '/account', '/mydata/unsupported', '/mydata/flows/unknown'])(
    'uses models from a nondata or unsupported current page %s',
    (pathname) => {
      expect(resolveDataScopeLink({ path: '/codata' }, pathname, '', transformed())).toBe(
        '/codata/models',
      );
    },
  );

  it.each(['/exampledata/processes', '/mydata/processes/analysis'])(
    'keeps the object type from the known source page %s without retaining its record state',
    (pathname) => {
      expect(
        resolveDataScopeLink(
          { path: '/codata' },
          pathname,
          '?id=record&version=1&mode=edit',
          transformed(),
        ),
      ).toBe('/codata/processes');
    },
  );

  it('rejects inherited access:false on a supporting ancestor and on a scope', () => {
    const roots = transformed();
    roots[1].children![3].access = false;
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/sources', '', roots)).toBe(
      '/codata/models',
    );
    roots[1].access = false;
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', roots)).toBe('/codata');
  });

  it('does not use child destinations hidden by a scope', () => {
    const roots = transformed();
    roots[1].hideChildrenInMenu = true;
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', roots)).toBe('/codata');
  });

  it('handles existing destination queries and hashes while removing stale record parameters', () => {
    const roots = transformed();
    roots[1].children![2].path =
      '/codata/flows?view=table&tid=old&id=old&version=1&mode=edit#items';
    expect(
      resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '?tid=new%2Bteam', roots),
    ).toBe('/codata/flows?view=table&tid=new%2Bteam#items');
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', roots)).toBe(
      '/codata/flows?view=table#items',
    );
  });

  it('retains only team context from the current record and encodes it once', () => {
    const roots = freezeMenu(transformed());
    expect(
      resolveDataScopeLink(
        { path: '/codata' },
        '/tgdata/processes',
        '?tid=team%2B%26%2F%20%E4%B8%AD&id=record&version=1&mode=edit&other=value',
        roots,
      ),
    ).toBe('/codata/processes?tid=team%2B%26%2F+%E4%B8%AD');
  });

  it('does not offer a scope switch into personal/team data during restricted tid navigation', () => {
    expect(
      resolveDataScopeLink({ path: '/mydata' }, '/tgdata/flows', '?tid=team-1', transformed()),
    ).toBe('/mydata');
    const restricted = buildDataNavigation(transformed(), { ...options, search: '?tid=team-1' });
    expect(
      resolveDataScopeLink({ path: '/codata' }, '/tgdata/flows', '?tid=team-1', restricted),
    ).toBe('/codata/flows?tid=team-1');
  });

  it('leaves hidden, missing, example, external and other non-scope destinations unchanged', () => {
    const roots = transformed();
    for (const item of [
      { path: '/codata', hideInMenu: true },
      { path: '/exampledata', hideInMenu: true },
      { path: 'https://example.org/docs?x=1#part' },
      { path: '/account?tab=profile#details' },
      {},
    ]) {
      expect(resolveDataScopeLink(item, '/mydata/flows', '?tid=team-1', roots)).toBe(item.path);
    }
    expect(resolveDataScopeLink({ path: '/codata' }, '/mydata/flows', '', [])).toBe('/codata');
  });
});
