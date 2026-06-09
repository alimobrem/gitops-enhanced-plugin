import React from 'react';
import { useMemo, useState, type FC } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card, CardTitle, CardBody,
  Flex, FlexItem,
  Grid, GridItem,
  Label,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  PauseCircleIcon,
  InProgressIcon,
  ArrowRightIcon,
} from '@patternfly/react-icons';
import { AnalysisRunGroupVersionKind } from '../../models';
import { ConfirmModal } from '../shared/ConfirmModal';
import type { RolloutResource } from '../../types';
import { FLEX_SPACE_SM, FLEX_ALIGN_CENTER } from '../../utils/pf-constants';
import { phaseColor } from '../../utils/status';
import './RolloutVisualization.css';

interface RSResource {
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    labels?: Record<string, string>;
    ownerReferences?: Array<{ name: string; kind: string; uid: string }>;
  };
  spec?: {
    replicas?: number;
    template?: { spec?: { containers?: Array<{ image: string }> } };
  };
  status?: { replicas?: number; readyReplicas?: number };
}

interface AnalysisRunResource {
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp?: string;
    ownerReferences?: Array<{ name: string; kind: string }>;
  };
  status?: { phase?: string; message?: string };
}

const stepLabel = (key: string, value: unknown): string => {
  switch (key) {
    case 'setWeight':
      return `${value}%`;
    case 'pause': {
      const dur = (value as Record<string, unknown>)?.duration;
      return dur ? String(dur) : '∞';
    }
    case 'analysis':
      return (value as Record<string, unknown>)?.templates
        ? String(((value as Record<string, unknown>).templates as Array<Record<string, unknown>>)?.[0]?.templateName ?? 'Analysis')
        : 'Analysis';
    case 'experiment':
      return 'Experiment';
    default:
      return key;
  }
};

const phaseAlertVariant = (phase?: string): 'success' | 'info' | 'danger' | 'warning' => {
  switch (phase) {
    case 'Healthy': return 'success';
    case 'Paused': return 'info';
    case 'Progressing': return 'info';
    case 'Degraded': return 'danger';
    default: return 'warning';
  }
};

interface RolloutVisualizationProps {
  rollout: RolloutResource;
  promote: () => Promise<void>;
  promoteFull: () => Promise<void>;
}

