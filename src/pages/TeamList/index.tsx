import { getLang, getLangText } from '@/services/general/util';
import { Card, Col, Row } from 'antd';
import React from 'react';
import { Teams } from './info';

import { PageContainer } from '@ant-design/pro-components';
import Meta from 'antd/es/card/Meta';
import { FormattedMessage, useIntl } from 'umi';

const TeamList: React.FC = () => {
  const { locale } = useIntl();
  const lang = getLang(locale);

  return (
    <PageContainer title={<FormattedMessage id="menu.teamlist" defaultMessage="Data ecology" />}>
      <Row gutter={16}>
        {Teams.map((team, index) => {
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
                      src={`/images/dataLogo/${team.logo}`}
                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                  </div>
                }
                onClick={() => {
                  window.open(`/tedata/models?id=${team.id}`);
                }}
              >
                <Meta
                  title={getLangText(team.title, lang)}
                  description={getLangText(team.description, lang)}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </PageContainer>
  );
};

export default TeamList;
