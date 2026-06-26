import React from 'react';
import { useState, useMemo, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardTitle, CardBody,
  Flex, FlexItem,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import { k8sPatch, k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { PromoterCommitStatusModel } from '../../models';
import { useCommitStatuses } from '../../hooks/useCommitStatuses';
import { derivePipelineStatus } from '../../utils/promotion';
import { FLEX_SPACE_SM, FLEX_ALIGN_CENTER } from '../../utils/pf-constants';
import { EnvironmentStageCard } from './EnvironmentStageCard';
import { GateConnector } from './GateConnector';
import { GateDetailPanel } from './GateDetailPanel';
import { EnvironmentDetailPanel } from './EnvironmentDetailPanel';
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

  const setCommitStatusPhase = useCallback(
    async (key: string, sha: string, phase: 'pending' | 'success') => {
      const match = (commitStatuses ?? []).find(
        (cs: CommitStatusResource) => cs.spec.name === key && cs.spec.sha === sha,
      );
      if (match) {
        await k8sPatch({
          model: PromoterCommitStatusModel,
          resource: match,
          data: [{ op: 'replace', path: '/spec/phase', value: phase }],
        });
      } else {
        await k8sCreate({
          model: PromoterCommitStatusModel,
          data: {
            apiVersion: 'promoter.argoproj.io/v1alpha1',
            kind: 'CommitStatus',
            metadata: {
              generateName: `${key}-`,
              namespace: strategy.metadata.namespace,
            },
            spec: {
              gitRepositoryRef: { name: strategy.spec.gitRepositoryRef.name },
              sha,
              name: key,
              phase,
            },
          },
        });
      }
    },
    [commitStatuses, strategy.metadata.namespace, strategy.spec.gitRepositoryRef.name],
  );

  const getProposedSha = useCallback(
    (stageIndex: number): string => {
      const stage = stages[stageIndex];
      return stage?.proposedHydratedSha ?? stage?.proposedSha ?? stage?.activeSha ?? '';
    },
    [stages],
  );

  const handleRetry = useCallback(
    async (key: string) => {
      if (selection?.type !== 'gate') return;
      await setCommitStatusPhase(key, getProposedSha(selection.index + 1), 'pending');
    },
    [selection, getProposedSha, setCommitStatusPhase],
  );

  const handleApprove = useCallback(
    async (key: string) => {
      if (selection?.type !== 'gate') return;
      await setCommitStatusPhase(key, getProposedSha(selection.index + 1), 'success');
    },
    [selection, getProposedSha, setCommitStatusPhase],
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

      {selection?.type === 'env' && stages[selection.index] && (
        <EnvironmentDetailPanel stage={stages[selection.index]} />
      )}

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
