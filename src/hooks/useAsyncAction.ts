"use client";

import { useCallback, useState } from "react";

type AsyncFn<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

type UseAsyncActionResult<TArgs extends unknown[], TResult> = {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
};

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: AsyncFn<TArgs, TResult>,
): UseAsyncActionResult<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  const run = useCallback(
    async (...args: TArgs) => {
      setIsPending(true);
      setError(null);
      try {
        return await action(...args);
      } catch (err) {
        const next =
          err instanceof Error ? err : new Error("Something went wrong");
        setError(next);
        throw next;
      } finally {
        setIsPending(false);
      }
    },
    [action],
  );

  return { run, isPending, error, reset };
}
