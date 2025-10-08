import { getAISuggestion } from '@/services/general/api';
import { CheckOutlined, CloseOutlined, CopyOutlined, UndoOutlined } from '@ant-design/icons';
import { createProcess } from '@tiangong-lca/tidas-sdk';
import { Button, message, Modal, Space, Spin, theme, Typography } from 'antd';
import * as jsondiffpatch from 'jsondiffpatch';
import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import './index.less';
const { Text, Title } = Typography;

interface AISuggestionProps {
  type: 'process' | 'flow';
  originJson?: any;
  disabled?: boolean;
  onAcceptChange?: (path: string, value: any) => void;
  onRejectChange?: (path: string) => void;
  onLatestJsonChange?: (latestJson: any) => void;
  onClose?: () => void;
}

interface DiffItem {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  displayPath: string;
}

interface JsonLine {
  content: string;
  lineNumber: number;
  indent: number;
  path: string;
  isDiff?: boolean;
  diffType?: 'added' | 'removed' | 'modified';
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  childCount?: number;
  isDeleteBlockStart?: boolean;
  deleteBlockDiffItem?: DiffItem;
  isAddedBlockStart?: boolean;
  addedBlockDiffItem?: DiffItem;
}

const AISuggestion: React.FC<AISuggestionProps> = ({
  type,
  originJson,
  disabled = false,
  onAcceptChange,
  onRejectChange,
  onLatestJsonChange,
  onClose = () => {},
}) => {
  const intl = useIntl();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [acceptedChanges, setAcceptedChanges] = useState<Set<string>>(new Set());
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set());
  const [AIJson, setAIJson] = useState<any>(null);
  const { token } = theme.useToken();

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  const colors = {
    background: token.colorBgContainer,
    backgroundSecondary: token.colorFillSecondary,

    border: token.colorBorder,
    borderSecondary: token.colorBorderSecondary,
    borderTertiary: token.colorSplit,

    addedBg: token.colorSuccessBg,
    addedBorder: token.colorSuccess,
    removedBg: token.colorErrorBg,
    removedBorder: token.colorError,
    modifiedBg: token.colorInfoBg,
    modifiedBorder: token.colorInfo,

    acceptedBg: token.colorSuccessBg,
    acceptedBorder: token.colorSuccessBorder,
    acceptedText: token.colorSuccess,
    rejectedBg: token.colorWarningBg,
    rejectedBorder: token.colorWarningBorder,
    rejectedText: token.colorWarning,
  };
  interface OperationHistoryItem {
    path?: string;
    type: 'accept' | 'reject' | 'accept_all' | 'reject_all';
    value?: any;
    previousAcceptedChanges: Set<string>;
    previousRejectedChanges: Set<string>;
    items?: Array<{
      path: string;
      value?: any;
    }>;
  }

  const [operationHistory, setOperationHistory] = useState<OperationHistoryItem[]>([]);

  const leftPanelRef = React.useRef<HTMLDivElement>(null);
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const getSuggestData = async () => {
    if (!originJson?.processDataSet) {
      setAIJson(originJson ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tidasData = createProcess();
      tidasData.processDataSet = originJson.processDataSet;

      const suggestResult = await getAISuggestion(tidasData.toJSONString(2), type, {
        outputDiffSummary: true,
        outputDiffHTML: true,
        maxRetries: 1,
      });
      setAIJson(suggestResult?.data ?? {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modalVisible) {
      getSuggestData();
    }
    if (!modalVisible) {
      onClose();
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

    const parseDelta = (deltaObj: any, path: string = '', parentIsArray: boolean = false) => {
      if (!deltaObj || typeof deltaObj !== 'object') return;

      Object.keys(deltaObj).forEach((key) => {
        // 跳过数组标记
        if (key === '_t') return;

        // 处理数组索引路径
        let currentPath: string;
        if (parentIsArray) {
          // 如果key包含下划线，说明是数组移动操作，需要特殊处理
          if (key.includes('_')) {
            const actualIndex = key.split('_')[0];
            currentPath = path ? `${path}[${actualIndex}]` : `[${actualIndex}]`;
          } else {
            currentPath = path ? `${path}[${key}]` : `[${key}]`;
          }
        } else {
          // 对象属性使用 .key 格式
          currentPath = path ? `${path}.${key}` : key;
        }

        const value = deltaObj[key];

        // 检查是否是数组类型的delta（包含_t: 'a'）
        const isArrayDelta = typeof value === 'object' && value !== null && value._t === 'a';

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
          } else if (value.length === 3 && value[2] === 3) {
            // 数组元素删除: [oldValue, 0, 3]
            items.push({
              path: currentPath,
              type: 'removed',
              oldValue: value[0],
              displayPath: currentPath,
            });
          } else if (value.length === 3 && value[2] === 2) {
            // 文本差异（暂不处理）
          }
        } else if (isArrayDelta) {
          // 处理数组内容的变化
          parseDelta(value, currentPath, true);
        } else if (typeof value === 'object' && value !== null) {
          // 递归处理嵌套对象
          parseDelta(value, currentPath, false);
        }
      });
    };

    parseDelta(delta);

    return items;
  }, [originJson, AIJson, diffpatcher]);

  // 初始化折叠路径 - 默认折叠没有差异的大对象/数组
  useEffect(() => {
    if (!originJson || !AIJson || diffItems.length === 0) return;

    const diffPaths = new Set(diffItems.map((item) => item.path));
    const pathsToCollapse = new Set<string>();

    const findCollapsiblePaths = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;

      // 检查当前路径及其子路径是否有差异
      let hasDiff = false;
      for (const diffPath of diffPaths) {
        if (diffPath.startsWith(path)) {
          hasDiff = true;
          break;
        }
      }

      // 如果没有差异且元素较多，添加到折叠列表
      if (!hasDiff && path) {
        // 不折叠根级别
        if (Array.isArray(obj) && obj.length > 3) {
          pathsToCollapse.add(path);
        } else if (typeof obj === 'object' && Object.keys(obj).length > 5) {
          pathsToCollapse.add(path);
        }
      }

      // 递归处理子元素
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const childPath = path ? `${path}[${index}]` : `[${index}]`;
          findCollapsiblePaths(item, childPath);
        });
      } else if (typeof obj === 'object') {
        Object.keys(obj).forEach((key) => {
          const childPath = path ? `${path}.${key}` : key;
          findCollapsiblePaths(obj[key], childPath);
        });
      }
    };

    findCollapsiblePaths(originJson);
  }, [originJson, AIJson, diffItems]);

  // 计算JSON结果
  const latestJson = useMemo(() => {
    if (!originJson || !AIJson || diffItems.length === 0) return originJson;

    const result = JSON.parse(JSON.stringify(originJson));

    diffItems.forEach((item) => {
      const isAccepted = acceptedChanges.has(item.path);

      if (isAccepted) {
        // 解析路径，支持数组索引格式 [index]
        const pathParts: string[] = [];
        let currentPathPart = '';
        let inBracket = false;

        for (let i = 0; i < item.path.length; i++) {
          const char = item.path[i];
          if (char === '[') {
            if (currentPathPart) {
              pathParts.push(currentPathPart);
              currentPathPart = '';
            }
            inBracket = true;
          } else if (char === ']') {
            if (inBracket && currentPathPart) {
              pathParts.push(currentPathPart);
              currentPathPart = '';
            }
            inBracket = false;
          } else if (char === '.' && !inBracket) {
            if (currentPathPart) {
              pathParts.push(currentPathPart);
              currentPathPart = '';
            }
          } else {
            currentPathPart += char;
          }
        }
        if (currentPathPart) {
          pathParts.push(currentPathPart);
        }

        // 应用变更
        let current = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          const isArrayIndex = /^\d+$/.test(part);

          if (isArrayIndex) {
            const index = parseInt(part, 10);
            if (!Array.isArray(current)) {
              current = [];
            }
            if (!current[index]) {
              current[index] = {};
            }
            current = current[index];
          } else {
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
        }

        const lastPart = pathParts[pathParts.length - 1];
        const isLastArrayIndex = /^\d+$/.test(lastPart);

        if (item.type === 'added' || item.type === 'modified') {
          if (isLastArrayIndex) {
            const index = parseInt(lastPart, 10);
            if (!Array.isArray(current)) {
              // 如果当前不是数组但需要设置数组元素，需要特殊处理
              const parent = pathParts.length > 1 ? current : result;
              parent[lastPart] = item.newValue;
            } else {
              current[index] = item.newValue;
            }
          } else {
            current[lastPart] = item.newValue;
          }
        } else if (item.type === 'removed') {
          if (isLastArrayIndex) {
            const index = parseInt(lastPart, 10);
            if (Array.isArray(current)) {
              current.splice(index, 1);
            }
          } else {
            delete current[lastPart];
          }
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
    setOperationHistory([]);
  };

  const handleUndo = () => {
    const lastOperation = operationHistory[operationHistory.length - 1];
    if (!lastOperation) {
      message.info(intl.formatMessage({ id: 'component.aiSuggestion.message.noUndoOperation' }));
      return;
    }

    // 恢复到上一个状态
    setAcceptedChanges(lastOperation.previousAcceptedChanges);
    setRejectedChanges(lastOperation.previousRejectedChanges);

    // 如果有回调函数，需要通知父组件
    if (lastOperation.type === 'accept' && lastOperation.path && onRejectChange) {
      onRejectChange(lastOperation.path);
    } else if (
      lastOperation.type === 'reject' &&
      lastOperation.path &&
      lastOperation.value &&
      onAcceptChange
    ) {
      onAcceptChange(lastOperation.path, lastOperation.value);
    } else if (lastOperation.type === 'accept_all' && lastOperation.items) {
      // 撤销所有接受的更改
      lastOperation.items.forEach((item) => {
        if (onRejectChange) {
          onRejectChange(item.path);
        }
      });
    } else if (lastOperation.type === 'reject_all' && lastOperation.items) {
      // 撤销所有拒绝的更改
      lastOperation.items.forEach((item) => {
        const diffItem = diffItems.find((d) => d.path === item.path);
        if (diffItem && onAcceptChange) {
          onAcceptChange(item.path, diffItem.newValue);
        }
      });
    }

    // 从历史记录中移除最后一个操作
    setOperationHistory((prev) => prev.slice(0, -1));

    message.success(intl.formatMessage({ id: 'component.aiSuggestion.message.undoSuccess' }));
  };

  const handleAcceptChange = (path: string, value: any) => {
    setOperationHistory((prev) => [
      ...prev,
      {
        path,
        type: 'accept',
        value,
        previousAcceptedChanges: new Set(acceptedChanges),
        previousRejectedChanges: new Set(rejectedChanges),
      },
    ]);

    setAcceptedChanges((prev) => new Set(prev).add(path));
    setRejectedChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });

    if (onAcceptChange) {
      onAcceptChange(path, value);
    }

    message.success(
      `${intl.formatMessage({ id: 'component.aiSuggestion.message.acceptChange' })}: ${path}`,
    );
  };

  const handleRejectChange = (path: string) => {
    setOperationHistory((prev) => [
      ...prev,
      {
        path,
        type: 'reject',
        previousAcceptedChanges: new Set(acceptedChanges),
        previousRejectedChanges: new Set(rejectedChanges),
      },
    ]);

    setRejectedChanges((prev) => new Set(prev).add(path));
    setAcceptedChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });

    if (onRejectChange) {
      onRejectChange(path);
    }

    message.warning(
      `${intl.formatMessage({ id: 'component.aiSuggestion.message.rejectChange' })}: ${path}`,
    );
  };

  const handleCopyToClipboard = async (content: any, label: string) => {
    try {
      const jsonString = JSON.stringify(content, null, 2);
      await navigator.clipboard.writeText(jsonString);
      message.success(
        `${label}${intl.formatMessage({ id: 'component.aiSuggestion.message.copySuccess' })}`,
      );
    } catch (err) {
      message.error(intl.formatMessage({ id: 'component.aiSuggestion.message.copyFailed' }));
      console.error('复制失败:', err);
    }
  };

  // 同步滚动处理
  const handleSyncScroll = (source: 'left' | 'right') => {
    if (source === 'left' && leftPanelRef.current && rightPanelRef.current) {
      rightPanelRef.current.scrollTop = leftPanelRef.current.scrollTop;
      rightPanelRef.current.scrollLeft = leftPanelRef.current.scrollLeft;
    } else if (source === 'right' && leftPanelRef.current && rightPanelRef.current) {
      leftPanelRef.current.scrollTop = rightPanelRef.current.scrollTop;
      leftPanelRef.current.scrollLeft = rightPanelRef.current.scrollLeft;
    }
  };

  // // 切换折叠状态
  // const toggleCollapse = (path: string) => {
  //   setCollapsedPaths(prev => {
  //     const newSet = new Set(prev);
  //     if (newSet.has(path)) {
  //       newSet.delete(path);
  //     } else {
  //       newSet.add(path);
  //     }
  //     return newSet;
  //   });
  // };

  // // 检查对象是否含有差异
  // const hasChildDifferences = (obj: any, path: string, diffPaths: Set<string>): boolean => {
  //   if (!obj || typeof obj !== 'object') return false;

  //   // 检查当前路径及其子路径
  //   for (const diffPath of diffPaths) {
  //     if (diffPath.startsWith(path)) {
  //       return true;
  //     }
  //   }
  //   return false;
  // };

  // 一键接受所有更改
  const handleAcceptAll = () => {
    // 保存当前状态到历史记录
    setOperationHistory((prev) => [
      ...prev,
      {
        type: 'accept_all',
        previousAcceptedChanges: new Set(acceptedChanges),
        previousRejectedChanges: new Set(rejectedChanges),
        // 保存所有项的值，以便撤销时能够正确恢复
        items: diffItems.map((item) => ({
          path: item.path,
          value: item.newValue,
        })),
      },
    ]);

    const newAccepted = new Set<string>();
    diffItems.forEach((item) => {
      newAccepted.add(item.path);
      // 通知父组件每个接受的更改
      if (onAcceptChange) {
        onAcceptChange(item.path, item.newValue);
      }
    });
    setAcceptedChanges(newAccepted);
    setRejectedChanges(new Set());
    message.success(
      `${intl.formatMessage({ id: 'component.aiSuggestion.message.acceptAllSuccess' })} ${diffItems.length} ${intl.formatMessage({ id: 'component.aiSuggestion.message.changes' })}`,
    );
  };

  // 一键拒绝所有更改
  const handleRejectAll = () => {
    // 保存当前状态到历史记录
    setOperationHistory((prev) => [
      ...prev,
      {
        type: 'reject_all',
        previousAcceptedChanges: new Set(acceptedChanges),
        previousRejectedChanges: new Set(rejectedChanges),
        items: diffItems.map((item) => ({
          path: item.path,
        })),
      },
    ]);

    const newRejected = new Set<string>();
    diffItems.forEach((item) => {
      newRejected.add(item.path);
      // 通知父组件每个拒绝的更改
      if (onRejectChange) {
        onRejectChange(item.path);
      }
    });
    setRejectedChanges(newRejected);
    setAcceptedChanges(new Set());
    message.warning(
      `${intl.formatMessage({ id: 'component.aiSuggestion.message.rejectAllSuccess' })} ${diffItems.length} ${intl.formatMessage({ id: 'component.aiSuggestion.message.changes' })}`,
    );
  };

  // 将JSON转换为带行号的文本行
  const jsonToLines = (obj: any, path: string = '', indent: number = 0): JsonLine[] => {
    // const lines: JsonLine[] = [];
    let lineNumber = 1;

    const processValue = (
      value: any,
      currentPath: string,
      currentIndent: number,
      isPropertyValue: boolean = false,
    ): JsonLine[] => {
      const result: JsonLine[] = [];
      const indentStr = isPropertyValue ? '' : '  '.repeat(currentIndent);

      if (value === null || value === undefined) {
        result.push({
          content: `${indentStr}null`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
        });
      } else if (typeof value === 'string') {
        result.push({
          content: `${indentStr}"${value}"`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
        });
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result.push({
          content: `${indentStr}${value}`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
        });
      } else if (Array.isArray(value)) {
        result.push({
          content: `${indentStr}[`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
          isCollapsible: value.length > 3,
          childCount: value.length,
        });

        value.forEach((item, index) => {
          const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
          const itemLines = processValue(item, itemPath, currentIndent + 1, false);
          result.push(...itemLines);
          if (index < value.length - 1) {
            result[result.length - 1].content += ',';
          }
        });

        result.push({
          content: `${'  '.repeat(currentIndent)}]`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
        });
      } else if (typeof value === 'object') {
        result.push({
          content: `${indentStr}{`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
          isCollapsible: Object.keys(value).length > 5,
          childCount: Object.keys(value).length,
        });

        const keys = Object.keys(value);
        keys.forEach((key, index) => {
          const keyPath = currentPath ? `${currentPath}.${key}` : key;
          const keyIndent = '  '.repeat(currentIndent + 1);

          // 处理值是否是简单类型
          const val = value[key];
          const isSimple =
            val === null ||
            val === undefined ||
            typeof val === 'string' ||
            typeof val === 'number' ||
            typeof val === 'boolean';

          if (isSimple) {
            // 简单值，放在同一行
            let valueStr = '';
            if (val === null || val === undefined) {
              valueStr = 'null';
            } else if (typeof val === 'string') {
              valueStr = `"${val}"`;
            } else {
              valueStr = String(val);
            }

            result.push({
              content: `${keyIndent}"${key}": ${valueStr}${index < keys.length - 1 ? ',' : ''}`,
              lineNumber: lineNumber++,
              indent: currentIndent + 1,
              path: keyPath,
            });
          } else {
            // 复杂值，分多行
            result.push({
              content: `${keyIndent}"${key}": `,
              lineNumber: lineNumber++,
              indent: currentIndent + 1,
              path: keyPath,
            });

            const valueLines = processValue(val, keyPath, currentIndent + 1, true);
            if (valueLines.length > 0) {
              result[result.length - 1].content += valueLines[0].content;
              valueLines.shift();
              result.push(...valueLines);
            }

            if (index < keys.length - 1) {
              result[result.length - 1].content += ',';
            }
          }
        });

        result.push({
          content: `${'  '.repeat(currentIndent)}}`,
          lineNumber: lineNumber++,
          indent: currentIndent,
          path: currentPath,
        });
      }

      return result;
    };

    return processValue(obj, path, indent, false);
  };

  const renderDiffContent = () => {
    // 创建差异路径集合，用于高亮显示
    // const diffPaths = new Set(diffItems.map((item) => item.path));
    const diffPathMap = new Map();
    diffItems.forEach((item) => {
      diffPathMap.set(item.path, item);
    });

    // 新的并排渲染方法 - 使用双指针对齐算法
    const renderSideBySideDiff = () => {
      // 将JSON转换为行数组，用于对齐显示
      const leftLines = jsonToLines(originJson);
      const rightLines = jsonToLines(AIJson);

      // 标记左边的差异行
      leftLines.forEach((line) => {
        const diffItem = diffPathMap.get(line.path);
        if (diffItem) {
          line.isDiff = true;
          line.diffType = diffItem.type;
        }
      });

      // 标记右边的差异行
      rightLines.forEach((line) => {
        const diffItem = diffPathMap.get(line.path);
        if (diffItem) {
          line.isDiff = true;
          line.diffType = diffItem.type;
        }
      });

      // 预处理：为所有属于删除字段的行添加删除块标记
      const markDiffBlocks = (lines: JsonLine[]) => {
        diffItems.forEach((diffItem) => {
          if (diffItem.type === 'removed') {
            let hasFoundStart = false;
            lines.forEach((line) => {
              if (
                line.path === diffItem.path ||
                line.path.startsWith(diffItem.path + '.') ||
                line.path.startsWith(diffItem.path + '[')
              ) {
                line.deleteBlockDiffItem = diffItem;
                line.isDiff = true;
                line.diffType = 'removed';

                // 只为第一个匹配删除路径的行标记为开始
                if (!hasFoundStart && line.path === diffItem.path) {
                  line.isDeleteBlockStart = true;
                  hasFoundStart = true;
                }
              }
            });
          } else if (diffItem.type === 'added') {
            let hasFoundStart = false;
            lines.forEach((line) => {
              if (
                line.path === diffItem.path ||
                line.path.startsWith(diffItem.path + '.') ||
                line.path.startsWith(diffItem.path + '[')
              ) {
                line.addedBlockDiffItem = diffItem;
                line.isDiff = true;
                line.diffType = 'added';

                // 只为第一个匹配新增路径的行标记为开始
                if (!hasFoundStart && line.path === diffItem.path) {
                  line.isAddedBlockStart = true;
                  hasFoundStart = true;
                }
              }
            });
          }
        });
      };

      markDiffBlocks(leftLines);
      markDiffBlocks(rightLines);

      // 智能对齐算法 - 基于路径匹配
      const alignLinesByPath = () => {
        const alignedRows: Array<{ left: JsonLine | undefined; right: JsonLine | undefined }> = [];
        let leftIdx = 0;
        let rightIdx = 0;

        while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
          const leftLine = leftLines[leftIdx];
          const rightLine = rightLines[rightIdx];

          if (!leftLine && !rightLine) {
            break;
          }

          // 如果只剩左边的行
          if (leftLine && !rightLine) {
            alignedRows.push({ left: leftLine, right: undefined });
            leftIdx++;
            continue;
          }

          // 如果只剩右边的行
          if (!leftLine && rightLine) {
            alignedRows.push({ left: undefined, right: rightLine });
            rightIdx++;
            continue;
          }

          // 两边都有行，进行智能匹配
          const leftDiff = leftLine ? diffPathMap.get(leftLine.path) : null;
          const rightDiff = rightLine ? diffPathMap.get(rightLine.path) : null;

          // 如果路径完全匹配，直接对齐
          if (leftLine.path === rightLine.path) {
            alignedRows.push({ left: leftLine, right: rightLine });
            leftIdx++;
            rightIdx++;
          }
          // 如果左边是删除项
          else if (leftDiff && leftDiff.type === 'removed') {
            alignedRows.push({ left: leftLine, right: undefined });
            leftIdx++;
          }
          // 如果右边是新增项
          else if (rightDiff && rightDiff.type === 'added') {
            alignedRows.push({ left: undefined, right: rightLine });
            rightIdx++;
          }
          // 尝试在后续行中找到匹配的路径
          else {
            let foundMatch = false;

            // 在右侧查找匹配左侧当前行的路径
            for (let i = rightIdx + 1; i < Math.min(rightIdx + 10, rightLines.length); i++) {
              if (rightLines[i].path === leftLine.path) {
                // 找到匹配，先添加右侧的不匹配行
                for (let j = rightIdx; j < i; j++) {
                  alignedRows.push({ left: undefined, right: rightLines[j] });
                }
                // 添加匹配的行
                alignedRows.push({ left: leftLine, right: rightLines[i] });
                leftIdx++;
                rightIdx = i + 1;
                foundMatch = true;
                break;
              }
            }

            if (!foundMatch) {
              // 在左侧查找匹配右侧当前行的路径
              for (let i = leftIdx + 1; i < Math.min(leftIdx + 10, leftLines.length); i++) {
                if (leftLines[i].path === rightLine.path) {
                  // 找到匹配，先添加左侧的不匹配行
                  for (let j = leftIdx; j < i; j++) {
                    alignedRows.push({ left: leftLines[j], right: undefined });
                  }
                  // 添加匹配的行
                  alignedRows.push({ left: leftLines[i], right: rightLine });
                  leftIdx = i + 1;
                  rightIdx++;
                  foundMatch = true;
                  break;
                }
              }
            }

            // 如果都没找到匹配，按原顺序对齐
            if (!foundMatch) {
              alignedRows.push({ left: leftLine, right: rightLine });
              leftIdx++;
              rightIdx++;
            }
          }
        }

        return alignedRows;
      };

      const alignedRows = alignLinesByPath();

      // 渲染单行
      const renderLine = (line: JsonLine | undefined, isLeft: boolean) => {
        if (!line) {
          return (
            <div
              style={{
                minHeight: '20px',
                paddingTop: '2px',
                paddingBottom: '2px',
                paddingLeft: '0px',
                paddingRight: '0px',
              }}
            >
              &nbsp;
            </div>
          );
        }

        const diffItem = diffPathMap.get(line.path);
        const isDiff = line.isDiff;

        // 对于删除操作，使用预先设置的删除块信息
        const isInDeletedBlock = !!line.deleteBlockDiffItem;
        const deleteBlockDiffItem = line.deleteBlockDiffItem;

        // 对于新增操作，使用预先设置的新增块信息
        const isInAddedBlock = !!line.addedBlockDiffItem;
        const addedBlockDiffItem = line.addedBlockDiffItem;

        return (
          <div
            style={{
              display: 'flex',
              minHeight: '20px',
              paddingTop: '2px',
              paddingBottom: '2px',
              paddingRight: '0px',
              paddingLeft: isDiff || isInDeletedBlock || isInAddedBlock ? '5px' : '8px',
              backgroundColor:
                isDiff || isInDeletedBlock || isInAddedBlock
                  ? line.diffType === 'added' || isInAddedBlock
                    ? colors.addedBg
                    : line.diffType === 'removed' || isInDeletedBlock
                      ? colors.removedBg
                      : colors.modifiedBg
                  : 'transparent',
              borderLeft:
                isDiff || isInDeletedBlock || isInAddedBlock
                  ? `3px solid ${
                      line.diffType === 'added' || isInAddedBlock
                        ? colors.addedBorder
                        : line.diffType === 'removed' || isInDeletedBlock
                          ? colors.removedBorder
                          : colors.modifiedBorder
                    }`
                  : 'none',
            }}
          >
            <span
              style={{
                minWidth: '40px',
                marginRight: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                userSelect: 'none',
                flexShrink: 0,
                opacity: 0.6,
              }}
            >
              {line.lineNumber}
            </span>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  flex: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  minWidth: 0,
                }}
              >
                {line.content}
              </span>

              {((isLeft && line.isDeleteBlockStart === true && deleteBlockDiffItem) ||
                (!isLeft && line.isAddedBlockStart === true && addedBlockDiffItem) ||
                (!isLeft && diffItem && diffItem.type === 'modified')) && (
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginRight: 8,
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                  }}
                >
                  {(() => {
                    const currentDiffItem = isInDeletedBlock
                      ? deleteBlockDiffItem
                      : isInAddedBlock
                        ? addedBlockDiffItem
                        : diffItem;
                    const currentPath = isInDeletedBlock
                      ? deleteBlockDiffItem?.path
                      : isInAddedBlock
                        ? addedBlockDiffItem?.path
                        : line.path;
                    const currentIsAccepted = acceptedChanges.has(currentPath || '');
                    const currentIsRejected = rejectedChanges.has(currentPath || '');

                    return currentIsAccepted ? (
                      <span
                        style={{
                          color: colors.acceptedText,
                          fontSize: '11px',
                          padding: '1px 4px',
                          backgroundColor: colors.acceptedBg,
                          borderRadius: '2px',
                          border: `1px solid ${colors.acceptedBorder}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <FormattedMessage id='component.aiSuggestion.status.accepted' />
                      </span>
                    ) : currentIsRejected ? (
                      <span
                        style={{
                          color: colors.rejectedText,
                          fontSize: '11px',
                          padding: '1px 4px',
                          backgroundColor: colors.rejectedBg,
                          borderRadius: '2px',
                          border: `1px solid ${colors.rejectedBorder}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <FormattedMessage id='component.aiSuggestion.status.rejected' />
                      </span>
                    ) : (
                      <>
                        <Button
                          type='primary'
                          size='small'
                          onClick={() =>
                            handleAcceptChange(currentPath || '', currentDiffItem?.newValue)
                          }
                          style={{
                            fontSize: '10px',
                            height: '20px',
                            padding: '0 4px',
                            whiteSpace: 'nowrap',
                            boxShadow: 'none',
                          }}
                        >
                          <FormattedMessage id='component.aiSuggestion.action.accept' />
                        </Button>
                        <Button
                          size='small'
                          onClick={() => handleRejectChange(currentPath || '')}
                          style={{
                            fontSize: '10px',
                            height: '20px',
                            padding: '0 4px',
                            whiteSpace: 'nowrap',
                            boxShadow: 'none',
                          }}
                        >
                          <FormattedMessage id='component.aiSuggestion.action.reject' />
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      };

      const rows = alignedRows.map((row, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            borderBottom: `1px solid ${colors.borderTertiary}`,
            width: '100%',
          }}
        >
          <div
            style={{
              width: '50%',
              borderRight: `1px solid ${colors.borderSecondary}`,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {renderLine(row.left, true)}
          </div>
          <div
            style={{
              width: '50%',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {renderLine(row.right, false)}
          </div>
        </div>
      ));

      return (
        <div
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '600px',
            fontFamily: 'monospace',
            width: '100%',
            position: 'relative',
          }}
          ref={leftPanelRef}
          onScroll={() => handleSyncScroll('left')}
        >
          <div
            style={{
              minWidth: '100%',
              display: 'table',
              tableLayout: 'fixed',
            }}
          >
            {rows}
          </div>
        </div>
      );
    };

    return (
      <div className='json-diff-container' data-theme={isDarkMode ? 'dark' : 'light'}>
        {/* 全局操作按钮 */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type='text'
              icon={<CopyOutlined />}
              size='small'
              onClick={() =>
                handleCopyToClipboard(
                  originJson,
                  intl.formatMessage({ id: 'component.aiSuggestion.label.originalData' }),
                )
              }
            >
              <FormattedMessage id='component.aiSuggestion.button.copyOriginal' />
            </Button>
            <Button
              type='text'
              icon={<CopyOutlined />}
              size='small'
              onClick={() =>
                handleCopyToClipboard(
                  AIJson,
                  intl.formatMessage({ id: 'component.aiSuggestion.label.aiSuggestionData' }),
                )
              }
            >
              <FormattedMessage id='component.aiSuggestion.button.copyAI' />
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type='primary'
              icon={<CheckOutlined />}
              onClick={handleAcceptAll}
              disabled={diffItems.length === 0}
            >
              <FormattedMessage id='component.aiSuggestion.button.acceptAll' /> ({diffItems.length})
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={handleRejectAll}
              disabled={diffItems.length === 0}
            >
              <FormattedMessage id='component.aiSuggestion.button.rejectAll' />
            </Button>
            <Button
              icon={<UndoOutlined />}
              onClick={handleUndo}
              disabled={operationHistory.length === 0}
            >
              <FormattedMessage id='component.aiSuggestion.button.undo' />
            </Button>
          </div>
        </div>

        {/* 标题栏 */}
        <div
          style={{
            display: 'flex',
            borderBottom: `2px solid ${colors.modifiedBorder}`,
            backgroundColor: colors.backgroundSecondary,
            fontWeight: 'bold',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '8px 16px',
              // borderRight: `1px solid ${colors.borderSecondary}`,
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              <FormattedMessage id='component.aiSuggestion.panel.originalData' />
            </Title>
          </div>
          <div
            style={{
              flex: 1,
              padding: '8px 16px',
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              <FormattedMessage id='component.aiSuggestion.panel.aiSuggestionData' />
            </Title>
          </div>
        </div>

        {/* 使用新的并排渲染 */}
        {renderSideBySideDiff()}

        <div className='latest-json-panel'>
          <div
            style={{
              display: 'flex',
              borderBottom: `2px solid ${colors.modifiedBorder}`,
              backgroundColor: colors.backgroundSecondary,
              fontWeight: 'bold',
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '8px 16px',
              }}
            >
              <Title level={5} style={{ margin: 0 }}>
                <FormattedMessage id='component.aiSuggestion.panel.latestJsonResult' />
              </Title>
            </div>
            <div
              style={{
                padding: '8px 16px',
              }}
            >
              <Text type='secondary'>
                <FormattedMessage id='component.aiSuggestion.panel.processed' />:{' '}
                {acceptedChanges.size + rejectedChanges.size} / {diffItems.length}
              </Text>
            </div>
          </div>

          <div className='json-display'>
            <pre
              style={{
                margin: 0,
                padding: 16,
                backgroundColor: colors.background,
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.4,
                overflow: 'auto',
                maxHeight: '400px',
                border: `1px solid ${colors.borderTertiary}`,
              }}
            >
              {JSON.stringify(latestJson, null, 2)}
            </pre>
          </div>

          {diffItems.length > 0 && (
            <div className='diff-summary'>
              <div className='summary-stats'>
                <div className='stat-item'>
                  <span className='stat-label'>
                    <FormattedMessage id='component.aiSuggestion.stats.addedFields' />
                  </span>
                  <span
                    className='stat-value'
                    style={{
                      color: colors.acceptedText,
                      backgroundColor: colors.acceptedBg,
                      border: `1px solid ${colors.acceptedBorder}`,
                    }}
                  >
                    {
                      diffItems.filter(
                        (item) => item.type === 'added' && acceptedChanges.has(item.path),
                      ).length
                    }
                  </span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>
                    <FormattedMessage id='component.aiSuggestion.stats.modifiedFields' />
                  </span>
                  <span
                    className='stat-value'
                    style={{
                      color: colors.modifiedBorder,
                      backgroundColor: colors.modifiedBg,
                      border: `1px solid ${colors.modifiedBorder}`,
                    }}
                  >
                    {
                      diffItems.filter(
                        (item) => item.type === 'modified' && acceptedChanges.has(item.path),
                      ).length
                    }
                  </span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>
                    <FormattedMessage id='component.aiSuggestion.stats.deletedFields' />
                  </span>
                  <span
                    className='stat-value'
                    style={{
                      color: colors.removedBorder,
                      backgroundColor: colors.removedBg,
                      border: `1px solid ${colors.removedBorder}`,
                    }}
                  >
                    {
                      diffItems.filter(
                        (item) => item.type === 'removed' && acceptedChanges.has(item.path),
                      ).length
                    }
                  </span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>
                    <FormattedMessage id='component.aiSuggestion.stats.rejectedChanges' />
                  </span>
                  <span
                    className='stat-value'
                    style={{
                      color: colors.rejectedText,
                      backgroundColor: colors.rejectedBg,
                      border: `1px solid ${colors.rejectedBorder}`,
                    }}
                  >
                    {rejectedChanges.size}
                  </span>
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
        <FormattedMessage id='component.aiSuggestion.button.aiCheck' />
      </Button>
      <Modal
        title={
          <Space>
            <FormattedMessage id='component.aiSuggestion.modal.title' />
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
        <Spin
          spinning={loading}
          tip={intl.formatMessage({ id: 'component.aiSuggestion.modal.loading' })}
        >
          {renderDiffContent()}
        </Spin>
      </Modal>
    </>
  );
};

export default AISuggestion;
