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
  const [resources, loaded] = useK8sWatchResource<ArgoCDResource[]>({
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

const DEFAULT_INSTANCE: ArgoCDInstance = {
  name: 'openshift-gitops',
  namespace: 'openshift-gitops',
};

export const InstanceContext = createContext<InstanceContextValue>({
  instance: DEFAULT_INSTANCE,
  instances: [DEFAULT_INSTANCE],
  setInstance: () => {},
});

export function useCurrentInstance(): InstanceContextValue {
  return useContext(InstanceContext);
}
