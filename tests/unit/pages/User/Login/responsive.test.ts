import { responsiveLoginFormProps } from '@/pages/User/Login/responsive';

describe('responsive LoginForm props', () => {
  it('allows the public LoginForm content slot to shrink inside mobile ProLayout padding', () => {
    expect(responsiveLoginFormProps).toEqual({
      containerStyle: { paddingInline: 0 },
      contentStyle: { maxWidth: 328, minWidth: 0, width: '100%' },
    });
  });
});
