import { createContext, useContext } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ArgoCDGroupVersionKind } from '../models';

export interface ArgoCDInstance {
  name: string;
  namespace: string;
}

interface ArgoCDResource {
  metadata: { name: string; namespace: string; uid: string };
}

export function useArgoCDInstances(): [ArgoCDInstance[], boolean] {
  const [resources, loaded, _error] = useK8sWatchResource<ArgoCDResource[]>({
    groupVersionKind: ArgoCDGroupVersionKind,
    isList: true,
  });

  const instances: ArgoCDInstance[] = (resources ?? []).map((r) => ({
    name: r.metadata.name,
    namespace: r.metadata.namespace,
  }));

  return [instances, loaded];
}

export interface InstanceContextValue {
  instance: ArgoCDInstance;
  instances: ArgoCDInstance[];
  setInstance: (instance: ArgoCDInstance) => void;
}

export const ALL_INSTANCES: ArgoCDInstance = {
  name: '*',
  namespace: '*',
};

const DEFAULT_INSTANCE: ArgoCDInstance = {
  name: 'openshift-gitops',
  namespace: 'openshift-gitops',
};

export function isAllInstances(inst: ArgoCDInstance): boolean {
  return inst.name === '*' && inst.namespace === '*';
}

export function watchNamespace(inst: ArgoCDInstance): string | undefined {
  return isAllInstances(inst) ? undefined : inst.namespace;
}

export const InstanceContext = createContext<InstanceContextValue>({
  instance: DEFAULT_INSTANCE,
  instances: [DEFAULT_INSTANCE],
  setInstance: () => {},
});

export function useCurrentInstance(): InstanceContextValue {
  return useContext(InstanceContext);
}
