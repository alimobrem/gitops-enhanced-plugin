import { ScmProviderGroupVersionKind } from '../models';
import { usePromoterResource } from './usePromoterResource';

export function useScmProviders(
  namespace?: string,
): [Array<Record<string, unknown>>, boolean, Error | null] {
  return usePromoterResource(ScmProviderGroupVersionKind, namespace);
}
