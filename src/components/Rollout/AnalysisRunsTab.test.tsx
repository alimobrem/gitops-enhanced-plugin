import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(() => [[], true, null]),
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { AnalysisRunsTab } from './AnalysisRunsTab';

const mockRollout = {
  metadata: { name: 'test-rollout', namespace: 'default', uid: '1' },
  spec: { replicas: 3, strategy: { canary: {} }, template: { spec: { containers: [] } } },
  status: { phase: 'Healthy' },
};

describe('AnalysisRunsTab', () => {
  it('renders empty state when no analysis runs', () => {
    render(<AnalysisRunsTab obj={mockRollout} />);
    expect(screen.getByText('No analysis runs found for this rollout.')).toBeInTheDocument();
  });

  it('renders analysis runs', () => {
    (useK8sWatchResource as jest.Mock).mockReturnValue([
      [
        {
          metadata: { name: 'run-1', namespace: 'default', uid: 'r1', creationTimestamp: '2024-01-01T00:00:00Z', ownerReferences: [{ kind: 'Rollout', name: 'test-rollout' }] },
          status: { phase: 'Successful', message: 'All metrics passed' },
        },
      ],
      true,
      null,
    ]);
    render(<AnalysisRunsTab obj={mockRollout} />);
    expect(screen.getByText('run-1')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();
  });
});
