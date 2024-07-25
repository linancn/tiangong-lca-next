import { getLangJson, removeEmptyObjects } from '../general/util';

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
