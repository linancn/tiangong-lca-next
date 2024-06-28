import { classificationToJson, getLangList, removeEmptyObjects } from "../general/util";

function getAttribute(key: string, value: any) {
  return value ? { [key]: value } : {};
}

function genUnitGroupInformation(data: any, id: string) {
  let dataSetInformation = data?.dataSetInformation;
  let common_name = {};
  if (dataSetInformation?.['common:name']) {
    if (dataSetInformation?.['common:name'].length === 1) {
      common_name = dataSetInformation?.['common:name'][0];
    } else if (dataSetInformation?.['common:name'].length > 1) {
      common_name = dataSetInformation?.['common:name'];
    }
  }
  let classification = dataSetInformation?.classificationInformation?.['common:classification'];
  let common_class = {};
  if (classification?.['common:class']?.['@level_0'] && classification?.['common:class']?.['@level_0'].trim() !== '') {
    common_class = {
      '@level': '0',
      '#text': classification?.['common:class']?.['@level_0'],
    };
    if (
      classification?.['common:class']?.['@level_1'] &&
      classification?.['common:class']?.['@level_1'].trim() !== ''
    ) {
      common_class = [
        {
          '@level': '0',
          '#text': classification?.['common:class']?.['@level_0'],
        },
        {
          '@level': '1',
          '#text': classification?.['common:class']?.['@level_1'],
        },
      ];
      if (
        classification?.['common:class']?.['@level_2'] &&
        classification?.['common:class']?.['@level_2'].trim() !== ''
      ) {
        common_class = [
          {
            '@level': '0',
            '#text': classification?.['common:class']?.['@level_0'],
          },
          {
            '@level': '1',
            '#text': classification?.['common:class']?.['@level_1'],
          },
          {
            '@level': '2',
            '#text': classification?.['common:class']?.['@level_2'],
          },
        ];
      }
    }
  }
  return {
    unitGroupInformation: {
      dataSetInformation: {
        'common:UUID': id,
        'common:name': common_name,
        classificationInformation: {
          'common:classification': {
            'common:class': common_class,
          },
        },
      },
      quantitativeReference: {
        referenceToReferenceUnit: data?.quantitativeReference?.referenceToReferenceUnit,
      }
    }
  };
}

function genModellingAndValidation(data: any) {
  let referenceToComplianceSystem = data?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem'];
  let shortDescription = {};
  if (referenceToComplianceSystem?.['common:shortDescription']) {
    if (referenceToComplianceSystem?.['common:shortDescription'].length === 1) {
      shortDescription = referenceToComplianceSystem?.['common:shortDescription'][0];
    } else if (referenceToComplianceSystem?.['common:shortDescription'].length > 1) {
      shortDescription = referenceToComplianceSystem?.['common:shortDescription'];
    }
  }
  return {
    modellingAndValidation: {
      complianceDeclarations: {
        compliance: {
          'common:referenceToComplianceSystem': {
            '@refObjectId': referenceToComplianceSystem?.['@refObjectId'],
            '@type': referenceToComplianceSystem?.['@type'],
            '@uri': referenceToComplianceSystem?.['@uri'],
            '@version': referenceToComplianceSystem?.['@version'],
            'common:shortDescription': shortDescription,
          },
          'common:approvalOfOverallCompliance': data?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance'],
        }
      }
    }
  };
}

