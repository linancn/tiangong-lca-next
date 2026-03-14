import {
  AimOutlined,
  CompressOutlined,
  CopyOutlined,
  ExpandOutlined,
  PartitionOutlined,
  RedoOutlined,
  SnippetsOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
// import 'tippy.js/dist/tippy.css';

import { useGraphEvent, useGraphInstance } from '@/contexts/graphContext';
import { applyDagreLayoutWithHistory } from '@/pages/LifeCycleModels/Components/toolbar/utils/layout';
import { Button, Space, Tooltip } from 'antd';
import { FormattedMessage } from 'umi';
import './styles/index.less';

export enum ControlEnum {
  Undo = 'undo',
  Redo = 'redo',
  Paste = 'paste',
  Duplicate = 'duplicate',
  ZoomTo = 'zoomTo',
  ZoomIn = 'zoomIn',
  ZoomOut = 'zoomOut',
  ZoomToFit = 'zoomToFit',
  ZoomToOrigin = 'zoomToOrigin',
  AutoLayoutLR = 'autoLayoutLR',
}

const dropDownItems = [
  {
    key: '1',
    label: '50%',
  },
  {
    key: '2',
    label: '75%',
  },
  {
    key: '3',
    label: '100%',
  },
  {
    key: '4',
    label: '125%',
  },
  {
    key: '5',
    label: '150%',
  },
];

const ControlActionList = [
  'undo',
  'redo',
  'paste',
  'duplicate',
  'zoomTo',
  'zoomIn',
  'zoomOut',
  'zoomToFit',
  'zoomToOrigin',
  'autoLayoutLR',
] as const;

type ControlAction = (typeof ControlActionList)[number];

interface ControlEditorActions {
  undo?: () => void;
  redo?: () => void;
  paste?: () => void;
  duplicate?: () => void;
}

interface ControlIProps {
  items: ControlAction[];
  direction?: 'horizontal' | 'vertical';
  placement?: 'top' | 'right' | 'bottom' | 'left';
  editorActions?: ControlEditorActions;
  canDuplicate?: boolean;
}

const Control = (props: ControlIProps) => {
  const { items, editorActions, canDuplicate = false } = props;

  const graph = useGraphInstance();

  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canPaste, setCanPaste] = useState(false);

  const refreshCommandState = useCallback(() => {
    if (!graph) {
      setCanUndo(false);
      setCanRedo(false);
      setCanPaste(false);
      return;
    }

    setCanUndo(graph.canUndo());
    setCanRedo(graph.canRedo());
    setCanPaste(!graph.isClipboardEmpty({ useLocalStorage: false }));
  }, [graph]);

  useGraphEvent('scale', ({ sx }: { sx: number }) => {
    setZoom(sx);
  });

  useGraphEvent('history:change', refreshCommandState);
  useGraphEvent('clipboard:changed', refreshCommandState);

  useEffect(() => {
    if (graph) {
      setZoom(graph.zoom());
    }
    refreshCommandState();
  }, [graph, refreshCommandState]);

  const ControlToolMap = {
    [ControlEnum.Undo]: {
      label: <FormattedMessage id='pages.button.model.undo' defaultMessage='Undo' />,
      icon: <UndoOutlined />,
    },
    [ControlEnum.Redo]: {
      label: <FormattedMessage id='pages.button.model.redo' defaultMessage='Redo' />,
      icon: <RedoOutlined />,
    },
    [ControlEnum.Paste]: {
      label: <FormattedMessage id='pages.button.model.paste' defaultMessage='Paste' />,
      icon: <SnippetsOutlined />,
    },
    [ControlEnum.Duplicate]: {
      label: (
        <FormattedMessage id='pages.button.model.duplicate' defaultMessage='Duplicate selection' />
      ),
      icon: <CopyOutlined />,
    },
    [ControlEnum.ZoomIn]: {
      label: <FormattedMessage id='pages.button.model.zoomIn' defaultMessage='Zoom In' />,
      icon: <ZoomInOutlined />,
    },
    [ControlEnum.ZoomOut]: {
      label: <FormattedMessage id='pages.button.model.zoomOut' defaultMessage='Zoom Out' />,
      icon: <ZoomOutOutlined />,
    },
    [ControlEnum.ZoomTo]: {
      label: <FormattedMessage id='pages.button.model.zoomTo' defaultMessage='Zoom To' />,
      icon: <AimOutlined />,
    },
    [ControlEnum.ZoomToFit]: {
      label: <FormattedMessage id='pages.button.model.zoomToFit' defaultMessage='Zoom To Fit' />,
      icon: <CompressOutlined />,
    },
    [ControlEnum.ZoomToOrigin]: {
      label: (
        <FormattedMessage id='pages.button.model.zoomToOrigin' defaultMessage='Zoom To Origin' />
      ),
      icon: <ExpandOutlined />,
    },
    [ControlEnum.AutoLayoutLR]: {
      label: <FormattedMessage id='pages.button.model.autoLayoutLR' defaultMessage='Auto Layout' />,
      icon: <PartitionOutlined />,
    },
  };

  const handleAction = (type: ControlAction, args?: string) => {
    if (!graph) return;
    const key = parseInt(args || '1', 10);
    const zoomNum = (0.25 * (key + 1)) as number;
    switch (type) {
      case ControlEnum.Undo:
        editorActions?.undo?.();
        break;
      case ControlEnum.Redo:
        editorActions?.redo?.();
        break;
      case ControlEnum.Paste:
        editorActions?.paste?.();
        break;
      case ControlEnum.Duplicate:
        editorActions?.duplicate?.();
        break;
      case ControlEnum.ZoomIn:
        if (zoom < 1.5) {
          graph.zoom(0.25);
        }
        break;
      case ControlEnum.ZoomOut:
        if (zoom > 0.5) {
          graph.zoom(-0.25);
        }
        break;
      case ControlEnum.ZoomToFit:
        graph.zoomToFit({ maxScale: 1 });
        break;
      case ControlEnum.ZoomToOrigin:
        graph.zoomTo(1);
        break;
      case ControlEnum.ZoomTo:
        graph.zoomTo(zoomNum);
        break;
      case ControlEnum.AutoLayoutLR: {
        const didLayout = applyDagreLayoutWithHistory(graph, 'LR');
        if (didLayout) {
          graph.zoomToFit({ maxScale: 1 });
        }
        break;
      }
    }
    setZoom(graph.zoom());
    refreshCommandState();
  };

  const isToolButtonEnabled = (type: ControlEnum) => {
    if (type === ControlEnum.Undo) {
      return canUndo;
    } else if (type === ControlEnum.Redo) {
      return canRedo;
    } else if (type === ControlEnum.Paste) {
      return canPaste;
    } else if (type === ControlEnum.Duplicate) {
      return canDuplicate;
    } else if (type === ControlEnum.ZoomIn) {
      return zoom < 1.5;
    } else if (type === ControlEnum.ZoomOut) {
      return zoom > 0.51;
    }
    return true;
  };

  return (
    <Space
      direction='horizontal'
      size={'middle'}
      style={{ position: 'absolute', right: 55, bottom: 10 }}
    >
      {items.map((tool) => {
        if (tool === 'zoomTo') {
          return (
            <Tooltip
              key={tool}
              title={
                <Space direction='vertical' size={'small'}>
                  {dropDownItems.map((item) => {
                    return (
                      <Button
                        key={item.key}
                        style={{ width: '50px' }}
                        onClick={() => handleAction(tool, item.key)}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Space>
              }
              placement='top'
            >
              {/* <button className="dropDownBtn">{`${Math.floor(zoom * 100)}%`}</button> */}
              <Button
                type='primary'
                size='small'
                onClick={() => handleAction(tool)}
                disabled={!isToolButtonEnabled(tool as ControlEnum)}
                style={{ fontSize: '8px', padding: '0', width: '24px', boxShadow: 'none' }}
              >
                {`${Math.floor(zoom * 100)}%`}
              </Button>
            </Tooltip>
          );
        } else if (ControlActionList.includes(tool)) {
          return (
            <Tooltip key={tool} title={ControlToolMap[tool].label} placement='top'>
              <Button
                type='primary'
                size='small'
                style={{ boxShadow: 'none' }}
                icon={ControlToolMap[tool].icon}
                onClick={() => handleAction(tool)}
                disabled={!isToolButtonEnabled(tool as ControlEnum)}
              />
            </Tooltip>
          );
        } else {
          return null;
        }
      })}
    </Space>
  );
};

export { Control };
