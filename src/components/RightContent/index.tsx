import {
  getDocumentationUrl,
  normalizeRuntimeLocale,
  SUPPORTED_APP_LOCALES,
} from '@/services/general/runtimeLocale';
import { MoonOutlined, QuestionCircleOutlined, SunFilled } from '@ant-design/icons';
import { SelectLang as UmiSelectLang, useIntl } from '@umijs/max';
import { ConfigProvider, theme } from 'antd';
import type React from 'react';
import { useRef } from 'react';

const { defaultAlgorithm, darkAlgorithm } = theme;

interface SelectLangProps {
  style?: React.CSSProperties;
}

type UmiSelectLangDropdownProps = React.ComponentProps<typeof UmiSelectLang> & {
  overlayClassName?: string;
};

const textOnlyLanguageDropdownProps: UmiSelectLangDropdownProps = {
  overlayClassName: 'tg-language-selector-dropdown',
};

export const SelectLang: React.FC<SelectLangProps> = ({ style }) => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const openLanguageMenu = () => {
    containerRef.current
      ?.querySelector<HTMLElement>('.ant-dropdown-trigger, button, [role="button"], a, span')
      ?.click();
  };

  return (
    <div
      ref={containerRef}
      role='button'
      tabIndex={0}
      aria-label={intl.formatMessage({
        id: 'pages.lang.select',
        defaultMessage: 'Select a language',
      })}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          openLanguageMenu();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLanguageMenu();
        }
      }}
    >
      <UmiSelectLang
        {...textOnlyLanguageDropdownProps}
        style={{
          padding: 4,
          ...style,
        }}
        postLocalesData={(locales) => {
          const localesByKey = new Map(locales.map((locale) => [locale.lang, locale]));
          return SUPPORTED_APP_LOCALES.map((locale) => {
            const existingLocale = localesByKey.get(locale) ?? { lang: locale };
            const localeWithoutIcon = { ...existingLocale };
            delete localeWithoutIcon.icon;

            if (locale !== 'de-DE') {
              return localeWithoutIcon;
            }

            return {
              ...localeWithoutIcon,
              lang: 'de-DE',
              label: 'Deutsch',
              title: 'Deutsch',
            };
          });
        }}
      />
    </div>
  );
};

export const Question = () => {
  const intl = useIntl();
  const locale = normalizeRuntimeLocale(intl?.locale);
  const docsUrl = getDocumentationUrl(locale);
  const isGermanEnglishFallback = locale === 'de-DE';
  const helpLabel = intl.formatMessage({
    id: isGermanEnglishFallback
      ? 'component.globalHeader.help.englishFallback'
      : 'component.globalHeader.help',
    defaultMessage: isGermanEnglishFallback ? 'Open help documentation (English)' : 'Help',
  });

  return (
    <button
      type='button'
      aria-label={helpLabel}
      title={helpLabel}
      style={{
        display: 'flex',
        height: 26,
        alignItems: 'center',
        padding: 0,
        color: 'inherit',
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
      }}
      onClick={() => {
        window.open(docsUrl);
      }}
    >
      <QuestionCircleOutlined />
    </button>
  );
};

interface DarkModeProps {
  handleClick: any;
  isDarkMode?: boolean;
}

export const DarkMode: React.FC<DarkModeProps> = ({ handleClick, isDarkMode }) => {
  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm }}>
      {isDarkMode ? <SunFilled onClick={handleClick} /> : <MoonOutlined onClick={handleClick} />}
    </ConfigProvider>
  );
};
