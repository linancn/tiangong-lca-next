/**
 * Tests for life cycle model utilities
 * Path: src/services/lifeCycleModels/util.ts
 */

import {
  genEdgeExchangeTableData,
  genLifeCycleModelData,
  genLifeCycleModelInfoFromData,
  genLifeCycleModelJsonOrdered,
  genNodeLabel,
  genPortLabel,
  genReferenceToResultingProcess,
} from '@/services/lifeCycleModels/util';

const createLangText = (text: string, lang = 'en') => ({ '@xml:lang': lang, '#text': text });

const createClassification = () => ({
  value: ['Systems', 'Unspecific parts'],
  id: ['class-0', 'class-1'],
});

const baseModelData = {
  lifeCycleModelInformation: {
    dataSetInformation: {
      name: {
        baseName: [createLangText('Model base name')],
        treatmentStandardsRoutes: [createLangText('Route info')],
        mixAndLocationTypes: [createLangText('Mix info')],
        functionalUnitFlowProperties: [createLangText('Unit info')],
      },
      classificationInformation: {
        'common:classification': {
          'common:class': createClassification(),
        },
      },
      referenceToResultingProcess: {
        '@refObjectId': 'proc-final',
        '@type': 'process data set',
        '@uri': '../processes/proc-final.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Final process')],
      },
      'common:generalComment': [createLangText('General remark')],
      referenceToExternalDocumentation: {
        '@refObjectId': 'doc-1',
        '@type': 'source data set',
        '@uri': '../sources/doc-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Documentation')],
      },
    },
    technology: {
      referenceToDiagram: {
        '@refObjectId': 'diagram-1',
        '@type': 'diagram',
        '@uri': '../diagram/diagram-1.svg',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Diagram description')],
      },
    },
  },
  modellingAndValidation: {
    dataSourcesTreatmentEtc: {
      useAdviceForDataSet: [createLangText('Advice')],
    },
    validation: {
      review: [
        {
          '@type': 'internal',
          'common:scope': [
            {
              '@name': 'scope-1',
              'common:method': {
                '@name': 'method-1',
              },
            },
          ],
          'common:dataQualityIndicators': {
            'common:dataQualityIndicator': [{ '@name': 'coverage', '@value': 'high' }],
          },
          'common:reviewDetails': [createLangText('Review details')],
          'common:referenceToNameOfReviewerAndInstitution': {
            '@refObjectId': 'reviewer-1',
            '@type': 'person',
            '@uri': '../contacts/reviewer-1.xml',
            '@version': '01.00.000',
            'common:shortDescription': [createLangText('Reviewer name')],
          },
          'common:otherReviewDetails': [createLangText('Other review')],
          'common:referenceToCompleteReviewReport': {
            '@refObjectId': 'report-1',
            '@type': 'document',
            '@uri': '../documents/report-1.pdf',
            '@version': '01.00.000',
            'common:shortDescription': [createLangText('Report')],
          },
        },
      ],
    },
    complianceDeclarations: {
      compliance: [
        {
          'common:referenceToComplianceSystem': {
            '@refObjectId': 'system-1',
            '@type': 'system',
            '@uri': '../compliance/system-1.xml',
            '@version': '01.00.000',
            'common:shortDescription': [createLangText('Compliance system')],
          },
          'common:approvalOfOverallCompliance': 'approved',
          'common:nomenclatureCompliance': 'compliant',
          'common:methodologicalCompliance': 'compliant',
          'common:reviewCompliance': 'compliant',
          'common:documentationCompliance': 'compliant',
          'common:qualityCompliance': 'high',
        },
      ],
    },
  },
  administrativeInformation: {
    'common:commissionerAndGoal': {
      'common:referenceToCommissioner': {
        '@refObjectId': 'commissioner-1',
        '@type': 'organisation',
        '@uri': '../contacts/commissioner-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Commissioner name')],
      },
      'common:project': [createLangText('Project name')],
      'common:intendedApplications': [createLangText('Intended application')],
    },
    dataGenerator: {
      'common:referenceToPersonOrEntityGeneratingTheDataSet': {
        '@refObjectId': 'generator-1',
        '@type': 'person',
        '@uri': '../contacts/generator-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Generator name')],
      },
    },
    dataEntryBy: {
      'common:timeStamp': '2023-01-01',
      'common:referenceToDataSetFormat': {
        '@refObjectId': 'format-1',
        '@type': 'format',
        '@uri': '../formats/format-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Format name')],
      },
      'common:referenceToPersonOrEntityEnteringTheData': {
        '@refObjectId': 'entry-1',
        '@type': 'person',
        '@uri': '../contacts/entry-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Entry person')],
      },
    },
    publicationAndOwnership: {
      'common:dataSetVersion': '01.00.000',
      'common:permanentDataSetURI': 'https://example.com/dataset',
      'common:referenceToOwnershipOfDataSet': {
        '@refObjectId': 'owner-1',
        '@type': 'organisation',
        '@uri': '../contacts/owner-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Owner name')],
      },
      'common:copyright': '© Example',
      'common:referenceToEntitiesWithExclusiveAccess': {
        '@refObjectId': 'exclusive-1',
        '@type': 'organisation',
        '@uri': '../contacts/exclusive-1.xml',
        '@version': '01.00.000',
        'common:shortDescription': [createLangText('Exclusive access entity')],
      },
      'common:licenseType': 'CC-BY',
      'common:accessRestrictions': [createLangText('None')],
    },
  },
  model: {
    nodes: [
      {
        id: 'node-a',
        data: {
          index: '0',
          id: 'proc-a',
          version: '01.00.000',
          shortDescription: [createLangText('Process A')],
          multiplicationFactor: '2',
          scalingFactor: '1.25',
          quantitativeReference: '1',
        },
      },
      {
        id: 'node-b',
        data: {
          index: '1',
          id: 'proc-b',
          version: '02.00.000',
          shortDescription: [createLangText('Process B')],
        },
      },
    ],
    edges: [
      {
        source: { cell: 'node-a' },
        target: { cell: 'node-b' },
        data: {
          connection: {
            outputExchange: {
              '@flowUUID': 'flow-1',
              downstreamProcess: {
                '@flowUUID': 'flow-2',
              },
            },
          },
        },
      },
    ],
  },
};

