import { REQUIRED_CONTENT_LANGUAGES } from '@/services/general/contentLanguageRegistry';
import { FileType, isImage, removeLogoApi, uploadLogoApi } from '@/services/supabase/storage';
import { editTeamMessage, getTeamMessageApi } from '@/services/teams/api';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import TeamForm from './form';

const getDrawerContainer = () => document.body;

const emptyRequiredText = () =>
  REQUIRED_CONTENT_LANGUAGES.map((languageCode) => ({
    '#text': '',
    '@xml:lang': languageCode,
  }));

export const hasRequiredTeamText = (value: unknown) =>
  Array.isArray(value) &&
  REQUIRED_CONTENT_LANGUAGES.every((requiredLanguage) =>
    value.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        String((item as Record<string, unknown>)['@xml:lang'] ?? '')
          .trim()
          .toLowerCase() === requiredLanguage &&
        typeof (item as Record<string, unknown>)['#text'] === 'string' &&
        String((item as Record<string, unknown>)['#text']).trim().length > 0,
    ),
  );

type Props = {
  id: string;
  buttonType: 'icon' | 'text';
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
          const suffix: string = file.name.split('.').pop()!;
          const { data } = await uploadLogoApi(file.name, file, suffix);
          const path = data?.path;
          if (type === 'lightLogo') {
            setBeforeLightLogoPath(path ?? '');
            return path;
          } else {
            setBeforeDarkLogoPath(path ?? '');
            return path;
          }
        } catch (error) {
          console.error('upload error', error);
          return;
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
      const formValues = {
        title: teamData.json?.title || emptyRequiredText(),
        description: teamData.json?.description || emptyRequiredText(),
        lightLogo: teamData.json?.lightLogo,
        darkLogo: teamData.json?.darkLogo,
      };
      setInitData({ ...teamData, ...formValues });
      setLightLogo(teamData.json?.lightLogo);
      setDarkLogo(teamData.json?.darkLogo);

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
          <FormattedMessage id='component.allTeams.table.edit' defaultMessage='Edit' />
        </Button>
      )}

      <Drawer
        getContainer={getDrawerContainer}
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
              if (!hasRequiredTeamText(formValues.title)) {
                message.error(
                  intl.formatMessage({
                    id: 'component.allTeams.form.title.required',
                    defaultMessage: 'Please input team name!',
                  }),
                );
                setSpinning(false);
                return false;
              }
              if (!hasRequiredTeamText(formValues.description)) {
                message.error(
                  intl.formatMessage({
                    id: 'component.allTeams.form.description.required',
                    defaultMessage: 'Please input team description!',
                  }),
                );
                setSpinning(false);
                return false;
              }
              if (!lightLogo?.length) {
                handleRemoveLogo('lightLogo');
                formValues.lightLogo = null;
              } else {
                const lightLogoPath =
                  typeof lightLogo === 'string'
                    ? lightLogo
                    : await uploadLogo(lightLogo, 'lightLogo');
                if (!lightLogoPath) {
                  message.error(
                    intl.formatMessage({
                      id: 'teams.logo.uploadError',
                      defaultMessage: 'Failed to upload team logo.',
                    }),
                  );
                  setSpinning(false);
                  return false;
                }
                formValues.lightLogo =
                  typeof lightLogo === 'string' ? lightLogo : `../sys-files/${lightLogoPath}`;
              }
              if (!darkLogo?.length) {
                handleRemoveLogo('darkLogo');
                formValues.darkLogo = null;
              } else {
                const darkLogoPath =
                  typeof darkLogo === 'string' ? darkLogo : await uploadLogo(darkLogo, 'darkLogo');
                if (!darkLogoPath) {
                  message.error(
                    intl.formatMessage({
                      id: 'teams.logo.uploadError',
                      defaultMessage: 'Failed to upload team logo.',
                    }),
                  );
                  setSpinning(false);
                  return false;
                }
                formValues.darkLogo =
                  typeof darkLogo === 'string' ? darkLogo : `../sys-files/${darkLogoPath}`;
              }
              const updateResult = await editTeamMessage(
                id,
                formValues,
                undefined,
                initData?.is_public,
              );
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
        </Spin>
      </Drawer>
    </>
  );
};

export default TeamEdit;
