import {
  getReferenceLookupEmptyResult,
  getReferenceLookupPaginationProps,
  getReferenceLookupTeamId,
  getReferenceLookupUuid,
  showInvalidReferenceLookupUuidMessage,
  showReferenceLookupLimitMessage,
} from '@/pages/Utils/referenceLookup';
import { message } from 'antd';

jest.mock('antd', () => ({
  message: {
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('reference lookup page helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes complete UUIDs and rejects partial values', () => {
    expect(getReferenceLookupUuid(' D1380000-0000-4000-8000-000000000001 ')).toBe(
      'd1380000-0000-4000-8000-000000000001',
    );
    expect(getReferenceLookupUuid('D1380000')).toBe(null);
  });

  it('builds an empty table result for invalid reference lookup input', () => {
    expect(getReferenceLookupEmptyResult()).toEqual({
      data: [],
      page: 1,
      success: true,
      total: 0,
    });
    expect(getReferenceLookupEmptyResult(3)).toEqual({
      data: [],
      page: 3,
      success: true,
      total: 0,
    });
  });

  it('normalizes optional team ids for reference lookup requests', () => {
    expect(getReferenceLookupTeamId('team-1')).toBe('team-1');
    expect(getReferenceLookupTeamId()).toBe('');
  });

  it('hides total text only while reference lookup pagination is active', () => {
    expect(getReferenceLookupPaginationProps(false)).toEqual({});

    const paginationProps = getReferenceLookupPaginationProps(true);

    expect(paginationProps.showTotal?.(24, [1, 10])).toBeNull();
  });

  it('shows localized reference lookup messages', () => {
    const intl = {
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    };

    showInvalidReferenceLookupUuidMessage(intl as any);
    showReferenceLookupLimitMessage(intl as any);

    expect(message.warning).toHaveBeenCalledWith(
      'Enter a complete dataset UUID before running Reference Lookup.',
    );
    expect(message.warning).toHaveBeenCalledWith(
      'Showing up to the first 50 reference lookup results.',
    );
  });

  it('falls back to error messages when warning is unavailable', () => {
    const intl = {
      formatMessage: jest.fn(({ defaultMessage }) => defaultMessage),
    };
    const originalWarning = message.warning;
    (message as any).warning = undefined;

    showInvalidReferenceLookupUuidMessage(intl as any);
    showReferenceLookupLimitMessage(intl as any);

    expect(message.error).toHaveBeenCalledWith(
      'Enter a complete dataset UUID before running Reference Lookup.',
    );
    expect(message.error).toHaveBeenCalledWith(
      'Showing up to the first 50 reference lookup results.',
    );

    (message as any).warning = originalWarning;
  });
});
