import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { YamlGeneratorEditor } from './YamlGeneratorEditor';

describe('YamlGeneratorEditor', () => {
  const gen = { pullRequest: { github: { owner: 'test', repo: 'app' } } };

  it('renders YAML in pre element', () => {
    render(<YamlGeneratorEditor generator={gen} onChange={jest.fn()} />);
    expect(screen.getByText(/pullRequest/)).toBeInTheDocument();
  });

  it('shows edit button', () => {
    render(<YamlGeneratorEditor generator={gen} onChange={jest.fn()} />);
    expect(screen.getByText('Edit YAML')).toBeInTheDocument();
  });

  it('enters edit mode on click', () => {
    render(<YamlGeneratorEditor generator={gen} onChange={jest.fn()} />);
    fireEvent.click(screen.getByText('Edit YAML'));
    expect(screen.getByRole('textbox', { name: 'Edit YAML' })).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels edit mode', () => {
    render(<YamlGeneratorEditor generator={gen} onChange={jest.fn()} />);
    fireEvent.click(screen.getByText('Edit YAML'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Edit YAML')).toBeInTheDocument();
  });

  it('shows error on invalid YAML save', () => {
    render(<YamlGeneratorEditor generator={gen} onChange={jest.fn()} />);
    fireEvent.click(screen.getByText('Edit YAML'));
    const textarea = screen.getByRole('textbox', { name: 'Edit YAML' });
    fireEvent.change(textarea, { target: { value: '[invalid yaml' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Invalid YAML')).toBeInTheDocument();
  });
});
