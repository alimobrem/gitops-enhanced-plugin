import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { ReposTab } from './ReposTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    sourceRepos: ['https://github.com/org/repo1', 'https://github.com/org/*'],
  },
};

describe('ReposTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<ReposTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders repo patterns', () => {
    render(<ReposTab obj={mockProject} />);
    expect(screen.getByText('https://github.com/org/repo1')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/org/*')).toBeInTheDocument();
  });

  it('renders table header', () => {
    render(<ReposTab obj={mockProject} />);
    expect(screen.getByText('Repository Pattern')).toBeInTheDocument();
  });

  it('renders empty state when no repos', () => {
    const empty: AppProjectResource = {
      ...mockProject,
      spec: { sourceRepos: [] },
    };
    render(<ReposTab obj={empty} />);
    expect(screen.getByText('No source repositories configured.')).toBeInTheDocument();
  });
});
