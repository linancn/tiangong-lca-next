import type { ReactNode } from 'react';
import React from 'react';

export const createAntdAppMock = (api: {
  message?: Record<string, jest.Mock>;
  modal?: Record<string, jest.Mock>;
  notification?: Record<string, jest.Mock>;
}) => {
  const App = ({ children }: { children?: ReactNode }) => <>{children}</>;
  App.useApp = () => api;
  return App;
};
