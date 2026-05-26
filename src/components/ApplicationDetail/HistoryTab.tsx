import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Bullseye, Spinner, EmptyState, EmptyStateBody, Button, Alert, Tooltip } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource } from '../../types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(startStr?: string, endStr?: string): string {
  if (!startStr || !endStr) return '-';
  const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
  if (diffMs < 0) return '-';
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remainSecs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

export const HistoryTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { sync } = useApplicationActions(app ?? null);
  const history = app?.status?.history ?? [];
  const [rollbackTarget, setRollbackTarget] = useState<{ id: number; revision: string } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollbackError, setRollbackError] = useState('');

  if (!app?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    setRolling(true);
    setRollbackError('');
    try {
      await sync(rollbackTarget.revision);
      setRollbackTarget(null);
    } catch (e) {
      setRollbackError((e as Error).message);
    } finally {
      setRolling(false);
    }
  };

  if (history.length === 0) {
    return <EmptyState><EmptyStateBody>{t('No deployment history available.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <>
      <Table aria-label={t('Deployment History')}>
        <Thead><Tr><Th>{t('ID')}</Th><Th>{t('Revision')}</Th><Th>{t('Deployed At')}</Th><Th>{t('Duration')}</Th><Th>{t('Source')}</Th><Th>{t('Actions')}</Th></Tr></Thead>
        <Tbody>
          {[...history].reverse().map((entry, idx) => (
            <Tr key={entry.id}>
              <Td>{entry.id}</Td>
              <Td>{entry.revision.substring(0, 7)}</Td>
              <Td>
                <Tooltip content={new Date(entry.deployedAt).toLocaleString()}>
                  <span>{timeAgo(entry.deployedAt)}</span>
                </Tooltip>
              </Td>
              <Td>{formatDuration(entry.deployStartedAt, entry.deployedAt)}</Td>
              <Td>{entry.source?.repoURL ? <a href={entry.source.repoURL} target="_blank" rel="noopener noreferrer">{entry.source.repoURL}</a> : '-'}</Td>
              <Td>{idx > 0 && <Button variant="secondary" size="sm" onClick={() => setRollbackTarget({ id: entry.id, revision: entry.revision })}>{t('Rollback')}</Button>}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <ConfirmModal
        title={t('Confirm Rollback')}
        isOpen={!!rollbackTarget}
        onConfirm={handleRollback}
        onCancel={() => setRollbackTarget(null)}
        isLoading={rolling}
        confirmLabel={t('Rollback')}
      >
        {rollbackError && <Alert variant="danger" isInline title={t('Rollback failed')} className="pf-v6-u-mb-md">{rollbackError}</Alert>}
        {rollbackTarget && t('Are you sure you want to rollback to revision {{revision}}?', { revision: rollbackTarget.revision.substring(0, 7) })}
      </ConfirmModal>
    </>
  );
};

export default HistoryTab;