describe('genNodeLabel', () => {
  it('should truncate long labels for non-Chinese languages based on node width', () => {
    const label = 'Alpha; Beta; Gamma; Delta';

    const result = genNodeLabel(label, 'en', 140);

    expect(result).toBe('Alpha; Beta; Gam...');
  });

  it('should use wider truncation threshold for Chinese language', () => {
    const label = '阿尔法贝塔伽玛德尔塔阿尔法贝塔伽玛德尔塔';

    const result = genNodeLabel(label, 'zh', 240);

    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThan(label.length);
  });

  it('should keep short labels unchanged', () => {
    expect(genNodeLabel('Short label', 'en', 300)).toBe('Short label');
  });
});

describe('genPortLabel', () => {
  it('should truncate port labels and preserve tooltip text', () => {
    const label = 'Long Output Flow Name';

    const result = genPortLabel(label, 'en', 140);

    expect(result).toBe('Long Outpu...');
  });

  it('should shorten Chinese port labels with adjusted width divisor', () => {
    const label = '非常长的端口名称需要截断才行';

    const result = genPortLabel(label, 'zh', 240);

    expect(result.endsWith('...')).toBe(true);
  });

  it('should keep short port labels unchanged', () => {
    expect(genPortLabel('Port', 'en', 300)).toBe('Port');
  });
});

describe('genReferenceToResultingProcess', () => {
  it('should return original data when process list is empty or data is missing', () => {
    const data = {
      lifeCycleModelDataSet: { lifeCycleModelInformation: { dataSetInformation: {} } },
    };

    expect(genReferenceToResultingProcess([], '01.00.000', data)).toBe(data);
    expect(genReferenceToResultingProcess(null, '01.00.000', data)).toBe(data);
    expect(
      genReferenceToResultingProcess(
        [{ modelInfo: { id: 'proc-1' }, data: {} }],
        '01.00.000',
        null,
      ),
    ).toBeNull();
  });

  it('should attach resulting process references with generated short descriptions', () => {
    const data = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          dataSetInformation: {},
        },
      },
    };

    const result = genReferenceToResultingProcess(
      [
        {
          modelInfo: { id: 'proc-1' },
          data: {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  name: {
                    baseName: [createLangText('Process One')],
                  },
                },
              },
            },
          },
        },
      ],
      '01.00.000',
      data,
    );

    expect(
      result.lifeCycleModelDataSet.lifeCycleModelInformation.dataSetInformation
        .referenceToResultingProcess,
    ).toEqual([
      expect.objectContaining({
        '@refObjectId': 'proc-1',
        '@type': 'process data set',
        '@uri': '../processes/proc-1.xml',
        '@version': '01.00.000',
      }),
    ]);
  });
});

