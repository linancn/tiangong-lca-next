import { CheckOutlined, CloseOutlined, CopyOutlined, UndoOutlined } from '@ant-design/icons';
import { createProcess, suggestData } from '@tiangong-lca/tidas-sdk';
import { Button, message, Modal, Space, Spin, theme, Typography } from 'antd';
import * as jsondiffpatch from 'jsondiffpatch';
import React, { useEffect, useMemo, useState } from 'react';
import './index.less';
const { Text, Title } = Typography;

interface AISuggestionProps {
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
}

const AISuggestion: React.FC<AISuggestionProps> = ({
  originJson,
  disabled = false,
  onAcceptChange,
  onRejectChange,
  onLatestJsonChange,
  onClose = () => {},
}) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [acceptedChanges, setAcceptedChanges] = useState<Set<string>>(new Set());
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set());
  const [AIJson, setAIJson] = useState<any>(null);
  const [operationHistory, setOperationHistory] = useState<
    Array<{
      path: string;
      type: 'accept' | 'reject';
      value?: any;
      previousAcceptedChanges: Set<string>;
      previousRejectedChanges: Set<string>;
    }>
  >([]);

  const leftPanelRef = React.useRef<HTMLDivElement>(null);
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();
  const getSuggestData = async () => {
    // console.log('获取suggest数据',JSON.parse(JSON.stringify(originJson)));
    setLoading(true);
    const suggestResult = await suggestData(JSON.stringify(createProcess(originJson)), 'process', {
      outputDiffSummary: true,
      outputDiffHTML: true,
      maxRetries: 1,
      modelConfig: {
        model: process.env.OPENAI_CHAT_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
    // console.log('suggestResult', suggestResult);
    setAIJson(suggestResult?.data ?? {});
    setLoading(false);
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
      message.info('没有可撤销的操作');
      return;
    }

    // 恢复到上一个状态
    setAcceptedChanges(lastOperation.previousAcceptedChanges);
    setRejectedChanges(lastOperation.previousRejectedChanges);

    // 如果有回调函数，需要通知父组件
    if (lastOperation.type === 'accept' && onRejectChange) {
      onRejectChange(lastOperation.path);
    } else if (lastOperation.type === 'reject' && lastOperation.value && onAcceptChange) {
      onAcceptChange(lastOperation.path, lastOperation.value);
    }

    // 从历史记录中移除最后一个操作
    setOperationHistory((prev) => prev.slice(0, -1));

    message.success('已撤销上一次操作');
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

    message.success(`已接受更改: ${path}`);
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

    message.warning(`已拒绝更改: ${path}`);
  };

  const handleCopyToClipboard = async (content: any, label: string) => {
    try {
      const jsonString = JSON.stringify(content, null, 2);
      await navigator.clipboard.writeText(jsonString);
      message.success(`${label}已复制到剪贴板`);
    } catch (err) {
      message.error('复制失败，请手动复制');
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
    const newAccepted = new Set<string>();
    diffItems.forEach((item) => {
      newAccepted.add(item.path);
    });
    setAcceptedChanges(newAccepted);
    setRejectedChanges(new Set());
    message.success(`已接受所有 ${diffItems.length} 个更改`);
  };

  // 一键拒绝所有更改
  const handleRejectAll = () => {
    const newRejected = new Set<string>();
    diffItems.forEach((item) => {
      newRejected.add(item.path);
    });
    setRejectedChanges(newRejected);
    setAcceptedChanges(new Set());
    message.warning(`已拒绝所有 ${diffItems.length} 个更改`);
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

      // 使用双指针算法对齐
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

        // 两边都有行，需要判断如何对齐
        const leftDiff = leftLine ? diffPathMap.get(leftLine.path) : null;
        const rightDiff = rightLine ? diffPathMap.get(rightLine.path) : null;

        // 如果左边是删除的内容
        if (leftDiff && leftDiff.type === 'removed') {
          // 需要找到删除块的结束位置
          const deletedPath = leftLine.path;
          let endIdx = leftIdx;

          // 找到所有属于这个删除块的行
          while (endIdx < leftLines.length) {
            const nextLine = leftLines[endIdx];
            if (!nextLine.path.startsWith(deletedPath) && nextLine.path !== deletedPath) {
              // 如果下一行不是删除内容的子路径，检查是否是删除内容的结束
              const nextDiff = diffPathMap.get(nextLine.path);
              if (!nextDiff || nextDiff.type !== 'removed') {
                break;
              }
            }
            endIdx++;
          }

          // 添加所有删除的行，右边留空
          for (let i = leftIdx; i < endIdx; i++) {
            alignedRows.push({ left: leftLines[i], right: undefined });
          }
          leftIdx = endIdx;
        }
        // 如果右边是新增的内容
        else if (rightDiff && rightDiff.type === 'added') {
          // 需要找到新增块的结束位置
          const addedPath = rightLine.path;
          let endIdx = rightIdx;

          // 找到所有属于这个新增块的行
          while (endIdx < rightLines.length) {
            const nextLine = rightLines[endIdx];
            if (!nextLine.path.startsWith(addedPath) && nextLine.path !== addedPath) {
              // 如果下一行不是新增内容的子路径，检查是否是新增内容的结束
              const nextDiff = diffPathMap.get(nextLine.path);
              if (!nextDiff || nextDiff.type !== 'added') {
                break;
              }
            }
            endIdx++;
          }

          // 添加所有新增的行，左边留空
          for (let i = rightIdx; i < endIdx; i++) {
            alignedRows.push({ left: undefined, right: rightLines[i] });
          }
          rightIdx = endIdx;
        }
        // 其他情况（包括修改和无差异的内容）
        else {
          alignedRows.push({ left: leftLine, right: rightLine });
          leftIdx++;
          rightIdx++;
        }
      }

      // 渲染单行
      const renderLine = (line: JsonLine | undefined, isLeft: boolean) => {
        if (!line) {
          return <div style={{ minHeight: '20px', padding: '2px 0' }}>&nbsp;</div>;
        }

        const diffItem = diffPathMap.get(line.path);
        const isDiff = line.isDiff;
        const isAccepted = acceptedChanges.has(line.path);
        const isRejected = rejectedChanges.has(line.path);

        return (
          <div
            style={{
              display: 'flex',
              minHeight: '20px',
              padding: '2px 0',
              backgroundColor: isDiff
                ? line.diffType === 'added'
                  ? '#f6ffed'
                  : line.diffType === 'removed'
                    ? '#fff2f0'
                    : '#e6f7ff'
                : 'transparent',
              borderLeft: isDiff
                ? `3px solid ${
                    line.diffType === 'added'
                      ? '#52c41a'
                      : line.diffType === 'removed'
                        ? '#ff4d4f'
                        : '#1890ff'
                  }`
                : 'none',
              paddingLeft: isDiff ? '5px' : '8px',
            }}
          >
            <span
              style={{
                color: '#999',
                minWidth: '40px',
                marginRight: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                userSelect: 'none',
                flexShrink: 0,
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

              {/* 操作按钮 */}
              {isDiff &&
                diffItem &&
                ((isLeft && diffItem.type === 'removed') ||
                  (!isLeft && (diffItem.type === 'added' || diffItem.type === 'modified'))) && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginRight: 8,
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                    }}
                  >
                    {isAccepted ? (
                      <span
                        style={{
                          color: '#52c41a',
                          fontSize: '11px',
                          padding: '1px 4px',
                          backgroundColor: '#f6ffed',
                          borderRadius: '2px',
                          border: '1px solid #b7eb8f',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        已接受
                      </span>
                    ) : isRejected ? (
                      <span
                        style={{
                          color: '#fa8c16',
                          fontSize: '11px',
                          padding: '1px 4px',
                          backgroundColor: '#fff7e6',
                          borderRadius: '2px',
                          border: '1px solid #ffd591',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        已拒绝
                      </span>
                    ) : (
                      <>
                        <Button
                          type='primary'
                          size='small'
                          onClick={() => handleAcceptChange(line.path, diffItem.newValue)}
                          style={{
                            fontSize: '10px',
                            height: '18px',
                            padding: '0 4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          接受
                        </Button>
                        <Button
                          size='small'
                          onClick={() => handleRejectChange(line.path)}
                          style={{
                            fontSize: '10px',
                            height: '18px',
                            padding: '0 4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          拒绝
                        </Button>
                      </>
                    )}
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
            borderBottom: '1px solid #f0f0f0',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '50%',
              borderRight: '1px solid #e8e8e8',
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
            backgroundColor: '#fff',
            border: '1px solid #d9d9d9',
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
      <div className='json-diff-container'>
        {/* 全局操作按钮 */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type='text'
              icon={<CopyOutlined />}
              size='small'
              onClick={() => handleCopyToClipboard(originJson, '原始数据')}
            >
              复制原始数据
            </Button>
            <Button
              type='text'
              icon={<CopyOutlined />}
              size='small'
              onClick={() => handleCopyToClipboard(AIJson, 'AI建议数据')}
            >
              复制AI建议
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type='primary'
              icon={<CheckOutlined />}
              onClick={handleAcceptAll}
              disabled={diffItems.length === 0}
            >
              接受所有更改 ({diffItems.length})
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={handleRejectAll}
              disabled={diffItems.length === 0}
            >
              拒绝所有更改
            </Button>
            <Button
              icon={<UndoOutlined />}
              onClick={handleUndo}
              disabled={operationHistory.length === 0}
            >
              撤销
            </Button>
          </div>
        </div>

        {/* 标题栏 */}
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #1890ff',
            backgroundColor: '#fafafa',
            fontWeight: 'bold',
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRight: '1px solid #e8e8e8',
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              原始数据
            </Title>
          </div>
          <div
            style={{
              flex: 1,
              padding: '8px 16px',
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              AI 建议数据
            </Title>
          </div>
        </div>

        {/* 使用新的并排渲染 */}
        {renderSideBySideDiff()}

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
        title={<Space>AI 数据校验</Space>}
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
          {renderDiffContent()}
        </Spin>
      </Modal>
    </>
  );
};

export default AISuggestion;
