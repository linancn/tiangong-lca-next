import ToolBarButton from '@/components/ToolBarButton';
import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { createSource, getSourceDetail } from '@/services/sources/api';
import { FormSource, SourceDataSetObjectKeys } from '@/services/sources/data';
import { genSourceFromData } from '@/services/sources/util';
import { supabaseStorageBucket } from '@/services/supabase/key';
import { getThumbFileUrls, removeFile, uploadFile } from '@/services/supabase/storage';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, message, Space, Spin, Tooltip } from 'antd';
import path from 'path';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { SourceForm } from './form';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
  importData?: any;
  onClose?: () => void;
};

// When type is 'copy' or 'createVersion', id and version are required parameters
type CreateProps =
  | (Omit<Props, 'type'> & { actionType?: 'create' })
  | (Omit<Props, 'type' | 'id' | 'version'> & {
      actionType: 'copy';
      id: string;
      version: string;
    })
  | (Omit<Props, 'type' | 'id' | 'version'> & {
      actionType: 'createVersion';
      id: string;
      version: string;
    });

const SourceCreate: FC<CreateProps> = ({
  actionRef,
  lang,
  actionType = 'create',
  id,
  version,
  importData,
  onClose = () => {},
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<FormSource>();
  const [initData, setInitData] = useState<FormSource>();
  const [activeTabKey, setActiveTabKey] = useState<SourceDataSetObjectKeys>('sourceInformation');
  const [fileList0, setFileList0] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [loadFiles, setLoadFiles] = useState<any[]>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const intl = useIntl();

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const onTabChange = (key: SourceDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const onSubmit = async () => {
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
          filePaths.push({ '@uri': file.url });
          return file;
        } else {
          const fileExtension = path.extname(file.name);
          const newUid = `../${supabaseStorageBucket}/${v4()}${fileExtension}`;
          filePaths.push({ '@uri': newUid });
          return { ...file, newUid: newUid };
        }
      });
    }

    const paramsId = (actionType === 'createVersion' ? id : v4()) ?? '';
    const formFieldsValue = formRefCreate.current?.getFieldsValue();
    const result = await createSource(paramsId, {
      ...formFieldsValue,
      sourceInformation: {
        ...fromData?.sourceInformation,
        dataSetInformation: {
          ...fromData?.sourceInformation?.dataSetInformation,
          referenceToDigitalFile: filePaths,
        },
      },
    });

    if (result?.data) {
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
          id: 'pages.button.create.success',
          defaultMessage: 'Created successfully!',
        }),
      );
      setFromData(undefined);
      formRefCreate.current?.resetFields();
      formRefCreate.current?.setFieldsValue({});
      setDrawerVisible(false);
      reload();
    } else {
      message.error(result.error.message);
    }
    return true;
  };

  const initFormDetail = async (dataSet: any) => {
    setInitData(dataSet);
    setFromData(dataSet);

    formRefCreate.current?.validateFields();
    formRefCreate.current?.setFieldsValue({ ...dataSet });

    const initFile = await getThumbFileUrls(
      dataSet.sourceInformation?.dataSetInformation?.referenceToDigitalFile,
    );
    await setFileList0(initFile);
    await setFileList(initFile);
  };

  const getFormDetail = async () => {
    if (!id || !version) return;
    setSpinning(true);
    getSourceDetail(id, version).then(async (result: any) => {
      const dataSet = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      await initFormDetail(dataSet);
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (importData && importData.length > 0 && !drawerVisible) {
      setDrawerVisible(true);
    }
  }, [importData]);

  useEffect(() => {
    if (!drawerVisible) {
      onClose();
      formRefCreate.current?.resetFields();
      setFromData(undefined);
      setInitData(undefined);
      setFileList([]);
      setFileList0([]);
      return;
    }
    if (importData && importData.length > 0) {
      const formData = genSourceFromData(importData[0].sourceDataSet);
      initFormDetail(formData);
      return;
    }
    if (actionType === 'copy' || actionType === 'createVersion') {
      getFormDetail();
      return;
    }

    // const referenceToDataSetFormatId = 'a97a0155-0234-4b87-b4ce-a45da52f2a40';
    // getSourceDetail(referenceToDataSetFormatId, '').then(async (result2: any) => {
    // const referenceToDataSetFormatData = genSourceFromData(
    //   result2.data?.json?.sourceDataSet ?? {},
    // );
    // const referenceToDataSetFormat = {
    //   '@refObjectId': referenceToDataSetFormatId,
    //   '@type': 'source data set',
    //   '@uri': `../sources/${referenceToDataSetFormatId}.xml`,
    //   '@version': result2.data?.version,
    //   'common:shortDescription':
    //     referenceToDataSetFormatData?.sourceInformation?.dataSetInformation?.[
    //       'common:shortName'
    //     ] ?? [],
    // };

    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
          // 'common:referenceToDataSetFormat': referenceToDataSetFormat,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': initVersion,
        },
      },
    };
    setInitData(newData as FormSource);
    // formRefCreate.current?.resetFields();
    const currentData = formRefCreate.current?.getFieldsValue();
    formRefCreate.current?.setFieldsValue({ ...currentData, ...newData });
    setFromData(newData as FormSource);
    setFileList0([]);
    setFileList([]);
    // });
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id={
              actionType === 'copy'
                ? 'pages.button.copy'
                : actionType === 'createVersion'
                  ? 'pages.button.createVersion'
                  : 'pages.button.create'
            }
            defaultMessage='Create'
          />
        }
      >
        {actionType === 'copy' ? (
          <Button
            shape='circle'
            icon={<CopyOutlined />}
            size='small'
            onClick={() => {
              setDrawerVisible(true);
            }}
          />
        ) : (
          <ToolBarButton
            icon={<PlusOutlined />}
            tooltip={<FormattedMessage id='pages.button.create' defaultMessage='Create' />}
            onClick={() => {
              setDrawerVisible(true);
            }}
          />
        )}
        {/* {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<PlusOutlined />} size="small" onClick={() => setDrawerVisible(true)} />
                ) : (
                    <Button onClick={() => setDrawerVisible(true)}>
                        <FormattedMessage id="options.create" defaultMessage="Edit" />
                    </Button>
                )} */}
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id={
              actionType === 'copy'
                ? 'pages.source.drawer.title.copy'
                : actionType === 'createVersion'
                  ? 'pages.source.drawer.title.createVersion'
                  : 'pages.source.drawer.title.create'
            }
            defaultMessage='Create Source'
          />
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
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefCreate}
            initialValues={initData}
            onValuesChange={(_, allValues) => {
              setFromData({
                ...fromData,
                [activeTabKey]: allValues[activeTabKey] ?? {},
              } as FormSource);
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={onSubmit}
          >
            <SourceForm
              formType='create'
              lang={lang}
              activeTabKey={activeTabKey}
              formRef={formRefCreate}
              onData={handletFromData}
              onTabChange={(key) => onTabChange(key as SourceDataSetObjectKeys)}
              loadFiles={loadFiles}
              setLoadFiles={setLoadFiles}
              fileList={fileList}
              setFileList={setFileList}
            />
          </ProForm>
        </Spin>
      </Drawer>
    </>
  );
};

export default SourceCreate;
