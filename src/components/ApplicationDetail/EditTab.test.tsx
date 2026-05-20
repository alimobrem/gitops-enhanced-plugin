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

const multiSourceApp = {
  ...mockApp,
  spec: {
    ...mockApp.spec,
    source: undefined,
    sources: [
      { repoURL: 'https://github.com/org/repo', path: 'base', targetRevision: 'main' },
      { repoURL: 'https://github.com/org/overlays', path: 'prod', targetRevision: 'main' },
    ],
  },
};

describe('EditTab', () => {
  beforeEach(() => mockK8sPatch.mockReset());

  it('renders form fields with current values', () => {
    render(<EditTab app={mockApp} />);
    expect(screen.getByDisplayValue('https://github.com/org/repo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('manifests')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('default').length).toBeGreaterThanOrEqual(1);
  });

  it('shows confirmation modal before saving', () => {
    render(<EditTab app={mockApp} />);
    // Make form dirty first
    fireEvent.change(screen.getByDisplayValue('manifests'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Confirm Save')).toBeInTheDocument();
  });

  it('calls k8sPatch with correct source path on confirm', async () => {
    mockK8sPatch.mockResolvedValue({});
    render(<EditTab app={mockApp} />);
    fireEvent.change(screen.getByDisplayValue('manifests'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getAllByText('Save')[1]); // modal save button
    await waitFor(() => expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ path: '/spec/source/repoURL' }),
        ]),
      }),
    ));
  });

  it('uses /spec/sources/0 path for multi-source apps', async () => {
    mockK8sPatch.mockResolvedValue({});
    render(<EditTab app={multiSourceApp as unknown as typeof mockApp} />);
    expect(screen.getByText('Multi-source application')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('base'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getAllByText('Save')[1]);
    await waitFor(() => expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ path: '/spec/sources/0/repoURL' }),
        ]),
      }),
    ));
  });

  it('shows error on save failure with dismiss', async () => {
    mockK8sPatch.mockRejectedValue(new Error('forbidden'));
    render(<EditTab app={mockApp} />);
    fireEvent.change(screen.getByDisplayValue('manifests'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getAllByText('Save')[1]);
    await waitFor(() => expect(screen.getByText('forbidden')).toBeInTheDocument());
  });

  it('disables save when required fields are empty', () => {
    render(<EditTab app={{
      ...mockApp,
      spec: { ...mockApp.spec, source: { repoURL: '', path: '', targetRevision: '' } },
    }} />);
    expect(screen.getByText('Save').closest('button')).toBeDisabled();
  });
});
