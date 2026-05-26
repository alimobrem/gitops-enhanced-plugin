import { useApplicationActions } from '../hooks/useApplicationActions';
import type { ApplicationResource } from '../types';

interface Action {
  id: string;
  label: string;
  cta: () => void;
  disabled?: boolean;
  tooltip?: string;
}

const useApplicationActionsProvider = (resource: ApplicationResource): [Action[], boolean, null] => {
  const { sync, refresh, terminate, deleteApp, retry } = useApplicationActions(resource);

  const isFailed = resource?.status?.operationState?.phase === 'Error' || resource?.status?.operationState?.phase === 'Failed';

  const actions: Action[] = [
    { id: 'argocd-sync', label: 'Sync', cta: () => sync() },
    ...(isFailed ? [{ id: 'argocd-retry', label: 'Retry', cta: () => retry() }] : []),
    { id: 'argocd-refresh', label: 'Refresh', cta: () => refresh(false) },
    { id: 'argocd-hard-refresh', label: 'Hard Refresh', cta: () => refresh(true) },
    { id: 'argocd-terminate', label: 'Terminate Operation', cta: () => terminate() },
    { id: 'argocd-delete', label: 'Delete Application', cta: () => deleteApp(true) },
  ];

  return [actions, true, null];
};

export default useApplicationActionsProvider;
