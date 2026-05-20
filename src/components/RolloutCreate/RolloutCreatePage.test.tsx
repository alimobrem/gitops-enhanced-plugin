import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{ metadata: { name: 'testuser' } }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  k8sCreate: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn(), goBack: jest.fn() }) }));

import { RolloutCreatePage } from './RolloutCreatePage';

describe('RolloutCreatePage', () => {
  it('renders wizard title', () => {
    render(<RolloutCreatePage />);
    expect(screen.getByRole('heading', { name: 'Create Rollout' })).toBeInTheDocument();
  });

  it('shows namespace field', () => {
    render(<RolloutCreatePage />);
    expect(screen.getByDisplayValue('default')).toBeInTheDocument();
  });

  it('shows replicas control', () => {
    render(<RolloutCreatePage />);
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });
});
