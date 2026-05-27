import React, { useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, Label,
  Card, CardTitle, CardBody,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  ExpandableSection,
} from '@patternfly/react-core';
import type { RolloutResource } from '../../types';
import { RolloutVisualization } from './RolloutVisualization';

export const OverviewTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const rollout = obj as RolloutResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  if (!rollout?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const strategyType = rollout?.spec?.strategy?.canary ? 'Canary' : rollout?.spec?.strategy?.blueGreen ? 'Blue-Green' : 'Unknown';
  const container = rollout?.spec?.template?.spec?.containers?.[0];

  return (
    <>
      <RolloutVisualization rollout={rollout} />

      <ExpandableSection
        toggleText={detailsExpanded ? t('Configuration') : t('Configuration')}
        onToggle={(_event, expanded) => setDetailsExpanded(expanded)}
        isExpanded={detailsExpanded}
        className="pf-v6-u-mt-md"
      >
        <Card>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Strategy')}</DescriptionListTerm>
                <DescriptionListDescription><Label isCompact>{strategyType}</Label></DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Replicas')}</DescriptionListTerm>
                <DescriptionListDescription>{rollout?.spec?.replicas ?? '-'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Revision History Limit')}</DescriptionListTerm>
                <DescriptionListDescription>{rollout?.spec?.revisionHistoryLimit ?? 10}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Min Ready Seconds')}</DescriptionListTerm>
                <DescriptionListDescription>{rollout?.spec?.minReadySeconds ?? 0}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Progress Deadline Seconds')}</DescriptionListTerm>
                <DescriptionListDescription>{rollout?.spec?.progressDeadlineSeconds ?? 600}</DescriptionListDescription>
              </DescriptionListGroup>
              {container && (
                <>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Image')}</DescriptionListTerm>
                    <DescriptionListDescription>{container.image}</DescriptionListDescription>
                  </DescriptionListGroup>
                  {container.ports?.[0] && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>{t('Container Port')}</DescriptionListTerm>
                      <DescriptionListDescription>{container.ports[0].containerPort}</DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </>
              )}
            </DescriptionList>
          </CardBody>
        </Card>
        {rollout?.spec?.strategy?.canary && (
          <Card className="pf-v6-u-mt-md">
            <CardTitle>{t('Canary')}</CardTitle>
            <CardBody>
              <DescriptionList isHorizontal>
                {rollout.spec.strategy.canary.maxSurge !== undefined && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Max Surge')}</DescriptionListTerm>
                    <DescriptionListDescription>{String(rollout.spec.strategy.canary.maxSurge)}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {rollout.spec.strategy.canary.maxUnavailable !== undefined && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Max Unavailable')}</DescriptionListTerm>
                    <DescriptionListDescription>{String(rollout.spec.strategy.canary.maxUnavailable)}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {rollout.spec.strategy.canary.stableService && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Stable Service')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.strategy.canary.stableService}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {rollout.spec.strategy.canary.canaryService && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Canary Service')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.strategy.canary.canaryService}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </CardBody>
          </Card>
        )}
        {rollout?.spec?.strategy?.blueGreen && (
          <Card className="pf-v6-u-mt-md">
            <CardTitle>{t('Blue-Green')}</CardTitle>
            <CardBody>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Active Service')}</DescriptionListTerm>
                  <DescriptionListDescription>{rollout.spec.strategy.blueGreen.activeService ?? '-'}</DescriptionListDescription>
                </DescriptionListGroup>
                {rollout.spec.strategy.blueGreen.previewService && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Preview Service')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.strategy.blueGreen.previewService}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Auto Promotion')}</DescriptionListTerm>
                  <DescriptionListDescription>{rollout.spec.strategy.blueGreen.autoPromotionEnabled !== false ? t('Enabled') : t('Disabled')}</DescriptionListDescription>
                </DescriptionListGroup>
                {rollout.spec.strategy.blueGreen.autoPromotionSeconds !== undefined && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Auto Promotion Seconds')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.strategy.blueGreen.autoPromotionSeconds}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {rollout.spec.strategy.blueGreen.scaleDownDelaySeconds !== undefined && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Scale Down Delay Seconds')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.strategy.blueGreen.scaleDownDelaySeconds}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {rollout.spec.strategy.blueGreen.previewReplicaCount !== undefined && rollout.spec.strategy.blueGreen.previewReplicaCount > 0 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Preview Replica Count')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.strategy.blueGreen.previewReplicaCount}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </CardBody>
          </Card>
        )}
      </ExpandableSection>
    </>
  );
};

export default OverviewTab;
