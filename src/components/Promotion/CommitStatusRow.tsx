import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Label } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import type { CommitStatusPhaseEntry } from '../../types';
import { commitStatusPhaseColor } from '../../utils/promotion';

const PhaseIcon: FC<{ phase: string }> = ({ phase }) => {
  switch (phase) {
    case 'success':
      return <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />;
    case 'failure':
      return <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />;
    case 'pending':
      return <InProgressIcon color="var(--pf-t--global--color--status--info--default)" />;
    default:
      return null;
  }
};

interface CommitStatusRowProps {
  entry: CommitStatusPhaseEntry;
  onRetry?: () => void;
  onApprove?: () => void;
}

export const CommitStatusRow: FC<CommitStatusRowProps> = ({ entry, onRetry, onApprove }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const isManual = !entry.url;
  const canRetry = entry.phase === 'failure' && onRetry;
  const canApprove = entry.phase === 'pending' && isManual && onApprove;

  return (
    <tr>
      <td>
        <PhaseIcon phase={entry.phase} />{' '}
        {entry.key}
      </td>
      <td>
        <Label isCompact color={commitStatusPhaseColor[entry.phase] ?? 'grey'}>
          {entry.phase}
        </Label>
      </td>
      <td>
        {entry.url ? (
          <a href={entry.url} target="_blank" rel="noopener noreferrer">
            {t('View Logs')}
          </a>
        ) : (
          <span>{t('Manual check')}</span>
        )}
      </td>
      <td>
        {canRetry && (
          <Button variant="link" size="sm" onClick={onRetry}>
            {t('Retry')}
          </Button>
        )}
        {canApprove && (
          <Button variant="link" size="sm" onClick={onApprove}>
            {t('Approve')}
          </Button>
        )}
      </td>
    </tr>
  );
};
