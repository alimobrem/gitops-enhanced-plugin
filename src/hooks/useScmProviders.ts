import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ScmProviderGroupVersionKind } from '../models';

export function useScmProviders(
  namespace?: string,
): [Array<Record<string, unknown>>, boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: ScmProviderGroupVersionKind,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] =
    useK8sWatchResource<Array<Record<string, unknown>>>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
