import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

import { AccessTestTab } from './AccessTestTab';
import type { AppProjectResource } from '../../types';

const mockProject: AppProjectResource = {
  metadata: { name: 'my-project', namespace: 'openshift-gitops', uid: '1' },
  spec: {
    roles: [
      {
        name: 'deployer',
        groups: ['team-a'],
        policies: [
          'p, proj:my-project:deployer, applications, sync, my-project/*, allow',
          'p, proj:my-project:deployer, applications, get, my-project/*, allow',
        ],
      },
    ],
  },
};

describe('AccessTestTab', () => {
  it('renders spinner when obj is undefined', () => {
    const { container } = render(<AccessTestTab />);
    expect(container.querySelector('.pf-v6-c-spinner')).toBeTruthy();
  });

  it('renders form fields', () => {
    render(<AccessTestTab obj={mockProject} />);
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Resource')).toBeInTheDocument();
    expect(screen.getByText('Test Access')).toBeInTheDocument();
  });

  it('shows ALLOWED result for matching policy', () => {
    render(<AccessTestTab obj={mockProject} />);
    const subjectInput = screen.getByPlaceholderText(
      'proj:my-project:my-role',
    );
    fireEvent.change(subjectInput, {
      target: { value: 'proj:my-project:deployer' },
    });
    fireEvent.click(screen.getByText('Test Access'));
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText(/Matching Rule/)).toBeInTheDocument();
  });

  it('shows DENIED result for non-matching policy', () => {
    render(<AccessTestTab obj={mockProject} />);
    const subjectInput = screen.getByPlaceholderText(
      'proj:my-project:my-role',
    );
    fireEvent.change(subjectInput, {
      target: { value: 'proj:my-project:unknown' },
    });
    const actionSelect = screen.getByLabelText('Action');
    fireEvent.change(actionSelect, { target: { value: 'delete' } });
    fireEvent.click(screen.getByText('Test Access'));
    expect(screen.getByText('DENIED')).toBeInTheDocument();
  });
});
