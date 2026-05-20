import type { FC } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import type { SyncStatusCode } from '../../types';

const icons: Record<SyncStatusCode, FC> = {
  Synced: CheckCircleIcon,
  OutOfSync: ExclamationTriangleIcon,
  Unknown: QuestionCircleIcon,
};

const colorMap: Record<SyncStatusCode, string> = {
  Synced: 'var(--pf-t--global--color--status--success--default)',
  OutOfSync: 'var(--pf-t--global--color--status--warning--default)',
  Unknown: 'var(--pf-t--global--color--status--info--default)',
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
      <IconComponent color={colorMap[status]} />
      <span>{status}</span>
    </span>
  );
};
