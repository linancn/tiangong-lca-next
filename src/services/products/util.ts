import { v4 } from 'uuid';
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
        referenceToFlowDataSet: {
          '@refObjectId': data?.productInformation?.referenceToFlowDataSet?.['@refObjectId'],
          'common:name': getLangJson(data?.productInformation?.referenceToFlowDataSet?.['common:name']),
          'common:generalComment': getLangJson(data?.productInformation?.referenceToFlowDataSet?.['common:generalComment']),
        }
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
      referenceToFlowDataSet: {
        '@refObjectId': data?.productInformation?.referenceToFlowDataSet?.['@refObjectId'],
        'common:name': getLangList(data?.productInformation?.referenceToFlowDataSet?.['common:name']),
        'common:generalComment': getLangList(data?.productInformation?.referenceToFlowDataSet?.['common:generalComment']),
      }
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

export function genEdgeExchangeTableData(data: any, lang: string) {
  if (data) {
    return data.map((item: any) => {
      return removeEmptyObjects({
        id: item.id ?? v4(),
        sourceProcessId: item.sourceProcessId ?? '-',
        sourceOutputFlowInternalID: item.sourceOutputFlowInternalID ?? '-',
        sourceOutputFlowId: item.sourceOutputFlowId ?? '-',
        sourceOutputFlowName: getLangText(item.sourceOutputFlowName, lang),
        sourceOutputFlowGeneralComment: getLangText(item.sourceOutputFlowGeneralComment, lang),
        targetProcessId: item.targetProcessId ?? '-',
        targetInputFlowInternalID: item.targetInputFlowInternalID ?? '-',
        targetInputFlowId: item.targetOutputFlowId ?? '-',
        targetInputFlowName: getLangText(item.targetInputFlowName, lang),
        targetInputFlowGeneralComment: getLangText(item.targetInputFlowGeneralComment, lang),
      });
    });
  }
  return [];
}
