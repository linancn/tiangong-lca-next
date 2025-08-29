import { Button, message, Modal, Space, Spin, theme, Typography } from 'antd';
import * as jsondiffpatch from 'jsondiffpatch';
import React, { useEffect, useMemo, useState } from 'react';
import './index.less';
// import { createContact,suggestData } from '@tiangong-lca/tidas-sdk';
import { getAISuggestion } from '@/services/general/api';
const { Text, Title } = Typography;

interface AISuggestionProps {
  originJson?: any;
  AIJson?: any;
  onValidate?: () => Promise<any>;
  disabled?: boolean;
  onAcceptChange?: (path: string, value: any) => void;
  onRejectChange?: (path: string) => void;
  onLatestJsonChange?: (latestJson: any) => void;
}

interface DiffItem {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  displayPath: string;
}

const AISuggestion: React.FC<AISuggestionProps> = ({
  originJson,
  AIJson,
  disabled = false,
  onAcceptChange,
  onRejectChange,
  onLatestJsonChange,
}) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [acceptedChanges, setAcceptedChanges] = useState<Set<string>>(new Set());
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set());
  // const [AIJson, setAIJson] = useState<any>(null);
  const { token } = theme.useToken();

  const getSuggestData = async () => {
    console.log('获取suggest数据');
    setLoading(true);
    const suggestResult = await getAISuggestion(originJson, 'conact', {
      outputDiffSummary: true,
      outputDiffHTML: true,
      maxRetries: 1,
      modelConfig: {
        model: process.env.OPENAI_CHAT_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
    console.log('suggestResult', suggestResult);
    setLoading(false);
  };

  useEffect(() => {
    if (modalVisible) {
      getSuggestData();
    }
  }, [modalVisible]);

  const diffpatcher = useMemo(() => {
    return jsondiffpatch.create({
      arrays: {
        detectMove: true,
        includeValueOnMove: false,
      },
      cloneDiffValues: false,
    });
  }, []);

  const diffItems = useMemo(() => {
    if (!originJson || !AIJson) return [];

    const delta = diffpatcher.diff(originJson, AIJson);
    if (!delta) return [];

    const items: DiffItem[] = [];

    const parseDelta = (deltaObj: any, path: string = '') => {
      if (!deltaObj || typeof deltaObj !== 'object') return;

      Object.keys(deltaObj).forEach((key) => {
        // 跳过数组标记
        if (key === '_t') return;

        const currentPath = path ? `${path}.${key}` : key;
        const value = deltaObj[key];

        if (Array.isArray(value)) {
          if (value.length === 1) {
            // 新增: [newValue]
            items.push({
              path: currentPath,
              type: 'added',
              newValue: value[0],
              displayPath: currentPath,
            });
          } else if (value.length === 3 && value[1] === 0 && value[2] === 0) {
            // 删除: [oldValue, 0, 0]
            items.push({
              path: currentPath,
              type: 'removed',
              oldValue: value[0],
              displayPath: currentPath,
            });
          } else if (value.length === 2) {
            // 修改: [oldValue, newValue]
            items.push({
              path: currentPath,
              type: 'modified',
              oldValue: value[0],
              newValue: value[1],
              displayPath: currentPath,
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          parseDelta(value, currentPath);
        }
      });
    };

    parseDelta(delta);

    return items;
  }, [originJson, AIJson, diffpatcher]);

  // 计算JSON结果
  const latestJson = useMemo(() => {
    if (!originJson || !AIJson || diffItems.length === 0) return originJson;

    const result = JSON.parse(JSON.stringify(originJson));

    diffItems.forEach((item) => {
      const isAccepted = acceptedChanges.has(item.path);

      if (isAccepted) {
        const pathArray = item.path.split('.');
        let current = result;

        for (let i = 0; i < pathArray.length - 1; i++) {
          if (!current[pathArray[i]]) {
            current[pathArray[i]] = {};
          }
          current = current[pathArray[i]];
        }

        if (item.type === 'added' || item.type === 'modified') {
          current[pathArray[pathArray.length - 1]] = item.newValue;
        } else if (item.type === 'removed') {
          delete current[pathArray[pathArray.length - 1]];
        }
      }
    });

    return result;
  }, [originJson, AIJson, diffItems, acceptedChanges, rejectedChanges]);

  useEffect(() => {
    if (onLatestJsonChange && latestJson) {
      onLatestJsonChange(latestJson);
    }
  }, [latestJson, onLatestJsonChange]);

  const handleButtonClick = () => {
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setAcceptedChanges(new Set());
    setRejectedChanges(new Set());
  };

  const handleAcceptChange = (path: string, value: any) => {
    setAcceptedChanges((prev) => new Set(prev).add(path));
    setRejectedChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });

    if (onAcceptChange) {
      onAcceptChange(path, value);
    }

    message.success(`已接受更改: ${path}`);
  };

  const handleRejectChange = (path: string) => {
    setRejectedChanges((prev) => new Set(prev).add(path));
    setAcceptedChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });

    if (onRejectChange) {
      onRejectChange(path);
    }

    message.warning(`已拒绝更改: ${path}`);
  };

  const renderDiffContent = () => {
    if (!originJson || !AIJson) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={4}>JSON 差异对比</Title>
          <Text type='secondary'>请提供原始 JSON 和 AI JSON 数据进行对比</Text>
        </div>
      );
    }

    if (diffItems.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={4} style={{ color: token.colorSuccess }}>
            没有发现差异
          </Title>
          <Text type='secondary'>两个 JSON 对象完全相同</Text>
        </div>
      );
    }

    // 创建差异路径集合，用于高亮显示
    const diffPaths = new Set(diffItems.map((item) => item.path));
    const diffPathMap = new Map();
    diffItems.forEach((item) => {
      diffPathMap.set(item.path, item);
    });

    // 递归渲染 JSON 对象，并标记差异
    const renderJsonWithDiff = (obj: any, path: string = '', isLeft: boolean = true) => {
      if (obj === null || obj === undefined) {
        return <span style={{ color: '#999' }}>null</span>;
      }

      if (typeof obj === 'string') {
        return <span style={{ color: '#d63384' }}>&quot;{obj}&quot;</span>;
      }

      if (typeof obj === 'number') {
        return <span style={{ color: '#fd7e14' }}>{obj}</span>;
      }

      if (typeof obj === 'boolean') {
        return <span style={{ color: '#fd7e14' }}>{obj.toString()}</span>;
      }

      if (Array.isArray(obj)) {
        return (
          <span>
            [
            {obj.map((item, index) => {
              const currentPath = path ? `${path}[${index}]` : `[${index}]`;
              const diffItem = diffPathMap.get(currentPath);
              const isDiff = diffPaths.has(currentPath);

              return (
                <div key={index} style={{ marginLeft: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span
                      style={{
                        backgroundColor: isDiff
                          ? diffItem?.type === 'added'
                            ? '#f6ffed'
                            : diffItem?.type === 'removed'
                              ? '#fff2f0'
                              : '#e6f7ff'
                          : 'transparent',
                        padding: isDiff ? '2px 4px' : '0',
                        borderRadius: isDiff ? '3px' : '0',
                        border: isDiff
                          ? diffItem?.type === 'added'
                            ? '1px solid #b7eb8f'
                            : diffItem?.type === 'removed'
                              ? '1px solid #ffccc7'
                              : '1px solid #91d5ff'
                          : 'none',
                        flex: 1,
                      }}
                    >
                      {renderJsonWithDiff(item, currentPath, isLeft)}
                    </span>

                    {/* 操作按钮显示逻辑 */}
                    {isDiff &&
                      diffItem &&
                      // 删除操作在左侧面板显示，新增和修改操作在右侧面板显示
                      ((isLeft && diffItem.type === 'removed') ||
                        (!isLeft &&
                          (diffItem.type === 'added' || diffItem.type === 'modified'))) && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            marginLeft: 8,
                            flexShrink: 0,
                          }}
                        >
                          {acceptedChanges.has(currentPath) ? (
                            <span
                              style={{
                                color: '#52c41a',
                                fontSize: '12px',
                                padding: '2px 6px',
                                backgroundColor: '#f6ffed',
                                borderRadius: '3px',
                                border: '1px solid #b7eb8f',
                              }}
                            >
                              已接受
                            </span>
                          ) : rejectedChanges.has(currentPath) ? (
                            <span
                              style={{
                                color: '#fa8c16',
                                fontSize: '12px',
                                padding: '2px 6px',
                                backgroundColor: '#fff7e6',
                                borderRadius: '3px',
                                border: '1px solid #ffd591',
                              }}
                            >
                              已拒绝
                            </span>
                          ) : (
                            <>
                              <Button
                                type='primary'
                                size='small'
                                onClick={() => handleAcceptChange(currentPath, diffItem.newValue)}
                                style={{
                                  fontSize: '10px',
                                  height: '20px',
                                  padding: '0 6px',
                                  lineHeight: '1',
                                }}
                              >
                                接受
                              </Button>
                              <Button
                                size='small'
                                onClick={() => handleRejectChange(currentPath)}
                                style={{
                                  fontSize: '10px',
                                  height: '20px',
                                  padding: '0 6px',
                                  lineHeight: '1',
                                }}
                              >
                                拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                  {index < obj.length - 1 && ','}
                </div>
              );
            })}
            ]
          </span>
        );
      }

      if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        return (
          <span>
            {'{'}
            {keys.map((key, index) => {
              const currentPath = path ? `${path}.${key}` : key;
              const diffItem = diffPathMap.get(currentPath);
              const isDiff = diffPaths.has(currentPath);

              return (
                <div key={key} style={{ marginLeft: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span
                      style={{
                        backgroundColor: isDiff
                          ? diffItem?.type === 'added'
                            ? '#f6ffed'
                            : diffItem?.type === 'removed'
                              ? '#fff2f0'
                              : '#e6f7ff'
                          : 'transparent',
                        padding: isDiff ? '2px 4px' : '0',
                        borderRadius: isDiff ? '3px' : '0',
                        border: isDiff
                          ? diffItem?.type === 'added'
                            ? '1px solid #b7eb8f'
                            : diffItem?.type === 'removed'
                              ? '1px solid #ffccc7'
                              : '1px solid #91d5ff'
                          : 'none',
                        flex: 1,
                      }}
                    >
                      <span style={{ color: '#0d6efd' }}>&quot;{key}&quot;</span>:{' '}
                      {renderJsonWithDiff(obj[key], currentPath, isLeft)}
                    </span>

                    {/* 操作按钮显示逻辑 */}
                    {isDiff &&
                      diffItem &&
                      ((isLeft && diffItem.type === 'removed') ||
                        (!isLeft &&
                          (diffItem.type === 'added' || diffItem.type === 'modified'))) && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            marginLeft: 8,
                            flexShrink: 0,
                          }}
                        >
                          {acceptedChanges.has(currentPath) ? (
                            <span
                              style={{
                                color: '#52c41a',
                                fontSize: '12px',
                                padding: '2px 6px',
                                backgroundColor: '#f6ffed',
                                borderRadius: '3px',
                                border: '1px solid #b7eb8f',
                              }}
                            >
                              已接受
                            </span>
                          ) : rejectedChanges.has(currentPath) ? (
                            <span
                              style={{
                                color: '#fa8c16',
                                fontSize: '12px',
                                padding: '2px 6px',
                                backgroundColor: '#fff7e6',
                                borderRadius: '3px',
                                border: '1px solid #ffd591',
                              }}
                            >
                              已拒绝
                            </span>
                          ) : (
                            <>
                              <Button
                                type='primary'
                                size='small'
                                onClick={() => handleAcceptChange(currentPath, diffItem.newValue)}
                                style={{
                                  fontSize: '10px',
                                  height: '20px',
                                  padding: '0 6px',
                                  lineHeight: '1',
                                }}
                              >
                                接受
                              </Button>
                              <Button
                                size='small'
                                onClick={() => handleRejectChange(currentPath)}
                                style={{
                                  fontSize: '10px',
                                  height: '20px',
                                  padding: '0 6px',
                                  lineHeight: '1',
                                }}
                              >
                                拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                  {index < keys.length - 1 && ','}
                </div>
              );
            })}
            {'}'}
          </span>
        );
      }

      return <span>{String(obj)}</span>;
    };

    return (
      <div className='json-diff-container'>
        <div className='diff-split-view'>
          <div className='diff-left-panel'>
            <div className='panel-header'>
              <Title level={5}>原始数据</Title>
            </div>
            <div className='json-display'>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  backgroundColor: '#f8f9fa',
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.4,
                  overflow: 'auto',
                  maxHeight: '500px',
                }}
              >
                {renderJsonWithDiff(originJson, '', true)}
              </pre>
            </div>
          </div>

          <div className='diff-right-panel'>
            <div className='panel-header'>
              <Title level={5}>AI 建议数据</Title>
            </div>
            <div className='json-display'>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  backgroundColor: '#f8f9fa',
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.4,
                  overflow: 'auto',
                  maxHeight: '500px',
                }}
              >
                {renderJsonWithDiff(AIJson, '', false)}
              </pre>
            </div>
          </div>
        </div>

        <div className='latest-json-panel'>
          <div className='panel-header'>
            <Title level={5}>最新JSON结果</Title>
            <Text type='secondary'>
              已处理: {acceptedChanges.size + rejectedChanges.size} / {diffItems.length}
            </Text>
          </div>

          <div className='json-display'>
            <pre
              style={{
                margin: 0,
                padding: 16,
                backgroundColor: '#f8f9fa',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.4,
                overflow: 'auto',
                maxHeight: '400px',
                border: '1px solid #f0f0f0',
              }}
            >
              {JSON.stringify(latestJson, null, 2)}
            </pre>
          </div>

          {diffItems.length > 0 && (
            <div className='diff-summary'>
              <div className='summary-stats'>
                <div className='stat-item'>
                  <span className='stat-label'>新增字段:</span>
                  <span className='stat-value accepted'>
                    {
                      diffItems.filter(
                        (item) => item.type === 'added' && acceptedChanges.has(item.path),
                      ).length
                    }
                  </span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>修改字段:</span>
                  <span className='stat-value modified'>
                    {
                      diffItems.filter(
                        (item) => item.type === 'modified' && acceptedChanges.has(item.path),
                      ).length
                    }
                  </span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>删除字段:</span>
                  <span className='stat-value removed'>
                    {
                      diffItems.filter(
                        (item) => item.type === 'removed' && acceptedChanges.has(item.path),
                      ).length
                    }
                  </span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>拒绝更改:</span>
                  <span className='stat-value rejected'>{rejectedChanges.size}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Button disabled={disabled} onClick={handleButtonClick}>
        AI校验
      </Button>
      <Modal
        title={
          <Space>
            <span>{originJson && AIJson ? 'JSON 差异对比' : 'AI 数据校验'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={1200}
        okButtonProps={{
          style: { backgroundColor: token.colorPrimary },
        }}
        cancelButtonProps={{
          style: { borderColor: token.colorPrimary, color: token.colorPrimary },
        }}
      >
        <Spin spinning={loading} tip='正在分析数据...'>
          {originJson && AIJson ? renderDiffContent() : <></>}
        </Spin>
      </Modal>
    </>
  );
};

export default AISuggestion;
