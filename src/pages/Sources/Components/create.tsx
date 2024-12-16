import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { createSource } from '@/services/sources/api';
import { supabaseStorageBucket } from '@/services/supabase/key';
import { removeFile, uploadFile } from '@/services/supabase/storage';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Tooltip, Typography, message } from 'antd';
import path from 'path';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { SourceForm } from './form';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};

const SourceCreate: FC<Props> = ({ actionRef, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');
  const [fileList0, setFileList0] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [loadFiles, setLoadFiles] = useState<any[]>([]);
  const intl = useIntl();

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const onTabChange = (key: string) => {
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

    const result = await createSource(v4(), {
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
        intl.formatMessage({
          id: 'pages.button.create.success',
          defaultMessage: 'Created successfully!',
        }),
      );
      setFromData({});
      formRefCreate.current?.resetFields();
      formRefCreate.current?.setFieldsValue({});
      setDrawerVisible(false);
      reload();
    } else {
      message.error(result.error.message);
    }
    return true;
  };

  useEffect(() => {
    if (!drawerVisible) return;
    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': initVersion,
        },
      },
    };
    setInitData(newData);
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(newData);
    setFromData(newData);
    setFileList0([]);
    setFileList([]);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.create" defaultMessage="Create" />}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
        {/* {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<PlusOutlined />} size="small" onClick={() => setDrawerVisible(true)} />
                ) : (
                    <Button onClick={() => setDrawerVisible(true)}>
                        <FormattedMessage id="options.create" defaultMessage="Edit" />
                    </Button>
                )} */}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.source.drawer.title.create" defaultMessage="Create Source" />
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
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
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
            formRef={formRefCreate}
            onData={handletFromData}
            onTabChange={onTabChange}
            loadFiles={loadFiles}
            setLoadFiles={setLoadFiles}
            fileList={fileList}
            setFileList={setFileList}
          />
        </ProForm>
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
      </Drawer>
    </>
  );
};

export default SourceCreate;
