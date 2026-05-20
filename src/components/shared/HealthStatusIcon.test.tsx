import React from 'react';
import { render, screen } from '@testing-library/react';
import { HealthStatusIcon } from './HealthStatusIcon';

describe('HealthStatusIcon', () => {
  it('renders Healthy', () => {
    render(<HealthStatusIcon status="Healthy" />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders Degraded', () => {
    render(<HealthStatusIcon status="Degraded" />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('renders Progressing', () => {
    render(<HealthStatusIcon status="Progressing" />);
    expect(screen.getByText('Progressing')).toBeInTheDocument();
  });
});
