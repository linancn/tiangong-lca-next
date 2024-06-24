function getAttribute(key: string, value: any) {
  return value ? { [key]: value } : {};
}
function initFlowInformation(data: any, id: string) {
  let dataSetInformation = data?.dataSetInformation;
  let baseNameData = dataSetInformation?.['name']?.['baseName'];
  let common__base_name = {};
  if (baseNameData) {
    if (baseNameData.length === 1) {
      common__base_name = baseNameData[0];
    } else if (baseNameData.length > 1) {
      common__base_name = baseNameData;
    }
  }
  let common_synonyms = {}
  if (dataSetInformation?.['common:synonyms']) {
    if (dataSetInformation?.['common:synonyms'].length === 1) {
      common_synonyms = dataSetInformation?.['common:synonyms'][0];
    } else if (dataSetInformation?.['common:synonyms'].length > 1) {
      common_synonyms = dataSetInformation?.['common:synonyms'];
    }
  }
  let common_category = {};
  let classification = dataSetInformation?.classificationInformation?.['common:elementaryFlowCategorization'];
  let categoryData = classification?.['common:category'];
  if (categoryData?.['@level_0'] && categoryData?.['@level_0'].trim() !== '') {
    common_category = {
      '@level': 0,
      '#text': categoryData?.['@level_0'],
    };
    if (
      categoryData?.['@level_1'] &&
      categoryData?.['@level_1'].trim() !== ''
    ) {
      common_category = [
        {
          '@level': 0,
          '#text': categoryData?.['@level_0'],
        },
        {
          '@level': 1,
          '#text': categoryData?.['@level_1'],
        },
      ];
      if (
        categoryData?.['@level_2'] &&
        categoryData?.['@level_2'].trim() !== ''
      ) {
        common_category = [
          {
            '@level': 0,
            '#text': categoryData?.['@level_0'],
          },
          {
            '@level': 1,
            '#text': categoryData?.['@level_1'],
          },
          {
            '@level': 2,
            '#text': categoryData?.['@level_2'],
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
  let referenceToReferenceFlowProperty = data?.quantitativeReference?.referenceToReferenceFlowProperty

  return {
    dataSetInformation: {
      'common:UUID': id,
      'name': {
        "baseName": common__base_name
      },
      "common:synonyms": common_synonyms,
      classificationInformation: {
        'common:elementaryFlowCategorization': {
          'common:category': common_category,
        },
      },
      "CASNumber": dataSetInformation?.['CASNumber'],
      'common:generalComment': common_generalComment,
      "common:other": {
        "ecn:ECNumber": dataSetInformation?.['common:other']?.['ecn:ECNumber'],
      }
    },
    quantitativeReference: {
      referenceToReferenceFlowProperty: referenceToReferenceFlowProperty
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
    "LCIMethod": {
      "typeOfDataSet": data?.LCIMethod?.['typeOfDataSet'],
    },
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
      "common:permanentDataSetURI": publicationAndOwnership?.['common:permanentDataSetURI']
    },
  }
}
function initFlowProperties(data: any) {
  let flowProperty = data?.flowProperty;
  let referenceToFlowPropertyDataSet = flowProperty?.referenceToFlowPropertyDataSet;
  let common_shortDescription = {};
  if (referenceToFlowPropertyDataSet?.['common:shortDescription']) {
    if (referenceToFlowPropertyDataSet?.['common:shortDescription'].length === 1) {
      common_shortDescription = referenceToFlowPropertyDataSet?.['common:shortDescription'][0];
    } else if (referenceToFlowPropertyDataSet?.['common:shortDescription'].length > 1) {
      common_shortDescription = referenceToFlowPropertyDataSet?.['common:shortDescription'];
    }
  }
  return {
    "flowProperty": {
      "@dataSetInternalID": flowProperty?.['@dataSetInternalID'],
      "referenceToFlowPropertyDataSet": {
        "@refObjectId": referenceToFlowPropertyDataSet?.['@refObjectId'],
        "@type": referenceToFlowPropertyDataSet?.['@type'],
        "@uri": referenceToFlowPropertyDataSet?.['@uri'],
        "common:shortDescription": common_shortDescription
      },
      "meanValue": flowProperty?.['meanValue'],
    }
  }
}
export function genFlowsJsonOrdered(id: string, data: any, oldData: any) {
  let flowInformation = initFlowInformation(data?.flowInformation, id);
  let modellingAndValidation = initModellingAndValidation(data?.modellingAndValidation);
  let administrativeInformation = initAdministrativeInformation(data?.administrativeInformation);
  let flowProperties = initFlowProperties(data?.flowProperties);
  const newData = {
    flowDataSet: {
      ...getAttribute('@xmlns', oldData.flowDataSet['@xmlns']),
      ...getAttribute('@xmlns:common', oldData.flowDataSet['@xmlns:common']),
      ...getAttribute('@xmlns:ecn', oldData.flowDataSet['@xmlns:ecn']),
      ...getAttribute('@xmlns:xsi', oldData.flowDataSet['@xmlns:xsi']),
      ...getAttribute('@version', oldData.flowDataSet['@version']),
      ...getAttribute('@xsi:schemaLocation', oldData.flowDataSet['@xsi:schemaLocation']),
      flowInformation: flowInformation,
      modellingAndValidation: modellingAndValidation,
      administrativeInformation: administrativeInformation,
      flowProperties: flowProperties
    },
  };

  return newData;
}
