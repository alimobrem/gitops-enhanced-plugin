import {
  useK8sWatchResource,
  type WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { ChangeTransferPolicyGroupVersionKind } from '../models';
import type { ChangeTransferPolicyResource } from '../types';

export function useChangeTransferPolicies(
  namespace?: string,
): [ChangeTransferPolicyResource[], boolean, Error | null] {
  const watchResource: WatchK8sResource = {
    groupVersionKind: ChangeTransferPolicyGroupVersionKind,
    isList: true,
    ...(namespace ? { namespace } : {}),
  };

  const [data, loaded, error] =
    useK8sWatchResource<ChangeTransferPolicyResource[]>(watchResource);
  return [data ?? [], loaded, error as Error | null];
}