function genAdministrativeInformation(data: any) {
  let referenceToDataSetFormat = data?.dataEntryBy?.['common:referenceToDataSetFormat'];
  let shortDescription = {};
  if (referenceToDataSetFormat?.['common:shortDescription']) {
    if (referenceToDataSetFormat?.['common:shortDescription'].length === 1) {
      shortDescription = referenceToDataSetFormat?.['common:shortDescription'][0];
    } else if (referenceToDataSetFormat?.['common:shortDescription'].length > 1) {
      shortDescription = referenceToDataSetFormat?.['common:shortDescription'];
    }
  }
  return {
    administrativeInformation: {
      dataEntryBy: {
        'common:timeStamp': data?.dataEntryBy?.['common:timeStamp'],
        'common:referenceToDataSetFormat': {
          '@refObjectId': referenceToDataSetFormat?.['@refObjectId'],
          '@type': referenceToDataSetFormat?.['@type'],
          '@uri': referenceToDataSetFormat?.['@uri'],
          '@version': referenceToDataSetFormat?.['@version'],
          'common:shortDescription': shortDescription,
        }
      },
      publicationAndOwnership: {
        'common:dataSetVersion': data?.publicationAndOwnership?.['common:dataSetVersion'],
      }
    }
  };
}

function genUnits(data: any) {
  let compute_units = [];
  if (data?.unit) {
    compute_units = data?.unit.map((item: any) => {
      return {
        '@dataSetInternalID': item['@dataSetInternalID'],
        name: item.name,
        meanValue: item.meanValue,
      };
    });
  }
  return {
    units: {
      unit: compute_units,
    }
  };
}

export function genUnitGroupJsonOrdered(id: string, data: any, oldData: any) {
  const unitGroupInformation = genUnitGroupInformation(data?.unitGroupInformation, id);
  const modellingAndValidation = genModellingAndValidation(data?.modellingAndValidation);
  const administrativeInformation = genAdministrativeInformation(data?.administrativeInformation);
  const units = genUnits(data?.units);
  const newData = {
    unitGroupDataSet: {
      ...getAttribute('@xmlns', oldData.unitGroupDataSet['@xmlns']),
      ...getAttribute('@xmlns:common', oldData.unitGroupDataSet['@xmlns:common']),
      ...getAttribute('@xmlns:xsi', oldData.unitGroupDataSet['@xmlns:xsi']),
      ...getAttribute('@version', oldData.unitGroupDataSet['@version']),
      ...getAttribute('@xsi:schemaLocation', oldData.unitGroupDataSet['@xsi:schemaLocation']),
      ...unitGroupInformation,
      ...modellingAndValidation,
      ...administrativeInformation,
      ...units,
    },
  };
  return newData;
}


export function genUnitGroupFromData(data: any) {
  return removeEmptyObjects({
    unitGroupInformation: {
      dataSetInformation: {
        'common:UUID': data?.unitGroupInformation?.dataSetInformation?.['common:UUID'] ?? '-',
        'common:name': getLangList(
          data?.unitGroupInformation?.dataSetInformation?.['common:name'],
        ),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToJson(
              data?.unitGroupInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
              ]?.['common:class'],
            ),
          },
        },
        email: data?.unitGroupInformation?.dataSetInformation?.email,
      },
      quantitativeReference: {
        referenceToReferenceUnit: data?.unitGroupInformation?.quantitativeReference?.referenceToReferenceUnit
      },
    },
    modellingAndValidation: {
      complianceDeclarations: {
        compliance: {
          'common:referenceToComplianceSystem': {
            '@refObjectId': data?.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem']?.['@refObjectId'],
            '@type': data?.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem']?.['@type'],
            '@uri': data?.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem']?.['@uri'],
            '@version': data?.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem']?.['@version'],
            'common:shortDescription': getLangList(data?.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem']?.['common:shortDescription']),
          },
          'common:approvalOfOverallCompliance': data?.modellingAndValidation?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance'],
        }
      }
    },
    administrativeInformation: {
      dataEntryBy: {
        'common:timeStamp': data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
        'common:referenceToDataSetFormat': {
          '@refObjectId': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@refObjectId'],
          '@type': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@type'],
          '@uri': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@uri'],
          '@version': data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@version'],
          'common:shortDescription': getLangList(data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']?.['common:shortDescription']),
        },
      },
      publicationAndOwnership: {
        'common:dataSetVersion': data?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'],
      },
    },
    units: data?.units ?? {},
  });
}