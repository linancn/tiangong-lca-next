import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  resolveCandidateReadinessBrowserName,
  waitForCandidateFrontendReady,
} from '../../../tests/e2e/i18n/candidate-readiness';

describe('candidate frontend readiness', () => {
  it('defaults to Chromium and accepts every configured browser project', () => {
    expect(resolveCandidateReadinessBrowserName(undefined)).toBe('chromium');
    expect(resolveCandidateReadinessBrowserName(' chromium ')).toBe('chromium');
    expect(resolveCandidateReadinessBrowserName('firefox')).toBe('firefox');
    expect(resolveCandidateReadinessBrowserName('webkit')).toBe('webkit');
    expect(() => resolveCandidateReadinessBrowserName('edge')).toThrow(
      'E2E_READINESS_BROWSER must name a configured Playwright browser project.',
    );
  });

  it('waits for the rendered login language control before releasing the test run', async () => {
    const waitFor = jest.fn().mockResolvedValue(undefined);
    const getByTestId = jest.fn(() => ({ waitFor }));
    const goto = jest.fn().mockResolvedValue(undefined);
    const page = { getByTestId, goto };
    const closeContext = jest.fn().mockResolvedValue(undefined);
    const newPage = jest.fn().mockResolvedValue(page);
    const context = { close: closeContext, newPage };
    const newContext = jest.fn().mockResolvedValue(context);
    const closeBrowser = jest.fn().mockResolvedValue(undefined);
    const browser = { close: closeBrowser, newContext };
    const guard = { blockedRequests: [] };
    const assertNoBlockedRequests = jest.fn();
    const installReadOnlyGuard = jest.fn().mockResolvedValue({ guard });
    const launchBrowser = jest.fn().mockResolvedValue(browser);

    await waitForCandidateFrontendReady('http://127.0.0.1:8123', 'firefox', 45_000, {
      assertNoBlockedRequests,
      installReadOnlyGuard,
      launchBrowser,
    } as never);

    expect(launchBrowser).toHaveBeenCalledWith('firefox');
    expect(newContext).toHaveBeenCalledWith({
      baseURL: 'http://127.0.0.1:8123',
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    expect(installReadOnlyGuard).toHaveBeenCalledWith(context);
    expect(goto).toHaveBeenCalledWith('/#/user/login?codex-e2e=frontend-readiness', {
      timeout: 45_000,
      waitUntil: 'domcontentloaded',
    });
    expect(getByTestId).toHaveBeenCalledWith('login-language-frame');
    expect(waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 45_000 });
    expect(assertNoBlockedRequests).toHaveBeenCalledWith(guard);
    expect(closeContext).toHaveBeenCalledTimes(1);
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('fails without page details and still closes partial browser resources', async () => {
    const closeContext = jest.fn().mockResolvedValue(undefined);
    const context = {
      close: closeContext,
      newPage: jest.fn().mockRejectedValue(new Error('sensitive page failure')),
    };
    const closeBrowser = jest.fn().mockResolvedValue(undefined);
    const browser = {
      close: closeBrowser,
      newContext: jest.fn().mockResolvedValue(context),
    };

    await expect(
      waitForCandidateFrontendReady('http://127.0.0.1:8123', 'chromium', 45_000, {
        assertNoBlockedRequests: jest.fn(),
        installReadOnlyGuard: jest.fn().mockResolvedValue({ guard: {} }),
        launchBrowser: jest.fn().mockResolvedValue(browser),
      } as never),
    ).rejects.toThrow('Candidate frontend did not become rendered and interactive in chromium.');
    expect(closeContext).toHaveBeenCalledTimes(1);
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('binds each CI browser job to the installed readiness browser', () => {
    const workflow = readFileSync(
      path.resolve(process.cwd(), '.github/workflows/i18n-semantic-e2e.yml'),
      'utf8',
    );
    expect(workflow).toContain('E2E_READINESS_BROWSER: ${{ matrix.browser }}');

    const globalSetup = readFileSync(
      path.resolve(process.cwd(), 'tests/e2e/i18n/global-setup.ts'),
      'utf8',
    );
    expect(globalSetup).toContain('await waitForCandidateFrontendReady(');
  });
});
