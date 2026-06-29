import { GitRepositoryGroupVersionKind } from '../models';
import { usePromoterResource } from './usePromoterResource';

export function useGitRepositories(
  namespace?: string,
): [Array<Record<string, unknown>>, boolean, Error | null] {
  return usePromoterResource(GitRepositoryGroupVersionKind, namespace);
}
