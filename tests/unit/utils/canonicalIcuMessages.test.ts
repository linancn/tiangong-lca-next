import enAiSuggestionMessages from '@/locales/en-US/component_AISuggestion';
import enProcessMessages from '@/locales/en-US/pages_process';
import zhAiSuggestionMessages from '@/locales/zh-CN/component_AISuggestion';
import zhProcessMessages from '@/locales/zh-CN/pages_process';
import { formatIcuMessage } from '../../helpers/i18n/localeAudit';

type MessageValues = Record<string, string | number>;

function formatMessage(
  messages: Record<string, string>,
  id: string,
  locale: string,
  values: MessageValues,
) {
  return formatIcuMessage(messages[id], values, locale);
}

describe('canonical ICU messages', () => {
  it.each([
    [0, 'Accepted 0 changes.', 'Rejected 0 changes.'],
    [1, 'Accepted 1 change.', 'Rejected 1 change.'],
    [2, 'Accepted 2 changes.', 'Rejected 2 changes.'],
  ])('renders English AI bulk actions for a count of %i', (count, accepted, rejected) => {
    expect(
      formatMessage(
        enAiSuggestionMessages,
        'component.aiSuggestion.message.acceptAllSuccess',
        'en-US',
        { count },
      ),
    ).toBe(accepted);
    expect(
      formatMessage(
        enAiSuggestionMessages,
        'component.aiSuggestion.message.rejectAllSuccess',
        'en-US',
        { count },
      ),
    ).toBe(rejected);
  });

  it('renders Chinese AI bulk actions with the supplied count', () => {
    expect(
      formatMessage(
        zhAiSuggestionMessages,
        'component.aiSuggestion.message.acceptAllSuccess',
        'zh-CN',
        { count: 2 },
      ),
    ).toBe('已接受 2 项更改。');
  });

  it.each([
    [0, 0, '0 root processes selected from 0 available options.'],
    [1, 1, '1 root process selected from 1 available option.'],
    [2, 2, '2 root processes selected from 2 available options.'],
  ])(
    'pluralizes English root-process selection for %i of %i',
    (selectedCount, totalCount, expected) => {
      expect(
        formatMessage(enProcessMessages, 'pages.process.lca.page.path.selectionHint', 'en-US', {
          selectedCount,
          totalCount,
        }),
      ).toBe(expected);
    },
  );

  it.each([
    [0, '0 process rows are currently available for analysis.'],
    [1, '1 process row is currently available for analysis.'],
    [2, '2 process rows are currently available for analysis.'],
  ])('pluralizes the English process-row count for %i', (count, expected) => {
    expect(
      formatMessage(enProcessMessages, 'pages.process.lca.page.processes.count', 'en-US', {
        count,
      }),
    ).toBe(expected);
  });

  it('pluralizes each Sankey diagnostic count independently', () => {
    expect(
      formatMessage(enProcessMessages, 'pages.process.lca.page.path.sankey.info.layered', 'en-US', {
        repeatCount: 1,
        cycleCutCount: 2,
        selfLoopCount: 0,
      }),
    ).toContain('1 repeated node instance, 2 cycle-cut links, and 0 self-loop links.');
  });

  it('renders Chinese selection counts in a complete sentence', () => {
    expect(
      formatMessage(zhProcessMessages, 'pages.process.lca.page.compare.selectionHint', 'zh-CN', {
        selectedCount: 2,
        totalCount: 3,
      }),
    ).toBe('已从 3 个可用过程选项中选择 2 个过程。');
  });
});
