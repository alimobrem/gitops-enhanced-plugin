import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, opts?: Record<string, unknown>) => {
  if (opts) return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  return s;
} }) }));

import { GateDetailPanel } from './GateDetailPanel';
import type { DerivedGateStatus, DerivedPipelineStage } from '../../utils/promotion';

const gate: DerivedGateStatus = {
  sourceEnv: 'dev',
  targetEnv: 'staging',
  status: 'blocked',
  failedChecks: ['security-scan'],
  pendingChecks: ['e2e-tests'],
  passedChecks: [],
  pr: { state: 'open', url: 'https://github.com/org/repo/pull/1', id: '1' },
};

const targetStage: DerivedPipelineStage = {
  branch: 'env/staging',
  label: 'staging',
  status: 'blocked',
  activeSha: 'aaa111',
  proposedSha: 'bbb222',
  proposedChecks: [
    { key: 'security-scan', phase: 'failure', url: 'https://tekton/run/1' },
    { key: 'e2e-tests', phase: 'pending', description: 'Waiting for status to be reported' },
  ],
  activeChecks: [
    { key: 'argocd-health', phase: 'pending', description: 'Waiting for status to be reported' },
  ],
  history: [],
  stuckMinutes: 0,
};

const stuckStage: DerivedPipelineStage = {
  ...targetStage,
  proposedChecks: [
    { key: 'integration-tests', phase: 'pending', description: 'Waiting for status to be reported' },
  ],
  activeChecks: [
    { key: 'argocd-health', phase: 'pending', description: 'Waiting for status to be reported' },
  ],
  stuckMinutes: 65,
};

describe('GateDetailPanel', () => {
  it('renders gate title', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getByText('Gate: dev → staging')).toBeInTheDocument();
  });

  it('renders PR link', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getByText('PR #1')).toBeInTheDocument();
  });

  it('renders proposed and active checks', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getByText('security-scan')).toBeInTheDocument();
    expect(screen.getByText('e2e-tests')).toBeInTheDocument();
    expect(screen.getByText('argocd-health')).toBeInTheDocument();
  });

  it('shows Approve button for pending manual checks', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getAllByText('Approve').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Retry button for failed checks', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows success alert after approve', async () => {
    const onApprove = jest.fn().mockResolvedValue(undefined);
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={onApprove} />);
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);
    expect(screen.getByText('Approve Check')).toBeInTheDocument();
    const confirmButtons = screen.getAllByText('Approve');
    const modalConfirm = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(modalConfirm);
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith('e2e-tests');
    });
    await waitFor(() => {
      expect(screen.getByText(/"e2e-tests" approved/)).toBeInTheDocument();
    });
  });

  it('shows error alert when approve fails', async () => {
    const onApprove = jest.fn().mockRejectedValue(new Error('forbidden'));
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={onApprove} />);
    const approveButtons = screen.getAllByText('Approve');
    fireEvent.click(approveButtons[0]);
    const confirmButtons = screen.getAllByText('Approve');
    const modalConfirm = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(modalConfirm);
    await waitFor(() => {
      expect(screen.getByText('forbidden')).toBeInTheDocument();
    });
  });

  it('shows success alert after retry', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={onRetry} onApproveCheck={jest.fn()} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(screen.getByText('Retry Check')).toBeInTheDocument();
    const confirmButtons = screen.getAllByText('Retry');
    const modalConfirm = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(modalConfirm);
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledWith('security-scan');
    });
    await waitFor(() => {
      expect(screen.getByText(/"security-scan" reset to pending/)).toBeInTheDocument();
    });
  });

  it('shows View Logs link for checks with URL', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getByText('View Logs')).toBeInTheDocument();
  });

  it('shows check description from the controller instead of Manual check', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getAllByText('Waiting for status to be reported').length).toBeGreaterThanOrEqual(1);
  });

  it('shows stuck warning when stuckMinutes >= 30', () => {
    render(<GateDetailPanel gate={gate} targetStage={stuckStage} stuckMinutes={65} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getByText('Promotion stuck for 65 minutes')).toBeInTheDocument();
    expect(screen.getByText(/Verify that your CI system/)).toBeInTheDocument();
  });

  it('does not show stuck warning when stuckMinutes < 30', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={10} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.queryByText(/Promotion stuck/)).not.toBeInTheDocument();
  });

  it('shows check descriptions from the controller', () => {
    render(<GateDetailPanel gate={gate} targetStage={targetStage} stuckMinutes={0} onRetryCheck={jest.fn()} onApproveCheck={jest.fn()} />);
    expect(screen.getAllByText('Waiting for status to be reported').length).toBeGreaterThanOrEqual(1);
  });
});
