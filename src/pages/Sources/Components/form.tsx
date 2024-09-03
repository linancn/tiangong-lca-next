import { UploadButton } from '@/components/FileViewer/upload';
import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { publicationTypeOptions } from '@/services/sources/data';
import { FileType, getBase64, isImage } from '@/services/supabase/storage';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Image, Input, Select, Space, Upload, UploadFile } from 'antd';
import { RcFile } from 'antd/es/upload';
import { FC, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
  loadFiles: RcFile[];
  setLoadFiles: React.Dispatch<React.SetStateAction<RcFile[]>>;
  fileList: UploadFile[];
  setFileList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
};

export const SourceForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onTabChange,
  loadFiles,
  setLoadFiles,
  fileList,
  setFileList,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

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
  const tabContent: { [key: string]: JSX.Element } = {
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
          <LangTextItemForm
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
          <LevelTextItemForm
            name={[
              'sourceInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            dataType={'Source'}
            formRef={formRef}
            onData={onData}
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
          <LangTextItemForm
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
        <ContactSelectForm
          name={['sourceInformation', 'dataSetInformation', 'referenceToContact']}
          label={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.referenceToContact"
              defaultMessage="Reference To Contact"
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
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
            <Input disabled={true} style={{ color: '#000' }} />
          </Form.Item>
          <SourceSelectForm
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            label={
              <FormattedMessage
                id="pages.source.edit.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
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
          <ContactSelectForm
            label={
              <FormattedMessage
                id="pages.source.edit.administrativeInformation.referenceToOwnershipOfDataSet"
                defaultMessage="Owner of data set"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            lang={lang}
            formRef={formRef}
            onData={onData}
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

  return (
    <>
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {tabContent[activeTabKey]}
      </Card>
      <Form.Item name="id" hidden>
        <Input />
      </Form.Item>
    </>
  );
};
