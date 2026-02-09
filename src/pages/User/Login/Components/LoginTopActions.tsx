import { DarkMode, SelectLang } from '@/components/RightContent';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import type React from 'react';
import { useRef, useState } from 'react';
import { useIntl } from 'umi';

type TopActionType = 'dark' | 'lang' | 'help';

interface LoginTopActionsProps {
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
}

const LoginTopActions: React.FC<LoginTopActionsProps> = ({ isDarkMode, onDarkModeToggle }) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [hoveredAction, setHoveredAction] = useState<TopActionType | null>(null);
  const actionColor = token.colorTextTertiary ?? token.colorTextSecondary;
  const actionHoverBg = token.colorBgTextHover;
  const langActionRef = useRef<HTMLDivElement>(null);
  const docsBaseUrl = 'https://docs.tiangong.earth';
  const locale = intl?.locale?.toLowerCase() || 'zh';
  const docsUrl = locale.startsWith('en') ? `${docsBaseUrl}/en` : docsBaseUrl;

  const handleOpenDocs = () => {
    window.open(docsUrl);
  };

  const handleLanguageFrameClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Keep native SelectLang behavior when clicking its own trigger.
    if (event.target !== event.currentTarget) {
      return;
    }
    const trigger = langActionRef.current?.querySelector<HTMLElement>(
      'button, [role="button"], .ant-dropdown-trigger, a, span',
    );
    trigger?.click();
  };

  return (
    <div
      data-testid='login-top-actions'
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        data-testid='login-dark-mode'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2px',
          cursor: 'pointer',
          fontSize: 16,
          borderRadius: token.borderRadius,
          color: actionColor,
        }}
        onMouseEnter={() => setHoveredAction('dark')}
        onMouseLeave={() => setHoveredAction(null)}
      >
        <div
          role='button'
          aria-label='toggle-dark-mode'
          onClick={onDarkModeToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            minWidth: 28,
            minHeight: 28,
            borderRadius: token.borderRadius,
            backgroundColor: hoveredAction === 'dark' ? actionHoverBg : undefined,
          }}
        >
          <div style={{ pointerEvents: 'none', lineHeight: 1 }}>
            <DarkMode handleClick={undefined} isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
      <div
        data-testid='login-language'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2px',
          cursor: 'pointer',
          fontSize: 16,
          borderRadius: token.borderRadius,
          color: actionColor,
        }}
        onMouseEnter={() => setHoveredAction('lang')}
        onMouseLeave={() => setHoveredAction(null)}
      >
        <div
          ref={langActionRef}
          role='button'
          aria-label='open-language-menu'
          onClick={handleLanguageFrameClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            minWidth: 28,
            minHeight: 28,
            borderRadius: token.borderRadius,
            backgroundColor: hoveredAction === 'lang' ? actionHoverBg : undefined,
          }}
        >
          <SelectLang style={{ padding: 0, color: actionColor }} />
        </div>
      </div>
      <div
        data-testid='login-help'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2px',
          cursor: 'pointer',
          fontSize: 16,
          borderRadius: token.borderRadius,
          color: actionColor,
        }}
        onMouseEnter={() => setHoveredAction('help')}
        onMouseLeave={() => setHoveredAction(null)}
      >
        <div
          role='button'
          aria-label='open-help-docs'
          onClick={handleOpenDocs}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            minWidth: 28,
            minHeight: 28,
            borderRadius: token.borderRadius,
            backgroundColor: hoveredAction === 'help' ? actionHoverBg : undefined,
          }}
        >
          <QuestionCircleOutlined />
        </div>
      </div>
    </div>
  );
};

export default LoginTopActions;
