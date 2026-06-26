import { useMemo } from 'react';
import { usePromotionStrategies } from './usePromotionStrategies';
import { getApplicationSource } from '../utils/application';
import { extractRepoPath } from '../utils/promotion';
import type { ApplicationResource, PromotionStrategyResource } from '../types';

export function useMatchingStrategy(
  app: ApplicationResource | undefined,
  namespace?: string,
): [PromotionStrategyResource | null, boolean, Error | null] {
  const [strategies, loaded, error] = usePromotionStrategies(namespace);

  const match = useMemo(() => {
    if (!loaded || strategies.length === 0 || !app) return null;
    const repoURL = getApplicationSource(app)?.repoURL ?? '';
    if (!repoURL) return null;
    const repoPath = extractRepoPath(repoURL);
    return strategies.find((s) => {
      const envRepoURL = s.status?.environments?.[0]?.proposed?.dry?.repoURL ?? '';
      if (!envRepoURL) return false;
      return extractRepoPath(envRepoURL) === repoPath;
    }) ?? null;
  }, [strategies, loaded, app]);

  return [match, loaded, error];
}
