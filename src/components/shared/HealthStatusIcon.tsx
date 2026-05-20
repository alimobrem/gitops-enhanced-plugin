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

const iconMap: Record<HealthStatusCode, ComponentType<{ color?: string }>> = {
  Healthy: CheckCircleIcon,
  Degraded: ExclamationCircleIcon,
  Progressing: SyncAltIcon,
  Suspended: PauseCircleIcon,
  Missing: GhostIcon,
  Unknown: QuestionCircleIcon,
};

const colorMap: Record<HealthStatusCode, string> = {
  Healthy: 'var(--pf-t--global--color--status--success--default)',
  Degraded: 'var(--pf-t--global--color--status--danger--default)',
  Progressing: 'var(--pf-t--global--color--status--info--default)',
  Suspended: 'var(--pf-t--global--color--status--info--default)',
  Missing: 'var(--pf-t--global--color--status--warning--default)',
  Unknown: 'var(--pf-t--global--color--status--info--default)',
};

export const HealthStatusIcon: FC<{ status: HealthStatusCode }> = ({
  status,
}) => {
  const IconComponent = iconMap[status] ?? QuestionCircleIcon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      <IconComponent color={colorMap[status]} />
      <span>{status}</span>
    </span>
  );
};
