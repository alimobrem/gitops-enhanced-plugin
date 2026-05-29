import React from 'react';
import { render, screen } from '@testing-library/react';

let mockApps: unknown[] = [];
let mockLoaded = true;
let mockError: unknown = null;

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [mockApps, mockLoaded, mockError],
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({
    instance: { name: 'test', namespace: 'openshift-gitops' },
    instances: [],
    setInstance: jest.fn(),
  }),
  watchNamespace: () => 'openshift-gitops',
}));

import { NotificationHistoryPage } from './NotificationHistoryPage';

describe('NotificationHistoryPage', () => {
  beforeEach(() => {
    mockApps = [];
    mockLoaded = true;
    mockError = null;
  });

  it('renders empty state when no notifications', () => {
    render(<NotificationHistoryPage />);
    expect(screen.getByText('No notifications recorded')).toBeInTheDocument();
  });

  it('renders notification entries from annotations', () => {
    mockApps = [
      {
        metadata: {
          name: 'my-app',
          namespace: 'openshift-gitops',
          uid: '1',
          annotations: {
            'notified.argoproj.io/on-sync-succeeded.slack': JSON.stringify({
              timestamp: '2025-01-15T10:00:00Z',
            }),
          },
        },
        spec: { destination: {} },
      },
    ];
    render(<NotificationHistoryPage />);
    expect(screen.getByText('my-app')).toBeInTheDocument();
    expect(screen.getByText('on-sync-succeeded')).toBeInTheDocument();
    expect(screen.getByText('slack')).toBeInTheDocument();
  });

  it('renders spinner while loading', () => {
    mockLoaded = false;
    const { container } = render(<NotificationHistoryPage />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });
});
