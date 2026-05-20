import React from 'react';
import { useState, useEffect, type FC, type PropsWithChildren } from 'react';
import {
  InstanceContext,
  useArgoCDInstances,
  type ArgoCDInstance,
} from '../../hooks/useArgoCDInstances';

const STORAGE_KEY = 'gitops-enhanced-selected-instance';

export const InstanceProvider: FC<PropsWithChildren> = ({ children }) => {
  const [instances, loaded] = useArgoCDInstances();

  const [instance, setInstanceState] = useState<ArgoCDInstance>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.warn('Failed to parse stored GitOps instance:', e); }
    return { name: 'openshift-gitops', namespace: 'openshift-gitops' };
  });

  useEffect(() => {
    if (!loaded || instances.length === 0) return;
    const stillExists = instances.some(
      (i) => i.namespace === instance.namespace && i.name === instance.name,
    );
    if (!stillExists) {
      setInstanceState(instances[0]);
    }
  }, [instances, loaded]);

  const setInstance = (inst: ArgoCDInstance) => {
    setInstanceState(inst);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inst));
  };

  return (
    <InstanceContext.Provider value={{ instance, instances, setInstance }}>
      {children}
    </InstanceContext.Provider>
  );
};

export default InstanceProvider;
