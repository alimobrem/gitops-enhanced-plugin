import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Label } from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
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
  const safeUrl = entry.url && /^https?:\/\//i.test(entry.url) ? entry.url : undefined;
  const isManual = !safeUrl;
  const canRetry = entry.phase === 'failure' && onRetry;
  const canApprove = entry.phase === 'pending' && onApprove;

  return (
    <Tr>
      <Td>
        <PhaseIcon phase={entry.phase} />{' '}
        {entry.key}
      </Td>
      <Td>
        <Label isCompact color={commitStatusPhaseColor[entry.phase] ?? 'grey'}>
          {entry.phase}
        </Label>
      </Td>
      <Td>
        {entry.description && (
          <div className="pf-v6-u-color-200 pf-v6-u-font-size-sm">{entry.description}</div>
        )}
        {safeUrl ? (
          <Button variant="link" size="sm" component="a" href={safeUrl} target="_blank" rel="noopener noreferrer">
            {t('View Logs')}
          </Button>
        ) : !entry.description ? (
          <span className="pf-v6-u-color-200">{t('Manual check')}</span>
        ) : null}
      </Td>
      <Td>
        {canRetry && (
          <Button variant="secondary" isSmall onClick={onRetry}>
            {t('Retry')}
          </Button>
        )}
        {canApprove && (
          <Button variant="secondary" isSmall onClick={onApprove}>
            {t('Approve')}
          </Button>
        )}
      </Td>
    </Tr>
  );
};
