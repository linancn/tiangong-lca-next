import ProcessView from '@/pages/Processes/Components/view';
import { getProcessDetailByIdAndVersion } from '@/services/processes/api';
import { genProcessName } from '@/services/processes/util';
import { CloseOutlined, ProductOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  submodels: Array<{
    id: string;
    version: string;
  }>;
  modelVersion: string;
  lang: string;
};

type ProcessTableItem = {
  key: string;
  id: string;
  version: string;
  name: string;
  modifiedAt: Date;
};

const ModelResult: FC<Props> = ({ submodels, modelVersion, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  if (submodels.length === 1) {
    const singleProcess = submodels[0];
    return (
      <ProcessView
        id={singleProcess.id}
        version={singleProcess.version}
        buttonType='toolResultIcon'
        lang={lang}
        disabled={false}
      />
    );
  }

  const columns: ProColumns<ProcessTableItem>[] = [
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      search: false,
      width: 400,
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      search: false,
      width: 120,
    },
    {
      title: <FormattedMessage id='pages.table.title.modifiedAt' defaultMessage='Modified at' />,
      dataIndex: 'modifiedAt',
      search: false,
      width: 180,
      valueType: 'dateTime',
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      width: 100,
      render: (_, record) => {
        return [
          <ProcessView
            key={0}
            id={record.id}
            version={record.version}
            buttonType='icon'
            lang={lang}
            disabled={false}
          />,
        ];
      },
    },
  ];

  return (
    <>
      <Tooltip
        title={<FormattedMessage id='pages.button.model.result' defaultMessage='Model result' />}
        placement='left'
      >
        <Button
          type='primary'
          icon={<ProductOutlined />}
          size='small'
          style={{ boxShadow: 'none' }}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>

      <Drawer
        getContainer={() => document.body}
        title={<FormattedMessage id='pages.button.model.result' defaultMessage='Model Results' />}
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <ProTable<ProcessTableItem>
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          request={async () => {
            const processData = submodels.map((submodel) => ({
              id: submodel.id,
              version: modelVersion,
            }));

            const result = await getProcessDetailByIdAndVersion(processData);

            if (result?.data && result.data.length > 0) {
              const data = result.data.map((item: any) => {
                const processInfo = item?.json?.processDataSet?.processInformation;
                return {
                  key: `${item.id}:${item.version}`,
                  id: item.id,
                  version: item.version,
                  name: genProcessName(processInfo?.dataSetInformation?.name ?? {}, lang) || '-',
                  modifiedAt: new Date(item.modified_at),
                };
              });

              return {
                data,
                success: true,
                total: data.length,
              };
            }

            return {
              data: [],
              success: true,
              total: 0,
            };
          }}
          columns={columns}
        />
      </Drawer>
    </>
  );
};

export default ModelResult;
