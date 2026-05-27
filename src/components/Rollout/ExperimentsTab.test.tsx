import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(() => [[], true, null]),
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { ExperimentsTab } from './ExperimentsTab';

const mockRollout = {
  metadata: { name: 'test-rollout', namespace: 'default', uid: '1' },
  spec: { replicas: 3, strategy: { canary: {} }, template: { spec: { containers: [] } } },
  status: { phase: 'Healthy' },
};

describe('ExperimentsTab', () => {
  it('renders empty state when no experiments', () => {
    render(<ExperimentsTab obj={mockRollout} />);
    expect(screen.getByText('No experiments found for this rollout.')).toBeInTheDocument();
  });
});
