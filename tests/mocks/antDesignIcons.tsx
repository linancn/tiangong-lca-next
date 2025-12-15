const toKebab = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();

const iconTestId = (exportName: string) => {
  const base = exportName.replace(/-?outlined$/i, '');
  return `icon-${toKebab(base)}`;
};

export const createAntDesignIconsMock = () =>
  new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        if (prop === 'default') return target;
        if (typeof prop !== 'string') return undefined;
        const Icon = (props: any) => <span data-testid={iconTestId(prop)} {...props} />;
        Icon.displayName = `MockIcon(${prop})`;
        return Icon;
      },
    },
  );
