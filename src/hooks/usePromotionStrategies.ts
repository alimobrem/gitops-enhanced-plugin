import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { PromotionStrategyGroupVersionKind } from '../models';
import type { PromotionStrategyResource } from '../types';

export function usePromotionStrategies(
  namespace?: string,
): [PromotionStrategyResource[], boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: PromotionStrategyGroupVersionKind,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] =
    useK8sWatchResource<PromotionStrategyResource[]>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
