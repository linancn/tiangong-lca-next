/**
 * Tests for RightContent components
 * Path: src/components/RightContent/index.tsx
 */

import { DarkMode, Question, SelectLang } from '@/components/RightContent';
import { fireEvent, render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type ConfigProviderProps = {
  children: ReactNode;
  theme: { algorithm: string };
};

type IconProps = {
  onClick?: () => void;
};

const configProviderThemes: string[] = [];

jest.mock('@ant-design/icons', () => ({
  MoonOutlined: ({ onClick }: IconProps) => (
    <button type='button' aria-label='moon-icon' onClick={onClick}>
      Moon
    </button>
  ),
  SunFilled: ({ onClick }: IconProps) => (
    <button type='button' aria-label='sun-icon' onClick={onClick}>
      Sun
    </button>
  ),
  QuestionCircleOutlined: () => (
    <button type='button' aria-label='question-icon'>
      ?
    </button>
  ),
}));

jest.mock('@umijs/max', () => ({
  SelectLang: ({ style }: { style?: Record<string, unknown> }) => (
    <div data-testid='select-lang' style={style ?? {}}>
      language selector
    </div>
  ),
  useIntl: () => ({
    locale: 'zh-CN',
  }),
}));

const mockWindowOpen = jest.fn();
const mockHandleClick = jest.fn();

const originalWindowOpen = global.open;

global.open = mockWindowOpen;

afterEach(() => {
  mockWindowOpen.mockClear();
  mockHandleClick.mockClear();
  configProviderThemes.length = 0;
});

jest.mock('antd', () => {
  const ConfigProvider = ({ children, theme }: ConfigProviderProps) => {
    configProviderThemes.push(theme.algorithm);
    return <div data-testid='config-provider'>{children}</div>;
  };

  const theme = {
    defaultAlgorithm: 'default-algorithm',
    darkAlgorithm: 'dark-algorithm',
  };

  return {
    ConfigProvider,
    theme,
  };
});

describe('RightContent Components', () => {
  it('renders dark mode toggle with moon icon by default and handles click', () => {
    render(<DarkMode handleClick={mockHandleClick} />);

    const toggle = screen.getByRole('button', { name: 'moon-icon' });

    expect(toggle).toBeInTheDocument();
    expect(configProviderThemes.pop()).toBe('default-algorithm');

    fireEvent.click(toggle);

    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('uses sun icon when dark mode is active', () => {
    render(<DarkMode handleClick={mockHandleClick} isDarkMode />);

    const toggle = screen.getByRole('button', { name: 'sun-icon' });

    expect(toggle).toBeInTheDocument();
    expect(configProviderThemes.pop()).toBe('dark-algorithm');

    fireEvent.click(toggle);

    expect(mockHandleClick).toHaveBeenCalledTimes(1);
  });

  it('opens documentation link when question icon is clicked', () => {
    render(<Question />);

    const button = screen.getByRole('button', { name: 'question-icon' });

    fireEvent.click(button);

    expect(mockWindowOpen).toHaveBeenCalledWith('https://docs.tiangong.earth');
  });

  it('renders the language selector with padding style', () => {
    render(<SelectLang />);

    const selector = screen.getByTestId('select-lang');

    expect(selector).toBeInTheDocument();
    expect(selector).toHaveStyle({ padding: '4px' });
  });
});
afterAll(() => {
  global.open = originalWindowOpen;
});
