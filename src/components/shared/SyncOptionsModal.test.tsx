import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncOptionsModal } from './SyncOptionsModal';
import type { ApplicationResource } from '../../types';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({}));

const makeApp = (overrides?: Partial<ApplicationResource>): ApplicationResource => ({
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'my-app', namespace: 'argocd', uid: '123' },
  spec: {
    source: { repoURL: 'https://github.com/test/repo', targetRevision: 'main', path: '.' },
    destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
    project: 'default',
  },
  status: {
    sync: { status: 'OutOfSync' },
    health: { status: 'Healthy' },
    resources: [
      { group: '', version: 'v1', kind: 'Service', namespace: 'default', name: 'my-svc', status: 'Synced' },
      { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'default', name: 'my-deploy', status: 'OutOfSync' },
    ],
  },
  ...overrides,
});

describe('SyncOptionsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    app: makeApp(),
    onSync: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders with correct title', () => {
    render(<SyncOptionsModal {...defaultProps} />);
    expect(screen.getByText('Sync Options')).toBeInTheDocument();
  });

  it('renders all switch labels', () => {
    render(<SyncOptionsModal {...defaultProps} />);
    expect(screen.getByText('Dry Run')).toBeInTheDocument();
    expect(screen.getByText('Prune')).toBeInTheDocument();
    expect(screen.getByText('Force')).toBeInTheDocument();
    expect(screen.getByText('Apply Only')).toBeInTheDocument();
    expect(screen.getByText('Preview changes without applying')).toBeInTheDocument();
    expect(screen.getByText('Delete resources not in Git')).toBeInTheDocument();
    expect(screen.getByText('Force replace instead of apply')).toBeInTheDocument();
    expect(screen.getByText('Skip hooks, only apply manifests')).toBeInTheDocument();
  });

  it('renders revision input defaulting to targetRevision', () => {
    render(<SyncOptionsModal {...defaultProps} />);
    const input = screen.getByLabelText('Revision');
    expect(input).toHaveValue('main');
  });

  it('defaults revision to HEAD when no targetRevision', () => {
    const app = makeApp();
    app.spec.source = { repoURL: 'https://github.com/test/repo', path: '.' };
    render(<SyncOptionsModal {...defaultProps} app={app} />);
    expect(screen.getByLabelText('Revision')).toHaveValue('HEAD');
  });

  it('calls onSync with correct options on submit', async () => {
    const onSync = jest.fn().mockResolvedValue(undefined);
    render(<SyncOptionsModal {...defaultProps} onSync={onSync} />);

    fireEvent.click(screen.getByLabelText('Dry Run'));
    fireEvent.click(screen.getByLabelText('Prune'));

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledWith({
        revision: 'main',
        dryRun: true,
        prune: true,
        force: false,
        applyOnly: false,
        resources: undefined,
      });
    });
  });

  it('calls onSync when submit button is clicked', async () => {
    const onSync = jest.fn().mockResolvedValue(undefined);
    render(<SyncOptionsModal {...defaultProps} onSync={onSync} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledTimes(1);
    });
  });

  it('shows warning and disables submit when syncBlocked', () => {
    render(
      <SyncOptionsModal
        {...defaultProps}
        syncBlocked={{ blocked: true, message: 'Sync window closed' }}
      />,
    );
    expect(screen.getByText('Sync window closed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync' })).toBeDisabled();
  });

  it('shows error alert on sync failure', async () => {
    const onSync = jest.fn().mockRejectedValue(new Error('network error'));
    render(<SyncOptionsModal {...defaultProps} onSync={onSync} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(screen.getByText('network error')).toBeInTheDocument();
    });
  });

  it('closes modal on successful sync', async () => {
    const onClose = jest.fn();
    render(<SyncOptionsModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not render when closed', () => {
    render(<SyncOptionsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Sync Options')).not.toBeInTheDocument();
  });

  it('pre-selects resources from preSelectedResources', () => {
    const preSelected = [{ group: 'apps', kind: 'Deployment', name: 'my-deploy', namespace: 'default' }];
    render(<SyncOptionsModal {...defaultProps} preSelectedResources={preSelected} />);
    expect(screen.getByText(/Select resources to sync.*1\/2/)).toBeInTheDocument();
  });
});
