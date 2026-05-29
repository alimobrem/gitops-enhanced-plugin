import { useState, useEffect, useCallback } from 'react';
import { fetchManagedResources } from '../services/argocd-api';
import type { ManagedResource } from '../types/argocd-api';

export function useManagedResources(
  appName: string,
  namespace: string,
  instanceAlias?: string,
): {
  resources: ManagedResource[];
  loaded: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [resources, setResources] = useState<ManagedResource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      setLoaded(false);
      setError(null);
      try {
        const result = await fetchManagedResources(namespace, appName, instanceAlias);
        if (!cancelled) {
          setResources(result.items);
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

  return { resources, loaded, error, refetch };
}
