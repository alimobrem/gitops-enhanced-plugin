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

  const fetchData = useCallback(async () => {
    setLoaded(false);
    setError(null);
    try {
      const result = await fetchManagedResources(namespace, appName, instanceAlias);
      setResources(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoaded(true);
    }
  }, [appName, namespace, instanceAlias]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { resources, loaded, error, refetch: fetchData };
}
