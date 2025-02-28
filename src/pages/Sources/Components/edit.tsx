import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { createSource, getSourceDetail, updateSource } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import { supabaseStorageBucket } from '@/services/supabase/key';
import { getThumbFileUrls, removeFile, uploadFile } from '@/services/supabase/storage';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, FormOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Spin, Tooltip, Typography, message } from 'antd';
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
  type?: 'edit' | 'copy' | 'createVersion';
};

const SourceEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  setViewDrawerVisible,
  type = 'edit',
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

    if (type === 'copy' || type === 'createVersion') {
      setSpinning(true);
      const createResult = await createSource(type === 'copy' ? v4() : id, {
        ...fromData,
        sourceInformation: {
          ...fromData.sourceInformation,
          dataSetInformation: {
            ...fromData.sourceInformation.dataSetInformation,
            referenceToDigitalFile: filePaths,
          },
        },
      });
      if (createResult?.data) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.create.success',
            defaultMessage: 'Created successfully!',
          }),
        );
        formRefEdit.current?.resetFields();
        setDrawerVisible(false);
        reload();
      } else if (createResult?.error?.code === '23505') {
        message.error(
          intl.formatMessage({
            id: 'pages.button.createVersion.fail',
            defaultMessage: 'Please change the version and submit',
          }),
        );
      } else {
        message.error(createResult?.error?.message);
      }
      setSpinning(false);
      return true;
    }

    const result = await updateSource(id, version, {
      ...fromData,
      sourceInformation: {
        ...fromData.sourceInformation,
        dataSetInformation: {
          ...fromData.sourceInformation.dataSetInformation,
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
        <FormattedMessage id="options.savesuccess" defaultMessage="Saved Successfully!" />,
      );
      formRefEdit.current?.resetFields();
      setDrawerVisible(false);
      reload();
    } else {
      message.error(result?.error?.message);
    }

    return true;
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      {buttonType === 'icon' ? (
        type === 'edit' ? (
          <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
            <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
          </Tooltip>
        ) : type === 'copy' ? (
          <Tooltip title={<FormattedMessage id="pages.button.copy" defaultMessage="Copy" />}>
            <Button shape="circle" icon={<CopyOutlined />} size="small" onClick={onEdit} />
          </Tooltip>
        ) : (
          <Tooltip
            title={
              <FormattedMessage id="pages.button.createVersion" defaultMessage="Create Version" />
            }
          >
            <Button type="text" icon={<PlusOutlined />} onClick={onEdit} />
          </Tooltip>
        )
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage
            id={buttonType ? buttonType : 'pages.button.edit'}
            defaultMessage="Edit"
          />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          type === 'edit' ? (
            <FormattedMessage id="pages.source.drawer.title.edit" defaultMessage="Edit Source" />
          ) : type === 'copy' ? (
            <FormattedMessage id="pages.source.drawer.title.copy" defaultMessage="Copy Source" />
          ) : (
            <FormattedMessage
              id="pages.source.drawer.title.createVersion"
              defaultMessage="Create Version"
            />
          )
        }
        width="90%"
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
            <Button
              onClick={() => {
                updateReference();
              }}
            >
              <FormattedMessage
                id="pages.button.updateReference"
                defaultMessage="Update reference"
              />
            </Button>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            {/* <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button> */}
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
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
              onFinish={onSubmit}
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
              />
            </ProForm>
          </UpdateReferenceContext.Provider>
          <Collapse
            items={[
              {
                key: '1',
                label: 'JSON Data',
                children: (
                  <Typography>
                    <pre>{JSON.stringify(fromData, null, 2)}</pre>
                  </Typography>
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>
    </>
  );
};

export default SourceEdit;
