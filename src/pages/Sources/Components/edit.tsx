import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import type { refDataType } from '@/pages/Utils/review';
import { ReffPath, checkData, getErrRefTab } from '@/pages/Utils/review';
import { getSourceDetail, updateSource } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import { supabaseStorageBucket } from '@/services/supabase/key';
import { getThumbFileUrls, removeFile, uploadFile } from '@/services/supabase/storage';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import path from 'path';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { SourceForm } from './form';
type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: any) => void;
};

const SourceEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  setViewDrawerVisible,
  updateErrRef = () => {},
}) => {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [spinning, setSpinning] = useState(false);
  const [fileList0, setFileList0] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [loadFiles, setLoadFiles] = useState<any[]>([]);
  const [referenceValue, setReferenceValue] = useState(0);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const parentRefCheckContext = useRefCheckContext();
  const [refCheckContextValue, setRefCheckContextValue] = useState<any>({
    refCheckData: [],
  });
  useEffect(() => {
    setRefCheckContextValue({
      refCheckData: [...parentRefCheckContext.refCheckData, ...refCheckData],
    });
  }, [refCheckData, parentRefCheckContext]);
  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

  const updateReference = async () => {
    setReferenceValue(referenceValue + 1);
  };
  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const reload = useCallback(() => {
    actionRef?.current?.reload();
  }, [actionRef]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getSourceDetail(id, version).then(async (result: any) => {
      const dataSet = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      setInitData(dataSet);
      setFromData(dataSet);
      formRefEdit.current?.setFieldsValue(dataSet);
      const initFile = await getThumbFileUrls(
        dataSet.sourceInformation?.dataSetInformation?.referenceToDigitalFile,
      );
      await setFileList0(initFile);
      await setFileList(initFile);
      setSpinning(false);
    });
  };

  const handleSubmit = async (autoClose: boolean) => {
    if (autoClose) setSpinning(true);
    if (fileList0.length > 0) {
      const nonExistentFiles = fileList0.filter(
        (file0) => !fileList.some((file) => file.uid === file0.uid),
      );
      if (nonExistentFiles.length > 0) {
        const { error } = await removeFile(
          nonExistentFiles.map((file) => file.uid.replace(`../${supabaseStorageBucket}/`, '')),
        );
        if (error) {
          message.error(error.message);
        }
      }
    }

    let filePaths: any[] = [];
    let fileListWithUUID = [];
    if (fileList.length > 0) {
      fileListWithUUID = fileList.map((file) => {
        const isInFileList0 = fileList0.some((file0) => file0.uid === file.uid);
        if (isInFileList0) {
          filePaths.push({ '@uri': file.uid });
          return file;
        } else {
          const fileExtension = path.extname(file.name);
          const newUid = `../${supabaseStorageBucket}/${v4()}${fileExtension}`;
          filePaths.push({ '@uri': newUid });
          return { ...file, newUid: newUid };
        }
      });
    }
    const fieldsValue = formRefEdit.current?.getFieldsValue();
    const result = await updateSource(id, version, {
      ...fieldsValue,
      sourceInformation: {
        ...fromData.sourceInformation,
        dataSetInformation: {
          ...fromData.sourceInformation.dataSetInformation,
          referenceToDigitalFile: filePaths,
        },
      },
    });

    if (result?.data) {
      if (result?.data[0]?.rule_verification === true) {
        updateErrRef(null);
      } else {
        updateErrRef({
          id: id,
          version: version,
          ruleVerification: result?.data[0]?.rule_verification,
          nonExistent: false,
        });
      }
      if (fileListWithUUID.length > 0) {
        fileListWithUUID.forEach(async (file) => {
          if (file.newUid) {
            const thisFile = loadFiles.find((f) => f.uid === file.uid);
            await uploadFile(file.newUid.replace(`../${supabaseStorageBucket}/`, ''), thisFile);
          }
        });
      }
      message.success(
        intl.formatMessage({
          id: 'page.options.savesuccess',
          defaultMessage: 'Saved Successfully!',
        }),
      );
      if (autoClose) formRefEdit.current?.resetFields();
      if (autoClose) setDrawerVisible(false);
      reload();
    } else {
      message.error(result?.error?.message);
    }
    if (autoClose) setSpinning(false);
    if (!autoClose) {
      return result;
    }
    return true;
  };

  useEffect(() => {
    if (!drawerVisible) {
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);
  const handleCheckData = async () => {
    setSpinning(true);
    const updateResult = await handleSubmit(false);
    if (updateResult.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      {
        '@type': 'source data set',
        '@refObjectId': id,
        '@version': version,
      },
      updateResult?.data[0]?.rule_verification,
      false,
    );
    await checkData(
      {
        '@type': 'source data set',
        '@refObjectId': id,
        '@version': version,
      },
      unRuleVerification,
      nonExistentRef,
      pathRef,
    );
    const problemNodes = pathRef?.findProblemNodes() ?? [];
    if (problemNodes && problemNodes.length > 0) {
      let result = problemNodes.map((item: any) => {
        return {
          id: item['@refObjectId'],
          version: item['@version'],
          ruleVerification: item.ruleVerification,
          nonExistent: item.nonExistent,
        };
      });
      setRefCheckData(result);
    } else {
      setRefCheckData([]);
    }
    const unRuleVerificationData = unRuleVerification.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        ruleVerification: false,
        nonExistent: false,
      };
    });
    const nonExistentRefData = nonExistentRef.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        ruleVerification: true,
        nonExistent: true,
      };
    });
    const errTabNames: string[] = [];
    nonExistentRef.forEach((item: any) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    unRuleVerification.forEach((item: any) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    problemNodes.forEach((item: any) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    formRefEdit.current
      ?.validateFields()
      .then(() => {})
      .catch((err: any) => {
        const errorFields = err?.errorFields ?? [];
        errorFields.forEach((item: any) => {
          const tabName = item?.name[0];
          if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
        });
      })
      .finally(() => {
        if (
          unRuleVerificationData.length === 0 &&
          nonExistentRefData.length === 0 &&
          errTabNames.length === 0
        ) {
          message.success(
            intl.formatMessage({
              id: 'pages.button.check.success',
              defaultMessage: 'Data check successfully!',
            }),
          );
        } else {
          if (errTabNames && errTabNames.length > 0) {
            message.error(
              errTabNames
                .map((tab: any) =>
                  intl.formatMessage({
                    id: `pages.contact.${tab}`,
                    defaultMessage: tab,
                  }),
                )
                .join('，') +
                '：' +
                intl.formatMessage({
                  id: 'pages.button.check.error',
                  defaultMessage: 'Data check failed!',
                }),
            );
          } else {
            message.error(
              intl.formatMessage({
                id: 'pages.button.check.error',
                defaultMessage: 'Data check failed!',
              }),
            );
          }
        }
      });
    setSpinning(false);
  };
  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
          <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit} />
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage
            id={buttonType ? buttonType : 'pages.button.edit'}
            defaultMessage='Edit'
          />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        destroyOnClose={true}
        title={
          <FormattedMessage id='pages.source.drawer.title.edit' defaultMessage='Edit Source' />
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={handleCheckData}>
              <FormattedMessage id='pages.button.check' defaultMessage='Data check' />
            </Button>
            <Button
              onClick={() => {
                updateReference();
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update reference'
              />
            </Button>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button> */}
            <Button
              onClick={async () => {
                setShowRules(false);
                await handleSubmit(true);
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
            <RefCheckContext.Provider value={refCheckContextValue}>
              <ProForm
                formRef={formRefEdit}
                initialValues={initData}
                onValuesChange={(_, allValues) => {
                  setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
                }}
                submitter={{
                  render: () => {
                    return [];
                  },
                }}
                onFinish={() => handleSubmit(true)}
              >
                <SourceForm
                  lang={lang}
                  activeTabKey={activeTabKey}
                  formRef={formRefEdit}
                  onData={handletFromData}
                  onTabChange={onTabChange}
                  loadFiles={loadFiles}
                  setLoadFiles={setLoadFiles}
                  fileList={fileList}
                  setFileList={setFileList}
                  showRules={showRules}
                />
              </ProForm>
            </RefCheckContext.Provider>
          </UpdateReferenceContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
};

export default SourceEdit;
