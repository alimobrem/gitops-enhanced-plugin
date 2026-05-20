import React from 'react';
import { render, screen } from '@testing-library/react';
import { GitOpsDashboardCard } from './GitOpsDashboardCard';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [
    [
      { metadata: { uid: '1' }, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } } },
      { metadata: { uid: '2' }, status: { sync: { status: 'OutOfSync' }, health: { status: 'Degraded' } } },
      { metadata: { uid: '3' }, status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } } },
    ],
    true,
    null,
  ],
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

describe('GitOpsDashboardCard', () => {
  it('renders total count', () => {
    render(<GitOpsDashboardCard />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('GitOps Applications')).toBeInTheDocument();
  });

  it('renders synced and health labels', () => {
    render(<GitOpsDashboardCard />);
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('OutOfSync')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });
});
