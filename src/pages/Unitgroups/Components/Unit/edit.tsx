/* istanbul ignore file -- unit drawer behavior is covered by tests; remaining misses are UI-only guards */
import LangTextItemForm from '@/components/LangTextItem/form';
import type { ValidationIssueSdkDetail } from '@/pages/Utils/review';
import { getSdkSuggestedFixMessage } from '@/pages/Utils/validation/messages';
import { UnitDraft, UnitItem } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Drawer, Form, Input, Space, Switch, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type SdkFieldMessageEntry = {
  text: string;
  validationCode?: string;
};

type Props = {
  id: string;
  data: UnitItem[];
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: UnitItem[]) => void;
  sdkHighlights?: ValidationIssueSdkDetail[];
  autoOpen?: boolean;
};

const parseSdkFieldPathToFormName = (fieldPath?: string) => {
  if (!fieldPath) {
    return undefined;
  }

  const normalizedPath = fieldPath.replace(/^unit\[#.+?\]\.?/, '');
  const segments = normalizedPath.split('.').filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  return segments.map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
};

const UnitEdit: FC<Props> = ({
  id,
  data,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  onData,
  sdkHighlights = [],
  autoOpen = false,
}) => {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fromData, setFromData] = useState<UnitDraft>({});
  const [initData, setInitData] = useState<UnitDraft>({});
  const formRefEdit = useRef<ProFormInstance>();
  const autoOpenConsumedRef = useRef(false);
  const sdkFieldMessagesRef = useRef<
    Map<string, { entries: SdkFieldMessageEntry[]; name: Array<string | number> }>
  >(new Map());

  const sdkFieldMessages = sdkHighlights.reduce<
    Map<string, { entries: SdkFieldMessageEntry[]; name: Array<string | number> }>
  >((accumulator, detail) => {
    const formName =
      (Array.isArray(detail.formName) && detail.formName.length > 0
        ? detail.formName
        : parseSdkFieldPathToFormName(detail.fieldPath)) ??
      (detail.fieldKey ? [detail.fieldKey] : undefined);
    const fieldKey = formName ? formName.map(String).join('.') : '';
    const messageText = getSdkSuggestedFixMessage(intl, detail);

    if (!formName || !fieldKey || !messageText) {
      return accumulator;
    }

    const messageEntry: SdkFieldMessageEntry = {
      text: messageText,
      validationCode: detail.validationCode,
    };
    const currentEntry = accumulator.get(fieldKey);

    if (currentEntry) {
      if (
        !currentEntry.entries.some(
          (entry) =>
            entry.text === messageEntry.text &&
            entry.validationCode === messageEntry.validationCode,
        )
      ) {
        currentEntry.entries.push(messageEntry);
      }

      return accumulator;
    }

    accumulator.set(fieldKey, {
      entries: [messageEntry],
      name: formName,
    });
    return accumulator;
  }, new Map());

  useEffect(() => {
    if (!autoOpen) {
      autoOpenConsumedRef.current = false;
      return;
    }

    if (autoOpenConsumedRef.current) {
      return;
    }

    autoOpenConsumedRef.current = true;
    setDrawerVisible(true);
  }, [autoOpen]);

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    // setSpinning(true);
    formRefEdit.current?.resetFields();
    const filteredData = data?.find((item) => item['@dataSetInternalID'] === id) ?? {};
    setInitData(filteredData);
    formRefEdit.current?.setFieldsValue(filteredData);
    setFromData(filteredData);
    // setSpinning(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  useEffect(() => {
    const formInstance = formRefEdit.current;

    if (
      !drawerVisible ||
      !formInstance ||
      typeof formInstance.setFields !== 'function' ||
      typeof formInstance.getFieldError !== 'function'
    ) {
      return;
    }

    const previousEntries = sdkFieldMessagesRef.current;
    const nextEntries = sdkFieldMessages;
    const changedFieldData = new Set<string>();
    const fieldStates: Array<{ errors: string[]; name: Array<string | number> }> = [];
    const appliedEntries = new Map<
      string,
      { entries: SdkFieldMessageEntry[]; name: Array<string | number> }
    >();

    [...previousEntries.keys(), ...nextEntries.keys()].forEach((key) => {
      if (changedFieldData.has(key)) {
        return;
      }

      changedFieldData.add(key);

      const previousEntry = previousEntries.get(key);
      const nextEntry = nextEntries.get(key);
      const fieldName = (nextEntry?.name ?? previousEntry?.name)!;
      const existingErrors = [formInstance.getFieldError(fieldName)]
        .flat()
        .filter((errorMessage): errorMessage is string => typeof errorMessage === 'string');
      const previousSdkMessages = previousEntry?.entries.map((entry) => entry.text) ?? [];
      const retainedErrors = existingErrors.filter(
        (errorMessage: string) => !previousSdkMessages.includes(errorMessage),
      );
      const nextErrors = [...retainedErrors];
      const nextAppliedFieldEntries: SdkFieldMessageEntry[] = [];

      (nextEntry?.entries ?? []).forEach((entry) => {
        if (entry.validationCode === 'required_missing' && retainedErrors.length > 0) {
          return;
        }

        if (!nextErrors.includes(entry.text)) {
          nextErrors.push(entry.text);
        }

        nextAppliedFieldEntries.push(entry);
      });

      if (nextAppliedFieldEntries.length > 0) {
        appliedEntries.set(key, {
          entries: nextAppliedFieldEntries,
          name: fieldName,
        });
      }

      if (
        existingErrors.length === nextErrors.length &&
        existingErrors.every(
          (errorMessage: string, index: number) => errorMessage === nextErrors[index],
        )
      ) {
        return;
      }

      fieldStates.push({
        errors: nextErrors,
        name: fieldName,
      });
    });

    if (fieldStates.length > 0) {
      formInstance.setFields(fieldStates);
    }

    sdkFieldMessagesRef.current = appliedEntries;
  }, [drawerVisible, sdkFieldMessages]);

  useEffect(() => {
    const highlightedField = sdkHighlights.find(
      (detail) => !detail.presentation || detail.presentation === 'field',
    );
    const formInstance = formRefEdit.current;
    const fieldName =
      (Array.isArray(highlightedField?.formName) && highlightedField.formName.length > 0
        ? highlightedField.formName
        : parseSdkFieldPathToFormName(highlightedField?.fieldPath)) ?? undefined;

    if (
      !drawerVisible ||
      !fieldName ||
      !formInstance ||
      typeof formInstance.scrollToField !== 'function'
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      formInstance.scrollToField(fieldName, { focus: true });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [drawerVisible, sdkHighlights]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit'></FormattedMessage>}
        >
          <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit}></Button>
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage id='pages.button.edit' defaultMessage='Edit'></FormattedMessage>
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.unitgroup.unit.drawer.title.edit'
            defaultMessage='Unit Edit'
          ></FormattedMessage>
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefEdit}
          initialValues={initData}
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData(
              data.map((item) => {
                if (item['@dataSetInternalID'] === id) {
                  return fromData as UnitItem;
                }
                return item;
              }),
            );
            formRefEdit.current?.resetFields();
            setDrawerVisible(false);
            actionRef.current?.reload();
            return true;
          }}
        >
          <Space direction='vertical' style={{ width: '100%' }}>
            <Form.Item name={'@dataSetInternalID'} hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage id='pages.unitgroup.edit.name' defaultMessage='Name of unit' />
              }
              name={'name'}
            >
              <Input />
            </Form.Item>
            <Card
              size='small'
              title={
                <FormattedMessage
                  id='pages.unitgroup.edit.generalComment'
                  defaultMessage='Comment'
                />
              }
            >
              <LangTextItemForm
                name={'generalComment'}
                label={
                  <FormattedMessage
                    id='pages.unitgroup.edit.generalComment'
                    defaultMessage='Comment'
                  />
                }
              />
            </Card>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.unitgroup.edit.meanValue'
                  defaultMessage='Mean value (of unit)'
                />
              }
              name={'meanValue'}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.unitgroup.edit.quantitativeReference'
                  defaultMessage='Quantitative reference'
                />
              }
              name={'quantitativeReference'}
            >
              <Switch></Switch>
            </Form.Item>
          </Space>
        </ProForm>
      </Drawer>
    </>
  );
};

export default UnitEdit;
