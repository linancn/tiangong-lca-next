function getAttribute(key: string, value: any) {
  return value ? { [key]: value } : {};
}

function computeUnits(units: any) {
  if (units) {
    return units.map((i: any) => {
      return {
        '@dataSetInternalID': i.dataSetInternalID,
        name: i.name,
        meanValue: i.meanValue,
      };
    });
  }
  return [];
}

export function genUnitGroupJsonOrdered(id: string, data: any, oldData: any) {
  let common_name = {};
  if (data?.['common:name']) {
    if (data?.['common:name'].length === 1) {
      common_name = data?.['common:name'][0];
    } else if (data?.['common:name'].length > 1) {
      common_name = data?.['common:name'];
    }
  }
  let common_class = {};
  if (data?.['common:class']?.['@level_0'] && data?.['common:class']?.['@level_0'].trim() !== '') {
    common_class = {
      '@level': 0,
      '#text': data?.['common:class']?.['@level_0'],
    };
    if (
      data?.['common:class']?.['@level_1'] &&
      data?.['common:class']?.['@level_1'].trim() !== ''
    ) {
      common_class = [
        {
          '@level': 0,
          '#text': data?.['common:class']?.['@level_0'],
        },
        {
          '@level': 1,
          '#text': data?.['common:class']?.['@level_1'],
        },
      ];
      if (
        data?.['common:class']?.['@level_2'] &&
        data?.['common:class']?.['@level_2'].trim() !== ''
      ) {
        common_class = [
          {
            '@level': 0,
            '#text': data?.['common:class']?.['@level_0'],
          },
          {
            '@level': 1,
            '#text': data?.['common:class']?.['@level_1'],
          },
          {
            '@level': 2,
            '#text': data?.['common:class']?.['@level_2'],
          },
        ];
      }
    }
  }
  let compliance_common_shortDescription = {};
  if (data?.['compliance:common:shortDescription']) {
    if (data?.['compliance:common:shortDescription'].length === 1) {
      compliance_common_shortDescription = data?.['compliance:common:shortDescription'][0];
    } else if (data?.['compliance:common:shortDescription'].length > 1) {
      compliance_common_shortDescription = data?.['compliance:common:shortDescription'];
    }
  }
  let dataEntryBy_common_shortDescription = {};
  if (data?.['dataEntryBy:common:shortDescription']) {
    if (data?.['dataEntryBy:common:shortDescription'].length === 1) {
      dataEntryBy_common_shortDescription = data?.['dataEntryBy:common:shortDescription'][0];
    } else if (data?.['dataEntryBy:common:shortDescription'].length > 1) {
      dataEntryBy_common_shortDescription = data?.['dataEntryBy:common:shortDescription'];
    }
  }
  const newData = {
    unitGroupDataSet: {
      ...getAttribute('@xmlns', oldData.unitGroupDataSet['@xmlns']),
      ...getAttribute('@xmlns:common', oldData.unitGroupDataSet['@xmlns:common']),
      ...getAttribute('@xmlns:xsi', oldData.unitGroupDataSet['@xmlns:xsi']),
      ...getAttribute('@version', oldData.unitGroupDataSet['@version']),
      ...getAttribute('@xsi:schemaLocation', oldData.unitGroupDataSet['@xsi:schemaLocation']),
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
          referenceToReferenceUnit: data?.referenceToReferenceUnit,
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:referenceToComplianceSystem': {
              '@refObjectId': data?.['compliance:common:@refObjectId'],
              '@type': data?.['compliance:common:@type'],
              '@uri': data?.['compliance:common:@uri'],
              '@version': data?.['compliance:common:@version'],
              'common:shortDescription': compliance_common_shortDescription,
            },
            'common:approvalOfOverallCompliance':
              data?.['compliance:common:approvalOfOverallCompliance'],
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': data?.['dataEntryBy:common:timeStamp'],
          'common:referenceToDataSetFormat': {
            '@refObjectId': data?.['dataEntryBy:common:@refObjectId'],
            '@type': data?.['dataEntryBy:common:@type'],
            '@uri': data?.['dataEntryBy:common:@uri'],
            '@version': data?.['dataEntryBy:common:@version'],
            'common:shortDescription': dataEntryBy_common_shortDescription,
          },
        },
        publicationAndOwnership: {
          'common:dataSetVersion': data?.['publicationAndOwnership:common:dataSetVersion'],
        },
      },
      units: {
        unit: computeUnits(data?.unit),
      },
    },
  };

  return newData;
}
