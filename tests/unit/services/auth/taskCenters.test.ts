// @ts-nocheck
const flush = async () => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
};
function setup(authOverride?: any) {
  jest.resetModules();
  let callback: any;
  const auth =
    authOverride !== undefined
      ? authOverride
      : {
          getClaims: jest
            .fn()
            .mockResolvedValue({ data: { claims: { sub: 'owner-b' } }, error: null }),
          onAuthStateChange: jest.fn((listener) => {
            callback = listener;
            return { data: { subscription: { unsubscribe: jest.fn() } } };
          }),
        };
  const bind = [jest.fn(), jest.fn(), jest.fn()];
  jest.doMock('@/services/supabase', () => ({ supabase: { auth } }));
  jest.doMock('@/services/lca/taskCenter', () => ({ bindLcaTaskCenterOwner: bind[0] }));
  jest.doMock('@/services/tidasPackage/taskCenter', () => ({
    bindTidasPackageTaskCenterOwner: bind[1],
  }));
  jest.doMock('@/services/dataProducts/taskCenter', () => ({
    bindDataProductTaskCenterOwner: bind[2],
  }));
  const module = require('@/services/auth/taskCenters');
  const onIdentityChange = jest.fn();
  const subscription = module.subscribeToTaskCenterAuthChanges(onIdentityChange);
  return {
    module,
    auth,
    bind,
    subscription,
    onIdentityChange,
    event: (event, id) => callback(event, id ? { user: { id } } : null),
  };
}
describe('verified task-center auth ownership', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.dontMock('@/services/supabase');
    jest.dontMock('@/services/lca/taskCenter');
    jest.dontMock('@/services/tidasPackage/taskCenter');
    jest.dontMock('@/services/dataProducts/taskCenter');
  });
  it('invalidates cross-tab identity immediately and requests full app admission outside the SDK callback', async () => {
    const { module, auth, bind, event, subscription, onIdentityChange } = setup();
    module.bindTaskCenterOwner('owner-a');
    const staleAdmission = module.getTaskCenterIdentityGeneration();
    const notified = jest.fn();
    const unsubscribe = module.subscribeTaskCenterIdentity(notified);
    event('SIGNED_OUT', null);
    event('SIGNED_IN', 'owner-b');
    bind.forEach((mock) => expect(mock).toHaveBeenLastCalledWith(null));
    expect(auth.getClaims).not.toHaveBeenCalled();
    expect(module.bindTaskCenterOwner('owner-a', staleAdmission)).toBe(false);
    jest.runOnlyPendingTimers();
    await flush();
    bind.forEach((mock) => expect(mock).toHaveBeenLastCalledWith(null));
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledTimes(2);
    // A same-document lookup must not clear the reload barrier.
    expect(module.bindTaskCenterOwner('owner-b')).toBe(false);
    const generation = module.getTaskCenterIdentityGeneration();
    const calls = bind[0].mock.calls.length;
    event('TOKEN_REFRESHED', 'owner-b');
    event('SIGNED_IN', 'owner-b');
    jest.runOnlyPendingTimers();
    await flush();
    expect(module.getTaskCenterIdentityGeneration()).toBe(generation);
    expect(bind[0]).toHaveBeenCalledTimes(calls);
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
    expect(auth.getClaims).not.toHaveBeenCalled();
    unsubscribe();
    subscription.unsubscribe();
  });
  it('keeps anonymous startup unadmitted and preserves the foreign barrier across same-document clearing', async () => {
    const { module, auth, bind, event, subscription, onIdentityChange } = setup();
    event('INITIAL_SESSION', 'owner-b');
    jest.runOnlyPendingTimers();
    await flush();
    expect(auth.getClaims).not.toHaveBeenCalled();
    expect(onIdentityChange).not.toHaveBeenCalled();
    module.bindTaskCenterOwner('owner-a');
    event('SIGNED_IN', 'owner-b');
    expect(module.bindTaskCenterOwner(null)).toBe(true);
    expect(module.bindTaskCenterOwner('owner-b')).toBe(false);
    jest.runOnlyPendingTimers();
    await flush();
    bind.forEach((mock) => expect(mock).toHaveBeenLastCalledWith(null));
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('cancels an unsubscribed foreign reload and permits admission only in a fresh document', () => {
    const old = setup();
    old.module.bindTaskCenterOwner('owner-a');
    old.event('SIGNED_IN', 'owner-b');
    old.subscription.unsubscribe();
    jest.runOnlyPendingTimers();
    expect(old.onIdentityChange).not.toHaveBeenCalled();
    expect(old.module.bindTaskCenterOwner('owner-b')).toBe(false);
    const fresh = setup();
    expect(fresh.module.bindTaskCenterOwner('owner-b')).toBe(true);
    const generation = fresh.module.getTaskCenterIdentityGeneration();
    fresh.event('TOKEN_REFRESHED', 'owner-b');
    fresh.event('SIGNED_IN', 'owner-b');
    jest.runOnlyPendingTimers();
    expect(fresh.module.getTaskCenterIdentityGeneration()).toBe(generation);
    expect(fresh.onIdentityChange).not.toHaveBeenCalled();
    fresh.subscription.unsubscribe();
  });

  it('requests fresh application admission after cross-tab signout without reading claims or hydrating another owner', async () => {
    const { module, auth, bind, event, subscription, onIdentityChange } = setup();
    module.bindTaskCenterOwner('owner-a');
    event('SIGNED_OUT', null);
    expect(onIdentityChange).not.toHaveBeenCalled();
    bind.forEach((mock) => expect(mock).toHaveBeenLastCalledWith(null));
    jest.runOnlyPendingTimers();
    await flush();
    expect(auth.getClaims).not.toHaveBeenCalled();
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
    event('SIGNED_OUT', null);
    subscription.unsubscribe();
    jest.runOnlyPendingTimers();
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
  });

  it('does not let a same-document admission cancel a signout reload', () => {
    const { module, event, subscription, onIdentityChange } = setup();
    module.bindTaskCenterOwner('owner-a');
    event('SIGNED_OUT', null);
    expect(module.bindTaskCenterOwner('owner-b')).toBe(false);
    jest.runOnlyPendingTimers();
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('suppresses the superseded reload when auth notifications reenter through a synchronous subscriber', () => {
    const { module, event, subscription, onIdentityChange } = setup();
    module.bindTaskCenterOwner('owner-a');
    let changedAgain = false;
    const unsubscribe = module.subscribeTaskCenterIdentity(() => {
      if (!changedAgain) {
        changedAgain = true;
        event('SIGNED_IN', 'owner-c');
      }
    });
    event('SIGNED_IN', 'owner-b');
    jest.runOnlyPendingTimers();
    expect(onIdentityChange).toHaveBeenCalledTimes(1);
    expect(module.bindTaskCenterOwner('owner-c')).toBe(false);
    unsubscribe();
    subscription.unsubscribe();
  });

  it('normalizes owner identity and permits duplicate admission without restarting domain recovery', () => {
    const { module, bind, subscription } = setup();
    module.bindTaskCenterOwner(' owner-a ');
    const generation = module.getTaskCenterIdentityGeneration();
    module.bindTaskCenterOwner('owner-a');
    expect(module.getTaskCenterIdentityGeneration()).toBe(generation);
    module.bindTaskCenterOwner(' ');
    bind.forEach((mock) => expect(mock).toHaveBeenLastCalledWith(null));
    subscription.unsubscribe();
  });
  it.each([null, 17, { getClaims: jest.fn() }, () => undefined])(
    'supports isolated bootstrap without an SDK event surface',
    (auth) => {
      expect(setup(auth).subscription).toBeUndefined();
    },
  );
});
