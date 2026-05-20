import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RowActions } from './RowActions';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
  k8sPatch: jest.fn().mockResolvedValue({}),
  k8sDelete: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }),
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

describe('RowActions', () => {
  it('renders kebab toggle', () => {
    render(<RowActions app={mockApp} />);
    expect(screen.getByLabelText('Actions')).toBeInTheDocument();
  });

  it('shows dropdown items on click', () => {
    render(<RowActions app={mockApp} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    expect(screen.getByText('Sync')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows delete confirmation with namespace', () => {
    render(<RowActions app={mockApp} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText(/test-app \(openshift-gitops\)/)).toBeInTheDocument();
  });
});
