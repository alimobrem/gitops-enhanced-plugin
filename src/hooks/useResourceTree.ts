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

  const fetchData = useCallback(async () => {
    setLoaded(false);
    setError(null);
    try {
      const result = await fetchResourceTree(namespace, appName, instanceAlias);
      setTree(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoaded(true);
    }
  }, [appName, namespace, instanceAlias]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { tree, loaded, error, refetch: fetchData };
}
