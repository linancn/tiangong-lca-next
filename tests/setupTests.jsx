import '@testing-library/jest-dom';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import React from 'react';
import { TextDecoder, TextEncoder } from 'util';

if (typeof global.React === 'undefined') {
  global.React = React;
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = WritableStream;
}

if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = TransformStream;
}

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(),
});

class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg) {
    this.onmessage(msg);
  }
}

window.Worker = Worker;

/* eslint-disable global-require */
if (typeof window !== 'undefined') {
  // ref: https://github.com/ant-design/ant-design/issues/18774
  if (!window.matchMedia) {
    Object.defineProperty(global.window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  }

  if (!window.matchMedia) {
    Object.defineProperty(global.window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn((query) => ({
        matches: query.includes('max-width'),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  }
}

const errorLog = console.error;
const shouldFailOnActWarning =
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  process.env.FAIL_ON_ACT_WARNING === 'true' ||
  process.env.FAIL_ON_ACT_WARNING === '1';

const actWarningRecords = [];
let actWarningsThisTest = 0;

beforeEach(() => {
  actWarningsThisTest = 0;
});

afterEach(() => {
  if (!shouldFailOnActWarning || actWarningsThisTest === 0) {
    return;
  }

  const currentTestName = global.expect?.getState?.().currentTestName;
  const testLabel = currentTestName ? ` in "${currentTestName}"` : '';
  const countLabel =
    actWarningsThisTest === 1
      ? '1 React act(...) warning'
      : `${actWarningsThisTest} React act(...) warnings`;
  throw new Error(
    `${countLabel} detected${testLabel}. Fix the test by awaiting async UI updates (e.g. await userEvent interactions, await waitFor(...), or use findBy* queries).`,
  );
});

afterAll(() => {
  if (actWarningRecords.length === 0) {
    return;
  }

  const sampleLimit = 5;
  const samples = actWarningRecords
    .slice(0, sampleLimit)
    .map(({ testName, message }) => `- ${testName || '<unknown test>'}: ${message}`)
    .join('\n');

  errorLog(
    `\n[tests] React act(...) warnings ${shouldFailOnActWarning ? 'detected' : 'suppressed'}: ${
      actWarningRecords.length
    }\n${samples}${
      actWarningRecords.length > sampleLimit
        ? `\n- ... (${actWarningRecords.length - sampleLimit} more)`
        : ''
    }\nSet FAIL_ON_ACT_WARNING=1 to fail locally.\n`,
  );
});

Object.defineProperty(global.window.console, 'error', {
  writable: true,
  configurable: true,
  value: (...rest) => {
    const logStr = rest.map((item) => (typeof item === 'string' ? item : String(item))).join(' ');
    const isActWarning =
      logStr.includes('was not wrapped in act(...)') &&
      (logStr.includes('inside a test') || logStr.includes('not wrapped in act'));

    if (isActWarning) {
      actWarningsThisTest += 1;

      const testName = global.expect?.getState?.().currentTestName;
      actWarningRecords.push({ testName, message: logStr });

      if (!shouldFailOnActWarning) {
        return;
      }
    }

    errorLog(...rest);
  },
});
