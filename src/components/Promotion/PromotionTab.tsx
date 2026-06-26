import React from 'react';
import { useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Title,
} from '@patternfly/react-core';
import { usePromotionStrategies } from '../../hooks/usePromotionStrategies';
import { PipelineVisualization } from './PipelineVisualization';
import type { ApplicationResource } from '../../types';

interface PromotionTabProps {
  obj?: Record<string, unknown>;
}

export const PromotionTab: FC<PromotionTabProps> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [strategies, loaded] = usePromotionStrategies(app?.metadata?.namespace);

  const match = useMemo(() => {
    if (!loaded || strategies.length === 0 || !app) return null;
    return strategies.find((s) =>
      s.spec.gitRepositoryRef.name && app.spec?.source?.repoURL?.includes(s.spec.gitRepositoryRef.name),
    ) ?? null;
  }, [strategies, loaded, app]);

  if (!app?.metadata) return <Bullseye><Spinner /></Bullseye>;

  if (!loaded) {
    return (
      <PageSection>
        <Bullseye><Spinner /></Bullseye>
      </PageSection>
    );
  }

  if (!match) {
    return (
      <PageSection>
        <EmptyState>
          <Title headingLevel="h4" size="lg">
            {t('No promotion pipeline')}
          </Title>
          <EmptyStateBody>
            {t('No promotion pipeline configured for this application. Create a PromotionStrategy to enable environment promotion.')}
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <PipelineVisualization strategy={match} />
    </PageSection>
  );
};

export default PromotionTab;
