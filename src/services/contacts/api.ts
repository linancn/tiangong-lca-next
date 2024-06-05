import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';

export async function addContacts(data: any) {
  const newID = v4();
  let common_shortName = {};
  if (data?.['common:shortName'] !== undefined) {
    if (data?.['common:shortName'].length === 1) {
      common_shortName = data?.['common:shortName'][0];
    } else if (data?.['common:shortName'].length > 1) {
      common_shortName = data?.['common:shortName'];
    }
  }
  let common_name = {};
  if (data?.['common:name'] !== undefined) {
    if (data?.['common:name'].length === 1) {
      common_name = data?.['common:name'][0];
    } else if (data?.['common:name'].length > 1) {
      common_name = data?.['common:name'];
    }
  }
  let common_class = {};
  if (
    data?.['common:class']?.['@level_0'] !== undefined &&
    data?.['common:class']?.['@level_0'] !== null &&
    data?.['common:class']?.['@level_0'].trim() !== ''
  ) {
    common_class = {
      '@level': 0,
      '#text': data?.['common:class']?.['@level_0'],
    };
    if (
      data?.['common:class']?.['@level_1'] !== undefined &&
      data?.['common:class']?.['@level_1'] !== null &&
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
        data?.['common:class']?.['@level_2'] !== undefined &&
        data?.['common:class']?.['@level_2'] !== null &&
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
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns': 'http://lca.jrc.it/ILCD/Contact',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Contact ../../schemas/ILCD_ContactDataSet.xsd',
      contactInformation: {
        dataSetInformation: {
          'common:UUID': newID,
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

  const { error } = await supabase
    .from('contacts')
    .insert([{ json_ordered: newData }])
    .select();
  return error;
}

export async function getContactTable(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
) {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';
  const { data, error } = await supabase
    .from('contacts')
    .select(
      `
                id,
                json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
                json->contactDataSet->contactInformation->dataSetInformation->"common:name",
                json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->contactDataSet->contactInformation->dataSetInformation->email,
                created_at
            `,
    )
    .order(sortBy, { ascending: orderBy === 'ascend' })
    .range(
      ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
      (params.current ?? 1) * (params.pageSize ?? 10) - 1,
    );

  if (error) {
    console.log('error', error);
  }

  if (data) {
    if (data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    const { count: data_count } = await supabase.from('contacts').select('id', { count: 'exact' });

    return Promise.resolve({
      data: data.map((item: any) => {
        try {
          return {
            id: item.id,
            lang: item['common:shortName'][0]['@xml:lang'] ?? '-',
            shortName: item['common:shortName'][0]['#text'] ?? '-',
            name: item['common:name'][0]['#text'] ?? '-',
            classification: '',
            email: item.email ?? '-',
            createdAt: new Date(item.created_at),
          };
        } catch (e) {
          console.error(e);
          return {
            id: item.id,
            lang: '-',
            shortName: '-',
            name: '-',
            classification: '',
            email: '-',
            createdAt: new Date(item.created_at),
          };
        }
      }),
      page: params.current ?? 1,
      success: true,
      total: data_count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}
