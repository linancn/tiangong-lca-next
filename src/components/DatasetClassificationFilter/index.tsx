import { getILCDClassification, getILCDFlowCategorization } from '@/services/classifications/api';
import type { Classification } from '@/services/general/data';
import {
  DATASET_CLASSIFICATION_TYPES,
  type DatasetClassificationFilterValue,
} from '@/services/general/datasetClassification';
import type { OpenDataDatasetKind } from '@/services/openDataCatalog/types';
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Cascader, Space } from 'antd';
import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type ClassificationOption = {
  label: string;
  value: string;
  filter: DatasetClassificationFilterValue;
  children?: ClassificationOption[];
};

export function toDatasetClassificationOptions(
  nodes: Classification[],
  scope: DatasetClassificationFilterValue['scope'],
  ancestors: string[] = [],
): ClassificationOption[] {
  return nodes.map((node) => {
    const path = [...ancestors, node.id];
    return {
      label: node.label,
      value: `${scope}:${node.id}`,
      filter: { scope, code: node.id, path },
      ...(node.children.length > 0
        ? { children: toDatasetClassificationOptions(node.children, scope, path) }
        : {}),
    };
  });
}

type Props = {
  datasetKind: OpenDataDatasetKind;
  lang: string;
  value: DatasetClassificationFilterValue[];
  onChange: (value: DatasetClassificationFilterValue[]) => void;
  flowType?: string;
};

export default function DatasetClassificationFilter({
  datasetKind,
  lang,
  value,
  onChange,
  flowType,
}: Props) {
  const intl = useIntl();
  const [options, setOptions] = useState<ClassificationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setOptions([]);
    const load = async () => {
      const includeClassification = datasetKind !== 'flow' || flowType !== 'Elementary flow';
      const includeElementary =
        datasetKind === 'flow' && (!flowType || flowType === 'Elementary flow');
      const requests = [
        ...(includeClassification
          ? [getILCDClassification(DATASET_CLASSIFICATION_TYPES[datasetKind], lang, ['all'])]
          : []),
        ...(includeElementary ? [getILCDFlowCategorization(lang, ['all'])] : []),
      ];
      const results = await Promise.all(requests);
      if (results.some((result) => !result.success)) {
        throw new Error('classification_resource_unavailable');
      }
      if (active) {
        const next = [];
        if (includeClassification) {
          next.push(...toDatasetClassificationOptions(results[0].data, 'classification'));
        }
        if (includeElementary) {
          next.push(
            ...toDatasetClassificationOptions(results[results.length - 1].data, 'elementary'),
          );
        }
        setOptions(next);
      }
    };
    void load()
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [datasetKind, flowType, lang, revision]);

  const selected = value[0];
  return (
    <Cascader<ClassificationOption>
      aria-label={intl.formatMessage({ id: 'pages.table.title.classification' })}
      placeholder={intl.formatMessage({ id: 'pages.table.title.classification' })}
      options={options}
      value={
        selected
          ? (selected.path ?? [selected.code]).map((code) => `${selected.scope}:${code}`)
          : []
      }
      onChange={(_, selectedOptions) => {
        const last = selectedOptions?.[selectedOptions.length - 1];
        onChange(last ? [last.filter] : []);
      }}
      allowClear
      changeOnSelect
      showSearch={{
        filter: (input, path) =>
          path.some((option) =>
            `${option.label} ${option.filter.code}`
              .toLocaleLowerCase()
              .includes(input.toLocaleLowerCase()),
          ),
      }}
      status={failed ? 'error' : undefined}
      {...(loading ? { suffixIcon: <LoadingOutlined /> } : {})}
      notFoundContent={
        failed ? (
          <Space orientation='vertical'>
            <FormattedMessage id='pages.classification.loadFailed' />
            <Button size='small' onClick={() => setRevision((current) => current + 1)}>
              <FormattedMessage id='pages.classification.retry' />
            </Button>
          </Space>
        ) : undefined
      }
      style={{ width: 220, maxWidth: '100%' }}
    />
  );
}
