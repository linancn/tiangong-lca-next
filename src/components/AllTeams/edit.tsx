import { FileType, isImage, removeLogoApi, uploadLogoApi } from '@/services/supabase/storage';
import { editTeamMessage, getTeamMessageApi } from '@/services/teams/api';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Spin, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import TeamForm from './form';

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible?: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
};

const TeamEdit: FC<Props> = ({
  id,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  disabled = false,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});
  const [fromData, setFromData] = useState<any>(undefined);
  const [lightLogo, setLightLogo] = useState<any>(undefined);
  const [darkLogo, setDarkLogo] = useState<any>(undefined);

  const [beforeLightLogoPath, setBeforeLightLogoPath] = useState<string>('');
  const [beforeDarkLogoPath, setBeforeDarkLogoPath] = useState<string>('');
  const intl = useIntl();

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const handletLogoChange = (data: any) => {
    if (fromData) {
      setLightLogo(data.lightLogo);
      setDarkLogo(data.darkLogo);
    }
  };
  const handleRemoveLogo = async (type: 'lightLogo' | 'darkLogo') => {
    if (type === 'lightLogo') {
      setLightLogo([]);
      await removeLogoApi([beforeLightLogoPath]);
    } else {
      setDarkLogo([]);
      await removeLogoApi([beforeDarkLogoPath]);
    }
  };
  const uploadLogo = async (fileList: FileType[], type: 'lightLogo' | 'darkLogo') => {
    if (fileList.length > 0) {
      const file = fileList[0];
      if (file) {
        if (!isImage(file)) {
          message.error(
            intl.formatMessage({
              id: 'teams.logo.typeError',
              defaultMessage: 'Only image files can be uploaded!',
            }),
          );
          if (type === 'lightLogo') {
            setLightLogo([]);
          } else {
            setDarkLogo([]);
          }
          return;
        }

        try {
          const suffix: string = file.name.split('.').pop() || '';
          const { data } = await uploadLogoApi(file.name, file, suffix);
          if (type === 'lightLogo') {
            setBeforeLightLogoPath(data?.path);
            return data.path;
          } else {
            setBeforeDarkLogoPath(data?.path);
            return data.path;
          }
        } catch (error) {
          console.log('upload error', error);
        }
      }
    }
  };
  const onReset = async () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    const result = await getTeamMessageApi(id);
    if (result.data && result.data.length > 0) {
      const teamData = result.data[0];
      setInitData(teamData);
      const formValues = {
        title: teamData.json?.title || [
          { '#text': '', '@xml:lang': 'zh' },
          { '#text': '', '@xml:lang': 'en' },
        ],
        description: teamData.json?.description || [
          { '#text': '', '@xml:lang': 'zh' },
          { '#text': '', '@xml:lang': 'en' },
        ],
      };

      formRefEdit.current?.setFieldsValue({ ...formValues });
      setFromData({
        ...formValues,
        json: {
          ...teamData.json,
        },
      });
    }
    setSpinning(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
          <Button
            disabled={disabled}
            shape='circle'
            icon={<FormOutlined />}
            size='small'
            onClick={onEdit}
          />
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage
            id={buttonType.trim().length > 0 ? buttonType : 'component.allTeams.table.edit'}
            defaultMessage='Edit'
          />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id='component.allTeams.drawer.title.edit' defaultMessage='Edit Team' />
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
            <Button onClick={() => formRefEdit.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefEdit}
            submitter={{
              render: () => {
                return [];
              },
            }}
            initialValues={initData}
            onFinish={async () => {
              setSpinning(true);
              const formValues = formRefEdit.current?.getFieldsValue() ?? {};
              if (!lightLogo.length) {
                handleRemoveLogo('lightLogo');
                formValues.lightLogo = null;
              } else {
                const lightLogoPath = await uploadLogo(lightLogo, 'lightLogo');
                formValues.lightLogo = lightLogoPath ? `../sys-files/${lightLogoPath}` : null;
              }
              if (!darkLogo.length) {
                handleRemoveLogo('darkLogo');
                formValues.darkLogo = null;
              } else {
                const darkLogoPath = await uploadLogo(darkLogo, 'darkLogo');
                formValues.darkLogo = darkLogoPath ? `../sys-files/${darkLogoPath}` : null;
              }
              const updateResult = await editTeamMessage(id, formValues);
              if (updateResult?.data) {
                message.success(
                  intl.formatMessage({
                    id: 'component.allTeams.form.updateSuccess',
                    defaultMessage: 'Team updated successfully!',
                  }),
                );
                actionRef?.current?.reload();
                setDrawerVisible(false);
                if (setViewDrawerVisible) setViewDrawerVisible(false);
              } else {
                message.error(
                  intl.formatMessage({
                    id: 'component.allTeams.form.updateError',
                    defaultMessage: 'Failed to update team information.',
                  }),
                );
              }
              setSpinning(false);
              return true;
            }}
          >
            <TeamForm
              lightLogoProps={initData?.json?.lightLogo}
              darkLogoProps={initData?.json?.darkLogo}
              onLogoChange={handletLogoChange}
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
        </Spin>
      </Drawer>
    </>
  );
};

export default TeamEdit;
