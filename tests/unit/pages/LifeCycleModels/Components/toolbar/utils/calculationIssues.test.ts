/**
 * Unit tests for the editor-side calculation issue location helper.
 */

import {
  isCalculationErrorCode,
  resolveCalculationIssues,
} from '@/pages/LifeCycleModels/Components/toolbar/utils/calculationIssues';
import type { CalculationIssue } from '@/services/lifeCycleModels/matrixCalculation/types';

const langEntry = (lang: string, text: string) => ({ '@xml:lang': lang, '#text': text });

const buildNode = (
  id: string,
  index: string,
  name: string,
  flows: Array<[string, string]> = [],
) => ({
  id,
  data: {
    index,
    shortDescription: [langEntry('en', name)],
  },
  ports: {
    items: flows.map(([flowId, flowName]) => ({
      data: { flowId, textLang: [langEntry('en', flowName)] },
    })),
  },
});

describe('resolveCalculationIssues', () => {
  it('locates an instance by index and resolves the flow name from ports', () => {
    const nodes = [buildNode('node-1', 'n0', 'Process A', [['flow-F0', 'Flow Zero']])] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_EXCHANGE_AMOUNT',
      instanceIndex: 'n0',
      flowId: 'flow-F0',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      {
        issue,
        nodeId: 'node-1',
        processName: 'Process A',
        flowName: 'Flow Zero',
      },
    ]);
  });

  it('falls back to the node id when the instance index does not match', () => {
    const nodes = [buildNode('node-9', 'nX', 'Process Z')] as any[];
    const issue: CalculationIssue = { code: 'MODEL_NOT_SOLVABLE', nodeId: 'node-9' };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'node-9', processName: 'Process Z', flowName: undefined },
    ]);
  });

  it('disambiguates same-name source instances with canvas numbering', () => {
    const nodes = [
      buildNode('a', 'n0', 'Same'),
      buildNode('b', 'n1', 'Same'),
      buildNode('c', 'n2', 'Other'),
    ] as any[];
    const issue: CalculationIssue = { code: 'NEGATIVE_ACTIVITY', instanceIndex: 'n1' };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'b', processName: 'Same 2', flowName: undefined },
    ]);
  });

  it('falls back to the first entry on language mismatch and to node label when shortDescription is absent', () => {
    const nodes = [
      {
        id: 'lbl',
        data: { index: 'n0', label: [{ '@xml:lang': 'zh', '#text': '标签名' }] },
        ports: {
          items: [
            { data: { flowId: 'other-flow' } },
            { data: { flowId: 'flow-F', textLang: [{ '@xml:lang': 'zh', '#text': '中文流' }] } },
          ],
        },
      },
    ] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_EXCHANGE_AMOUNT',
      instanceIndex: 'n0',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'lbl', processName: '标签名', flowName: '中文流' },
    ]);
  });

  it('falls back to undefined names when entries lack text values', () => {
    const nodes = [
      {
        id: 'm',
        data: { index: 'n0', shortDescription: [{ '@xml:lang': 'en' }] },
        ports: { items: [{ data: { flowId: 'flow-F', textLang: [{ '@xml:lang': 'en' }] } }] },
      },
    ] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_CONNECTION',
      instanceIndex: 'n0',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'm', processName: undefined, flowName: undefined },
    ]);
  });

  it('tolerates missing issue arrays, missing ports, and non-array text objects', () => {
    const nodes = [
      {
        id: 'obj',
        data: {
          index: 'n0',
          shortDescription: { '@xml:lang': 'en', '#text': 'Object Name' },
        },
        ports: {
          items: [
            { data: { flowId: 'flow-F', textLang: { '@xml:lang': 'en', '#text': 'Object Flow' } } },
          ],
        },
      },
      {
        id: 'no-ports',
        data: { index: 'n1', shortDescription: [{ '@xml:lang': 'en', '#text': 'X' }] },
      },
    ] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_EXCHANGE_AMOUNT',
      instanceIndex: 'n1',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'no-ports', processName: 'X', flowName: undefined },
    ]);

    const objectText: CalculationIssue = {
      code: 'INVALID_ALLOCATION',
      instanceIndex: 'n0',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [objectText], 'en')).toEqual([
      { issue: objectText, nodeId: 'obj', processName: 'Object Name', flowName: 'Object Flow' },
    ]);

    // issues 为空/缺失时不抛错
    expect(
      resolveCalculationIssues(nodes, undefined as unknown as CalculationIssue[], 'en'),
    ).toEqual([]);
  });

  it('returns undefined names for nodes and ports without any text', () => {
    const nodes = [
      {
        id: 'empty',
        data: { index: 'n0' },
        ports: { items: [{ data: { flowId: 'flow-F' } }] },
      },
    ] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_ALLOCATION',
      instanceIndex: 'n0',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'empty', processName: undefined, flowName: undefined },
    ]);
  });

  it('continues past ports whose textLang lacks values and resolves names from later entries', () => {
    const nodes = [
      {
        id: 'm2',
        data: { index: 'n0', shortDescription: [{ '@xml:lang': 'zh', '#text': '中文名' }] },
        ports: {
          items: [
            { data: { flowId: 'flow-A', textLang: [{ '@xml:lang': 'en' }] } },
            { data: { flowId: 'flow-F' } },
            { data: { flowId: 'flow-F', textLang: [{ '@xml:lang': 'zh', '#text': '流名' }] } },
          ],
        },
      },
    ] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_EXCHANGE_AMOUNT',
      instanceIndex: 'n0',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 'm2', processName: '中文名', flowName: '流名' },
    ]);
  });

  it('returns the raw issue without a node match and tolerates string textLang', () => {
    const nodes = [
      {
        id: 's',
        data: { index: 'n0', shortDescription: 'Plain Name' },
        ports: { items: [{ data: { flowId: 'flow-F', textLang: 'Plain Flow' } }] },
      },
    ] as any[];
    const issue: CalculationIssue = {
      code: 'INVALID_ALLOCATION',
      instanceIndex: 'n0',
      flowId: 'flow-F',
    };
    expect(resolveCalculationIssues(nodes, [issue], 'en')).toEqual([
      { issue, nodeId: 's', processName: 'Plain Name', flowName: 'Plain Flow' },
    ]);

    const unknown: CalculationIssue = { code: 'EMPTY_MODEL' };
    expect(resolveCalculationIssues([], [unknown], 'en')).toEqual([{ issue: unknown }]);
  });
});

describe('isCalculationErrorCode', () => {
  it('recognizes calculation failure codes and rejects others', () => {
    expect(isCalculationErrorCode('MODEL_NOT_SOLVABLE')).toBe(true);
    expect(isCalculationErrorCode('CALCULATION_FAILED')).toBe(true);
    expect(isCalculationErrorCode('SAVE_REJECTED')).toBe(false);
    expect(isCalculationErrorCode(undefined)).toBe(false);
  });
});
