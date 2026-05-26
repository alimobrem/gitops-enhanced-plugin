import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { WindowsTab } from './WindowsTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    syncWindows: [
      { kind: 'allow', schedule: '0 0 * * *', duration: '1h', namespaces: ['prod', 'staging'] },
      { kind: 'deny', schedule: '0 12 * * 5', duration: '2h', namespaces: ['dev'] },
    ],
  },
};

describe('WindowsTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<WindowsTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders schedule and duration', () => {
    render(<WindowsTab obj={mockProject} />);
    expect(screen.getByText('0 0 * * *')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('0 12 * * 5')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('renders kind labels', () => {
    render(<WindowsTab obj={mockProject} />);
    expect(screen.getByText('allow')).toBeInTheDocument();
    expect(screen.getByText('deny')).toBeInTheDocument();
  });

  it('renders namespaces joined by comma', () => {
    render(<WindowsTab obj={mockProject} />);
    expect(screen.getByText('prod, staging')).toBeInTheDocument();
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('renders empty state when no sync windows', () => {
    const empty: AppProjectResource = {
      ...mockProject,
      spec: { syncWindows: [] },
    };
    render(<WindowsTab obj={empty} />);
    expect(screen.getByText('No sync windows configured.')).toBeInTheDocument();
  });
});
