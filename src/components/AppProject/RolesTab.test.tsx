import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (s: string, opts?: Record<string, unknown>) => {
      if (!opts) return s;
      return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)), s);
    },
  }),
}));

import { RolesTab } from './RolesTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    roles: [
      { name: 'admin', groups: ['team-a', 'team-b'], policies: ['p, allow'] },
      { name: 'viewer', groups: ['team-c'], policies: [] },
    ],
  },
};

describe('RolesTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<RolesTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders role names', () => {
    render(<RolesTab obj={mockProject} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('renders groups joined by comma', () => {
    render(<RolesTab obj={mockProject} />);
    expect(screen.getByText('team-a, team-b')).toBeInTheDocument();
    expect(screen.getByText('team-c')).toBeInTheDocument();
  });

  it('renders policy count', () => {
    render(<RolesTab obj={mockProject} />);
    expect(screen.getByText('1 policies')).toBeInTheDocument();
    expect(screen.getByText('0 policies')).toBeInTheDocument();
  });

  it('renders empty state when no roles', () => {
    const empty: AppProjectResource = {
      ...mockProject,
      spec: { roles: [] },
    };
    render(<RolesTab obj={empty} />);
    expect(screen.getByText('No roles configured.')).toBeInTheDocument();
  });
});
