import { UploadButton } from '@/components/FileViewer/upload';
import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import ContactSelectFrom from '@/pages/Contacts/Components/select/from';
import { getSourceDetail, updateSource } from '@/services/sources/api';
import { publicationTypeOptions } from '@/services/sources/data';
import { genSourceFromData } from '@/services/sources/util';
import { supabaseStorageBucket } from '@/services/supabase/key';
import {
  FileType,
  getBase64,
  getFileUrls,
  isImage,
  removeFile,
  uploadFile,
} from '@/services/supabase/storage';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Form,
  Image,
  Input,
  message,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  Upload,
  UploadFile,
} from 'antd';
import path from 'path';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import SourceSelectFrom from './select/from';

type Props = {
  id: string;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

const SourceEdit: FC<Props> = ({ id, buttonType, actionRef, lang, setViewDrawerVisible }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [spinning, setSpinning] = useState(false);
  const [fileList0, setFileList0] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [loadFiles, setLoadFiles] = useState<any[]>([]);

  const handlePreview = async (file: UploadFile) => {
    if (isImage(file)) {
      if (!file.url && !file.preview) {
        file.preview = await getBase64(file.originFileObj as FileType);
      }
      setPreviewImage(file.url || (file.preview as string));
      setPreviewOpen(true);
    } else {
      window.open(file.url || (file.preview as string), '_blank');
    }
  };

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const tabList = [
    {
      key: 'sourceInformation',
      tab: (
        <FormattedMessage
          id="pages.source.edit.sourceInformation"
          defaultMessage="Source Information"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.source.edit.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
  ];

  const contentList: Record<string, React.ReactNode> = {
    sourceInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.shortName"
              defaultMessage="Short Name"
            />
          }
        >
          <LangTextItemFrom
            name={['sourceInformation', 'dataSetInformation', 'common:shortName']}
            label={
              <FormattedMessage
                id="pages.source.edit.sourceInformation.shortName"
                defaultMessage="Short Name"
              />
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.classification"
              defaultMessage="Classification"
            />
          }
        >
          <LevelTextItemFrom
            name={[
              'sourceInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            dataType={'Source'}
            formRef={formRefEdit}
            onData={handletFromData}
          />
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.sourceCitation"
              defaultMessage="Source Citation"
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'sourceCitation']}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.publicationType"
              defaultMessage="Publication Type"
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'publicationType']}
        >
          <Select options={publicationTypeOptions} />
        </Form.Item>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.sourceDescriptionOrComment"
              defaultMessage="Source Description Or Comment"
            />
          }
        >
          <LangTextItemFrom
            name={['sourceInformation', 'dataSetInformation', 'sourceDescriptionOrComment']}
            label={
              <FormattedMessage
                id="pages.source.edit.sourceInformation.sourceDescriptionOrComment"
                defaultMessage="Source Description Or Comment"
              />
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.referenceToDigitalFile"
              defaultMessage="Reference To Digital File"
            />
          }
        >
          <Upload
            name="avatar"
            listType="picture-card"
            fileList={fileList}
            onPreview={handlePreview}
            beforeUpload={(file) => {
              setLoadFiles([...loadFiles, file]);
              return false;
            }}
            onChange={({ fileList: newFileList }) => {
              setFileList(newFileList);
            }}
          >
            <UploadButton />
          </Upload>
          {previewImage && (
            <Image
              wrapperStyle={{ display: 'none' }}
              preview={{
                visible: previewOpen,
                onVisibleChange: (visible) => setPreviewOpen(visible),
                afterOpenChange: (visible) => !visible && setPreviewImage(''),
              }}
              src={previewImage}
            />
          )}
        </Card>
        {/* <Form.Item
          label={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.referenceToDigitalFile"
              defaultMessage="Reference To Digital File"
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'referenceToDigitalFile', '@uri']}
        >
          <Input disabled={false} />
        </Form.Item> */}
        <br />
        <ContactSelectFrom
          name={['sourceInformation', 'dataSetInformation', 'referenceToContact']}
          label={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.referenceToContact"
              defaultMessage="Reference To Contact"
            />
          }
          lang={lang}
          formRef={formRefEdit}
          onData={handletFromData}
        />
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.administrativeInformation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.source.edit.administrativeInformation.timeStamp"
                defaultMessage="Time Stamp"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
          >
            <Input />
          </Form.Item>
          <SourceSelectFrom
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            label={
              <FormattedMessage
                id="pages.source.edit.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            lang={lang}
            formRef={formRefEdit}
            onData={handletFromData}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.source.edit.administrativeInformation.dataSetVersion"
                defaultMessage="DataSet Version"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          >
            <Input />
          </Form.Item>
          <ContactSelectFrom
            label={
              <FormattedMessage
                id="pages.contact.referenceToOwnershipOfDataSet"
                defaultMessage="Reference To Contact"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            lang={lang}
            formRef={formRefEdit}
            onData={handletFromData}
          />

          <Form.Item
            label={
              <FormattedMessage
                id="pages.source.edit.administrativeInformation.permanentDataSetURI"
                defaultMessage="Permanent Data Set URI"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:permanentDataSetURI',
            ]}
          >
            <Input />
          </Form.Item>
        </Card>
      </Space>
    ),
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getSourceDetail(id).then(async (result) => {
      formRefEdit.current?.setFieldsValue({
        ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}),
        id: id,
      });
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

    let filePaths = '';
    let fileListWithUUID = [];
    if (fileList.length > 0) {
      fileListWithUUID = fileList.map((file) => {
        const isInFileList0 = fileList0.some((file0) => file0.uid === file.uid);
        if (isInFileList0) {
          filePaths = filePaths + `${file.uid},`;
          return file;
        } else {
          const fileExtension = path.extname(file.name);
          const newUid = `../${supabaseStorageBucket}/${v4()}${fileExtension}`;
          filePaths = filePaths + `${newUid},`;
          return { ...file, newUid: newUid };
        }
      });
    }

    filePaths = filePaths.slice(0, -1);

    const result = await updateSource({
      ...fromData,
      sourceInformation: {
        ...fromData.sourceInformation,
        dataSetInformation: {
          ...fromData.sourceInformation.dataSetInformation,
          referenceToDigitalFile: {
            '@uri': filePaths,
          },
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
    setSpinning(true);
    getSourceDetail(id).then(async (result: any) => {
      const dataSet = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      setInitData({ ...dataSet, id: id });
      setFromData({ ...dataSet, id: id });
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...dataSet,
        id: id,
      });
      const initFile = await getFileUrls(
        dataSet.sourceInformation?.dataSetInformation?.referenceToDigitalFile?.['@uri'],
      );
      await setFileList0(initFile);
      await setFileList(initFile);
      setSpinning(false);
    });
  }, [drawerVisible]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
        </Button>
      )}

      <Drawer
        title={
          <FormattedMessage id="pages.source.drawer.title.edit" defaultMessage="Edit Source" />
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
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
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
            <Card
              style={{ width: '100%' }}
              // title="Card title"
              // extra={<a href="#">More</a>}
              tabList={tabList}
              activeTabKey={activeTabKey}
              onTabChange={onTabChange}
            >
              {contentList[activeTabKey]}
            </Card>
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
        </Spin>
      </Drawer>
    </>
  );
};

export default SourceEdit;
