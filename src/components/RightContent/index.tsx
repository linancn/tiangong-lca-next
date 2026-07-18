import { getLocaleDefinition, hasLocaleFallback } from '@/services/general/localeRegistry';
import {
  getDocumentationUrl,
  normalizeRuntimeLocale,
  SUPPORTED_APP_LOCALES,
} from '@/services/general/runtimeLocale';
import { MoonOutlined, QuestionCircleOutlined, SunFilled } from '@ant-design/icons';
import { SelectLang as UmiSelectLang, useIntl } from '@umijs/max';
import { ConfigProvider, theme, Tooltip } from 'antd';
import type React from 'react';

const { defaultAlgorithm, darkAlgorithm } = theme;

interface SelectLangProps {
  style?: React.CSSProperties;
}

export const SelectLang: React.FC<SelectLangProps> = ({ style }) => {
  return (
    <UmiSelectLang
      style={{
        padding: 4,
        ...style,
      }}
      postLocalesData={(locales) => {
        const localesByKey = new Map(locales.map((locale) => [locale.lang, locale]));
        return SUPPORTED_APP_LOCALES.map((locale) => {
          const existingLocale = localesByKey.get(locale) ?? { lang: locale };
          const localeDefinition = getLocaleDefinition(locale);

          return {
            ...existingLocale,
            lang: locale,
            label: localeDefinition.nativeLabel,
            title: localeDefinition.nativeLabel,
          };
        });
      }}
    />
  );
};

export const Question = () => {
  const intl = useIntl();
  const locale = normalizeRuntimeLocale(intl?.locale);
  const docsUrl = getDocumentationUrl(locale);
  const usesEnglishFallback = hasLocaleFallback(locale, 'documentationLocale');
  const helpLabel = intl.formatMessage({
    id: usesEnglishFallback
      ? 'component.globalHeader.help.englishFallback'
      : 'component.globalHeader.help',
    defaultMessage: usesEnglishFallback ? 'Open help documentation (English)' : 'Help',
  });

  return (
    <Tooltip title={helpLabel}>
      <button
        type='button'
        className='tg-global-header-help-action'
        aria-label={helpLabel}
        onClick={() => {
          window.open(docsUrl);
        }}
      >
        <QuestionCircleOutlined />
      </button>
    </Tooltip>
  );
};

interface DarkModeProps {
  handleClick: any;
  isDarkMode?: boolean;
}

export const DarkMode: React.FC<DarkModeProps> = ({ handleClick, isDarkMode }) => {
  const intl = useIntl();
  const toggleLabel = intl.formatMessage({
    id: 'pages.theme.toggleDarkMode',
    defaultMessage: 'Toggle dark mode',
  });

  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm }}>
      <Tooltip title={toggleLabel}>
        <button
          type='button'
          className='tg-global-header-help-action'
          aria-label={toggleLabel}
          onClick={handleClick}
        >
          {isDarkMode ? <SunFilled aria-hidden /> : <MoonOutlined aria-hidden />}
        </button>
      </Tooltip>
    </ConfigProvider>
  );
};
