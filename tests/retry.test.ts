import { withRetrySync } from '../src/utils/retry';

describe('withRetrySync', () => {
  it('returns the result immediately on first success', () => {
    expect(withRetrySync(() => 42)).toBe(42);
  });

  it('retries on failure and succeeds on a later attempt', () => {
    let calls = 0;
    const result = withRetrySync(
      () => {
        calls++;
        if (calls < 3) throw new Error('transient');
        return 'ok';
      },
      3,
      0
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws after all attempts are exhausted', () => {
    let calls = 0;
    expect(() =>
      withRetrySync(
        () => {
          calls++;
          throw new Error('always fails');
        },
        3,
        0
      )
    ).toThrow('always fails');
    expect(calls).toBe(3);
  });

  it('respects maxAttempts of 1 (no retries)', () => {
    let calls = 0;
    expect(() =>
      withRetrySync(
        () => {
          calls++;
          throw new Error('fail');
        },
        1,
        0
      )
    ).toThrow();
    expect(calls).toBe(1);
  });
});
