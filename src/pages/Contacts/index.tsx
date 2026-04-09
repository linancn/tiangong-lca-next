import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import {
  extractContributeDataError,
  getContributeDataErrorMessage,
} from '@/components/ContributeData/utils';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import TableFilter from '@/components/TableFilter';
import {
  contact_hybrid_search,
  getContactTableAll,
  getContactTablePgroongaSearch,
} from '@/services/contacts/api';
import { ContactImportData, ContactTable } from '@/services/contacts/data';
import { attachStateCodesToRows, contributeSource } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import { getTeamById } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import {
  ActionType,
  PageContainer,
  ProColumns,
  ProTable,
  TableDropdown,
} from '@ant-design/pro-components';
import { Card, Checkbox, Col, Input, Row, Space, Tooltip, message, theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import ContactCreate from './Components/create';
import ContactDelete from './Components/delete';
import ContactEdit from './Components/edit';
import ContactView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<ContactImportData | null>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [editVersion, setEditVersion] = useState<string>('');
  const { token } = theme.useToken();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const id = searchParams.get('id');
  const version = searchParams.get('version');
  const required = searchParams.get('required') === '1';

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const stateCodeRef = useRef<string | number>('all');
  const keyWordRef = useRef<string>('');
  const attachReviewState = async (result: {
    data?: ContactTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result?.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('contacts', result.data),
    };
  };

  useEffect(() => {
    if (dataSource === 'my' && id && version) {
      setEditId(id);
      setEditVersion(version);
      setEditDrawerVisible(true);
    }
  }, [dataSource, id, version]);

  const contactColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'shortName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.classification' defaultMessage='Classification' />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <div>
            {row.classification && row.classification !== 'undefined' ? row.classification : '-'}
          </div>
        );
      },
    },
    {
      title: <FormattedMessage id='pages.contact.email' defaultMessage='E-mail' />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <Space size={'small'}>
            {row.version}
            <AllVersionsList
              lang={lang}
              searchTableName='contacts'
              columns={getAllVersionsColumns(contactColumns, 4)}
              searchColume={`
                 id,
                json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
                json->contactDataSet->contactInformation->dataSetInformation->"common:name",
                json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->contactDataSet->contactInformation->dataSetInformation->>email,
                version,
                modified_at,
                team_id
              `}
              id={row.id}
              addVersionComponent={({ newVersion }) => (
                <ContactCreate
                  newVersion={newVersion}
                  actionType='createVersion'
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  actionRef={actionRef}
                />
              )}
            ></AllVersionsList>
          </Space>
        );
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        const actionDisabled = isDataUnderReview(row.stateCode);
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <ContactView
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType='icon'
                actionRef={actionRef}
              />
              <ContactEdit
                disabled={actionDisabled}
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
                showSyncOpenDataButton={true}
              />
              <ContactDelete
                disabled={actionDisabled}
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <TableDropdown
                style={{
                  color: token.colorPrimary,
                }}
                menus={[
                  {
                    key: 'export',
                    name: <ExportData tableName='contacts' id={row.id} version={row.version} />,
                  },
                  {
                    key: 'copy',
                    name: (
                      <ContactCreate
                        actionType='copy'
                        id={row.id}
                        version={row.version}
                        lang={lang}
                        actionRef={actionRef}
                      />
                    ),
                  },
                  {
                    key: 'contribute',
                    name: (
                      <ContributeData
                        onOk={async () => {
                          const contributeResult = await contributeSource(
                            'contacts',
                            row.id,
                            row.version,
                          );
                          const contributeError = extractContributeDataError(contributeResult);

                          if (contributeError) {
                            message.error(getContributeDataErrorMessage(intl, contributeError));
                            console.log(contributeError);
                          } else {
                            message.success(
                              intl.formatMessage({
                                id: 'component.contributeData.success',
                                defaultMessage: 'Contribute successfully',
                              }),
                            );
                            actionRef.current?.reload();
                          }
                        }}
                        disabled={!!row.teamId}
                      />
                    ),
                  },
                ]}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <ContactView
              id={row.id}
              version={row.version}
              lang={lang}
              buttonType='icon'
              actionRef={actionRef}
            />
            <ContactCreate
              actionType='copy'
              id={row.id}
              version={row.version}
              lang={lang}
              actionRef={actionRef}
            />
            <ExportData tableName='contacts' id={row.id} version={row.version} />
          </Space>,
        ];
      },
    },
  ];

  useEffect(() => {
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) setTeam(res.data[0]);
    });
  }, []);

  const onSearch: SearchProps['onSearch'] = (value) => {
    keyWordRef.current = value;
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  const handleImportData = (jsonData: ContactImportData) => {
    setImportData(jsonData);
  };

  return (
    <PageContainer
      header={{
        title: team?.json?.title ? getLangText(team?.json?.title, lang) : false,
        breadcrumb: {},
      }}
    >
      <Card>
        <Row align={'middle'}>
          <Col flex='auto' style={{ marginRight: '10px' }}>
            <Search
              size={'large'}
              placeholder={
                openAI
                  ? intl.formatMessage({ id: 'pages.search.placeholder' })
                  : intl.formatMessage({ id: 'pages.search.keyWord' })
              }
              onSearch={onSearch}
              enterButton
            />
          </Col>
          <Col style={{ display: 'none' }} flex='100px'>
            <Checkbox
              onChange={(e) => {
                setOpenAI(e.target.checked);
              }}
            >
              <FormattedMessage id='pages.search.openAI' defaultMessage='AI Search' />
            </Checkbox>
          </Col>
        </Row>
      </Card>
      <ProTable<ContactTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id='menu.tgdata.contacts' defaultMessage='Contacts' />
          </>
        }
        actionRef={actionRef}
        search={false}
        options={{ fullScreen: true }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [
              <TableFilter
                key={2}
                onChange={(val) => {
                  stateCodeRef.current = val;
                  actionRef.current?.reload();
                }}
              />,
              <ContactCreate
                importData={importData}
                onClose={() => setImportData(null)}
                lang={lang}
                key={0}
                actionRef={actionRef}
              />,
              <ImportData onJsonData={handleImportData} key={1} />,
            ];
          }
          return [];
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          const currentKeyWord = keyWordRef.current;
          const currentStateCode = stateCodeRef.current;
          if (currentKeyWord.length > 0) {
            if (openAI) {
              return attachReviewState(
                await contact_hybrid_search(
                  params,
                  lang,
                  dataSource,
                  currentKeyWord,
                  {},
                  currentStateCode,
                ),
              );
            }
            return attachReviewState(
              await getContactTablePgroongaSearch(
                params,
                lang,
                dataSource,
                currentKeyWord,
                {},
                currentStateCode,
              ),
            );
          }
          return attachReviewState(
            await getContactTableAll(params, sort, lang, dataSource, tid ?? '', currentStateCode),
          );
        }}
        columns={contactColumns}
      />

      {editDrawerVisible && editId && editVersion && (
        <ContactEdit
          id={editId}
          version={editVersion}
          lang={lang}
          buttonType={'icon'}
          actionRef={actionRef}
          setViewDrawerVisible={setEditDrawerVisible}
          autoOpen={true}
          autoCheckRequired={required}
        />
      )}
    </PageContainer>
  );
};

export default TableList;
