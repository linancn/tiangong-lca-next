import { initVersion, langOptions } from '@/services/general/data';

describe('general data constants', () => {
  it('exposes the supported language options in stable order', () => {
    expect(langOptions).toEqual([
      { value: 'en', label: 'English' },
      { value: 'zh', label: '简体中文' },
    ]);
  });

  it('keeps the default initial version string stable', () => {
    expect(initVersion).toBe('01.01.000');
  });
});
