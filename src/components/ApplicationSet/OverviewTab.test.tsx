import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { OverviewTab } from './OverviewTab';
import type { AppSetResource } from '../../types';

const mockAppSet: AppSetResource = {
  metadata: { name: 'test-appset', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    generators: [{ git: { repoURL: 'https://github.com/org/repo' } }, { list: { elements: [] } }],
  },
  status: {
    conditions: [
      { type: 'ParametersGenerated', status: 'True', message: 'All good' },
      { type: 'ResourcesUpToDate', status: 'False', message: 'Stale' },
    ],
  },
};

describe('OverviewTab (ApplicationSet)', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<OverviewTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders Generators heading', () => {
    render(<OverviewTab obj={mockAppSet} />);
    expect(screen.getByText('Generators')).toBeInTheDocument();
  });

  it('renders generator type labels', () => {
    render(<OverviewTab obj={mockAppSet} />);
    expect(screen.getByText('git')).toBeInTheDocument();
    expect(screen.getByText('list')).toBeInTheDocument();
  });

  it('renders conditions when present', () => {
    render(<OverviewTab obj={mockAppSet} />);
    expect(screen.getByText('Conditions')).toBeInTheDocument();
    expect(screen.getByText('ParametersGenerated')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('does not render conditions card when none exist', () => {
    const noConditions: AppSetResource = {
      ...mockAppSet,
      status: undefined,
    };
    render(<OverviewTab obj={noConditions} />);
    expect(screen.queryByText('Conditions')).not.toBeInTheDocument();
  });
});
