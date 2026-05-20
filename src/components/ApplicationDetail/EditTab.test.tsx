import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTab } from './EditTab';

const mockK8sPatch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));

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
    source: { repoURL: 'https://github.com/org/repo', path: 'manifests', targetRevision: 'main' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
    syncPolicy: { automated: { prune: true, selfHeal: false } },
  },
  status: { sync: { status: 'Synced' as const }, health: { status: 'Healthy' as const } },
};

describe('EditTab', () => {
  beforeEach(() => mockK8sPatch.mockReset());

  it('renders form fields with current values', () => {
    render(<EditTab app={mockApp} />);
    expect(screen.getByDisplayValue('https://github.com/org/repo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('manifests')).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('default').length).toBeGreaterThanOrEqual(1);
  });

  it('calls k8sPatch on save', async () => {
    mockK8sPatch.mockResolvedValue({});
    render(<EditTab app={mockApp} />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockK8sPatch).toHaveBeenCalled());
  });

  it('shows error on save failure', async () => {
    mockK8sPatch.mockRejectedValue(new Error('forbidden'));
    render(<EditTab app={mockApp} />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText('forbidden')).toBeInTheDocument());
  });

  it('shows success message on save', async () => {
    mockK8sPatch.mockResolvedValue({});
    render(<EditTab app={mockApp} />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText('Application updated successfully')).toBeInTheDocument());
  });
});
