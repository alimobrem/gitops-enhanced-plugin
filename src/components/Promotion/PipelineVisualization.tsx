import React from 'react';
import { useState, useMemo, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardTitle, CardBody,
  Flex, FlexItem,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { PromoterCommitStatusModel } from '../../models';
import { useCommitStatuses } from '../../hooks/useCommitStatuses';
import { derivePipelineStatus } from '../../utils/promotion';
import { FLEX_SPACE_SM, FLEX_ALIGN_CENTER } from '../../utils/pf-constants';
import { EnvironmentStageCard } from './EnvironmentStageCard';
import { GateConnector } from './GateConnector';
import { GateDetailPanel } from './GateDetailPanel';
import type { PromotionStrategyResource, CommitStatusResource } from '../../types';
import './PipelineVisualization.css';

type Selection = { type: 'env'; index: number } | { type: 'gate'; index: number } | null;

interface PipelineVisualizationProps {
  strategy: PromotionStrategyResource;
}

export const PipelineVisualization: FC<PipelineVisualizationProps> = ({ strategy }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [selection, setSelection] = useState<Selection>(null);

  const [commitStatuses] = useCommitStatuses(strategy.metadata.namespace);

  const { stages, gates } = useMemo(
    () => derivePipelineStatus(strategy),
    [strategy],
  );

  const patchCommitStatus = useCallback(
    async (key: string, sha: string, phase: 'pending' | 'success') => {
      const match = (commitStatuses ?? []).find(
        (cs: CommitStatusResource) => cs.spec.name === key && cs.spec.sha === sha,
      );
      if (!match) return;
      await k8sPatch({
        model: PromoterCommitStatusModel,
        resource: match,
        data: [{ op: 'replace', path: '/spec/phase', value: phase }],
      });
    },
    [commitStatuses],
  );

  const handleRetry = useCallback(
    async (key: string) => {
      if (selection?.type !== 'gate') return;
      const stage = stages[selection.index + 1];
      const sha = stage?.proposedSha ?? stage?.activeSha ?? '';
      await patchCommitStatus(key, sha, 'pending');
    },
    [selection, stages, patchCommitStatus],
  );

  const handleApprove = useCallback(
    async (key: string) => {
      if (selection?.type !== 'gate') return;
      const stage = stages[selection.index + 1];
      const sha = stage?.proposedSha ?? stage?.activeSha ?? '';
      await patchCommitStatus(key, sha, 'success');
    },
    [selection, stages, patchCommitStatus],
  );

  return (
    <div className="gitops-pipeline">
      <Card isCompact className="pf-v6-u-mb-md">
        <CardTitle>{t('Promotion Pipeline')}</CardTitle>
        <CardBody>
          <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
            {stages.map((stage, i) => (
              <React.Fragment key={stage.branch}>
                {i > 0 && (
                  <>
                    <FlexItem>
                      <GateConnector
                        gate={gates[i - 1]}
                        isSelected={selection?.type === 'gate' && selection.index === i - 1}
                        onClick={() =>
                          setSelection((prev) =>
                            prev?.type === 'gate' && prev.index === i - 1
                              ? null
                              : { type: 'gate', index: i - 1 },
                          )
                        }
                      />
                    </FlexItem>
                    <FlexItem>
                      <ArrowRightIcon className="gitops-gate-arrow" />
                    </FlexItem>
                  </>
                )}
                <FlexItem>
                  <EnvironmentStageCard
                    stage={stage}
                    isSelected={selection?.type === 'env' && selection.index === i}
                    onClick={() =>
                      setSelection((prev) =>
                        prev?.type === 'env' && prev.index === i
                          ? null
                          : { type: 'env', index: i },
                      )
                    }
                  />
                </FlexItem>
              </React.Fragment>
            ))}
          </Flex>
        </CardBody>
      </Card>

      {selection?.type === 'gate' && gates[selection.index] && (
        <GateDetailPanel
          gate={gates[selection.index]}
          targetStage={stages[selection.index + 1]}
          onRetryCheck={handleRetry}
          onApproveCheck={handleApprove}
        />
      )}
    </div>
  );
};

export default PipelineVisualization;
