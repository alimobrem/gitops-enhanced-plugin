import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

interface UserResource {
  metadata: { name: string };
}

export function useCurrentUser(): string {
  const [user] = useK8sWatchResource<UserResource>({
    groupVersionKind: { group: 'user.openshift.io', version: 'v1', kind: 'User' },
    name: '~',
  });
  return user?.metadata?.name ?? 'unknown';
}
