import { FileType, getBase64, getOriginalFileUrl, isImage } from '@/services/supabase/storage';
import { Card, Form, Image, Input, Select, Space, Upload, UploadFile } from 'antd';
import { FC, useState } from 'react';

import { UploadButton } from '@/components/FileViewer/upload';
import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import RequiredMark from '@/components/RequiredMark';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import { ProFormInstance } from '@ant-design/pro-components';
import { theme } from 'antd';
import { RcFile } from 'antd/es/upload';
import { FormattedMessage } from 'umi';
import schema from '../sources_schema.json';
import { publicationTypeOptions } from './optiondata';

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
  formType?: string;
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
  formType,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [showShortNameError, setShowShortNameError] = useState(false);
  const { token } = theme.useToken();
  const handlePreview = async (file: UploadFile) => {
    if (isImage(file)) {
      if (!file.url && !file.preview) {
        file.preview = await getBase64(file.originFileObj as FileType);
        setPreviewImage(file.preview);
      } else {
        getOriginalFileUrl(file.uid, file.name).then((res) => {
          setPreviewImage(res?.url ?? '');
        });
      }
      setPreviewOpen(true);
    } else {
      getOriginalFileUrl(file.uid, file.name).then((res) => {
        window.open(res.url, '_blank');
      });
    }
  };

  const tabList = [
    {
      key: 'sourceInformation',
      tab: (
        <FormattedMessage
          id='pages.source.edit.sourceInformation'
          defaultMessage='Source information'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.source.edit.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
  ];
  const tabContent: { [key: string]: JSX.Element } = {
    sourceInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        <Card
          size='small'
          title={
            <RequiredMark
              showError={showShortNameError}
              label={
                <FormattedMessage
                  id='pages.source.edit.sourceInformation.shortName'
                  defaultMessage='Short name of source'
                />
              }
            />
          }
        >
          <LangTextItemForm
            name={['sourceInformation', 'dataSetInformation', 'common:shortName']}
            label={
              <FormattedMessage
                id='pages.source.edit.sourceInformation.shortName'
                defaultMessage='Short name of source'
              />
            }
            setRuleErrorState={setShowShortNameError}
            rules={getRules(
              schema['sourceDataSet']['sourceInformation']['dataSetInformation'][
                'common:shortName'
              ]['rules'] ?? [],
            )}
          />
        </Card>
        <br />
        <LevelTextItemForm
          name={[
            'sourceInformation',
            'dataSetInformation',
            'classificationInformation',
            'common:classification',
            'common:class',
          ]}
          formRef={formRef}
          lang={lang}
          dataType={'Source'}
          onData={onData}
          rules={getRules(
            schema['sourceDataSet']['sourceInformation']['dataSetInformation'][
              'classificationInformation'
            ]['common:classification']['common:class']['rules'] ?? [],
          )}
        />
        <Form.Item
          label={
            <FormattedMessage
              id='pages.source.edit.sourceInformation.sourceCitation'
              defaultMessage='Source citation'
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'sourceCitation']}
          rules={getRules(
            schema['sourceDataSet']['sourceInformation']['dataSetInformation']['sourceCitation'][
              'rules'
            ] ?? [],
          )}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={
            <FormattedMessage
              id='pages.source.edit.sourceInformation.publicationType'
              defaultMessage='Publication type'
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'publicationType']}
        >
          <Select options={publicationTypeOptions} />
        </Form.Item>
        {/* <br /> */}
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.source.edit.sourceInformation.sourceDescriptionOrComment'
              defaultMessage='Source description or comment'
            />
          }
        >
          <LangTextItemForm
            name={['sourceInformation', 'dataSetInformation', 'sourceDescriptionOrComment']}
            label={
              <FormattedMessage
                id='pages.source.edit.sourceInformation.sourceDescriptionOrComment'
                defaultMessage='Source description or comment'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.source.edit.sourceInformation.referenceToDigitalFile'
              defaultMessage='Link to digital file'
            />
          }
        >
          <Upload
            name='avatar'
            listType='picture-card'
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
              id='pages.source.edit.sourceInformation.referenceToContact'
              defaultMessage='Belongs to:'
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />
        <br />
        <SourceSelectForm
          label={
            <FormattedMessage
              id='pages.source.edit.sourceInformation.referenceToLogo'
              defaultMessage='Logo of organisation or source'
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'referenceToLogo']}
          lang={lang}
          formRef={formRef}
          onData={onData}
        />
      </Space>
    ),
    administrativeInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.source.edit.administrativeInformation.dataEntryBy'
              defaultMessage='Data entry by'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.source.edit.administrativeInformation.timeStamp'
                defaultMessage='Time Stamp'
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            rules={getRules(
              schema['sourceDataSet']['administrativeInformation']['dataEntryBy'][
                'common:timeStamp'
              ]['rules'] ?? [],
            )}
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <SourceSelectForm
            defaultSourceName={formType === 'create' ? 'ILCD format' : undefined}
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            label={
              <FormattedMessage
                id='pages.source.edit.administrativeInformation.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
            rules={getRules(
              schema['sourceDataSet']['administrativeInformation']['dataEntryBy'][
                'common:referenceToDataSetFormat'
              ]['rules'] ?? [],
            )}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.source.edit.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.source.edit.administrativeInformation.dataSetVersion'
                defaultMessage='Data set version'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
            rules={getRules(
              schema['sourceDataSet']['administrativeInformation']['publicationAndOwnership'][
                'common:dataSetVersion'
              ]['rules'] ?? [],
            )}
          >
            <Input />
          </Form.Item>
          <ContactSelectForm
            label={
              <FormattedMessage
                id='pages.source.edit.administrativeInformation.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
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
            rules={getRules(
              schema['sourceDataSet']['administrativeInformation']['publicationAndOwnership'][
                'common:referenceToOwnershipOfDataSet'
              ]['rules'] ?? [],
            )}
          />
          <br />
          <SourceSelectForm
            label={
              <FormattedMessage
                id='pages.source.edit.administrativeInformation.referenceToPrecedingDataSetVersion'
                defaultMessage='Preceding data set version'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
            ]}
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.source.edit.administrativeInformation.permanentDataSetURI'
                defaultMessage='Permanent data set URI'
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
    <Card
      style={{ width: '100%' }}
      tabList={tabList}
      activeTabKey={activeTabKey}
      onTabChange={onTabChange}
    >
      {Object.keys(tabContent).map((key) => (
        <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
          {tabContent[key]}
        </div>
      ))}
    </Card>
  );
};
