import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  k8sPatch: jest.fn(),
  k8sCreate: jest.fn(),
  k8sDelete: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'test', ns: 'default' }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn() }) }));
jest.mock('../../hooks/useArgoCDInstances', () => ({
  useCurrentInstance: () => ({ instance: { name: 'test', namespace: 'default' }, instances: [], setInstance: jest.fn() }),
}));

import { DismissibleAlert } from './DismissibleAlert';

describe('DismissibleAlert', () => {
  it('renders the alert', () => {
    render(<DismissibleAlert variant="info" title="Test Alert">Alert body</DismissibleAlert>);
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
    expect(screen.getByText('Alert body')).toBeInTheDocument();
  });

  it('dismisses when close button is clicked', () => {
    render(<DismissibleAlert variant="info" title="Dismiss Me">body</DismissibleAlert>);
    expect(screen.getByText('Dismiss Me')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^Close/));
    expect(screen.queryByText('Dismiss Me')).not.toBeInTheDocument();
  });
});
