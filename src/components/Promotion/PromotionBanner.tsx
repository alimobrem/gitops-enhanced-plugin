import React from 'react';
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@patternfly/react-core';
import { usePromotionStrategies } from '../../hooks/usePromotionStrategies';
import { derivePipelineStatus } from '../../utils/promotion';
import type { ApplicationResource } from '../../types';
import type { PipelineStageStatus } from '../../utils/promotion';

const statusVariant: Record<PipelineStageStatus, 'success' | 'info' | 'warning' | 'danger'> = {
  healthy: 'success',
  promoting: 'info',
  pending: 'warning',
  blocked: 'danger',
};

interface PromotionBannerProps {
  app: ApplicationResource;
}

export const PromotionBanner: FC<PromotionBannerProps> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [strategies, loaded] = usePromotionStrategies(app.metadata.namespace);

  const match = useMemo(() => {
    if (!loaded || strategies.length === 0) return null;
    return strategies.find((s) =>
      s.spec.gitRepositoryRef.name && app.spec?.source?.repoURL?.includes(s.spec.gitRepositoryRef.name),
    ) ?? null;
  }, [strategies, loaded, app.spec?.source?.repoURL]);

  const pipeline = useMemo(
    () => (match ? derivePipelineStatus(match) : null),
    [match],
  );

  if (!match || !pipeline) return null;

  const { overallStatus, stages, gates } = pipeline;

  const promotingGate = gates.find((g) => g.status === 'blocked' || g.status === 'running');
  const message = overallStatus === 'healthy'
    ? t('All environments healthy')
    : overallStatus === 'blocked' && promotingGate
    ? t('Promotion blocked: {{check}} failed ({{source}} → {{target}})', {
        check: promotingGate.failedChecks[0] ?? '?',
        source: promotingGate.sourceEnv,
        target: promotingGate.targetEnv,
      })
    : overallStatus === 'promoting' && promotingGate
    ? t('Promotion: {{source}} → {{target}} in progress', {
        source: promotingGate.sourceEnv,
        target: promotingGate.targetEnv,
      })
    : t('Promotion checks pending');

  const detailUrl = `/k8s/ns/${match.metadata.namespace}/promoter.argoproj.io~v1alpha1~PromotionStrategy/${match.metadata.name}`;

  return (
    <Alert
      variant={statusVariant[overallStatus]}
      isInline
      isPlain
      title={message}
      className="pf-v6-u-mb-md"
      actionLinks={
        <Link to={detailUrl}>
          <Button variant="link" isInline>{t('View Pipeline')}</Button>
        </Link>
      }
    />
  );
};
