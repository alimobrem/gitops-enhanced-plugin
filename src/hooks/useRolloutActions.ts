import { useCallback } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { safePatch } from '../utils/patch';
import { RolloutModel } from '../models';
import type { RolloutResource } from '../types/rollout';

function annotationPath(annotation: string): string {
  return `/metadata/annotations/${annotation.replace(/\//g, '~1')}`;
}

export function useRolloutActions(rollout: RolloutResource | null): {
  promote: () => Promise<void>;
  promoteFull: () => Promise<void>;
  abort: () => Promise<void>;
  restart: () => Promise<void>;
} {
  const patchAnnotation = useCallback(
    async (annotation: string, value: string) => {
      if (!rollout) return;
      await k8sPatch({
        model: RolloutModel,
        resource: rollout,
        data: [safePatch(rollout, annotationPath(annotation), value)],
      });
    },
    [rollout],
  );

  const promote = useCallback(
    () => patchAnnotation('rollout.argoproj.io/promote', 'true'),
    [patchAnnotation],
  );

  const promoteFull = useCallback(
    () => patchAnnotation('rollout.argoproj.io/promote-full', 'true'),
    [patchAnnotation],
  );

  const abort = useCallback(
    () => patchAnnotation('rollout.argoproj.io/abort', 'true'),
    [patchAnnotation],
  );

  const restart = useCallback(
    () => patchAnnotation('rollout.argoproj.io/restart', new Date().toISOString()),
    [patchAnnotation],
  );

  return { promote, promoteFull, abort, restart };
}
