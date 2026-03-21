import HeaderActionIcon from '@/components/HeaderActionIcon';
import { TidasPackageScope } from '@/services/general/api';
import { getSystemUserRoleApi } from '@/services/roles/api';
import { submitTidasPackageExportTask } from '@/services/tidasPackage/taskCenter';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { message, Modal, Radio, Spin } from 'antd';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

const ExportTidasPackage: FC = () => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<TidasPackageScope>('current_user');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    let active = true;

    getSystemUserRoleApi().then((userRole) => {
      if (!active) {
        return;
      }
      setIsSystemAdmin(userRole?.role === 'admin' || userRole?.role === 'owner');
    });

    return () => {
      active = false;
    };
  }, []);

  const scopeOptions = useMemo(
    () =>
      isSystemAdmin
        ? ([
            'current_user',
            'open_data',
            'current_user_and_open_data',
          ] satisfies TidasPackageScope[])
        : (['current_user'] satisfies TidasPackageScope[]),
    [isSystemAdmin],
  );

  const handleDownload = async () => {
    try {
      setLoading(true);
      submitTidasPackageExportTask({ scope });

      message.success(
        intl.formatMessage({
          id: 'component.tidasPackage.export.submitted',
          defaultMessage: 'Export task submitted. Check the task center for progress and download.',
        }),
      );
      setOpen(false);
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({
            id: 'component.tidasPackage.export.error',
            defaultMessage: 'Failed to export TIDAS package',
          }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HeaderActionIcon
        title={
          <FormattedMessage
            id='component.tidasPackage.export.tooltip'
            defaultMessage='Export TIDAS ZIP Package'
          />
        }
        icon={<CloudDownloadOutlined />}
        onClick={() => setOpen(true)}
      />
      <Modal
        title={intl.formatMessage({
          id: 'component.tidasPackage.export.title',
          defaultMessage: 'Export TIDAS ZIP Package',
        })}
        open={open}
        onOk={handleDownload}
        onCancel={() => {
          if (!loading) {
            setOpen(false);
          }
        }}
        okText={intl.formatMessage({
          id: 'component.tidasPackage.export.confirm',
          defaultMessage: 'Export',
        })}
        cancelText={intl.formatMessage({
          id: 'component.tidasPackage.cancel',
          defaultMessage: 'Cancel',
        })}
      >
        <Spin spinning={loading}>
          <Radio.Group
            value={scope}
            onChange={(event) => setScope(event.target.value as TidasPackageScope)}
          >
            {scopeOptions.map((option) => (
              <Radio key={option} value={option}>
                {option === 'current_user' ? (
                  <FormattedMessage
                    id='component.tidasPackage.scope.currentUser'
                    defaultMessage='Current user data'
                  />
                ) : option === 'open_data' ? (
                  <FormattedMessage
                    id='component.tidasPackage.scope.openData'
                    defaultMessage='Open data'
                  />
                ) : (
                  <FormattedMessage
                    id='component.tidasPackage.scope.currentUserAndOpenData'
                    defaultMessage='Current user data + open data'
                  />
                )}
              </Radio>
            ))}
          </Radio.Group>
        </Spin>
      </Modal>
    </>
  );
};

export default ExportTidasPackage;
