import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { OverviewTab } from './OverviewTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    sourceRepos: ['https://github.com/org/repo1', 'https://github.com/org/repo2'],
    destinations: [
      { server: 'https://kubernetes.default.svc', namespace: 'prod' },
      { server: 'https://kubernetes.default.svc', namespace: 'staging' },
      { server: 'https://kubernetes.default.svc', namespace: 'dev' },
    ],
    roles: [{ name: 'admin', policies: ['p, proj:my-project:admin, *, *, *, allow'], groups: ['team-a'] }],
    syncWindows: [{ kind: 'allow', schedule: '0 0 * * *', duration: '1h' }],
  },
};

describe('OverviewTab (AppProject)', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<OverviewTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders source repos count', () => {
    render(<OverviewTab obj={mockProject} />);
    expect(screen.getByText('2 repositories')).toBeInTheDocument();
  });

  it('renders destinations count', () => {
    render(<OverviewTab obj={mockProject} />);
    expect(screen.getByText('3 destinations')).toBeInTheDocument();
  });

  it('renders roles count', () => {
    render(<OverviewTab obj={mockProject} />);
    expect(screen.getByText('1 roles')).toBeInTheDocument();
  });

  it('renders sync windows count', () => {
    render(<OverviewTab obj={mockProject} />);
    expect(screen.getByText('1 windows')).toBeInTheDocument();
  });

  it('renders "All repositories" label when wildcard', () => {
    const wildcard: AppProjectResource = {
      ...mockProject,
      spec: { ...mockProject.spec, sourceRepos: ['*'] },
    };
    render(<OverviewTab obj={wildcard} />);
    expect(screen.getByText('All repositories')).toBeInTheDocument();
  });
});
