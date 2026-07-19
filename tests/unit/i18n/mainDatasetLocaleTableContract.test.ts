import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');

const MAIN_DATASET_TABLES = [
  {
    file: 'src/pages/Contacts/index.tsx',
    rowType: 'ContactTable',
    serviceCalls: [
      'getContactTableUuidMentionSearch',
      'getContactTablePgroongaSearch',
      'getContactTableAll',
    ],
  },
  {
    file: 'src/pages/Flowproperties/index.tsx',
    rowType: 'FlowpropertyTable',
    serviceCalls: [
      'getFlowpropertyTableUuidMentionSearch',
      'getFlowpropertyTablePgroongaSearch',
      'getFlowpropertyTableAll',
    ],
  },
  {
    file: 'src/pages/Unitgroups/index.tsx',
    rowType: 'UnitGroupTable',
    serviceCalls: [
      'getUnitGroupTableUuidMentionSearch',
      'getUnitGroupTablePgroongaSearch',
      'getUnitGroupTableAll',
    ],
  },
  {
    file: 'src/pages/Flows/index.tsx',
    rowType: 'FlowTable',
    serviceCalls: [
      'getFlowTableUuidMentionSearch',
      'flow_hybrid_search',
      'getFlowTablePgroongaSearch',
      'getFlowTableAll',
    ],
  },
  {
    file: 'src/pages/Processes/index.tsx',
    rowType: 'ProcessTable',
    serviceCalls: [
      'getProcessTableUuidMentionSearch',
      'process_hybrid_search',
      'getProcessTablePgroongaSearch',
      'getProcessTableAll',
    ],
  },
  {
    file: 'src/pages/LifeCycleModels/index.tsx',
    rowType: 'LifeCycleModelTable',
    serviceCalls: [
      'getLifeCycleModelTableUuidMentionSearch',
      'lifeCycleModel_hybrid_search',
      'getLifeCycleModelTablePgroongaSearch',
      'getLifeCycleModelTableAll',
    ],
  },
  {
    file: 'src/pages/Sources/index.tsx',
    rowType: 'SourceTable',
    serviceCalls: [
      'getSourceTableUuidMentionSearch',
      'getSourceTablePgroongaSearch',
      'getSourceTableAll',
    ],
  },
] as const;

function extractCall(source: string, callee: string): string {
  const callStart = source.indexOf(`${callee}(`);
  if (callStart < 0) {
    return '';
  }

  const openingParenthesis = source.indexOf('(', callStart);
  let depth = 0;
  for (let index = openingParenthesis; index < source.length; index += 1) {
    if (source[index] === '(') {
      depth += 1;
    } else if (source[index] === ')') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(callStart, index + 1);
      }
    }
  }

  return '';
}

describe.each(MAIN_DATASET_TABLES)('$file locale-aware ProTable contract', (table) => {
  const source = fs.readFileSync(path.join(REPOSITORY_ROOT, table.file), 'utf8');

  it('uses the canonical registry locale as a request parameter', () => {
    const tableStart = source.indexOf(`<ProTable<${table.rowType}, LocaleAwareTableParams>`);
    const paramsStart = source.indexOf('params={{ locale: appLocale }}', tableStart);
    const requestStart = source.indexOf('request={async (', tableStart);

    expect(source).toContain(
      'const appLocale = normalizeRuntimeLocale(intl.locale) ?? DEFAULT_BROWSER_APP_LOCALE;',
    );
    expect(source).toContain('const lang = getLang(appLocale);');
    expect(source).toContain('const currentAppLocaleRef = useRef(appLocale);');
    expect(source).toContain('const tableRequestEpochRef = useRef(0);');
    expect(source).toContain(
      'syncLocaleMaterializedTableRequestEpochs(currentAppLocaleRef, appLocale, [',
    );
    expect(tableStart).toBeGreaterThanOrEqual(0);
    expect(paramsStart).toBeGreaterThan(tableStart);
    expect(paramsStart).toBeLessThan(requestStart);
    expect(
      source.slice(requestStart, source.indexOf('\n        columns={', requestStart)),
    ).toContain('guardLocaleMaterializedTableRequest(');
    expect(source).toContain('() => currentAppLocaleRef.current');
    expect(source).toContain('tableRequestEpochRef,');
    expect(source).toContain('async ({ isCurrentRequest }) => {');
  });

  it('only shows a capped-reference notice for the latest request and scopes it by locale', () => {
    expect(source).toContain('isCurrentRequest() &&');
    expect(source).toContain('referenceLookupLimitNoticeRef.current !== noticeKey');
    expect(source).toMatch(/referenceLookupTeamId,\s+requestedLocale,\s+\]\.join\(':'\);/u);
  });

  it('keeps every main-table service path content-language aware', () => {
    const requestStart = source.indexOf('request={async (');
    const requestEnd = source.indexOf('\n        columns={', requestStart);
    const requestSource = source.slice(requestStart, requestEnd);

    expect(requestStart).toBeGreaterThanOrEqual(0);
    expect(requestEnd).toBeGreaterThan(requestStart);
    table.serviceCalls.forEach((serviceCall) => {
      const callSource = extractCall(requestSource, serviceCall);
      expect(callSource).not.toBe('');
      expect(callSource).toMatch(/\blang\b/u);
    });
  });
});
