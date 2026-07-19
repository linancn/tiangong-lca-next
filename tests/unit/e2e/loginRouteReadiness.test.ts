import {
  LOGIN_ROUTE_READY_TIMEOUT_MS,
  waitForRenderedLoginControl,
} from '../../../tests/e2e/i18n/login-route-readiness';

describe('login route readiness', () => {
  it('waits for the rendered language control with the bounded page timeout', async () => {
    const waitFor = jest.fn().mockResolvedValue(undefined);
    const languageControl = { waitFor };
    const getByTestId = jest.fn().mockReturnValue(languageControl);

    await expect(waitForRenderedLoginControl({ getByTestId } as never)).resolves.toBe(
      languageControl,
    );

    expect(getByTestId).toHaveBeenCalledWith('login-language-frame');
    expect(waitFor).toHaveBeenCalledWith({
      state: 'visible',
      timeout: LOGIN_ROUTE_READY_TIMEOUT_MS,
    });
  });

  it('honors the longer candidate-startup timeout supplied by global setup', async () => {
    const waitFor = jest.fn().mockResolvedValue(undefined);
    const getByTestId = jest.fn().mockReturnValue({ waitFor });

    await waitForRenderedLoginControl({ getByTestId } as never, 180_000);

    expect(waitFor).toHaveBeenCalledWith({
      state: 'visible',
      timeout: 180_000,
    });
  });
});
