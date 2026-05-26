import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { RolloutModel } from '../models';
import type { RolloutResource } from '../types';
import type { Action } from './types';

const useRolloutActionsProvider = (resource: RolloutResource): [Action[], boolean, null] => {
  const isPaused = resource?.status?.phase === 'Paused';

  const runAction = async (annotation: string, value: string) => {
    await k8sPatch({ model: RolloutModel, resource, data: [
      { op: 'add', path: `/metadata/annotations/${annotation.replace(/\//g, '~1')}`, value },
    ] });
  };

  const actions: Action[] = [
    ...(isPaused ? [{ id: 'rollout-promote', label: 'Promote', cta: () => runAction('rollout.argoproj.io/promote', 'true') }] : []),
    { id: 'rollout-restart', label: 'Restart', cta: () => runAction('rollout.argoproj.io/restart', new Date().toISOString()) },
    { id: 'rollout-abort', label: 'Abort', cta: () => runAction('rollout.argoproj.io/abort', 'true') },
  ];

  return [actions, true, null];
};

export default useRolloutActionsProvider;
