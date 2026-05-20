import React from 'react';
import type { ComponentType, FC } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  SyncAltIcon,
  PauseCircleIcon,
  GhostIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import type { HealthStatusCode } from '../../types';
import { healthStatusColor } from '../../utils/status';
import './StatusIcon.css';

const iconMap: Record<HealthStatusCode, ComponentType<{ color?: string }>> = {
  Healthy: CheckCircleIcon,
  Degraded: ExclamationCircleIcon,
  Progressing: SyncAltIcon,
  Suspended: PauseCircleIcon,
  Missing: GhostIcon,
  Unknown: QuestionCircleIcon,
};

export const HealthStatusIcon: FC<{ status: HealthStatusCode }> = ({
  status,
}) => {
  const IconComponent = iconMap[status] ?? QuestionCircleIcon;
  return (
    <span className="gitops-status-icon">
      <IconComponent color={healthStatusColor[status]} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};
