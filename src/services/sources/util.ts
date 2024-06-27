import { classificationToJson, classificationToList, getLangJson, getLangList, removeEmptyObjects } from "../general/util";

export function genSourceJsonOrdered(id: string, data: any, oldData: any) {
  return removeEmptyObjects({
    sourceDataSet: {
      '@xmlns:common': oldData.sourceDataSet?.['@xmlns:common'] ?? {},
      '@xmlns': oldData.sourceDataSet?.['@xmlns'] ?? {},
      '@xmlns:xsi': oldData.sourceDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.sourceDataSet?.['@version'] ?? {},
      '@xsi:schemaLocation': oldData.sourceDataSet?.['@xsi:schemaLocation'] ?? {},
      sourceInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': getLangJson(data?.sourceInformation?.dataSetInformation?.['common:shortName']),
          classificationInformation: {
            'common:classification': {
              'common:class': classificationToList(
                data?.sourceInformation?.dataSetInformation?.classificationInformation?.['common:classification']?.['common:class'],
              ),
            },
          },
          sourceCitation: data?.sourceInformation?.dataSetInformation?.sourceCitation ?? {},
          publicationType: data?.sourceInformation?.dataSetInformation?.publicationType ?? {},
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? {},
          'common:referenceToDataSetFormat': {
            '@type': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@type'] ?? {},
            '@refObjectId': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@refObjectId'] ?? {},
            '@uri': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@uri'] ?? {},
            'common:shortDescription': getLangJson(data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['common:shortDescription']),
          },
        },
        publicationAndOwnership: {
          'common:dataSetVersion': data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ?? {},
        },
      },
    },
  });
}

export function genSourceFromData(data: any) {
  console.log(data);
  return removeEmptyObjects({
    sourceInformation: {
      dataSetInformation: {
        'common:UUID': data?.sourceInformation?.dataSetInformation?.['common:UUID'],
        'common:shortName': getLangList(
          data?.sourceInformation?.dataSetInformation?.['common:shortName'],
        ),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToJson(
              data?.sourceInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        sourceCitation: data?.sourceInformation?.dataSetInformation?.sourceCitation,
        publicationType: data?.sourceInformation?.dataSetInformation?.publicationType,
      },
    },
    administrativeInformation: {
      dataEntryBy: {
        'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
        'common:referenceToDataSetFormat': {
          '@type': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            ?.['@type'],
          '@refObjectId': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            ?.['@refObjectId'],
          '@uri': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            ?.['@uri'],
          'common:shortDescription': getLangList(
            data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            ?.['common:shortDescription'],
          ),
        },
      },
      publicationAndOwnership: {
        'common:dataSetVersion': data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
      }
    }
  });
}
