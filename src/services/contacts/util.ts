import {
  classificationToJson,
  classificationToList,
  getLangJson,
  getLangList,
  removeEmptyObjects,
} from '../general/util';

function initContactInformation(data: any, id: string) {
  let dataSetInformation = data?.dataSetInformation;
  let referenceToContact = dataSetInformation?.referenceToContact;
  return {
    dataSetInformation: {
      "common:UUID": id,
      'common:shortName': getLangJson(
        dataSetInformation?.['common:shortName'],
      ),
      'common:name': getLangJson(dataSetInformation?.['common:name']),
      classificationInformation: {
        'common:classification': {
          'common:class': classificationToList(
            dataSetInformation?.classificationInformation?.[
            'common:classification'
            ]?.['common:class'],
          ),
        },
      },
      "contactAddress": getLangJson(dataSetInformation?.contactAddress),
      "telephone": dataSetInformation?.telephone,
      "telefax": dataSetInformation?.telefax,
      "email": dataSetInformation?.email,
      "WWWAddress": dataSetInformation?.WWWAddress,
      'centralContactPoint': getLangJson(
        dataSetInformation?.['centralContactPoint'],
      ),
      'contactDescriptionOrComment': getLangJson(
        dataSetInformation?.['contactDescriptionOrComment'],
      ),
      "referenceToContact": {
        "@refObjectId": referenceToContact?.['@refObjectId'],
        "@type": referenceToContact?.['@type'],
        "@uri": referenceToContact?.['@uri'],
        "common:shortDescription": getLangJson(
          referenceToContact?.['common:shortDescription'],
        ),
        '@version': referenceToContact?.['@version'],
      }
    }
  }
}
function initAdministrativeInformation(data: any) {
  let dataEntryBy = data?.dataEntryBy;
  let publicationAndOwnership = data?.publicationAndOwnership;
  return {
    "dataEntryBy": {
      "common:timeStamp": dataEntryBy?.['common:timeStamp'],
      "common:referenceToDataSetFormat": {
        "@refObjectId": dataEntryBy?.['common:referenceToDataSetFormat']?.['@refObjectId'],
        "@type": dataEntryBy?.['common:referenceToDataSetFormat']?.['@type'],
        "@uri": dataEntryBy?.['common:referenceToDataSetFormat']?.['@uri'],
        "common:shortDescription": getLangJson(dataEntryBy?.['common:referenceToDataSetFormat']?.['common:shortDescription']),
      }
    },
    "publicationAndOwnership": {
      "common:dataSetVersion": publicationAndOwnership?.['common:dataSetVersion'],
      "common:referenceToPrecedingDataSetVersion": {
        "@refObjectId": publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['@refObjectId'],
        "@type": publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['@type'],
        "@uri": publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['@uri'],
        "common:shortDescription": getLangJson(publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['common:shortDescription']),
      },
      "common:permanentDataSetURI": publicationAndOwnership?.['common:permanentDataSetURI'],
    }
  }
}
export function genContactJsonOrdered(id: string, data: any, oldData: any) {
  let contactInformation = initContactInformation(data?.contactInformation, id)
  let administrativeInformation = initAdministrativeInformation(data?.administrativeInformation)
  return removeEmptyObjects({
    contactDataSet: {
      '@xmlns': oldData.contactDataSet?.['@xmlns'] ?? {},
      '@xmlns:common': oldData.contactDataSet?.['@xmlns:common'] ?? {},
      '@xmlns:xsi': oldData.contactDataSet?.['@xmlns:xsi'] ?? {},
      '@version': oldData.contactDataSet['@version'] ?? {},
      '@xsi:schemaLocation': oldData.contactDataSet['@xsi:schemaLocation'] ?? {},
      contactInformation: contactInformation,
      administrativeInformation: administrativeInformation,
    },
  });
}
const resetContactInformation = (data: any) => {
  let dataSetInformation = data?.dataSetInformation;
  return {
    dataSetInformation: {
      'common:UUID': dataSetInformation?.['common:UUID'] ?? '-',
      'common:shortName': getLangList(
        dataSetInformation?.['common:shortName'],
      ),
      'common:name': getLangList(dataSetInformation?.['common:name']),
      classificationInformation: {
        'common:classification': {
          'common:class': classificationToJson(
            dataSetInformation?.classificationInformation?.[
            'common:classification'
            ]?.['common:class'],
          ),
        },
      },
      "contactAddress": getLangList(dataSetInformation?.contactAddress),
      "telephone": dataSetInformation?.telephone,
      "telefax": dataSetInformation?.telefax,
      email: dataSetInformation?.email,
      "WWWAddress": dataSetInformation?.WWWAddress,
      'centralContactPoint': getLangList(
        dataSetInformation?.['centralContactPoint'],
      ),
      'contactDescriptionOrComment': getLangList(
        dataSetInformation?.['contactDescriptionOrComment'],
      ),
      "referenceToContact": {
        "@refObjectId": dataSetInformation?.referenceToContact?.['@refObjectId'],
        "@type": dataSetInformation?.referenceToContact?.['@type'],
        "@uri": dataSetInformation?.referenceToContact?.['@uri'],
        "common:shortDescription": getLangList(
          dataSetInformation?.referenceToContact?.['common:shortDescription'],
        ),
        '@version': dataSetInformation?.referenceToContact?.['@version'],
      }
    },
  };
}
const resetAdministrativeInformation = (data: any) => {
  return {
    "dataEntryBy": {
      "common:timeStamp": data?.dataEntryBy?.['common:timeStamp'],
      "common:referenceToDataSetFormat": {
        "@refObjectId": data?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@refObjectId'],
        "@type": data?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@type'],
        "@uri": data?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@uri'],
        "common:shortDescription": getLangList(data?.dataEntryBy?.['common:referenceToDataSetFormat']?.['common:shortDescription']),
      }
    },
    "publicationAndOwnership": {
      "common:dataSetVersion": data?.publicationAndOwnership?.['common:dataSetVersion'],
      "common:referenceToPrecedingDataSetVersion": {
        "@refObjectId": data?.publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['@refObjectId'],
        "@type": data?.publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['@type'],
        "@uri": data?.publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['@uri'],
        "common:shortDescription": getLangList(data?.publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.['common:shortDescription']),
      },
      "common:permanentDataSetURI": data?.publicationAndOwnership?.['common:permanentDataSetURI'],
    }

  }
}
export function genContactFromData(data: any) {
  let contactInformation = resetContactInformation(data?.contactInformation)
  let administrativeInformation = resetAdministrativeInformation(data?.administrativeInformation)
  return removeEmptyObjects({
    contactInformation: contactInformation,
    administrativeInformation: administrativeInformation,
  });
}
