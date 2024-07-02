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
          sourceDescriptionOrComment: getLangJson(data?.sourceInformation?.dataSetInformation?.sourceDescriptionOrComment),
          referenceToDigitalFile: {
            '@uri': data?.sourceInformation?.dataSetInformation?.referenceToDigitalFile?.['@uri'],
          },
          referenceToContact: {
            "@refObjectId": data?.sourceInformation?.dataSetInformation?.referenceToContact?.["@refObjectId"],
            "@type": data?.sourceInformation?.dataSetInformation?.referenceToContact?.["@type"],
            "@uri": data?.sourceInformation?.dataSetInformation?.referenceToContact?.["@uri"],
            '@version': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@version'],
            "common:shortDescription": getLangJson(data?.sourceInformation?.dataSetInformation?.referenceToContact?.["common:shortDescription"]),
          }
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
          "common:permanentDataSetURI": data?.administrativeInformation?.publicationAndOwnership?.["common:permanentDataSetURI"] ?? {},
        },
      },
    },
  });
}

export function genSourceFromData(data: any) {
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
        sourceDescriptionOrComment: getLangList(data?.sourceInformation?.dataSetInformation?.sourceDescriptionOrComment),
        referenceToDigitalFile: {
          '@uri': data?.sourceInformation?.dataSetInformation?.referenceToDigitalFile?.['@uri'],
        },
        referenceToContact: {
          "@refObjectId": data?.sourceInformation?.dataSetInformation?.referenceToContact?.["@refObjectId"],
          "@type": data?.sourceInformation?.dataSetInformation?.referenceToContact?.["@type"],
          "@uri": data?.sourceInformation?.dataSetInformation?.referenceToContact?.["@uri"],
          '@version': data?.sourceInformation?.dataSetInformation?.referenceToContact?.['@version'],
          "common:shortDescription": getLangList(data?.sourceInformation?.dataSetInformation?.referenceToContact?.["common:shortDescription"]),
        }
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
        "common:permanentDataSetURI": data?.administrativeInformation?.publicationAndOwnership?.["common:permanentDataSetURI"],
      }
    }
  });
}
