import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionsMenu } from './ActionsMenu';

const mockK8sPatch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
  consoleFetch: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

const mockApp = {
  apiVersion: 'argoproj.io/v1alpha1' as const,
  kind: 'Application' as const,
  metadata: { name: 'test-app', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    source: { repoURL: 'https://github.com/org/repo', path: '.', targetRevision: 'HEAD' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
  status: { sync: { status: 'Synced' as const }, health: { status: 'Healthy' as const } },
};

describe('ActionsMenu', () => {
  beforeEach(() => mockK8sPatch.mockReset().mockResolvedValue({}));

  it('renders the Actions toggle button', () => {
    render(<ActionsMenu app={mockApp} />);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows dropdown items when clicked', () => {
    render(<ActionsMenu app={mockApp} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Sync')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Hard Refresh')).toBeInTheDocument();
    expect(screen.getByText('Terminate')).toBeInTheDocument();
  });
});
