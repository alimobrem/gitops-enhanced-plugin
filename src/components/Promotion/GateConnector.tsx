import React from 'react';
import type { FC } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedClockIcon,
} from '@patternfly/react-icons';
import type { DerivedGateStatus, GateStatus } from '../../utils/promotion';

const gateIconClass: Record<GateStatus, string> = {
  passed: 'gitops-gate-icon--passed',
  blocked: 'gitops-gate-icon--blocked',
  running: 'gitops-gate-icon--running',
  waiting: 'gitops-gate-icon--waiting',
};

const GateIcon: FC<{ status: GateStatus }> = ({ status }) => {
  switch (status) {
    case 'passed':
      return <CheckCircleIcon className={gateIconClass.passed} />;
    case 'blocked':
      return <ExclamationCircleIcon className={gateIconClass.blocked} />;
    case 'running':
      return <InProgressIcon className={gateIconClass.running} />;
    case 'waiting':
      return <OutlinedClockIcon className={gateIconClass.waiting} />;
  }
};

interface GateConnectorProps {
  gate: DerivedGateStatus;
  isSelected: boolean;
  onClick: () => void;
}

export const GateConnector: FC<GateConnectorProps> = ({ gate, isSelected, onClick }) => {
  const summaryText = gate.status === 'blocked' && gate.failedChecks.length > 0
    ? gate.failedChecks[0]
    : gate.status === 'running' && gate.pendingChecks.length > 0
    ? gate.pendingChecks[0]
    : null;

  return (
    <div
      className="gitops-gate"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.85 }}
    >
      <GateIcon status={gate.status} />
      {summaryText && (
        <div className={`gitops-gate-summary${gate.status === 'blocked' ? ' gitops-gate-summary--failed' : ''}`}>
          {summaryText}
        </div>
      )}
    </div>
  );
};
