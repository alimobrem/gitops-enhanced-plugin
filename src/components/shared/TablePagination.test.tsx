import React from 'react';
import { render, screen } from '@testing-library/react';

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

import { TablePagination } from './TablePagination';

describe('TablePagination', () => {
  it('renders nothing when totalItems <= 20', () => {
    const { container } = render(
      <TablePagination page={1} perPage={20} totalItems={15} onSetPage={jest.fn()} onPerPageSelect={jest.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders pagination when totalItems > 20', () => {
    render(
      <TablePagination page={1} perPage={20} totalItems={50} onSetPage={jest.fn()} onPerPageSelect={jest.fn()} />,
    );
    expect(screen.getByLabelText('Pagination')).toBeInTheDocument();
  });
});
