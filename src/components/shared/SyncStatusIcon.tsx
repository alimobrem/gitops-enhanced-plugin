import React from 'react';
import type { ComponentType, FC } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import type { SyncStatusCode } from '../../types';
import { syncStatusColor } from '../../utils/status';

const icons: Record<SyncStatusCode, ComponentType<{ color?: string }>> = {
  Synced: CheckCircleIcon,
  OutOfSync: ExclamationTriangleIcon,
  Unknown: QuestionCircleIcon,
};

export const SyncStatusIcon: FC<{ status: SyncStatusCode }> = ({ status }) => {
  const IconComponent = icons[status] ?? QuestionCircleIcon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      <IconComponent color={syncStatusColor[status]} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};
