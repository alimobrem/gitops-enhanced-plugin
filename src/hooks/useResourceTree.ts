import { useState, useEffect, useCallback } from 'react';
import { fetchResourceTree } from '../services/argocd-api';
import type { ApplicationTree } from '../types/argocd-api';

export function useResourceTree(
  appName: string,
  namespace: string,
  instanceAlias?: string,
): {
  tree: ApplicationTree | null;
  loaded: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [tree, setTree] = useState<ApplicationTree | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      setLoaded(false);
      setError(null);
      try {
        const result = await fetchResourceTree(namespace, appName, instanceAlias);
        if (!cancelled) {
          setTree(result);
          setLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoaded(true);
        }
      }
    };
    doFetch();
    return () => { cancelled = true; };
  }, [appName, namespace, instanceAlias, fetchCount]);

  const refetch = useCallback(() => setFetchCount((c) => c + 1), []);

  return { tree, loaded, error, refetch };
}
