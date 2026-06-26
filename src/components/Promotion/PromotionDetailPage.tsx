import React from 'react';
import { useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Alert,
  Bullseye,
  Spinner,
  Card, CardTitle, CardBody,
  Grid, GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
} from '@patternfly/react-core';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { PromotionStrategyGroupVersionKind } from '../../models';
import { derivePipelineStatus } from '../../utils/promotion';
import { PipelineVisualization } from './PipelineVisualization';
import type { PromotionStrategyResource } from '../../types';
import type { PipelineStageStatus } from '../../utils/promotion';

const statusLabelColor: Record<PipelineStageStatus, 'green' | 'red' | 'blue' | 'gold'> = {
  healthy: 'green',
  promoting: 'blue',
  blocked: 'red',
  pending: 'gold',
};

interface PromotionDetailPageProps {
  obj?: Record<string, unknown>;
}

export const PromotionDetailPage: FC<PromotionDetailPageProps> = ({ obj }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const name = (obj?.metadata as Record<string, string>)?.name ?? '';
  const namespace = (obj?.metadata as Record<string, string>)?.namespace ?? '';

  const [strategy, loaded, error] = useK8sWatchResource<PromotionStrategyResource>({
    groupVersionKind: PromotionStrategyGroupVersionKind,
    name,
    namespace,
  });

  const pipeline = useMemo(
    () => (strategy ? derivePipelineStatus(strategy) : null),
    [strategy],
  );

  if (!loaded && !error) {
    return (
      <PageSection>
        <Bullseye><Spinner /></Bullseye>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant="danger" isInline title={t('Error loading PromotionStrategy')}>
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  if (!strategy) return null;

  const readyCondition = strategy.status?.conditions?.find((c) => c.type === 'Ready');

  return (
    <PageSection>
      <Grid hasGutter>
        <GridItem span={12}>
          <Card isCompact>
            <CardBody>
              <DescriptionList isHorizontal isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Repository')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {strategy.spec.gitRepositoryRef.name}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Environments')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {strategy.spec.environments.map((e) => e.branch).join(' → ')}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipeline && (
                      <Label isCompact color={statusLabelColor[pipeline.overallStatus]}>
                        {pipeline.overallStatus}
                      </Label>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {readyCondition && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Ready')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label isCompact color={readyCondition.status === 'True' ? 'green' : 'red'}>
                        {readyCondition.status}
                      </Label>
                      {readyCondition.message && (
                        <span className="pf-v6-u-ml-sm">{readyCondition.message}</span>
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem span={12}>
          <PipelineVisualization strategy={strategy} />
        </GridItem>
      </Grid>
    </PageSection>
  );
};

export default PromotionDetailPage;
