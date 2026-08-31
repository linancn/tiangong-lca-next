import type { SystemStatus } from '@/services/general/systemStatus';
import { reloadBrowserPage } from '@/utils/browserNavigation';
import { ReloadOutlined, ToolOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Tag, Typography } from 'antd';
import styles from './index.less';

const { Paragraph, Title } = Typography;

export interface SystemMaintenanceProps {
  status: SystemStatus;
}

export default function SystemMaintenance({ status }: SystemMaintenanceProps) {
  const { formatDate } = useIntl();
  const isVerifying = status.phase === 'verifying';
  const estimatedEnd = status.estimatedEndAt
    ? formatDate(status.estimatedEndAt, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : undefined;

  return (
    <main className={styles.page} data-testid='system-maintenance'>
      <section className={styles.card} aria-labelledby='system-maintenance-title'>
        <div className={styles.icon} aria-hidden='true'>
          <ToolOutlined />
        </div>
        <Tag color={isVerifying ? 'processing' : 'warning'} className={styles.statusTag}>
          <FormattedMessage
            id={
              isVerifying
                ? 'component.systemMaintenance.verifyingTag'
                : 'component.systemMaintenance.maintenanceTag'
            }
          />
        </Tag>
        <Title id='system-maintenance-title' level={1} className={styles.title}>
          <FormattedMessage id='component.systemMaintenance.title' />
        </Title>
        <Paragraph className={styles.description}>
          <FormattedMessage
            id={
              isVerifying
                ? 'component.systemMaintenance.verifyingDescription'
                : 'component.systemMaintenance.description'
            }
          />
        </Paragraph>

        {(status.targetVersion || estimatedEnd) && (
          <dl className={styles.details}>
            {status.targetVersion && (
              <div>
                <dt>
                  <FormattedMessage id='component.systemMaintenance.targetVersion' />
                </dt>
                <dd>{status.targetVersion}</dd>
              </div>
            )}
            {estimatedEnd && (
              <div>
                <dt>
                  <FormattedMessage id='component.systemMaintenance.estimatedEnd' />
                </dt>
                <dd>{estimatedEnd}</dd>
              </div>
            )}
          </dl>
        )}

        <Button
          type='primary'
          size='large'
          icon={<ReloadOutlined />}
          onClick={() => reloadBrowserPage(window.location)}
        >
          <FormattedMessage id='component.systemMaintenance.refresh' />
        </Button>
      </section>
    </main>
  );
}