export const RolloutVisualization: FC<RolloutVisualizationProps> = ({ rollout, promote, promoteFull }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [showPromoteFullConfirm, setShowPromoteFullConfirm] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isPromotingFull, setIsPromotingFull] = useState(false);

  const phase = rollout?.status?.phase;
  const currentStepIndex = rollout?.status?.currentStepIndex ?? 0;
  const steps = rollout?.spec?.strategy?.canary?.steps;
  const isCanary = !!rollout?.spec?.strategy?.canary;
  const isBlueGreen = !!rollout?.spec?.strategy?.blueGreen;

  // Watch ReplicaSets
  const [replicaSets, rsLoaded, rsError] = useK8sWatchResource<RSResource[]>({
    groupVersionKind: { group: 'apps', version: 'v1', kind: 'ReplicaSet' },
    namespace: rollout?.metadata?.namespace ?? '',
    isList: true,
  });

  // Watch AnalysisRuns
  const [analysisRuns, arLoaded, arError] = useK8sWatchResource<AnalysisRunResource[]>({
    groupVersionKind: AnalysisRunGroupVersionKind,
    namespace: rollout?.metadata?.namespace ?? '',
    isList: true,
  });

  // Filter ReplicaSets owned by this rollout
  const ownedRS = useMemo(() =>
    (replicaSets ?? []).filter((rs) =>
      rs.metadata?.ownerReferences?.some(
        (ref) => ref.kind === 'Rollout' && ref.name === rollout?.metadata?.name,
      ),
    ),
  [replicaSets, rollout?.metadata?.name]);

  const stableRS = useMemo(() =>
    ownedRS.find((rs) => rs.metadata?.labels?.['rollouts-pod-template-hash'] === rollout?.status?.stableRS),
  [ownedRS, rollout?.status?.stableRS]);

  const canaryRS = useMemo(() =>
    ownedRS.find((rs) => rs.metadata?.labels?.['rollouts-pod-template-hash'] === rollout?.status?.currentPodHash),
  [ownedRS, rollout?.status?.currentPodHash]);

  // Compute canary traffic weight
  const currentWeight = useMemo(() => {
    if (!steps || !isCanary) return 0;
    // Find last completed setWeight step
    for (let i = Math.min(currentStepIndex, steps.length) - 1; i >= 0; i--) {
      if (steps[i]?.setWeight !== undefined) {
        return Number(steps[i].setWeight);
      }
    }
    return 0;
  }, [steps, currentStepIndex, isCanary]);

  const nextWeight = useMemo(() => {
    if (!steps) return 100;
    for (let i = currentStepIndex + 1; i < steps.length; i++) {
      if (steps[i]?.setWeight !== undefined) return Number(steps[i].setWeight);
    }
    return 100;
  }, [steps, currentStepIndex]);

  // Latest analysis run
  const latestRun = useMemo(() => {
    const rolloutName = rollout?.metadata?.name ?? '';
    return (analysisRuns ?? [])
      .filter((r) =>
        r.metadata?.ownerReferences?.some(
          (ref) => ref.kind === 'Rollout' && ref.name === rolloutName,
        ),
      )
      .sort((a, b) =>
        (b.metadata?.creationTimestamp ?? '').localeCompare(a.metadata?.creationTimestamp ?? ''),
      )
      .at(0);
  }, [analysisRuns, rollout?.metadata?.name]);

  const stableWeight = 100 - currentWeight;

  const rsImage = (rs?: RSResource): string =>
    rs?.spec?.template?.spec?.containers?.[0]?.image ?? '-';

  if (!rollout?.metadata) return null;

  return (
    <div>
      {(rsError || arError) && (
        <Alert variant="warning" isInline isPlain title={t('Error loading resources')} className="pf-v6-u-mb-sm" />
      )}
      {/* Section 1: Phase Banner */}
      <Alert
        variant={phaseAlertVariant(phase)}
        isInline
        isPlain
        title={phase === 'Progressing' ? t('In Progress') : (phase ?? t('Unknown'))}
        className="pf-v6-u-mb-md"
      />

      {/* Section 2: Canary Step Timeline */}
      {isCanary && steps && steps.length > 0 && (
        <Card isCompact className="pf-v6-u-mb-md">
          <CardTitle>{t('Step {{n}} of {{total}}', { n: currentStepIndex + 1, total: steps.length })}</CardTitle>
          <CardBody>
            <Flex spaceItems={FLEX_SPACE_SM} alignItems={FLEX_ALIGN_CENTER}>
              {steps.map((step, i) => {
                const key = Object.keys(step)[0];
                const isComplete = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;

                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <FlexItem>
                        <ArrowRightIcon className="gitops-step-arrow" />
                      </FlexItem>
                    )}
                    <FlexItem>
                      <Card
                        isCompact
                        className={`gitops-step-card${isComplete ? ' gitops-step--complete' : ''}${isCurrent ? ' gitops-step--current' : ''}`}
                      >
                        <CardBody>
                          <div className="gitops-step-type">{stepLabel(key, step[key])}</div>
                          <div className="gitops-step-status">
                            {isComplete && <CheckCircleIcon className="gitops-step-icon--success" />}
                            {isCurrent && phase === 'Paused' && (
                              <PauseCircleIcon className="gitops-step-icon--paused" />
                            )}
                            {isCurrent && phase !== 'Paused' && (
                              <InProgressIcon className="gitops-step-icon--progress" />
                            )}
                          </div>
                          {isCurrent && phase === 'Paused' && (
                            <Flex className="pf-v6-u-mt-sm">
                              <FlexItem>
                                <Button variant="primary" size="sm" onClick={() => setShowPromoteConfirm(true)}>
                                  {t('Promote')}
                                </Button>
                              </FlexItem>
                              <FlexItem>
                                <Button variant="link" size="sm" onClick={() => setShowPromoteFullConfirm(true)}>
                                  {t('Promote Full')}
                                </Button>
                              </FlexItem>
                            </Flex>
                          )}
                        </CardBody>
                      </Card>
                    </FlexItem>
                  </React.Fragment>
                );
              })}
            </Flex>
          </CardBody>
        </Card>
      )}

      {/* Section 3: Traffic Split Bar (canary only) */}
      {isCanary && (
        <Card isCompact className="pf-v6-u-mb-md">
          <CardTitle>{t('Traffic Split')}</CardTitle>
          <CardBody>
            <div
              className="gitops-traffic-bar"
              style={{ '--stable-weight': `${stableWeight}%`, '--canary-weight': `${currentWeight}%` } as React.CSSProperties}
            >
              <div className="gitops-traffic-stable">
                {t('Stable')} ({stableWeight}%)
              </div>
              <div className="gitops-traffic-canary">
                {t('Canary')} ({currentWeight}%)
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Section 4: ReplicaSet Cards */}
      {rsLoaded && (stableRS || canaryRS) && (
        <Grid hasGutter className="pf-v6-u-mb-md">
          <GridItem span={6}>
            <Card>
              <CardTitle>{isBlueGreen ? t('Active') : t('Stable')}</CardTitle>
              <CardBody>
                {stableRS ? (
                  <>
                    <div>RS: {stableRS.metadata?.name}</div>
                    <div>
                      {stableRS.status?.readyReplicas ?? 0}/{stableRS.status?.replicas ?? 0} {t('ready')}
                    </div>
                    <div>{t('Image')}: {rsImage(stableRS)}</div>
                  </>
                ) : '-'}
              </CardBody>
            </Card>
          </GridItem>
          <GridItem span={6}>
            <Card>
              <CardTitle>{isBlueGreen ? t('Preview') : t('Canary')}</CardTitle>
              <CardBody>
                {canaryRS ? (
                  <>
                    <div>RS: {canaryRS.metadata?.name}</div>
                    <div>
                      {canaryRS.status?.readyReplicas ?? 0}/{canaryRS.status?.replicas ?? 0} {t('ready')}
                    </div>
                    <div>{t('Image')}: {rsImage(canaryRS)}</div>
                  </>
                ) : '-'}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      )}

      {/* Section 5: Latest Analysis Run */}
      {arLoaded && latestRun && (
        <Card isCompact className="pf-v6-u-mb-md">
          <CardTitle>{t('Analysis Result')}</CardTitle>
          <CardBody>
            <Label isCompact color={phaseColor(latestRun.status?.phase)}>
              {latestRun.status?.phase ?? t('Unknown')}
            </Label>
            {latestRun.status?.message && (
              <span className="pf-v6-u-ml-sm">{latestRun.status.message}</span>
            )}
          </CardBody>
        </Card>
      )}

      <ConfirmModal
        title={t('Promote')}
        isOpen={showPromoteConfirm}
        onConfirm={async () => {
          setIsPromoting(true);
          await promote();
          setIsPromoting(false);
          setShowPromoteConfirm(false);
        }}
        onCancel={() => setShowPromoteConfirm(false)}
        isLoading={isPromoting}
        confirmLabel={t('Promote')}
      >
        {t('Traffic will shift from {{from}}% to {{to}}%', { from: String(currentWeight), to: String(nextWeight) })}
      </ConfirmModal>

      <ConfirmModal
        title={t('Promote Full')}
        isOpen={showPromoteFullConfirm}
        onConfirm={async () => {
          setIsPromotingFull(true);
          await promoteFull();
          setIsPromotingFull(false);
          setShowPromoteFullConfirm(false);
        }}
        onCancel={() => setShowPromoteFullConfirm(false)}
        isLoading={isPromotingFull}
        confirmLabel={t('Promote Full')}
        confirmVariant="danger"
      >
        {t('Skip remaining steps and promote to 100% traffic')}
      </ConfirmModal>
    </div>
  );
};

export default RolloutVisualization;
