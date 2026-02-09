import { MoonOutlined, QuestionCircleOutlined, SunFilled } from '@ant-design/icons';
import { SelectLang as UmiSelectLang, useIntl } from '@umijs/max';
import { ConfigProvider, theme } from 'antd';
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
    />
  );
};

export const Question = () => {
  const intl = useIntl();
  const docsBaseUrl = 'https://docs.tiangong.earth';
  const locale = intl?.locale?.toLowerCase() || 'zh';
  const docsUrl = locale.startsWith('en') ? `${docsBaseUrl}/en` : docsBaseUrl;

  return (
    <div
      style={{
        display: 'flex',
        height: 26,
      }}
      onClick={() => {
        window.open(docsUrl);
      }}
    >
      <QuestionCircleOutlined />
    </div>
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
