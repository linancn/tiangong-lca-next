function getAttribute(key: string, value: any) {
    return value ? { [key]: value } : {};
  }
  
  export function genSourceJsonOrdered(id: string, data: any, oldData: any) {
    let common_shortName = {};
    if (data?.['common:shortName']) {
      if (data?.['common:shortName'].length === 1) {
        common_shortName = data?.['common:shortName'][0];
      } else if (data?.['common:shortName'].length > 1) {
        common_shortName = data?.['common:shortName'];
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
      sourceDataSet: {
        ...getAttribute('@xmlns:common', oldData.sourceDataSet['@xmlns:common']),
        ...getAttribute('@xmlns', oldData.sourceDataSet['@xmlns']),
        ...getAttribute('@xmlns:xsi', oldData.sourceDataSet['@xmlns:xsi']),
        ...getAttribute('@version', oldData.sourceDataSet['@version']),
        ...getAttribute('@xsi:schemaLocation', oldData.sourceDataSet['@xsi:schemaLocation']),
        sourceInformation: {
          dataSetInformation: {
            'common:UUID': id,
            'common:shortName': common_shortName,
            classificationInformation: {
              'common:classification': {
                'common:class': common_class,
              },
            },
            sourceCitation: data?.sourceCitation,
            publicationType: data?.publicationType,
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
  