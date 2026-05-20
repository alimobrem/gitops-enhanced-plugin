import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationModel } from '../models';
import type { ApplicationResource } from '../types';

export function useApplicationActions(app: ApplicationResource | null) {
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

  return { refresh, terminate };
}
