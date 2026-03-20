import AlignedNumber from '@/components/AlignedNumber';
import type { LCIAResultTable } from '@/services/lciaMethods/data';
import { Card, Col, Descriptions, Progress, Row, Space, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC } from 'react';
import { FormattedMessage } from 'umi';
import {
  normalizeNumber,
  resolveLangText,
  toProgressPercent,
  toProgressStatus,
  VALUE_EPSILON,
} from './lcaAnalysisShared';

export const DEFAULT_LCA_PROFILE_LIMIT = 8;

export type LcaProfileItem = {
  key: string;
  title: string;
  unit: string;
  value: number;
  absoluteValue: number;
  normalizedValue: number;
  direction: 'positive' | 'negative' | 'neutral';
};

export type LcaProfileModel = {
  items: LcaProfileItem[];
  topItems: LcaProfileItem[];
  totalCount: number;
  nonZeroCount: number;
  topAbsoluteItem?: LcaProfileItem;
  topPositiveItem?: LcaProfileItem;
  topNegativeItem?: LcaProfileItem;
};

type Props = {
  rows: LCIAResultTable[];
  lang: string;
  loading?: boolean;
  limit?: number;
};

function toDirection(value: number): LcaProfileItem['direction'] {
  if (value > VALUE_EPSILON) {
    return 'positive';
  }
  if (value < -VALUE_EPSILON) {
    return 'negative';
  }
  return 'neutral';
}

export function buildLcaProfileModel(
  rows: LCIAResultTable[],
  lang: string,
  limit = DEFAULT_LCA_PROFILE_LIMIT,
): LcaProfileModel {
  const baseItems = rows
    .map((row) => {
      const key = String(row.referenceToLCIAMethodDataSet?.['@refObjectId'] ?? row.key ?? '');
      const title =
        resolveLangText(row.referenceToLCIAMethodDataSet?.['common:shortDescription'], lang) ||
        key ||
        '-';
      const unit = resolveLangText(row.referenceQuantityDesc, lang) || '-';
      const value = normalizeNumber(row.meanAmount);
      const absoluteValue = Math.abs(value);

      return {
        key: key || title,
        title,
        unit,
        value,
        absoluteValue,
        normalizedValue: 0,
        direction: toDirection(value),
      } satisfies LcaProfileItem;
    })
    .sort((left, right) => {
      if (right.absoluteValue !== left.absoluteValue) {
        return right.absoluteValue - left.absoluteValue;
      }
      return left.title.localeCompare(right.title);
    });

  const maxAbsoluteValue = baseItems[0]?.absoluteValue ?? 0;
  const items = baseItems.map((item) => ({
    ...item,
    normalizedValue: maxAbsoluteValue > VALUE_EPSILON ? item.absoluteValue / maxAbsoluteValue : 0,
  }));

  const nonZeroItems = items.filter((item) => item.absoluteValue > VALUE_EPSILON);

  return {
    items,
    topItems: nonZeroItems.slice(0, Math.max(1, limit)),
    totalCount: items.length,
    nonZeroCount: nonZeroItems.length,
    topAbsoluteItem: items[0],
    topPositiveItem: items.find((item) => item.direction === 'positive'),
    topNegativeItem: items.find((item) => item.direction === 'negative'),
  };
}

function renderProfileValue(item?: LcaProfileItem) {
  if (!item) {
    return '-';
  }

  return (
    <>
      {item.title}
      <br />
      <AlignedNumber value={item.value} />{' '}
      <Typography.Text type='secondary'>{item.unit}</Typography.Text>
    </>
  );
}

const LcaProfileSummary: FC<Props> = ({ rows, lang, loading = false, limit }) => {
  if (loading && rows.length === 0) {
    return null;
  }

  const model = buildLcaProfileModel(rows, lang, limit);

  const profileColumns: ColumnsType<LcaProfileItem> = [
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.field.impact'
          defaultMessage='Impact category'
        />
      ),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.value'
          defaultMessage='Impact value'
        />
      ),
      key: 'value',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.value} />{' '}
          <Typography.Text type='secondary'>{item.unit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.relativeMagnitude'
          defaultMessage='Relative magnitude'
        />
      ),
      key: 'normalizedValue',
      render: (_, item) => (
        <Progress
          percent={toProgressPercent(item.normalizedValue)}
          showInfo={false}
          status={toProgressStatus(item.direction)}
        />
      ),
    },
  ];

  return (
    <Card size='small'>
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>
            <FormattedMessage
              id='pages.process.view.lciaresults.profile.title'
              defaultMessage='LCIA Profile'
            />
          </Typography.Text>
          <Typography.Paragraph type='secondary'>
            <FormattedMessage
              id='pages.process.view.lciaresults.profile.subtitle'
              defaultMessage='Bars are normalized by the largest absolute impact value. Exact raw values remain in the table below.'
            />
          </Typography.Paragraph>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Statistic
              title={
                <FormattedMessage
                  id='pages.process.view.lciaresults.profile.categoryCount'
                  defaultMessage='Impact categories'
                />
              }
              value={model.totalCount}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Statistic
              title={
                <FormattedMessage
                  id='pages.process.view.lciaresults.profile.nonZeroCount'
                  defaultMessage='Non-zero categories'
                />
              }
              value={model.nonZeroCount}
            />
          </Col>
        </Row>

        <Descriptions bordered size='small' column={1}>
          <Descriptions.Item
            label={
              <FormattedMessage
                id='pages.process.view.lciaresults.profile.topPositive'
                defaultMessage='Largest positive category'
              />
            }
          >
            {renderProfileValue(model.topPositiveItem ?? model.topAbsoluteItem)}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <FormattedMessage
                id='pages.process.view.lciaresults.profile.topNegative'
                defaultMessage='Largest negative category'
              />
            }
          >
            {renderProfileValue(model.topNegativeItem)}
          </Descriptions.Item>
        </Descriptions>

        {model.topItems.length > 0 ? (
          <>
            <Typography.Text strong>
              <FormattedMessage
                id='pages.process.view.lciaresults.profile.topList'
                defaultMessage='Top categories by normalized magnitude'
              />
            </Typography.Text>
            <Table<LcaProfileItem>
              rowKey='key'
              size='small'
              pagination={false}
              columns={profileColumns}
              dataSource={model.topItems}
            />
          </>
        ) : (
          <Typography.Text type='secondary'>
            <FormattedMessage
              id='pages.process.view.lciaresults.profile.empty'
              defaultMessage='No LCIA results available for profile analysis.'
            />
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
};

export default LcaProfileSummary;
