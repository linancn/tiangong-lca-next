import { getLangJson, getLangList, getLangText, removeEmptyObjects } from '../general/util';

export function genProductJsonOrdered(id: string, data: any) {
  return removeEmptyObjects({
    productDataSet: {
      productInformation: {
        dataSetInformation: {
          'common:UUID': id,
          name: getLangJson(data?.productInformation?.dataSetInformation?.name),
          'common:generalComment': getLangJson(
            data?.productInformation?.dataSetInformation?.['common:generalComment'],
          ),
        },
      },
      model: {
        nodes: data?.model?.nodes ?? [],
        edges: data?.model?.edges ?? [],
      },
    },
  });
}

export function genProductInfoFromData(data: any) {
  return {
    productInformation: {
      dataSetInformation: {
        'common:UUID': data?.productInformation?.dataSetInformation?.['common:UUID'],
        name: getLangList(data?.productInformation?.dataSetInformation?.name),
        'common:generalComment': getLangList(
          data?.productInformation?.dataSetInformation?.['common:generalComment'],
        ),
      },
    },
  };
}

export function genProductModelFromData(data: any, lang: string) {
  return {
    nodes:
      data?.model?.nodes?.map((node: any) => {
        return {
          ...node,
          label: getLangText(node?.data?.label, lang),
        };
      }) ?? [],
    edges: data?.model?.edges ?? [],
  };
}
