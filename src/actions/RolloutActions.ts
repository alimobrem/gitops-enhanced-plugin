import { useRef, useMemo, useCallback } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { RolloutModel } from '../models';
import type { RolloutResource } from '../types';
import type { Action } from './types';
import { safePatch } from '../utils/patch';

const useRolloutActionsProvider = (resource: RolloutResource): [Action[], boolean, null] => {
  const resourceRef = useRef(resource);
  resourceRef.current = resource;

  const isPaused = resource?.status?.phase === 'Paused';
  const runAction = useCallback(async (annotation: string, value: string) => {
    const r = resourceRef.current;
    await k8sPatch({ model: RolloutModel, resource: r, data: [
      safePatch(r, `/metadata/annotations/${annotation.replace(/\//g, '~1')}`, value),
    ] });
  }, []);

  const actions = useMemo<Action[]>(() => [
    ...(isPaused ? [{ id: 'rollout-promote', label: 'Promote', cta: () => runAction('rollout.argoproj.io/promote', 'true') }] : []),
    { id: 'rollout-restart', label: 'Restart', cta: () => runAction('rollout.argoproj.io/restart', new Date().toISOString()) },
    { id: 'rollout-abort', label: 'Abort', cta: () => runAction('rollout.argoproj.io/abort', 'true') },
  ], [runAction, isPaused]);

  return [actions, true, null];
};

export default useRolloutActionsProvider;
