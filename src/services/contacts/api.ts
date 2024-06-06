import { supabase } from '@/services/supabase';
import { SortOrder } from 'antd/lib/table/interface';
import { v4 } from 'uuid';
import { classificationToString, getLangText } from '../general/util';

export async function createContacts(data: any) {
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

  const result = await supabase
    .from('contacts')
    .insert([{ id: newID, json_ordered: newData }])
    .select();
  return result;
}

export async function deleteContact(id: string) {
  const result = await supabase.from('contacts').delete().eq('id', id);
  return result;
}

export async function getContactTable(
  params: {
    current?: number;
    pageSize?: number;
  },
  sort: Record<string, SortOrder>,
  lang: string,
  dataSource: string,
) {
  const sortBy = Object.keys(sort)[0] ?? 'created_at';
  const orderBy = sort[sortBy] ?? 'descend';

  let result: any = {};
  let count_result: any = {};
  if (dataSource === 'tg') {
    result = await supabase
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

    count_result = await supabase.from('contacts').select('id', { count: 'exact' });
  } else if (dataSource === 'my') {
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      result = await supabase
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
        .eq('user_id', session.data.session.user?.id)
        .order(sortBy, { ascending: orderBy === 'ascend' })
        .range(
          ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
          (params.current ?? 1) * (params.pageSize ?? 10) - 1,
        );

      count_result = await supabase
        .from('contacts')
        .select('id', { count: 'exact' })
        .eq('user_id', session.data.session.user?.id);
    }
  }

  if (result.error) {
    console.log('error', result.error);
  }

  if (result.data) {
    if (result.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
      });
    }

    return Promise.resolve({
      data: result.data.map((i: any) => {
        try {
          return {
            id: i.id,
            lang: lang,
            shortName: getLangText(i['common:shortName'], lang),
            name: getLangText(i['common:name'], lang),
            classification: classificationToString(i['common:class']),
            email: i.email ?? '-',
            createdAt: new Date(i.created_at),
          };
        } catch (e) {
          console.error(e);
          return {
            id: i.id,
            lang: '-',
            shortName: '-',
            name: '-',
            classification: '-',
            email: i.email ?? '-',
            createdAt: new Date(i.created_at),
          };
        }
      }),
      page: params.current ?? 1,
      success: true,
      total: count_result.count ?? 0,
    });
  }
  return Promise.resolve({
    data: [],
    success: false,
  });
}
