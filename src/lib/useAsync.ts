import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: Error };

/** Runs `fn` when `key` changes. `retry` reruns it. A null key means nothing to load. Stale results are dropped. */
export function useAsync<T>(key: string | null, fn: () => Promise<T>): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>(key ? { status: 'loading' } : { status: 'idle' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!key) { setState({ status: 'idle' }); return; }
    let live = true;
    setState({ status: 'loading' });
    fn().then((data) => live && setState({ status: 'ok', data }), (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  const retry = useCallback(() => setN((v) => v + 1), []);
  return { ...state, retry };
}
