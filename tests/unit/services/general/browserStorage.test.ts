import { readBrowserStorage, writeBrowserStorage } from '@/services/general/browserStorage';

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
});

it('reads and writes available browser preferences', () => {
  expect(readBrowserStorage('preference')).toBeNull();
  writeBrowserStorage('preference', 'selected');
  expect(readBrowserStorage('preference')).toBe('selected');
});

it('tolerates denied reads and writes', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage denied', 'SecurityError');
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage denied', 'SecurityError');
  });
  expect(readBrowserStorage('preference')).toBeNull();
  expect(() => writeBrowserStorage('preference', 'selected')).not.toThrow();
});
