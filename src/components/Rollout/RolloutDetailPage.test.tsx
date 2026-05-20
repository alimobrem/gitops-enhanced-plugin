import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{
    metadata: { name: 'demo-rollout', namespace: 'guestbook', uid: '1' },
    spec: { replicas: 3, strategy: { canary: { steps: [{ setWeight: 20 }, { pause: { duration: '30s' } }] } }, template: { spec: { containers: [{ name: 'app', image: 'nginx:latest', ports: [{ containerPort: 80 }] }] } } },
    status: { phase: 'Healthy', currentStepIndex: 0 },
  }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  k8sPatch: jest.fn().mockResolvedValue({}),
  k8sDelete: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'demo-rollout', ns: 'guestbook' }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }) }));

import { RolloutDetailPage } from './RolloutDetailPage';

describe('RolloutDetailPage', () => {
  it('renders rollout name', () => {
    render(<RolloutDetailPage />);
    expect(screen.getByRole('heading', { name: 'demo-rollout' })).toBeInTheDocument();
  });

  it('shows strategy type', () => {
    render(<RolloutDetailPage />);
    expect(screen.getByText('Canary')).toBeInTheDocument();
  });

  it('shows canary steps', () => {
    render(<RolloutDetailPage />);
    expect(screen.getByText(/setWeight/)).toBeInTheDocument();
  });

  it('shows phase', () => {
    render(<RolloutDetailPage />);
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
  });

  it('shows Overview and Configuration tabs', () => {
    render(<RolloutDetailPage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });
});
