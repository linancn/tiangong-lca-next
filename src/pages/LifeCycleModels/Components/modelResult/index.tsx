import ProcessEdit from '@/pages/Processes/Components/edit';
import ProcessView from '@/pages/Processes/Components/view';
import {
  ContentLanguageAwareTableParams,
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
} from '@/services/general/data';
import { getProcessesByIdAndVersion } from '@/services/processes/api';
import { ProcessTable } from '@/services/processes/data';
import { CloseOutlined, ProductOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  submodels: Array<{
    id: string;
    version: string;
  }>;
  modelId: string;
  modelVersion: string;
  lang: string;
  actionType: 'view' | 'edit';
};

const ModelResult: FC<Props> = ({ submodels, modelId, modelVersion, lang, actionType }) => {
  const contentLanguageParams = getContentLanguageAwareTableParams(lang);
  const currentContentLanguageRef = useRef(contentLanguageParams.contentLanguage);
  const mainProductRequestEpochRef = useRef(0);
  const subProductRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(
    currentContentLanguageRef,
    contentLanguageParams.contentLanguage,
    [mainProductRequestEpochRef, subProductRequestEpochRef],
  );
  const [drawerVisible, setDrawerVisible] = useState(false);
  const subProcuctTableRef = useRef<ActionType>();
  const mainProcuctTableRef = useRef<ActionType>();

  const columns: ProColumns<ProcessTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
      width: 60,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: true,
      search: false,
      render: (_, row) => {
        return [
          <Tooltip key={0} placement='topLeft' title={row.generalComment}>
            {row.name}
          </Tooltip>,
        ];
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      search: false,
      width: 100,
    },
    {
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
      width: 120,
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      search: false,
      width: 100,
      render: (_, record) => {
        const result = [
          <ProcessView
            key={0}
            id={record.id}
            version={record.version ?? modelVersion}
            buttonType='icon'
            lang={lang}
            disabled={false}
          />,
        ];
        if (actionType === 'edit') {
          result.push(
            <ProcessEdit
              actionFrom='modelResult'
              key={1}
              id={record.id}
              version={record.version ?? modelVersion}
              buttonType='icon'
              lang={lang}
              disabled={false}
              actionRef={record.id === modelId ? mainProcuctTableRef : subProcuctTableRef}
              setViewDrawerVisible={() => {}}
            />,
          );
        }
        return result;
      },
    },
  ];

  return (
    <>
      <Tooltip
        title={<FormattedMessage id='pages.button.model.result' defaultMessage='Model Results' />}
        placement='left'
      >
        <Button
          type='primary'
          icon={<ProductOutlined />}
          size='small'
          style={{ boxShadow: 'none' }}
          onClick={() => {
            setDrawerVisible(true);
            mainProcuctTableRef.current?.reload();
            subProcuctTableRef.current?.reload();
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
        <ProTable<ProcessTable, ContentLanguageAwareTableParams>
          search={false}
          params={contentLanguageParams}
          pagination={false}
          headerTitle={<FormattedMessage id='pages.lifeCycleModel.modelResults.mainProduct' />}
          actionRef={mainProcuctTableRef}
          request={async (params) => {
            return guardLocaleMaterializedTableRequest(
              params.contentLanguage,
              () => currentContentLanguageRef.current,
              mainProductRequestEpochRef,
              () =>
                getProcessesByIdAndVersion(
                  [{ id: modelId, version: modelVersion }],
                  params.contentLanguage,
                ),
            );
          }}
          columns={columns}
        />
        <ProTable<ProcessTable, ContentLanguageAwareTableParams>
          search={false}
          params={contentLanguageParams}
          pagination={false}
          headerTitle={<FormattedMessage id='pages.lifeCycleModel.modelResults.subProduct' />}
          actionRef={subProcuctTableRef}
          request={async (params) => {
            const subProducts = submodels.filter((e) => e.id !== modelId);
            return guardLocaleMaterializedTableRequest(
              params.contentLanguage,
              () => currentContentLanguageRef.current,
              subProductRequestEpochRef,
              () =>
                getProcessesByIdAndVersion(
                  subProducts.map((e) => ({ id: e.id, version: modelVersion })),
                  params.contentLanguage,
                ),
            );
          }}
          columns={columns}
        />
      </Drawer>
    </>
  );
};

export default ModelResult;