describe('genLifeCycleModelJsonOrdered', () => {
  it('should build ordered ILCD JSON with sequential internal IDs and references', () => {
    const result = genLifeCycleModelJsonOrdered('model-123', baseModelData);

    // After removing oldData parameter, the function uses default xmlns values
    expect(result.lifeCycleModelDataSet['@xmlns']).toBe(
      'http://eplca.jrc.ec.europa.eu/ILCD/LifeCycleModel/2017',
    );
    expect(result.lifeCycleModelDataSet['@xsi:schemaLocation']).toBeDefined();

    const processes = result.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes
      .processInstance as any[];

    expect(Array.isArray(processes)).toBe(true);
    expect(processes).toHaveLength(2);
    expect(processes[0]['@dataSetInternalID']).toBe('0');
    expect(processes[1]['@dataSetInternalID']).toBe('1');

    expect(
      result.lifeCycleModelDataSet.lifeCycleModelInformation.quantitativeReference
        .referenceToReferenceProcess,
    ).toBe('0');

    expect(processes[0].referenceToProcess['@refObjectId']).toBe('proc-a');
    expect(processes[0].referenceToProcess['@uri']).toBe('../processes/proc-a.xml');

    const firstOutput = processes[0].connections.outputExchange;
    expect(firstOutput['@flowUUID']).toBe('flow-1');
    expect(firstOutput.downstreamProcess['@id']).toBe('1');
    expect(firstOutput.downstreamProcess['@flowUUID']).toBe('flow-2');
  });

  it('should group multiple downstream processes under one output flow UUID', () => {
    const data = {
      ...baseModelData,
      model: {
        nodes: [
          ...baseModelData.model.nodes,
          {
            id: 'node-c',
            data: {
              index: '2',
              id: 'proc-c',
              version: '03.00.000',
              shortDescription: [createLangText('Process C')],
            },
          },
        ],
        edges: [
          ...baseModelData.model.edges,
          {
            source: { cell: 'node-a' },
            target: { cell: 'node-c' },
            data: {
              connection: {
                outputExchange: {
                  '@flowUUID': 'flow-1',
                  downstreamProcess: {
                    '@flowUUID': 'flow-3',
                  },
                },
              },
            },
          },
        ],
      },
    };

    const result = genLifeCycleModelJsonOrdered('model-123', data);
    const processes = result.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes
      .processInstance as any[];
    const groupedOutput = processes[0].connections.outputExchange;

    expect(groupedOutput['@flowUUID']).toBe('flow-1');
    expect(groupedOutput.downstreamProcess).toEqual([
      expect.objectContaining({ '@id': '1', '@flowUUID': 'flow-2' }),
      expect.objectContaining({ '@id': '2', '@flowUUID': 'flow-3' }),
    ]);
  });
});

describe('genLifeCycleModelInfoFromData', () => {
  it('should convert ordered dataset back to form-friendly data structures', () => {
    const ordered = genLifeCycleModelJsonOrdered('model-456', baseModelData);

    const result = genLifeCycleModelInfoFromData(ordered.lifeCycleModelDataSet);

    const baseName = result.lifeCycleModelInformation.dataSetInformation.name.baseName;
    expect(Array.isArray(baseName)).toBe(true);
    const baseNameList = Array.isArray(baseName) ? baseName : [baseName];
    expect(baseNameList[0]).toEqual(createLangText('Model base name'));

    expect(result.lifeCycleModelInformation.quantitativeReference.referenceToReferenceProcess).toBe(
      '0',
    );

    const classification =
      result.lifeCycleModelInformation.dataSetInformation.classificationInformation[
        'common:classification'
      ]['common:class'];
    const classificationList = classification as { id?: string[]; value?: string[] };
    expect(classificationList.value).toEqual(['Systems', 'Unspecific parts']);
    expect(classificationList.id).toEqual(['class-0', 'class-1']);
  });

  it('should preserve review and compliance collections after round-tripping', () => {
    const ordered = genLifeCycleModelJsonOrdered('model-789', baseModelData);

    const result = genLifeCycleModelInfoFromData(ordered.lifeCycleModelDataSet);
    const reviewList = Array.isArray(result.modellingAndValidation.validation.review)
      ? result.modellingAndValidation.validation.review
      : [result.modellingAndValidation.validation.review];
    const complianceList = Array.isArray(
      result.modellingAndValidation.complianceDeclarations.compliance,
    )
      ? result.modellingAndValidation.complianceDeclarations.compliance
      : [result.modellingAndValidation.complianceDeclarations.compliance];
    const review = reviewList[0] as any;
    const compliance = complianceList[0] as any;

    expect(review['@type']).toBe('internal');
    expect(review['common:scope']).toEqual([
      expect.objectContaining({
        '@name': 'scope-1',
        'common:method': expect.objectContaining({ '@name': 'method-1' }),
      }),
    ]);
    expect(review['common:referenceToCompleteReviewReport']['@refObjectId']).toBe('report-1');
    expect(compliance['common:referenceToComplianceSystem']['@refObjectId']).toBe('system-1');
    expect(compliance['common:approvalOfOverallCompliance']).toBe('approved');
  });
});

