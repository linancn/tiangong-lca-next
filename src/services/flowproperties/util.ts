function getAttribute(key: string, value: any) {
  return value ? { [key]: value } : {};
}

export function genFlowpropertiesJsonOrdered(id: string, data: any, oldData: any) {
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
  let common_generalComment = {};
  if (data?.['common:generalComment']) {
    if (data?.['common:generalComment'].length === 1) {
      common_generalComment = data?.['common:generalComment'][0];
    } else if (data?.['common:generalComment'].length > 1) {
      common_generalComment = data?.['common:generalComment'];
    }
  }
  console.log('oldData', oldData);
  const newData = {
    flowPropertyDataSet: {
      ...getAttribute('@xmlns:common', oldData.flowPropertyDataSet['@xmlns:common']),
      ...getAttribute('@xmlns', oldData.flowPropertyDataSet['@xmlns']),
      ...getAttribute('@xmlns:xsi', oldData.flowPropertyDataSet['@xmlns:xsi']),
      ...getAttribute('@version', oldData.flowPropertyDataSet['@version']),
      ...getAttribute('@xsi:schemaLocation', oldData.flowPropertyDataSet['@xsi:schemaLocation']),
      flowPropertiesInformation: {
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
        // quantitativeReference: {
        //   referenceToReferenceUnitGroup: {
        //     "@refObjectId":data?.[]
        //   }
        // }
      },
      // modellingAndValidation: {
      //   complianceDeclarations: {

      //   }
      // },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': data?.['common:timeStamp'],
        },
        publicationAndOwnership: {
          'common:dataSetVersion': data?.['common:dataSetVersion'],
        },
      },
    },
  };

  return newData;
}
