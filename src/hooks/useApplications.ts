import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationGroupVersionKind } from '../models';
import type { ApplicationResource } from '../types';

export function useApplications(
  namespace?: string,
): [ApplicationResource[], boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] =
    useK8sWatchResource<ApplicationResource[]>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
