import { getILCDClassification, getILCDFlowCategorization } from '@/services/classifications/api';
import type { Classification } from '@/services/general/data';
import {
  DATASET_CLASSIFICATION_TYPES,
  type DatasetClassificationFilterValue,
} from '@/services/general/datasetClassification';
import type { OpenDataDatasetKind } from '@/services/openDataCatalog/types';
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Cascader, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
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
  const contextKey = JSON.stringify([
    datasetKind,
    flowType,
    lang,
    intl.locale,
    value.map(({ scope, code, path, system }) => ({ scope, code, path: path ?? [code], system })),
  ]);
  const [session, setSession] = useState<{
    contextKey: string;
    draft: DatasetClassificationFilterValue[];
  } | null>(null);
  const selectionInProgress = useRef<object | null>(null);
  const mounted = useRef(false);
  const triggerRoot = useRef<HTMLSpanElement>(null);
  const popupRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selectionInProgress.current = null;
    };
  }, []);
  const open = session?.contextKey === contextKey;
  const draft = open ? session.draft : value;
  const close = () => {
    selectionInProgress.current = null;
    setSession(null);
  };
  useEffect(() => {
    setSession(null);
    selectionInProgress.current = null;
  }, [contextKey]);
  useEffect(() => {
    if (!open) return;
    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (triggerRoot.current?.contains(target) ||
        (popupRoot.current?.closest('.ant-cascader-dropdown') ?? popupRoot.current)?.contains(
          target,
        ));
    const dismissOutside = (event: Event) => {
      if (!isInside(event.target)) close();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (triggerRoot.current?.contains(event.target as Node)) {
        // Search-input focus is internal. Only a click on the native suffix
        // expresses a toggle/dismissal while the confirmation draft is open.
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('.ant-select-suffix')) close();
      } else dismissOutside(event);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onWindowBlur = () => close();
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('focusin', dismissOutside, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('focusin', dismissOutside, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [open]);

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

  const selected = draft[0];
  return (
    <span ref={triggerRoot}>
      <Cascader<ClassificationOption>
        aria-label={intl.formatMessage({ id: 'pages.table.title.classification' })}
        placeholder={intl.formatMessage({ id: 'pages.table.title.classification' })}
        options={options}
        open={open}
        onOpenChange={(nextOpen) => {
          if (!mounted.current) return;
          if (nextOpen) {
            setSession({ contextKey, draft: value });
          } else if (!selectionInProgress.current) {
            close();
          }
        }}
        popupRender={(menus) => (
          <div ref={popupRoot}>
            {menus}
            <Space
              wrap
              style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}
              onMouseDown={(event) => event.preventDefault()}
            >
              <Button size='small' onClick={() => setSession({ contextKey, draft: [] })}>
                <FormattedMessage id='pages.button.clear' />
              </Button>
              <Button size='small' onClick={close}>
                <FormattedMessage id='pages.button.cancel' />
              </Button>
              <Button
                size='small'
                type='primary'
                disabled={!open}
                onClick={() => {
                  // Compare stable query fields; a code-only root and its hydrated path are equivalent.
                  const identity = (filters: DatasetClassificationFilterValue[]) =>
                    JSON.stringify(
                      filters.map(({ scope, code, path, system }) => ({
                        scope,
                        code,
                        path: path ?? [code],
                        system,
                      })),
                    );
                  if (open && identity(draft) !== identity(value)) onChange(draft);
                  close();
                }}
              >
                <FormattedMessage id='pages.button.confirm' />
              </Button>
            </Space>
          </div>
        )}
        value={
          selected
            ? (selected.path ?? [selected.code]).map((code) => `${selected.scope}:${code}`)
            : []
        }
        onChange={(_, selectedOptions) => {
          const last = selectedOptions?.[selectedOptions.length - 1];
          // A leaf's native close is asynchronous. Keep the draft open until
          // an explicit dismissal interaction, independently of native task timing.
          selectionInProgress.current = {};
          setSession({ contextKey, draft: last ? [last.filter] : [] });
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
        styles={{ popup: { root: { maxWidth: 'calc(100vw - 16px)', overflowX: 'auto' } } }}
        popupAlign={{ overflow: { adjustX: true, adjustY: true, shiftX: true } }}
      />
    </span>
  );
}
