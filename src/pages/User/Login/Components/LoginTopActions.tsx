import { DarkMode, SelectLang } from '@/components/RightContent';
import { hasLocaleFallback } from '@/services/general/localeRegistry';
import { getDocumentationUrl, normalizeRuntimeLocale } from '@/services/general/runtimeLocale';
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
  const locale = normalizeRuntimeLocale(intl?.locale);
  const docsUrl = getDocumentationUrl(locale);
  const usesEnglishFallback = hasLocaleFallback(locale, 'documentationLocale');
  const helpLabel = intl.formatMessage({
    id: usesEnglishFallback
      ? 'component.globalHeader.help.englishFallback'
      : 'component.globalHeader.help',
    defaultMessage: usesEnglishFallback
      ? 'Open help documentation (English)'
      : 'Open help documentation',
  });

  const handleOpenDocs = () => {
    window.open(docsUrl);
  };

  const openLanguageMenu = () => {
    const trigger = langActionRef.current?.querySelector<HTMLElement>(
      '.ant-dropdown-trigger, button, [role="button"], a, span',
    );
    trigger?.click();
  };

  const handleLanguageFrameClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Keep native SelectLang behavior when clicking its own trigger.
    if (event.target !== event.currentTarget) {
      return;
    }
    openLanguageMenu();
  };

  const handleActionKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    activate: () => void,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
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
          backgroundColor: hoveredAction === 'dark' ? actionHoverBg : undefined,
        }}
        onMouseEnter={() => setHoveredAction('dark')}
        onMouseLeave={() => setHoveredAction(null)}
      >
        <DarkMode handleClick={onDarkModeToggle} isDarkMode={isDarkMode} />
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
          data-testid='login-language-frame'
          role='button'
          tabIndex={0}
          aria-label={intl.formatMessage({
            id: 'pages.lang.select',
            defaultMessage: 'Select a language',
          })}
          onClick={handleLanguageFrameClick}
          onKeyDown={(event) => handleActionKeyDown(event, openLanguageMenu)}
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
          <SelectLang style={{ padding: 0, color: actionColor, fontSize: 16, lineHeight: 1 }} />
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
          tabIndex={0}
          aria-label={helpLabel}
          title={helpLabel}
          onClick={handleOpenDocs}
          onKeyDown={(event) => handleActionKeyDown(event, handleOpenDocs)}
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
