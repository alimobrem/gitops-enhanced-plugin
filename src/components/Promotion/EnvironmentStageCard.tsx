import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Label, Tooltip } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import type { DerivedPipelineStage, PipelineStageStatus } from '../../utils/promotion';
import { timeAgo } from '../../utils/time';

const statusLabelColor: Record<PipelineStageStatus, 'green' | 'red' | 'blue' | 'gold'> = {
  healthy: 'green',
  promoting: 'blue',
  blocked: 'red',
  pending: 'gold',
};

const statusText: Record<PipelineStageStatus, string> = {
  healthy: 'Healthy',
  promoting: 'Promoting',
  blocked: 'Blocked',
  pending: 'Pending',
};

interface EnvironmentStageCardProps {
  stage: DerivedPipelineStage;
  isSelected: boolean;
  onClick: () => void;
}

export const EnvironmentStageCard: FC<EnvironmentStageCardProps> = ({ stage, isSelected, onClick }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const stateClass = `gitops-env-card--${stage.status}`;
  const selectedClass = isSelected ? ' gitops-env-card--selected' : '';

  return (
    <Card
      isCompact
      className={`gitops-env-card ${stateClass}${selectedClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <CardBody>
        <div className="gitops-env-label">{stage.label}</div>
        {stage.activeSha && (
          <Tooltip
            content={
              stage.activeNote?.subject
                ? `${stage.activeNote.subject}${stage.activeNote.author ? ` — ${stage.activeNote.author}` : ''}`
                : stage.activeSha
            }
          >
            <div className="gitops-env-sha">
              {stage.activeHydratedSha && stage.activeHydratedSha !== stage.activeSha ? (
                <>
                  <span className="gitops-env-sha-label">dry:</span> {stage.activeSha.slice(0, 7)}
                  <br />
                  <span className="gitops-env-sha-label">hyd:</span> {stage.activeHydratedSha.slice(0, 7)}
                </>
              ) : (
                stage.activeSha.slice(0, 7)
              )}
            </div>
          </Tooltip>
        )}
        <div className="gitops-env-status">
          <Label isCompact color={statusLabelColor[stage.status]}>
            {t(statusText[stage.status])}
          </Label>
        </div>
        {stage.pr?.state === 'open' && (
          <div className="gitops-env-sha">
            PR #{stage.pr.id ?? '?'}
          </div>
        )}
        {stage.pr?.createdAt && stage.status === 'promoting' && (
          <div className="gitops-env-time">{timeAgo(stage.pr.createdAt)}</div>
        )}
        {!stage.pr?.createdAt && stage.activeCommitTime && stage.status === 'healthy' && (
          <div className="gitops-env-time">{timeAgo(stage.activeCommitTime)}</div>
        )}
        {stage.stuckMinutes >= 30 && (
          <Tooltip content={t('All checks pending for {{minutes}}m — click for details', { minutes: stage.stuckMinutes })}>
            <div className="gitops-env-stuck">
              <ExclamationTriangleIcon color="var(--pf-t--global--color--status--warning--default)" /> {t('Stuck')}
            </div>
          </Tooltip>
        )}
      </CardBody>
    </Card>
  );
};
