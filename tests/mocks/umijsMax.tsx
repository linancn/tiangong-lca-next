import { createUmiMock, umiMocks } from './umi';

export const umijsMaxMocks = {
  fetchUserInfo: jest.fn(),
  setInitialState: jest.fn(),
};

export const createUmijsMaxMock = () => ({
  ...createUmiMock(),
  SelectLang: (props: any) => <div data-testid='select-lang' {...props} />,
  Helmet: ({ children }: any) => <>{children}</>,
  __mockHistoryPush: umiMocks.historyPush,
  __mockHistoryReplace: umiMocks.historyReplace,
});
