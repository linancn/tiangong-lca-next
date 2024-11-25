import { getLang, getLangText } from '@/services/general/util';
import { Card, Col, Row } from 'antd';
import React from 'react';
import { Partners } from './info';

import { PageContainer } from '@ant-design/pro-components';
import Meta from 'antd/es/card/Meta';
import { FormattedMessage, useIntl } from 'umi';

const AllianceList: React.FC = () => {
  const { locale } = useIntl();
  const lang = getLang(locale);

  return (
    <PageContainer title={<FormattedMessage id="menu.aldata" defaultMessage="Alliance data" />}>
      <Row gutter={16}>
        {Partners.map((partner, index) => {
          return (
            <Col span={8} key={index}>
              <Card
                hoverable
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  paddingTop: '24px',
                }}
                cover={
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '200px',
                    }}
                  >
                    <img
                      src={`/images/allianceLogo/${partner.logo}`}
                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                  </div>
                }
                onClick={() => {
                  window.open(`/aldata?id=${partner.id}`);
                }}
              >
                <Meta
                  title={getLangText(partner.title, lang)}
                  description={getLangText(partner.description, lang)}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </PageContainer>
  );
};

export default AllianceList;
