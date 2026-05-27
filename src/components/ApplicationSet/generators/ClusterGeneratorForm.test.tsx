import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { ClusterGeneratorForm } from './ClusterGeneratorForm';
import type { ClusterGenerator } from '../../../types';

describe('ClusterGeneratorForm', () => {
  const baseGen: ClusterGenerator = {
    clusters: { selector: { matchLabels: { env: 'prod' } }, values: { region: 'us-east' } },
  };

  it('renders match labels', () => {
    render(<ClusterGeneratorForm generator={baseGen} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('env')).toBeInTheDocument();
    expect(screen.getByDisplayValue('prod')).toBeInTheDocument();
  });

  it('renders values', () => {
    render(<ClusterGeneratorForm generator={baseGen} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('region')).toBeInTheDocument();
    expect(screen.getByDisplayValue('us-east')).toBeInTheDocument();
  });

  it('calls onChange when adding a label', () => {
    const onChange = jest.fn();
    render(<ClusterGeneratorForm generator={baseGen} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add Label'));
    expect(onChange).toHaveBeenCalled();
  });

  it('renders with empty generator', () => {
    const emptyGen: ClusterGenerator = { clusters: {} };
    render(<ClusterGeneratorForm generator={emptyGen} onChange={jest.fn()} />);
    expect(screen.getByText('Match Labels')).toBeInTheDocument();
  });
});
