import { useCallback, useEffect, useState } from 'react';

type State<T> = { data: T | undefined; error: unknown; for: unknown };

/**
 * Runs `fn` whenever its identity changes (wrap it in useCallback) and keeps the
 * latest result. `loading` is true until the current `fn` has settled; the
 * previous data stays visible meanwhile. `reload()` re-runs it and resolves when done
 * (for pull-to-refresh).
 */
export function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, for: null });

  useEffect(() => {
    let active = true;
    fn().then(
      (data) => active && setState({ data, error: null, for: fn }),
      (error) => active && setState((s) => ({ ...s, error, for: fn })),
    );
    return () => {
      active = false;
    };
  }, [fn]);

  const reload = useCallback(async () => {
    try {
      const data = await fn();
      setState({ data, error: null, for: fn });
    } catch (error) {
      setState((s) => ({ ...s, error, for: fn }));
    }
  }, [fn]);

  return { data: state.data, error: state.error, loading: state.for !== fn, reload, setData: (data: T) => setState({ data, error: null, for: fn }) };
}
