import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(() => [[], true, null]),
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { PodsTab } from './PodsTab';

const mockRollout = {
  metadata: { name: 'test-rollout', namespace: 'default', uid: '1' },
  spec: {
    replicas: 3,
    selector: { matchLabels: { app: 'test' } },
    strategy: { canary: {} },
    template: { spec: { containers: [] } },
  },
  status: { phase: 'Healthy' },
};

describe('PodsTab', () => {
  it('renders empty state when no pods', () => {
    render(<PodsTab obj={mockRollout} />);
    expect(screen.getByText('No pods found for this rollout.')).toBeInTheDocument();
  });

  it('renders pods matching selector', () => {
    (useK8sWatchResource as jest.Mock).mockReturnValue([
      [
        {
          metadata: { name: 'pod-1', namespace: 'default', uid: 'p1', creationTimestamp: '2024-01-01T00:00:00Z', labels: { app: 'test' } },
          status: { phase: 'Running', containerStatuses: [{ name: 'app', ready: true, restartCount: 0 }] },
        },
      ],
      true,
      null,
    ]);
    render(<PodsTab obj={mockRollout} />);
    expect(screen.getByText('pod-1')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });
});
