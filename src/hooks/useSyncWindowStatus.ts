import { useMemo } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { AppProjectGroupVersionKind } from '../models';
import { isSyncBlocked } from '../utils/sync-windows';
import type { ApplicationResource } from '../types';
import type { AppProjectResource } from '../types/appproject';

interface SyncWindowStatus {
  blocked: boolean;
  message: string;
  projectName: string;
}

export function useSyncWindowStatus(app: ApplicationResource | null): SyncWindowStatus {
  const projectName = app?.spec?.project ?? 'default';
  const ns = app?.metadata?.namespace ?? '';

  const [project, loaded, error] = useK8sWatchResource<AppProjectResource>({
    groupVersionKind: AppProjectGroupVersionKind,
    name: projectName,
    namespace: ns,
  });

  return useMemo(() => {
    if (!loaded || error || !project || !app) {
      return { blocked: false, message: '', projectName };
    }
    if (!project.spec?.syncWindows?.length) {
      return { blocked: false, message: '', projectName };
    }
    const blocked = isSyncBlocked(project, app.metadata?.name ?? '', app.metadata?.namespace);
    return {
      blocked,
      message: blocked ? `Sync blocked by sync window on project ${projectName}` : '',
      projectName,
    };
  }, [project, loaded, error, app, projectName]);
}
