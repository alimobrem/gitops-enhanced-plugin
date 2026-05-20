import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, EmptyStateBody, Button, Alert } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource } from '../../types';

export const HistoryTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { sync } = useApplicationActions(app);
  const history = app.status?.history ?? [];
  const [rollbackTarget, setRollbackTarget] = useState<{ id: number; revision: string } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollbackError, setRollbackError] = useState('');

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
        <Thead><Tr><Th>{t('ID')}</Th><Th>{t('Revision')}</Th><Th>{t('Deployed At')}</Th><Th>{t('Source')}</Th><Th>{t('Actions')}</Th></Tr></Thead>
        <Tbody>
          {[...history].reverse().map((entry, idx) => (
            <Tr key={entry.id}>
              <Td>{entry.id}</Td>
              <Td>{entry.revision.substring(0, 7)}</Td>
              <Td>{new Date(entry.deployedAt).toLocaleString()}</Td>
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
