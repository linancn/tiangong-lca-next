import { render, RenderOptions } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';

/**
 * Custom render function that wraps components with necessary providers
 * @param ui - Component to render
 * @param options - Additional render options
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ConfigProvider>{children}</ConfigProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0);
  });

/**
 * Create mock function with type safety
 */
export const createMockFn = <T extends (...args: any[]) => any>(): jest.MockedFunction<T> => {
  return jest.fn() as unknown as jest.MockedFunction<T>;
};

/**
 * Mock console methods for testing
 */
export const mockConsole = () => {
  const originalConsole = { ...console };

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });
};

/**
 * Create a Promise that resolves after a delay
 */
export const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
