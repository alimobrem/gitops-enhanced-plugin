import React from 'react';
import { useState, useMemo, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, EmptyState, EmptyStateBody,
  Alert, Tooltip, Label, PageSection,
  Dropdown, DropdownList, DropdownItem, MenuToggle,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import { timeAgo } from '../../utils/time';
import type { ApplicationResource } from '../../types';

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

function commitUrl(repoURL?: string, revision?: string): string | null {
  if (!repoURL || !revision) return null;
  const cleanUrl = repoURL.replace(/\.git$/, '');
  if (cleanUrl.includes('github.com')) return `${cleanUrl}/commit/${revision}`;
  if (cleanUrl.includes('gitlab.com') || cleanUrl.includes('gitlab')) return `${cleanUrl}/-/commit/${revision}`;
  if (cleanUrl.includes('bitbucket.org')) return `${cleanUrl}/commits/${revision}`;
  return null;
}

function phaseColor(phase?: string): 'green' | 'red' | 'blue' | 'grey' {
  switch (phase) {
    case 'Succeeded': return 'green';
    case 'Failed': case 'Error': return 'red';
    case 'Running': return 'blue';
    default: return 'grey';
  }
}

const RowActions: FC<{
  entry: { id: number; revision: string };
  isCurrent: boolean;
  onRollback: (target: { id: number; revision: string }) => void;
}> = ({ entry, isCurrent, onRollback }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={() => setIsOpen(false)}
      onOpenChange={setIsOpen}
      popperProps={{ position: 'right' }}
      toggle={(ref) => (
        <MenuToggle ref={ref} variant="plain" onClick={() => setIsOpen(!isOpen)} aria-label={t('Actions')}>
          <EllipsisVIcon />
        </MenuToggle>
      )}
    >
      <DropdownList>
        {!isCurrent && (
          <DropdownItem key="rollback" onClick={() => onRollback(entry)}>
            {t('Rollback')}
          </DropdownItem>
        )}
        {isCurrent && (
          <DropdownItem key="current" isDisabled>
            {t('Current revision')}
          </DropdownItem>
        )}
      </DropdownList>
    </Dropdown>
  );
};

export const HistoryTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { sync } = useApplicationActions(app ?? null);
  const history = useMemo(() => [...(app?.status?.history ?? [])].reverse(), [app?.status?.history]);
  const [rollbackTarget, setRollbackTarget] = useState<{ id: number; revision: string } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollbackError, setRollbackError] = useState('');

  const handleRollback = useCallback(async () => {
    if (!rollbackTarget) return;
    setRolling(true);
    setRollbackError('');
    try {
      await sync({ revision: rollbackTarget.revision });
      setRollbackTarget(null);
    } catch (e) {
      setRollbackError((e as Error).message);
    } finally {
      setRolling(false);
    }
  }, [rollbackTarget, sync]);

  if (!app?.metadata) return <Bullseye><Spinner /></Bullseye>;

  if (history.length === 0) {
    return <EmptyState><EmptyStateBody>{t('No deployment history available.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <PageSection>
      <Table aria-label={t('Deployment History')} variant="compact">
        <Thead>
          <Tr>
            <Th>{t('ID')}</Th>
            <Th>{t('Status')}</Th>
            <Th>{t('Revision')}</Th>
            <Th>{t('Deployed At')}</Th>
            <Th>{t('Duration')}</Th>
            <Th>{t('Source')}</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {history.map((entry, idx) => {
            const url = commitUrl(entry.source?.repoURL, entry.revision);
            const opPhase = idx === 0 ? app.status?.operationState?.phase : undefined;

            return (
              <Tr key={entry.id}>
                <Td dataLabel={t('ID')}>{entry.id}</Td>
                <Td dataLabel={t('Status')}>
                  <Label isCompact color={phaseColor(idx === 0 ? opPhase : 'Succeeded')}>
                    {idx === 0 ? (opPhase ?? t('Completed')) : t('Completed')}
                  </Label>
                </Td>
                <Td dataLabel={t('Revision')}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {entry.revision.substring(0, 7)}
                    </a>
                  ) : (
                    <code>{entry.revision.substring(0, 7)}</code>
                  )}
                </Td>
                <Td dataLabel={t('Deployed At')}>
                  <Tooltip content={new Date(entry.deployedAt).toLocaleString()}>
                    <span>{timeAgo(entry.deployedAt)}</span>
                  </Tooltip>
                </Td>
                <Td dataLabel={t('Duration')}>
                  {formatDuration(entry.deployStartedAt, entry.deployedAt)}
                </Td>
                <Td dataLabel={t('Source')}>
                  {entry.source?.repoURL ? (
                    <Tooltip content={entry.source.repoURL}>
                      <span>{entry.source.repoURL.replace(/^https?:\/\//, '').split('/').slice(-2).join('/')}</span>
                    </Tooltip>
                  ) : '-'}
                </Td>
                <Td isActionCell>
                  <RowActions
                    entry={{ id: entry.id, revision: entry.revision }}
                    isCurrent={idx === 0}
                    onRollback={setRollbackTarget}
                  />
                </Td>
              </Tr>
            );
          })}
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
    </PageSection>
  );
};

export default HistoryTab;
