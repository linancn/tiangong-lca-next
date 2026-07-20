import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');

const DATASET_PICKERS = [
  {
    file: 'src/pages/Contacts/Components/select/drawer.tsx',
    rowType: 'ContactTable',
    tableCount: 4,
    serviceCallCounts: {
      getContactTablePgroongaSearch: 4,
      getContactTableAll: 4,
    },
  },
  {
    file: 'src/pages/Flowproperties/Components/select/drawer.tsx',
    rowType: 'FlowpropertyTable',
    tableCount: 4,
    serviceCallCounts: {
      getFlowpropertyTablePgroongaSearch: 4,
      getFlowpropertyTableAll: 4,
    },
  },
  {
    file: 'src/pages/Flows/Components/select/drawer.tsx',
    rowType: 'FlowTable',
    tableCount: 4,
    serviceCallCounts: {
      flow_hybrid_search: 2,
      getFlowTablePgroongaSearch: 4,
      getFlowTableAll: 4,
    },
  },
  {
    file: 'src/pages/Sources/Components/select/drawer.tsx',
    rowType: 'SourceTable',
    tableCount: 4,
    serviceCallCounts: {
      getSourceTablePgroongaSearch: 4,
      getSourceTableAll: 4,
    },
  },
  {
    file: 'src/pages/Unitgroups/Components/select/drawer.tsx',
    rowType: 'UnitGroupTable',
    tableCount: 3,
    serviceCallCounts: {
      getUnitGroupTablePgroongaSearch: 3,
      getUnitGroupTableAll: 3,
    },
  },
] as const;

function countOccurrences(source: string, token: string): number {
  return source.split(token).length - 1;
}

function withoutLineComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
}

function extractCalls(source: string, callee: string): string[] {
  const calls: string[] = [];
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const callStart = source.indexOf(`${callee}(`, searchFrom);
    if (callStart < 0) {
      break;
    }

    const openingParenthesis = source.indexOf('(', callStart);
    let depth = 0;
    let callEnd = -1;
    for (let index = openingParenthesis; index < source.length; index += 1) {
      if (source[index] === '(') {
        depth += 1;
      } else if (source[index] === ')') {
        depth -= 1;
        if (depth === 0) {
          callEnd = index + 1;
          break;
        }
      }
    }

    if (callEnd < 0) {
      throw new Error(`Unterminated ${callee} call`);
    }
    calls.push(source.slice(callStart, callEnd));
    searchFrom = callEnd;
  }

  return calls;
}

describe.each(DATASET_PICKERS)('$file content-language-aware ProTable contract', (picker) => {
  const source = withoutLineComments(
    fs.readFileSync(path.join(REPOSITORY_ROOT, picker.file), 'utf8'),
  );

  it('uses the registry-resolved content language as an external parameter for every table', () => {
    expect(source).toContain(
      'const contentLanguageAwareTableParams = getContentLanguageAwareTableParams(lang);',
    );
    expect(
      countOccurrences(source, `<ProTable<${picker.rowType}, ContentLanguageAwareTableParams>`),
    ).toBe(picker.tableCount);
    expect(countOccurrences(source, 'params={contentLanguageAwareTableParams}')).toBe(
      picker.tableCount,
    );
    expect(countOccurrences(source, 'request={async (')).toBe(picker.tableCount);
    expect(countOccurrences(source, 'params: ContentLanguageAwareTableParams & {')).toBe(
      picker.tableCount,
    );
    expect(source).toContain(
      'const currentContentLanguageRef = useRef(contentLanguageAwareTableParams.contentLanguage);',
    );
    expect(countOccurrences(source, 'guardLocaleMaterializedTableRequest(')).toBe(
      picker.tableCount,
    );
    expect(countOccurrences(source, '() => currentContentLanguageRef.current')).toBe(
      picker.tableCount,
    );
    expect(source).toContain('syncLocaleMaterializedTableRequestEpochs(');
    expect(countOccurrences(source, 'RequestEpochRef = useRef(0);')).toBe(picker.tableCount);
  });

  it('uses the request parameter for every locale-materializing service call', () => {
    Object.entries(picker.serviceCallCounts).forEach(([serviceCall, expectedCount]) => {
      const calls = extractCalls(source, serviceCall);

      expect(calls).toHaveLength(expectedCount);
      calls.forEach((call) => {
        expect(call).toContain('params.contentLanguage');
      });
    });
  });
});
