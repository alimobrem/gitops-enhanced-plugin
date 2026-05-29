import { k8sPatch, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationModel } from '../models';
import { useCurrentUser } from './useCurrentUser';
import { getApplicationSource } from '../utils/application';
import type { ApplicationResource } from '../types';

export interface SyncOptions {
  revision?: string;
  resources?: Array<{ group: string; kind: string; name: string; namespace?: string }>;
  dryRun?: boolean;
  prune?: boolean;
  force?: boolean;
  applyOnly?: boolean;
}

export function useApplicationActions(app: ApplicationResource | null) {
  const username = useCurrentUser();

  const sync = async (options: SyncOptions = {}) => {
    if (!app) return;
    const syncValue: Record<string, unknown> = {
      revision: options.revision ?? getApplicationSource(app)?.targetRevision ?? 'HEAD',
    };
    if (options.resources?.length) {
      syncValue.resources = options.resources;
    }
    if (options.dryRun) {
      syncValue.dryRun = true;
    }
    const syncOptionItems: string[] = [];
    if (options.prune) syncOptionItems.push('Prune=true');
    if (options.force) syncOptionItems.push('Force=true');
    if (options.applyOnly) syncOptionItems.push('ApplyOnly=true');
    if (syncOptionItems.length > 0) {
      syncValue.syncOptions = { items: syncOptionItems };
    }
    await k8sPatch({
      model: ApplicationModel,
      resource: app,
      data: [
        {
          op: 'add',
          path: '/operation',
          value: {
            initiatedBy: { username },
            sync: syncValue,
          },
        },
      ],
    });
  };

  const refresh = async (hard = false) => {
    if (!app) return;
    await k8sPatch({
      model: ApplicationModel,
      resource: app,
      data: [
        {
          op: 'replace',
          path: '/metadata/annotations/argocd.argoproj.io~1refresh',
          value: hard ? 'hard' : 'normal',
        },
      ],
    });
  };

  const terminate = async () => {
    if (!app) return;
    await k8sPatch({
      model: ApplicationModel,
      resource: app,
      data: [
        {
          op: 'add',
          path: '/metadata/annotations/argocd.argoproj.io~1operation-terminate',
          value: 'true',
        },
      ],
    });
  };

  const deleteApp = async (cascade = true) => {
    if (!app) return;
    if (!cascade) {
      await k8sPatch({
        model: ApplicationModel,
        resource: app,
        data: [{ op: 'remove', path: '/metadata/finalizers', value: null }],
      });
    }
    await k8sDelete({ model: ApplicationModel, resource: app });
  };

  const retry = async () => {
    if (!app) return;
    const lastRevision = app.status?.operationState?.syncResult?.revision
      ?? app.status?.sync?.revision
      ?? getApplicationSource(app)?.targetRevision
      ?? 'HEAD';
    await sync({ revision: lastRevision });
  };

  return { sync, refresh, terminate, deleteApp, retry };
}
