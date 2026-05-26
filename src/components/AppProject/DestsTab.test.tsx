import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { DestsTab } from './DestsTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    destinations: [
      { server: 'https://kubernetes.default.svc', namespace: 'prod', name: 'in-cluster' },
      { server: 'https://remote.example.com', namespace: 'staging' },
    ],
  },
};

describe('DestsTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<DestsTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders server and namespace', () => {
    render(<DestsTab obj={mockProject} />);
    expect(screen.getByText('https://kubernetes.default.svc')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('in-cluster')).toBeInTheDocument();
    expect(screen.getByText('https://remote.example.com')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<DestsTab obj={mockProject} />);
    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Namespace')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders empty state when no destinations', () => {
    const empty: AppProjectResource = {
      ...mockProject,
      spec: { destinations: [] },
    };
    render(<DestsTab obj={empty} />);
    expect(screen.getByText('No destinations configured.')).toBeInTheDocument();
  });
});
