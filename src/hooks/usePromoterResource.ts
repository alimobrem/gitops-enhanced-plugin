import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';

interface GroupVersionKind {
  group: string;
  version: string;
  kind: string;
}

export function usePromoterResource<T = Record<string, unknown>>(
  gvk: GroupVersionKind,
  namespace?: string,
): [T[], boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: gvk,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] = useK8sWatchResource<T[]>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
