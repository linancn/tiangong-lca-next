import { QuestionCircleOutlined, MoonOutlined, SunFilled } from '@ant-design/icons';
import { SelectLang as UmiSelectLang } from '@umijs/max';
import { ConfigProvider, theme } from 'antd';

const { defaultAlgorithm, darkAlgorithm } = theme;

export const SelectLang = () => {
  return (
    <UmiSelectLang
      style={{
        padding: 4,
      }}
    />
  );
};

export const Question = () => {
  return (
    <div
      style={{
        display: 'flex',
        height: 26,
      }}
      onClick={() => {
        window.open('https://www.tiangong.earth');
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
}