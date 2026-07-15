import { useEffect, useState } from 'react';

/**
 * Generic data-fetching hook.
 *
 * @param {() => Promise<any>} fetchFn  — async function that returns data (e.g. api.getAthletes)
 * @param {any[]}              deps     — dependency array (defaults to [fetchFn])
 * @returns {{ data, loading, error }}
 */
export default function useFetch(fetchFn, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? [fetchFn]);

  return { data, loading, error };
}
