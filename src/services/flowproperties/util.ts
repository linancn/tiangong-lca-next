function getAttribute(key: string, value: any) {
  return value ? { [key]: value } : {};
}
function initFlowPropertiesInformation(data: any, id: string) {
  let dataSetInformation = data?.dataSetInformation;
  let common_name = {};
  if (dataSetInformation?.['common:name']) {
    if (dataSetInformation?.['common:name'].length === 1) {
      common_name = dataSetInformation?.['common:name'][0];
    } else if (dataSetInformation?.['common:name'].length > 1) {
      common_name = dataSetInformation?.['common:name'];
    }
  }
  let common_class = {};
  if (dataSetInformation?.['common:class']?.['@level_0'] && dataSetInformation?.['common:class']?.['@level_0'].trim() !== '') {
    common_class = {
      '@level': 0,
      '#text': dataSetInformation?.['common:class']?.['@level_0'],
    };
    if (
      dataSetInformation?.['common:class']?.['@level_1'] &&
      dataSetInformation?.['common:class']?.['@level_1'].trim() !== ''
    ) {
      common_class = [
        {
          '@level': 0,
          '#text': dataSetInformation?.['common:class']?.['@level_0'],
        },
        {
          '@level': 1,
          '#text': dataSetInformation?.['common:class']?.['@level_1'],
        },
      ];
      if (
        dataSetInformation?.['common:class']?.['@level_2'] &&
        dataSetInformation?.['common:class']?.['@level_2'].trim() !== ''
      ) {
        common_class = [
          {
            '@level': 0,
            '#text': dataSetInformation?.['common:class']?.['@level_0'],
          },
          {
            '@level': 1,
            '#text': dataSetInformation?.['common:class']?.['@level_1'],
          },
          {
            '@level': 2,
            '#text': dataSetInformation?.['common:class']?.['@level_2'],
          },
        ];
      }
    }
  }
  let common_generalComment = {};
  if (dataSetInformation?.['common:generalComment']) {
    if (dataSetInformation?.['common:generalComment'].length === 1) {
      common_generalComment = dataSetInformation?.['common:generalComment'][0];
    } else if (dataSetInformation?.['common:generalComment'].length > 1) {
      common_generalComment = dataSetInformation?.['common:generalComment'];
    }
  }
  let common_shortDescription = {}
  let referenceToReferenceUnitGroup = data?.quantitativeReference?.referenceToReferenceUnitGroup
  if (referenceToReferenceUnitGroup?.['common:shortDescription']) {
    if (referenceToReferenceUnitGroup?.['common:shortDescription'].length === 1) {
      common_shortDescription = referenceToReferenceUnitGroup?.['common:shortDescription'][0];
    } else if (referenceToReferenceUnitGroup?.['common:shortDescription'].length > 1) {
      common_shortDescription = referenceToReferenceUnitGroup?.['common:shortDescription'];
    }
  }
  return {
    dataSetInformation: {
      'common:UUID': id,
      'common:name': common_name,
      classificationInformation: {
        'common:classification': {
          'common:class': common_class,
        },
      },
      'common:generalComment': common_generalComment,
    },
    quantitativeReference: {
      referenceToReferenceUnitGroup: {
        "@refObjectId": referenceToReferenceUnitGroup?.['@refObjectId'],
        "@type": referenceToReferenceUnitGroup?.['@type'],
        "@uri": referenceToReferenceUnitGroup?.['@uri'],
        "common:shortDescription": common_shortDescription
      }
    }
  };
}
function initModellingAndValidation(data: any) {
  let referenceToComplianceSystem = data?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem']
  let common_shortDescription = {}
  if (referenceToComplianceSystem?.['common:shortDescription']) {
    if (referenceToComplianceSystem?.['common:shortDescription'].length === 1) {
      common_shortDescription = referenceToComplianceSystem?.['common:shortDescription'][0];
    } else if (referenceToComplianceSystem?.['common:shortDescription'].length > 1) {
      common_shortDescription = referenceToComplianceSystem?.['common:shortDescription'];
    }
  }
  return {
    complianceDeclarations: {
      compliance: {
        "common:referenceToComplianceSystem": {
          "@refObjectId": referenceToComplianceSystem?.['@refObjectId'],
          "@type": referenceToComplianceSystem?.['@type'],
          "@uri": referenceToComplianceSystem?.['@uri'],
          "common:shortDescription": common_shortDescription
        },
        "common:approvalOfOverallCompliance": data?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance']
      }
    }
  }
}
function initAdministrativeInformation(data: any) {
  let dataEntryBy = data?.dataEntryBy;
  let referenceToDataSetFormat = dataEntryBy?.["common:referenceToDataSetFormat"];
  let dataEntryBy_common_shortDescription = {}
  if (referenceToDataSetFormat?.['common:shortDescription']) {
    if (referenceToDataSetFormat?.['common:shortDescription'].length === 1) {
      dataEntryBy_common_shortDescription = referenceToDataSetFormat?.['common:shortDescription'][0];
    } else if (referenceToDataSetFormat?.['common:shortDescription'].length > 1) {
      dataEntryBy_common_shortDescription = referenceToDataSetFormat?.['common:shortDescription'];
    }
  }
  let publicationAndOwnership = data?.publicationAndOwnership;
  let referenceToPrecedingDataSetVersion = publicationAndOwnership?.["common:referenceToDataSetFormat"];
  let publicationAndOwnership_common_shortDescription = {}
  if (referenceToPrecedingDataSetVersion?.['common:shortDescription']) {
    if (referenceToPrecedingDataSetVersion?.['common:shortDescription'].length === 1) {
      publicationAndOwnership_common_shortDescription = referenceToPrecedingDataSetVersion?.['common:shortDescription'][0];
    } else if (referenceToPrecedingDataSetVersion?.['common:shortDescription'].length > 1) {
      publicationAndOwnership_common_shortDescription = referenceToPrecedingDataSetVersion?.['common:shortDescription'];
    }
  }
  return {
    dataEntryBy: {
      'common:timeStamp': dataEntryBy?.['common:timeStamp'],
      "common:referenceToDataSetFormat": {
        "@refObjectId": referenceToDataSetFormat?.['@refObjectId'],
        "@type": referenceToDataSetFormat?.['@type'],
        "@uri": referenceToDataSetFormat?.['@uri'],
        "common:shortDescription": dataEntryBy_common_shortDescription
      }
    },
    publicationAndOwnership: {
      'common:dataSetVersion': publicationAndOwnership?.['common:dataSetVersion'],
      "common:referenceToPrecedingDataSetVersion": {
        "@refObjectId": referenceToPrecedingDataSetVersion?.['@refObjectId'],
        "@type": referenceToPrecedingDataSetVersion?.['@type'],
        "@uri": referenceToPrecedingDataSetVersion?.['@uri'],
        "common:shortDescription": publicationAndOwnership_common_shortDescription
      },
      "common:permanentDataSetURI": publicationAndOwnership?.['common:permanentDataSetURI']
    },
  }
}
export function genFlowpropertiesJsonOrdered(id: string, data: any, oldData: any) {
  let flowPropertiesInformation = initFlowPropertiesInformation(data?.flowPropertiesInformation, id);
  let modellingAndValidation = initModellingAndValidation(data?.modellingAndValidation);
  let administrativeInformation = initAdministrativeInformation(data?.administrativeInformation);

  const newData = {
    flowPropertyDataSet: {
      ...getAttribute('@xmlns:common', oldData.flowPropertyDataSet['@xmlns:common']),
      ...getAttribute('@xmlns', oldData.flowPropertyDataSet['@xmlns']),
      ...getAttribute('@xmlns:xsi', oldData.flowPropertyDataSet['@xmlns:xsi']),
      ...getAttribute('@version', oldData.flowPropertyDataSet['@version']),
      ...getAttribute('@xsi:schemaLocation', oldData.flowPropertyDataSet['@xsi:schemaLocation']),
      flowPropertiesInformation: flowPropertiesInformation,
      modellingAndValidation: modellingAndValidation,
      administrativeInformation: administrativeInformation,
    },
  };

  return newData;
}
