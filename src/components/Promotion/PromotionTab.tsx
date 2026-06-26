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
    const repoURL = app.spec?.source?.repoURL ?? '';
    return strategies.find((s) => {
      const ref = s.spec.gitRepositoryRef.name;
      if (!ref) return false;
      const repoPath = repoURL.replace(/\.git$/, '').split('/').slice(-2).join('/');
      const envRepoURL = s.status?.environments?.[0]?.proposed?.dry?.repoURL ?? '';
      const envPath = envRepoURL.replace(/\.git$/, '').replace(/^https?:\/\/(git@)?/, '').split('/').slice(-2).join('/');
      if (envPath && repoPath) return repoPath === envPath;
      return false;
    }) ?? null;
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
