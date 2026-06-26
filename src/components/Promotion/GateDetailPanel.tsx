import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardTitle, CardBody,
  Alert,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th } from '@patternfly/react-table';
import { ConfirmModal } from '../shared/ConfirmModal';
import { CommitStatusRow } from './CommitStatusRow';
import type { DerivedGateStatus, DerivedPipelineStage } from '../../utils/promotion';
import { safeHref } from '../../utils/promotion';

interface GateDetailPanelProps {
  gate: DerivedGateStatus;
  targetStage: DerivedPipelineStage;
  stuckMinutes: number;
  onRetryCheck: (key: string) => Promise<void>;
  onApproveCheck: (key: string) => Promise<void>;
}

export const GateDetailPanel: FC<GateDetailPanelProps> = ({
  gate,
  targetStage,
  stuckMinutes,
  onRetryCheck,
  onApproveCheck,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [confirmAction, setConfirmAction] = useState<{ type: 'retry' | 'approve'; key: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const proposedChecks = targetStage.proposedChecks;
  const activeChecks = targetStage.activeChecks;

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      if (confirmAction.type === 'retry') {
        await onRetryCheck(confirmAction.key);
        setActionSuccess(t('"{{key}}" reset to pending — waiting for rerun', { key: confirmAction.key }));
      } else {
        await onApproveCheck(confirmAction.key);
        setActionSuccess(t('"{{key}}" approved — promotion will proceed once all checks pass', { key: confirmAction.key }));
      }
      setConfirmAction(null);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="gitops-gate-detail">
      <CardTitle>
        {t('Gate: {{source}} → {{target}}', { source: gate.sourceEnv, target: gate.targetEnv })}
      </CardTitle>
      <CardBody>
        {actionSuccess && (
          <Alert variant="success" isInline title={actionSuccess} className="pf-v6-u-mb-md"
            actionClose={<Button variant="plain" aria-label="Close" onClick={() => setActionSuccess('')} />}
          />
        )}
        {actionError && !confirmAction && (
          <Alert variant="danger" isInline title={actionError} className="pf-v6-u-mb-md"
            actionClose={<Button variant="plain" aria-label="Close" onClick={() => setActionError('')} />}
          />
        )}
        {stuckMinutes >= 30 && (
          <Alert variant="warning" isInline className="pf-v6-u-mb-md"
            title={t('Promotion stuck for {{minutes}} minutes', { minutes: stuckMinutes })}
          >
            {t('All checks have been pending since the PR was opened. Verify that your CI system (Tekton, GitHub Actions) is configured to report commit statuses for this repository, or manually approve the checks below.')}
          </Alert>
        )}
        {gate.pr?.url && (
          <div className="gitops-gate-detail__pr-link">
            <Button
              variant="link"
              component="a"
              href={safeHref(gate.pr.url)}
              target="_blank"
              rel="noopener noreferrer"
              isDisabled={!safeHref(gate.pr.url)}
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
            >
              PR #{gate.pr.id ?? '?'}
            </Button>
          </div>
        )}

        {(targetStage.proposedSha || targetStage.proposedNote) && (
          <DescriptionList isHorizontal isCompact className="pf-v6-u-mb-md">
            {targetStage.proposedSha && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Commit')}</DescriptionListTerm>
                <DescriptionListDescription className="gitops-env-sha">
                  {targetStage.proposedSha.slice(0, 7)}
                  {targetStage.proposedHydratedSha && targetStage.proposedHydratedSha !== targetStage.proposedSha && (
                    <> {' → '} {targetStage.proposedHydratedSha.slice(0, 7)} <span className="gitops-env-sha-label">({t('hydrated')})</span></>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {targetStage.proposedNote?.author && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Author')}</DescriptionListTerm>
                <DescriptionListDescription>{targetStage.proposedNote.author}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {targetStage.proposedNote?.subject && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Message')}</DescriptionListTerm>
                <DescriptionListDescription>{targetStage.proposedNote.subject}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {targetStage.proposedNote?.date && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Pushed')}</DescriptionListTerm>
                <DescriptionListDescription>{targetStage.proposedNote.date}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        )}

        {proposedChecks.length > 0 && (
          <>
            <div className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">
              {t('Proposed checks (must pass before merge)')}
            </div>
            <Table aria-label={t('Proposed commit statuses')} isCompact isStriped>
              <Thead>
                <Tr>
                  <Th>{t('Check')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>{t('Details')}</Th>
                  <Th>{t('Actions')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {proposedChecks.map((entry) => (
                  <CommitStatusRow
                    key={entry.key}
                    entry={entry}
                    onRetry={() => setConfirmAction({ type: 'retry', key: entry.key })}
                    onApprove={() => setConfirmAction({ type: 'approve', key: entry.key })}
                  />
                ))}
              </Tbody>
            </Table>
          </>
        )}

        {activeChecks.length > 0 && (
          <>
            <div className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm pf-v6-u-mt-md">
              {t('Active checks (must pass after merge)')}
            </div>
            <Table aria-label={t('Active commit statuses')} isCompact isStriped>
              <Thead>
                <Tr>
                  <Th>{t('Check')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>{t('Details')}</Th>
                  <Th>{t('Actions')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activeChecks.map((entry) => (
                  <CommitStatusRow
                    key={entry.key}
                    entry={entry}
                    onRetry={() => setConfirmAction({ type: 'retry', key: entry.key })}
                    onApprove={() => setConfirmAction({ type: 'approve', key: entry.key })}
                  />
                ))}
              </Tbody>
            </Table>
          </>
        )}

        <ConfirmModal
          title={confirmAction?.type === 'retry' ? t('Retry Check') : t('Approve Check')}
          isOpen={!!confirmAction}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          isLoading={actionLoading}
          confirmLabel={confirmAction?.type === 'retry' ? t('Retry') : t('Approve')}
          confirmVariant={confirmAction?.type === 'approve' ? 'danger' : 'primary'}
        >
          {actionError && (
            <Alert variant="danger" isInline isPlain title={actionError} className="pf-v6-u-mb-sm" />
          )}
          {confirmAction?.type === 'retry'
            ? t('Retry the "{{key}}" check? This will reset the commit status to pending.', { key: confirmAction.key })
            : t('Manually approve the "{{key}}" check? This will mark the commit status as successful.', { key: confirmAction?.key ?? '' })}
        </ConfirmModal>
      </CardBody>
    </Card>
  );
};
