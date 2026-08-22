jest.unmock('@/contexts/AntdAppContext');

import {
  AntdAppApiRegistrar,
  dispatchAntdAppAction,
  useAntdAppApi,
} from '@/contexts/AntdAppContext';
import { act, render, waitFor } from '@testing-library/react';

const mockAppApi: any = {
  message: { error: jest.fn() },
  modal: { confirm: jest.fn() },
  notification: { open: jest.fn() },
};
let mockActiveAppApi = mockAppApi;

jest.mock('antd', () => {
  const React = jest.requireActual('react');
  const App = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  App.useApp = () => mockActiveAppApi;

  return {
    __esModule: true,
    App,
    get message() {
      throw new Error('Ant Design static message API must not be accessed');
    },
  };
});

describe('AntdAppContext', () => {
  beforeEach(() => {
    mockActiveAppApi = mockAppApi;
  });

  it('queues before mount, flushes in order, dispatches immediately, and queues again after unmount', async () => {
    const ApiConsumer = () => {
      useAntdAppApi();
      return null;
    };
    const calls: string[] = [];
    const consumer = render(<ApiConsumer />);
    dispatchAntdAppAction((api) => calls.push(api === mockAppApi ? 'queued-1' : 'wrong-api'));
    dispatchAntdAppAction((api) => calls.push(api === mockAppApi ? 'queued-2' : 'wrong-api'));

    expect(calls).toEqual([]);
    consumer.unmount();

    const firstProvider = render(<AntdAppApiRegistrar>ready</AntdAppApiRegistrar>);
    await waitFor(() => expect(calls).toEqual(['queued-1', 'queued-2']));

    act(() => {
      dispatchAntdAppAction((api) => calls.push(api === mockAppApi ? 'immediate' : 'wrong-api'));
    });
    expect(calls).toEqual(['queued-1', 'queued-2', 'immediate']);

    firstProvider.unmount();
    dispatchAntdAppAction((api) =>
      calls.push(api === mockAppApi ? 'queued-after-unmount' : 'wrong-api'),
    );
    expect(calls).toEqual(['queued-1', 'queued-2', 'immediate']);

    const secondProvider = render(<AntdAppApiRegistrar>ready again</AntdAppApiRegistrar>);
    await waitFor(() =>
      expect(calls).toEqual(['queued-1', 'queued-2', 'immediate', 'queued-after-unmount']),
    );
    secondProvider.unmount();
  });

  it('keeps the previous registrar available while a newer registrar owns dispatch', () => {
    const firstCalls: string[] = [];
    const secondCalls: string[] = [];
    const secondApi = {
      message: { error: jest.fn() },
      modal: { confirm: jest.fn() },
      notification: { open: jest.fn() },
    } as any;

    const firstProvider = render(<AntdAppApiRegistrar>first</AntdAppApiRegistrar>);
    mockActiveAppApi = secondApi;
    const secondProvider = render(<AntdAppApiRegistrar>second</AntdAppApiRegistrar>);

    act(() => {
      dispatchAntdAppAction((api) =>
        secondCalls.push(api === secondApi ? 'second' : 'unexpected-api'),
      );
    });
    expect(secondCalls).toEqual(['second']);

    secondProvider.unmount();
    act(() => {
      dispatchAntdAppAction((api) =>
        firstCalls.push(api === mockAppApi ? 'first' : 'unexpected-api'),
      );
    });
    expect(firstCalls).toEqual(['first']);

    firstProvider.unmount();
  });
});
