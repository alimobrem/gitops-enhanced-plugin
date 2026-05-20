import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [{
    metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
    spec: { sourceRepos: ['https://github.com/org/*'], destinations: [{ server: '*', namespace: 'prod' }], roles: [{ name: 'dev', groups: ['team-a'] }], syncWindows: [] },
  }, true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'my-project', ns: 'openshift-gitops' }) }));

import { AppProjectDetailPage } from './AppProjectDetailPage';

describe('AppProjectDetailPage', () => {
  it('renders project name', () => {
    render(<AppProjectDetailPage />);
    expect(screen.getByRole('heading', { name: 'my-project' })).toBeInTheDocument();
  });

  it('renders tabs', () => {
    render(<AppProjectDetailPage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getAllByText(/Source Repos/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Destinations/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Roles/).length).toBeGreaterThan(0);
  });
});
