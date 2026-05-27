import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { ListGeneratorForm } from './ListGeneratorForm';
import type { ListGenerator } from '../../../types';

describe('ListGeneratorForm', () => {
  const baseGen: ListGenerator = {
    list: { elements: [{ cluster: 'prod', url: 'https://prod.example.com' }] },
  };

  it('renders element table with columns', () => {
    const onChange = jest.fn();
    render(<ListGeneratorForm generator={baseGen} onChange={onChange} />);
    expect(screen.getByDisplayValue('prod')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://prod.example.com')).toBeInTheDocument();
  });

  it('calls onChange when adding an element', () => {
    const onChange = jest.fn();
    render(<ListGeneratorForm generator={baseGen} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add Element'));
    expect(onChange).toHaveBeenCalledWith({
      list: { elements: [{ cluster: 'prod', url: 'https://prod.example.com' }, { cluster: '', url: '' }] },
    });
  });

  it('calls onChange when adding a column', () => {
    const onChange = jest.fn();
    render(<ListGeneratorForm generator={baseGen} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add Column'));
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0] as ListGenerator;
    expect(Object.keys(arg.list.elements[0])).toContain('key2');
  });

  it('renders add column when no elements', () => {
    const onChange = jest.fn();
    const emptyGen: ListGenerator = { list: { elements: [] } };
    render(<ListGeneratorForm generator={emptyGen} onChange={onChange} />);
    expect(screen.getByText('Add Column')).toBeInTheDocument();
  });
});
