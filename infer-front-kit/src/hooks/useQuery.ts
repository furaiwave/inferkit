import { useState, useEffect, useCallback, useRef } from 'react';

export type QueryState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error';   error: Error };

export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps:    unknown[] = [],
  enabled = true,
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({ status: 'idle' });
  const abort  = useRef<AbortController | null>(null);
  const fnRef  = useRef(fetcher);
  fnRef.current = fetcher;

  const run = useCallback(async () => {
    abort.current?.abort();
    abort.current = new AbortController();
    setState({ status: 'loading' });
    try {
      const data = await fnRef.current();
      setState({ status: 'success', data });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!enabled) return;
    void run();
    return () => abort.current?.abort();
  }, [run, enabled]);

  return { ...state, refetch: run };
}

export type MutationState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error';   error: Error };

export function useMutation<TData, TArgs = void>(
  fn: (args: TArgs) => Promise<TData>,
): { state: MutationState<TData>; mutate: (args: TArgs) => Promise<TData | null>; reset: () => void } {
  const [state, setState] = useState<MutationState<TData>>({ status: 'idle' });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = useCallback(async (args: TArgs): Promise<TData | null> => {
    setState({ status: 'pending' });
    try {
      const data = await fnRef.current(args);
      setState({ status: 'success', data });
      return data;
    } catch (err) {
      setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      return null;
    }
  }, []);

  return { state, mutate, reset: useCallback(() => setState({ status: 'idle' }), []) };
}