describe('genLifeCycleModelData', () => {
  it('should derive node and port labels based on language preferences', () => {
    const sample = {
      xflow: {
        nodes: [
          {
            id: 'node-a',
            width: 140,
            label: 'should be replaced',
            data: {
              label: {
                baseName: [createLangText('Alpha process')],
                treatmentStandardsRoutes: [createLangText('Route info')],
                mixAndLocationTypes: [createLangText('Mix info')],
                functionalUnitFlowProperties: [createLangText('Unit info')],
              },
            },
            ports: {
              items: [
                {
                  id: 'port-1',
                  data: {
                    textLang: [createLangText('Long Output Flow Name')],
                  },
                  attrs: {
                    text: {
                      text: 'original',
                    },
                  },
                },
              ],
            },
          },
        ],
        edges: [{ id: 'edge-1' }],
      },
    };

    const result = genLifeCycleModelData(sample, 'en');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].label).toBe('Alpha process; R...');
    expect(result.nodes[0].ports.items[0].attrs.text.text).toBe('Long Outpu...');
    expect(result.nodes[0].ports.items[0].attrs.text.title).toBe('Long Output Flow Name');
    expect(result.nodes[0].ports.items[0].tools).toEqual([{ id: 'portTool' }]);
    expect(result.edges).toEqual(sample.xflow.edges);
  });

  it('should use fallback width, labels, and empty edge defaults', () => {
    const sample = {
      xflow: {
        nodes: [
          {
            id: 'node-fallback',
            data: {},
            ports: {
              items: [
                {
                  id: 'port-fallback',
                  data: {},
                  attrs: {
                    text: {},
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const result = genLifeCycleModelData(sample as any, 'en');

    expect(result.nodes[0].label).toBe('-');
    expect(result.nodes[0].ports.items[0].attrs.text.text).toBe('');
    expect(result.nodes[0].ports.items[0].attrs.text.title).toBeUndefined();
    expect(result.edges).toEqual([]);
  });

  it('should prefer node.size.width and attrs text when textLang is missing', () => {
    const sample = {
      xflow: {
        nodes: [
          {
            id: 'node-sized',
            width: 400,
            size: { width: 84, height: 40 },
            data: {
              label: {
                baseName: [createLangText('Compact label that should truncate')],
              },
            },
            ports: {
              items: [
                {
                  id: 'port-sized',
                  attrs: {
                    text: {
                      text: 'Fallback port name',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const result = genLifeCycleModelData(sample as any, 'en');

    expect(result.nodes[0].label).toBe('Compact ...');
    expect(result.nodes[0].ports.items[0].attrs.text.text).toBe('Fa...');
    expect(result.nodes[0].ports.items[0].attrs.text.title).toBe('Fallback port name');
  });
});

describe('genEdgeExchangeTableData', () => {
  it('should map exchange entries and fallback to defaults', () => {
    const data = [
      {
        id: 'edge-1',
        sourceProcessId: 'proc-a',
        sourceOutputFlowInternalID: 'in-1',
        sourceOutputFlowId: 'flow-a',
        sourceOutputFlowName: [createLangText('Output Flow')],
        sourceOutputFlowGeneralComment: [createLangText('Output comment')],
        targetProcessId: 'proc-b',
        targetInputFlowInternalID: 'in-2',
        targetInputFlowId: 'flow-b',
        targetInputFlowName: [createLangText('Input Flow')],
        targetInputFlowGeneralComment: null,
      },
    ];

    const result = genEdgeExchangeTableData(data, 'en');

    expect(result).toHaveLength(1);
    expect(result[0].sourceOutputFlowGeneralComment).toBe('Output comment');
    expect(result[0].targetInputFlowGeneralComment).toBe('-');
  });

  it('should keep provided targetInputFlowId instead of defaulting to "-"', () => {
    const data = [
      {
        id: 'edge-1',
        targetInputFlowId: 'flow-b',
      },
    ];

    const result = genEdgeExchangeTableData(data, 'en');

    expect(result[0].targetInputFlowId).toBe('flow-b');
  });

  it('should generate fallback ids and targetInputFlowId defaults', () => {
    const result = genEdgeExchangeTableData(
      [
        {
          sourceOutputFlowName: [createLangText('Only source')],
        },
      ] as any,
      'en',
    );

    expect(result[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result[0].targetInputFlowId).toBe('-');
  });

  it('should return empty array when input is nullish', () => {
    expect(genEdgeExchangeTableData(undefined, 'en')).toEqual([]);
    expect(genEdgeExchangeTableData(null, 'en')).toEqual([]);
  });
});
