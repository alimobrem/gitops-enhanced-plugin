import React from 'react';
import { render, screen } from '@testing-library/react';
import { SyncStatusIcon } from './SyncStatusIcon';

describe('SyncStatusIcon', () => {
  it('renders Synced', () => {
    render(<SyncStatusIcon status="Synced" />);
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('renders OutOfSync', () => {
    render(<SyncStatusIcon status="OutOfSync" />);
    expect(screen.getByText('OutOfSync')).toBeInTheDocument();
  });

  it('renders Unknown', () => {
    render(<SyncStatusIcon status="Unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
