import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { GitRepositoryGroupVersionKind } from '../models';

export function useGitRepositories(
  namespace?: string,
): [Array<Record<string, unknown>>, boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: GitRepositoryGroupVersionKind,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] =
    useK8sWatchResource<Array<Record<string, unknown>>>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
