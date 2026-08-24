import type { CSSProperties, FC, PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  loading: boolean;
  style?: CSSProperties;
}>;

const fieldsetStyle: CSSProperties = {
  border: 0,
  margin: 0,
  minInlineSize: 0,
  padding: 0,
};

const LoadingDisabledActionGroup: FC<Props> = ({ children, loading, style }) => (
  <fieldset
    aria-busy={loading}
    disabled={loading}
    style={style ? { ...fieldsetStyle, ...style } : fieldsetStyle}
  >
    {children}
  </fieldset>
);

export default LoadingDisabledActionGroup;
