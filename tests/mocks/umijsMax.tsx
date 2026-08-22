import { createUmiMock, umiMocks } from './umi';

export const umijsMaxMocks = {
  fetchUserInfo: jest.fn(),
  setInitialState: jest.fn(),
};

export const createUmijsMaxMock = () => ({
  ...createUmiMock(),
  SelectLang: ({ globalIconClassName, style }: any) => (
    <button className={globalIconClassName} data-testid='select-lang' style={style} type='button' />
  ),
  Helmet: ({ children }: any) => <>{children}</>,
  __mockHistoryPush: umiMocks.historyPush,
  __mockHistoryReplace: umiMocks.historyReplace,
});
