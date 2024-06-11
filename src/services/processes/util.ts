function getAttribute(key: string, value: any) {
  return value ? { [key]: value } : {};
}

export function genProcessJsonOrdered(id: string, data: any, oldData: any) {
  let common_shortName = {};
  if (data?.['common:shortName']) {
    if (data?.['common:shortName'].length === 1) {
      common_shortName = data?.['common:shortName'][0];
    } else if (data?.['common:shortName'].length > 1) {
      common_shortName = data?.['common:shortName'];
    }
  }
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
  const newData = {
    contactDataSet: {
      ...getAttribute('@xmlns:common', oldData.contactDataSet['@xmlns:common']),
      ...getAttribute('@xmlns', oldData.contactDataSet['@xmlns']),
      ...getAttribute('@xmlns:xsi', oldData.contactDataSet['@xmlns:xsi']),
      ...getAttribute('@version', oldData.contactDataSet['@version']),
      ...getAttribute('@xsi:schemaLocation', oldData.contactDataSet['@xsi:schemaLocation']),
      contactInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': common_shortName,
          'common:name': common_name,
          classificationInformation: {
            'common:classification': {
              'common:class': common_class,
            },
          },
          email: data?.email,
        },
      },
      administrativeInformation: {
        publicationAndOwnership: {
          'common:dataSetVersion': data?.['common:dataSetVersion'],
        },
      },
    },
  };

  return newData;
}
