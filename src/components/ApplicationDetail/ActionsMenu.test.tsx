import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionsMenu } from './ActionsMenu';

const mockK8sPatch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: "testuser" } }, true, null],
  k8sDelete: jest.fn().mockResolvedValue({}),
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));

jest.mock('react-router', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }), useParams: () => ({}) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }), useParams: () => ({}) }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string, opts?: Record<string, string>) => {
    if (opts) return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), s);
    return s;
  }}),
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
    expect(screen.getByText('Terminate')).toBeInTheDocument();
  });

  it('shows confirmation modal for terminate', () => {
    render(<ActionsMenu app={mockApp} />);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Terminate'));
    expect(screen.getByText('Confirm Terminate')).toBeInTheDocument();
    expect(screen.getByText(/abort any in-progress sync/)).toBeInTheDocument();
  });

  it('shows error alert when action fails', async () => {
    mockK8sPatch.mockRejectedValue(new Error('forbidden'));
    render(<ActionsMenu app={mockApp} />);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Sync'));
    await waitFor(() => expect(screen.getByText(/Sync: forbidden/)).toBeInTheDocument());
  });
});
