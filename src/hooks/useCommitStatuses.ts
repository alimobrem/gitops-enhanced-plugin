import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { PromoterCommitStatusGroupVersionKind } from '../models';
import type { CommitStatusResource } from '../types';

export function useCommitStatuses(
  namespace?: string,
): [CommitStatusResource[], boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: PromoterCommitStatusGroupVersionKind,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] =
    useK8sWatchResource<CommitStatusResource[]>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
