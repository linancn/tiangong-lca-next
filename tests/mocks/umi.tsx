import { defaultIntl, IntlShape, renderMessageWithValues } from './i18n';

type LocationLike = {
  pathname: string;
  search?: string;
};

export const umiMocks = {
  useLocation: jest.fn((): LocationLike => ({ pathname: '/', search: '' })),
  useIntl: jest.fn((): IntlShape => defaultIntl),
  useModel: jest.fn((...args: any[]) => {
    void args;
    return {};
  }),
  historyPush: jest.fn(),
  historyReplace: jest.fn(),
};

export const setUmiLocation = (location: LocationLike) => {
  umiMocks.useLocation.mockImplementation(() => location);
};

export const setUmiIntl = (intl: IntlShape) => {
  umiMocks.useIntl.mockImplementation(() => intl);
};

export const setUmiModel = (impl: (...args: any[]) => any) => {
  umiMocks.useModel.mockImplementation(impl);
};

export const resetUmiMocks = () => {
  umiMocks.useLocation.mockReset().mockImplementation(() => ({ pathname: '/', search: '' }));
  umiMocks.useIntl.mockReset().mockImplementation(() => defaultIntl);
  umiMocks.useModel.mockReset().mockImplementation(() => ({}));
  umiMocks.historyPush.mockReset();
  umiMocks.historyReplace.mockReset();
};

export const createUmiMock = () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id, values }: any) => (
    <span>{renderMessageWithValues(defaultMessage ?? id ?? '', values)}</span>
  ),
  useIntl: () => umiMocks.useIntl(),
  useLocation: () => umiMocks.useLocation(),
  useModel: (...args: any[]) => umiMocks.useModel(...args),
  history: {
    push: (...args: any[]) => umiMocks.historyPush(...args),
    replace: (...args: any[]) => umiMocks.historyReplace(...args),
  },
  getLocale: () => umiMocks.useIntl().locale,
});
