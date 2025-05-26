import LangTextItemForm from '@/components/LangTextItem/form';
import { FileType, getBase64, getThumbFileUrls } from '@/services/supabase/storage';
import { PlusOutlined } from '@ant-design/icons';
import { Card, Form, Space, Upload } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  onLogoChange: (data: any) => void;
  lightLogoProps: string;
  darkLogoProps: string;
};

const TeamForm: FC<Props> = ({ onLogoChange, lightLogoProps, darkLogoProps }) => {
  const [lightLogo, setLightLogo] = useState<FileType[]>([]);
  const [lightLogoPreviewUrl, setLightLogoPreviewUrl] = useState('');

  const [darkLogo, setDarkLogo] = useState<FileType[]>([]);
  const [darkLogoPreviewUrl, setDarkLogoPreviewUrl] = useState('');

  useEffect(() => {
    getThumbFileUrls([{ '@uri': `${lightLogoProps}` }]).then((res) => {
      if (res[0]?.status === 'done') {
        setLightLogoPreviewUrl(res[0]?.thumbUrl);
      }
    });

    getThumbFileUrls([{ '@uri': `${darkLogoProps}` }]).then((res) => {
      if (res[0]?.status === 'done') {
        setDarkLogoPreviewUrl(res[0]?.thumbUrl);
      }
    });
  }, [lightLogoProps, darkLogoProps]);

  useEffect(() => {
    onLogoChange({ lightLogo: lightLogo, darkLogo: darkLogo });
  }, [lightLogo, darkLogo]);

  const removeLogo = async (type: 'lightLogo' | 'darkLogo') => {
    if (type === 'lightLogo') {
      setLightLogo([]);
      setLightLogoPreviewUrl('');
    } else {
      setDarkLogo([]);
      setDarkLogoPreviewUrl('');
    }
  };

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      <Card
        size='small'
        title={<FormattedMessage id='component.allTeams.form.title' defaultMessage='Team Name' />}
      >
        <LangTextItemForm
          name='title'
          label={<FormattedMessage id='component.allTeams.form.title' defaultMessage='Team Name' />}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='component.allTeams.form.title.required'
                  defaultMessage='Please input team name!'
                />
              ),
            },
          ]}
        />
      </Card>

      <Card
        size='small'
        title={
          <FormattedMessage
            id='component.allTeams.form.description'
            defaultMessage='Team Description'
          />
        }
      >
        <LangTextItemForm
          name='description'
          label={
            <FormattedMessage
              id='component.allTeams.form.description'
              defaultMessage='Team Description'
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='component.allTeams.form.description.required'
                  defaultMessage='Please input team description!'
                />
              ),
            },
          ]}
        />
      </Card>

      {/* <Card
        size="small"
        title={
          <FormattedMessage id="component.allTeams.form.public" defaultMessage="Public Display" />
        }
      >
        <Form.Item
          name="rank"
          valuePropName="checked"
          getValueProps={(value) => ({
            checked: value !== -1,
          })}
          normalize={(value) => {
            return value ? 0 : -1;
          }}
          label={
            <FormattedMessage
              id="component.allTeams.form.public"
              defaultMessage="Public Display"
            />
          }
        >
          <Switch />
        </Form.Item>
      </Card> */}

      <Card
        size='small'
        title={<FormattedMessage id='component.allTeams.logo.title' defaultMessage='Team Logo' />}
      >
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          <Form.Item
            label={
              <FormattedMessage
                id='component.allTeams.form.lightLogo'
                defaultMessage='Light Logo'
              />
            }
            labelCol={{ span: 4 }}
            name='lightLogo'
          >
            <div>
              <Upload
                beforeUpload={(file) => {
                  getBase64(file as FileType).then((url) => {
                    setLightLogoPreviewUrl(url);
                    setLightLogo([file]);
                  });

                  return false;
                }}
                onRemove={() => removeLogo('lightLogo')}
                maxCount={1}
                listType='picture-card'
                fileList={
                  lightLogoPreviewUrl && lightLogoPreviewUrl.length > 0
                    ? [
                        {
                          uid: '-1',
                          name: 'logo',
                          status: 'done',
                          url: lightLogoPreviewUrl,
                        },
                      ]
                    : []
                }
              >
                {!lightLogoPreviewUrl && <PlusOutlined />}
              </Upload>
            </div>
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage id='component.allTeams.form.darkLogo' defaultMessage='Dark Logo' />
            }
            labelCol={{ span: 4 }}
            name='darkLogo'
          >
            <div
              style={
                darkLogoPreviewUrl
                  ? { background: '#141414', display: 'inline-block', borderRadius: '8px' }
                  : {}
              }
            >
              <Upload
                beforeUpload={(file) => {
                  getBase64(file as FileType).then((url) => {
                    setDarkLogoPreviewUrl(url);
                    setDarkLogo([file]);
                  });
                  return false;
                }}
                onRemove={() => removeLogo('darkLogo')}
                maxCount={1}
                listType='picture-card'
                fileList={
                  darkLogoPreviewUrl && darkLogoPreviewUrl.length > 0
                    ? [
                        {
                          uid: '-1',
                          name: 'logo',
                          status: 'done',
                          url: darkLogoPreviewUrl,
                        },
                      ]
                    : []
                }
              >
                {!darkLogoPreviewUrl && <PlusOutlined />}
              </Upload>
            </div>
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );
};

export default TeamForm;
