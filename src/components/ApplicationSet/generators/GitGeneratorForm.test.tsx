import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { GitGeneratorForm } from './GitGeneratorForm';
import type { GitGenerator } from '../../../types';

describe('GitGeneratorForm', () => {
  const baseGen: GitGenerator = {
    git: { repoURL: 'https://github.com/test/repo', revision: 'main', directories: [{ path: '*' }] },
  };

  it('renders repo URL and revision', () => {
    render(<GitGeneratorForm generator={baseGen} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('https://github.com/test/repo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
  });

  it('renders directory entries', () => {
    render(<GitGeneratorForm generator={baseGen} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('*')).toBeInTheDocument();
  });

  it('renders files mode when files are set', () => {
    const fileGen: GitGenerator = {
      git: { repoURL: 'https://github.com/test/repo', files: [{ path: 'config.json' }] },
    };
    render(<GitGeneratorForm generator={fileGen} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('config.json')).toBeInTheDocument();
  });

  it('shows error when repo URL is empty', () => {
    const emptyGen: GitGenerator = { git: { repoURL: '' } };
    render(<GitGeneratorForm generator={emptyGen} onChange={jest.fn()} />);
    expect(screen.getByText('Repository URL is required')).toBeInTheDocument();
  });
});
