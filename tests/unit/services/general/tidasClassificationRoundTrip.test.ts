import { genContactFromData, genContactJsonOrdered } from '@/services/contacts/util';
import {
  genFlowpropertyFromData,
  genFlowpropertyJsonOrdered,
} from '@/services/flowproperties/util';
import { genFlowFromData, genFlowJsonOrdered } from '@/services/flows/util';
import {
  genLifeCycleModelInfoFromData,
  genLifeCycleModelJsonOrdered,
} from '@/services/lifeCycleModels/util';
import { genProcessFromData, genProcessJsonOrdered } from '@/services/processes/util';
import { genSourceFromData, genSourceJsonOrdered } from '@/services/sources/util';
import { genUnitGroupFromData, genUnitGroupJsonOrdered } from '@/services/unitgroups/util';

it.each([
  ['contact', 'contactInformation', genContactFromData, genContactJsonOrdered],
  [
    'flowProperty',
    'flowPropertiesInformation',
    genFlowpropertyFromData,
    genFlowpropertyJsonOrdered,
  ],
  ['flow', 'flowInformation', genFlowFromData, genFlowJsonOrdered],
  [
    'lifeCycleModel',
    'lifeCycleModelInformation',
    genLifeCycleModelInfoFromData,
    genLifeCycleModelJsonOrdered,
  ],
  ['process', 'processInformation', genProcessFromData, genProcessJsonOrdered],
  ['source', 'sourceInformation', genSourceFromData, genSourceJsonOrdered],
  ['unitGroup', 'unitGroupInformation', genUnitGroupFromData, genUnitGroupJsonOrdered],
] as const)(
  'preserves named classification systems across the %s serializer',
  (kind, information, read, write) => {
    const systems = [
      {
        '@name': 'First',
        '@classes': 'https://example.org/a',
        'common:class': [{ '@level': '0', '@classId': 'a', '#text': 'Alpha' }],
      },
      {
        '@name': 'Second',
        '@classes': 'https://example.org/b',
        'common:class': [{ '@level': '2', '@classId': 'b', '#text': 'Beta' }],
      },
    ];
    const data = {
      [information]: {
        dataSetInformation: { classificationInformation: { 'common:classification': systems } },
      },
    };
    const form = read(data);
    expect(form?.[information as keyof typeof form]).toMatchObject({
      dataSetInformation: { classificationInformation: { 'common:classification': systems } },
    });
    const saved = write('00000000-0000-4000-8000-000000000001', form);
    expect(
      (saved as any)[`${kind}DataSet`][information].dataSetInformation.classificationInformation[
        'common:classification'
      ],
    ).toEqual(systems);
  },
);
