export class PortalHybridDeadlineError extends Error {
  constructor() {
    super('hybrid_timeout');
    this.name = 'PortalHybridDeadlineError';
  }
}

export class PortalHybridDeadline {
  readonly #controller = new AbortController();
  readonly #expiresAt: number;
  readonly #now: () => number;
  readonly #timeoutId: ReturnType<typeof setTimeout>;

  constructor(timeoutMs: number, now: () => number = () => performance.now(), startedAt?: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
      throw new PortalHybridDeadlineError();
    }
    this.#now = now;
    const resolvedStartedAt = startedAt ?? this.#readNow();
    if (!Number.isFinite(resolvedStartedAt)) throw new PortalHybridDeadlineError();
    this.#expiresAt = resolvedStartedAt + timeoutMs;
    const initialRemainingMs = Math.max(0, this.#expiresAt - this.#readNow());
    this.#timeoutId = setTimeout(() => this.#expire(), Math.ceil(initialRemainingMs));
    if (initialRemainingMs <= 0) this.#expire();
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  remainingMs(): number {
    if (this.signal.aborted) return 0;
    return Math.max(0, this.#expiresAt - this.#readNow());
  }

  isExpired(): boolean {
    if (this.signal.aborted || this.remainingMs() <= 0) {
      this.#expire();
      return true;
    }
    return false;
  }

  assertActive(): void {
    if (this.isExpired()) throw new PortalHybridDeadlineError();
  }

  async run<T>(operation: () => T | Promise<T>): Promise<T> {
    this.assertActive();
    const remainingMs = Math.max(1, Math.ceil(this.remainingMs()));
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const operationPromise = Promise.resolve().then(() => {
      this.assertActive();
      return operation();
    });
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        this.#expire();
        reject(new PortalHybridDeadlineError());
      }, remainingMs);
    });
    try {
      const result = await Promise.race([operationPromise, timeoutPromise]);
      this.assertActive();
      return result;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  detach(operation: () => void | Promise<void>, finalize?: () => void | Promise<void>): void {
    const remainingMs = this.remainingMs();
    if (remainingMs <= 0) {
      if (finalize) {
        void Promise.resolve()
          .then(finalize)
          .catch(() => undefined);
      }
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const operationPromise = Promise.resolve()
      .then(operation)
      .then(
        () => undefined,
        () => undefined,
      );
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, Math.max(1, Math.ceil(remainingMs)));
    });
    void Promise.race([operationPromise, timeoutPromise]).finally(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (finalize) {
        void Promise.resolve()
          .then(finalize)
          .catch(() => undefined);
      }
    });
  }

  dispose(): void {
    clearTimeout(this.#timeoutId);
  }

  #expire(): void {
    if (!this.signal.aborted) this.#controller.abort();
  }

  #readNow(): number {
    let value: number;
    try {
      value = this.#now();
    } catch (_error) {
      throw new PortalHybridDeadlineError();
    }
    if (!Number.isFinite(value)) throw new PortalHybridDeadlineError();
    return value;
  }
}

export function isPortalHybridDeadlineError(error: unknown): error is PortalHybridDeadlineError {
  return error instanceof PortalHybridDeadlineError;
}
