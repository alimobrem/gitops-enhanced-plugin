import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { CommitStatusRow } from './CommitStatusRow';
import type { CommitStatusPhaseEntry } from '../../types';

const renderRow = (entry: CommitStatusPhaseEntry, onRetry?: () => void, onApprove?: () => void) =>
  render(
    <table><tbody>
      <CommitStatusRow entry={entry} onRetry={onRetry} onApprove={onApprove} />
    </tbody></table>,
  );

describe('CommitStatusRow', () => {
  it('renders check name and phase label', () => {
    renderRow({ key: 'security-scan', phase: 'success' });
    expect(screen.getByText('security-scan')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('renders View Logs link for checks with valid URL', () => {
    renderRow({ key: 'test', phase: 'success', url: 'https://tekton/run/1' });
    expect(screen.getByText('View Logs')).toBeInTheDocument();
    expect(screen.getByText('View Logs').closest('a')?.getAttribute('href')).toBe('https://tekton/run/1');
  });

  it('renders Manual check for checks without URL', () => {
    renderRow({ key: 'test', phase: 'pending' });
    expect(screen.getByText('Manual check')).toBeInTheDocument();
  });

  it('sanitizes javascript: URLs', () => {
    renderRow({ key: 'test', phase: 'success', url: 'javascript:alert(1)' });
    expect(screen.getByText('Manual check')).toBeInTheDocument();
    expect(screen.queryByText('View Logs')).not.toBeInTheDocument();
  });

  it('shows Approve button for pending checks with onApprove', () => {
    const onApprove = jest.fn();
    renderRow({ key: 'test', phase: 'pending' }, undefined, onApprove);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalled();
  });

  it('shows Retry button for failed checks with onRetry', () => {
    const onRetry = jest.fn();
    renderRow({ key: 'test', phase: 'failure' }, onRetry);
    expect(screen.getByText('Retry')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not show Approve for successful checks', () => {
    renderRow({ key: 'test', phase: 'success' }, undefined, jest.fn());
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('does not show Retry for pending checks', () => {
    renderRow({ key: 'test', phase: 'pending' }, jest.fn());
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('does not show Approve when no onApprove provided', () => {
    renderRow({ key: 'test', phase: 'pending' });
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });
});
