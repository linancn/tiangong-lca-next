import {
  classificationToJson,
  classificationToList,
  getLangJson,
  getLangList,
  removeEmptyObjects,
} from '../general/util';

export function genContactJsonOrdered(id: string, data: any, oldData: any) {
  return removeEmptyObjects({
    contactDataSet: {
      '@xmlns:common': oldData.contactDataSet?.['@xmlns:common'] ?? {},
      '@xmlns': oldData.contactDataSet?.['@xmlns'] ?? {},
      '@xmlns:xsi': oldData.contactDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.contactDataSet['@version'] ?? {},
      '@xsi:schemaLocation': oldData.contactDataSet['@xsi:schemaLocation'] ?? {},
      contactInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': getLangJson(
            data?.contactInformation?.dataSetInformation?.['common:shortName'],
          ),
          'common:name': getLangJson(data?.contactInformation?.dataSetInformation?.['common:name']),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToList(
                data?.contactInformation?.dataSetInformation?.classificationInformation?.[
                  'common:classification'
                ]?.['common:class'],
              ),
            },
          },
          email: data?.contactInformation?.dataSetInformation?.email,
        },
      },
      administrativeInformation: data?.administrativeInformation ?? {},
    },
  });
}

export function genContactFromData(data: any) {
  return removeEmptyObjects({
    contactInformation: {
      dataSetInformation: {
        'common:shortName': getLangList(
          data?.contactInformation?.dataSetInformation?.['common:shortName'],
        ),
        'common:name': getLangList(data?.contactInformation?.dataSetInformation?.['common:name']),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToJson(
              data?.contactInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        email: data?.contactInformation?.dataSetInformation?.email,
      },
    },
    administrativeInformation: data?.administrativeInformation ?? {},
  });
}
