import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[], true, null],
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { InstancePicker } from './InstancePicker';
import { InstanceContext } from '../../hooks/useArgoCDInstances';

describe('InstancePicker', () => {
  it('shows label when single instance', () => {
    const ctx = { instance: { name: 'argo', namespace: 'openshift-gitops' }, instances: [{ name: 'argo', namespace: 'openshift-gitops' }], setInstance: jest.fn() };
    render(
      <InstanceContext.Provider value={ctx}>
        <InstancePicker />
      </InstanceContext.Provider>,
    );
    expect(screen.getByText('openshift-gitops')).toBeInTheDocument();
  });

  it('shows dropdown when multiple instances', () => {
    const ctx = {
      instance: { name: 'a', namespace: 'ns-a' },
      instances: [{ name: 'a', namespace: 'ns-a' }, { name: 'b', namespace: 'ns-b' }],
      setInstance: jest.fn(),
    };
    render(
      <InstanceContext.Provider value={ctx}>
        <InstancePicker />
      </InstanceContext.Provider>,
    );
    expect(screen.getByText('ns-a/a')).toBeInTheDocument();
  });
});
