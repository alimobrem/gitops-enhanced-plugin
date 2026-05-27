import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { GeneratorEditor } from './GeneratorEditor';
import type { AppSetGenerator } from '../../../types';

describe('GeneratorEditor', () => {
  it('renders list generator form', () => {
    const gen: AppSetGenerator = { list: { elements: [{ cluster: 'prod' }] } };
    render(<GeneratorEditor generator={gen} index={0} onChange={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/Generator 1: List/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('prod')).toBeInTheDocument();
  });

  it('renders git generator form', () => {
    const gen: AppSetGenerator = { git: { repoURL: 'https://github.com/test/repo', directories: [{ path: '*' }] } };
    render(<GeneratorEditor generator={gen} index={0} onChange={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/Generator 1: Git/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://github.com/test/repo')).toBeInTheDocument();
  });

  it('renders cluster generator form', () => {
    const gen: AppSetGenerator = { clusters: { selector: { matchLabels: { env: 'dev' } } } };
    render(<GeneratorEditor generator={gen} index={0} onChange={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/Generator 1: Cluster/)).toBeInTheDocument();
  });

  it('renders YAML editor for unknown types', () => {
    const gen: AppSetGenerator = { pullRequest: { github: { owner: 'test' } } };
    render(<GeneratorEditor generator={gen} index={2} onChange={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/Generator 3: pullRequest/)).toBeInTheDocument();
    expect(screen.getByText('Edit YAML')).toBeInTheDocument();
  });

  it('renders matrix children when not nested', () => {
    const gen: AppSetGenerator = {
      matrix: {
        generators: [
          { list: { elements: [{ cluster: 'a' }] } },
        ],
      },
    };
    render(<GeneratorEditor generator={gen} index={0} onChange={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText(/Generator 1: Matrix/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('a')).toBeInTheDocument();
  });

  it('renders matrix as YAML when nested', () => {
    const gen: AppSetGenerator = { matrix: { generators: [] } };
    render(<GeneratorEditor generator={gen} index={0} onChange={jest.fn()} onRemove={jest.fn()} nested />);
    expect(screen.getByText('Edit YAML')).toBeInTheDocument();
  });
});
