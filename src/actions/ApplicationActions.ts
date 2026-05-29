import { useRef, useMemo } from 'react';
import { useApplicationActions } from '../hooks/useApplicationActions';
import type { ApplicationResource } from '../types';
import type { Action } from './types';

const useApplicationActionsProvider = (resource: ApplicationResource): [Action[], boolean, null] => {
  const actionsRef = useRef<{ sync: () => void; refresh: (h: boolean) => void; terminate: () => void; deleteApp: (c: boolean) => void; retry: () => void }>();
  const { sync, refresh, terminate, deleteApp, retry } = useApplicationActions(resource);
  actionsRef.current = { sync, refresh, terminate, deleteApp, retry };

  const isFailed = resource?.status?.operationState?.phase === 'Error' || resource?.status?.operationState?.phase === 'Failed';
  const actions = useMemo<Action[]>(() => [
    { id: 'argocd-sync', label: 'Sync', cta: () => actionsRef.current?.sync() },
    {
      id: 'argocd-sync-options',
      label: 'Sync with options...',
      cta: () => window.dispatchEvent(new CustomEvent('gitops-open-sync-modal', {
        detail: { appName: resource.metadata.name, appNamespace: resource.metadata.namespace },
      })),
    },
    ...(isFailed ? [{ id: 'argocd-retry', label: 'Retry', cta: () => actionsRef.current?.retry() }] : []),
    { id: 'argocd-refresh', label: 'Refresh', cta: () => actionsRef.current?.refresh(false) },
    { id: 'argocd-hard-refresh', label: 'Hard Refresh', cta: () => actionsRef.current?.refresh(true) },
    { id: 'argocd-terminate', label: 'Terminate Operation', cta: () => actionsRef.current?.terminate() },
    { id: 'argocd-delete', label: 'Delete Application', cta: () => actionsRef.current?.deleteApp(true) },
  ], [isFailed, resource.metadata.name, resource.metadata.namespace]);

  return [actions, true, null];
};

export default useApplicationActionsProvider;
