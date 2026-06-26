import React from 'react';
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card, CardTitle, CardBody,
  Grid, GridItem,
  Label,
  Button,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { usePromotionStrategies } from '../../hooks/usePromotionStrategies';
import { derivePipelineStatus } from '../../utils/promotion';
import type { PromotionStrategyResource } from '../../types';

interface PromotionActivitySectionProps {
  namespace?: string;
}

export const PromotionActivitySection: FC<PromotionActivitySectionProps> = ({ namespace }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [strategies, loaded, error] = usePromotionStrategies(namespace);

  const derived = useMemo(
    () => strategies.map((s) => ({ strategy: s, ...derivePipelineStatus(s) })),
    [strategies],
  );

  const blocked = useMemo(
    () => derived.filter((d) => d.overallStatus === 'blocked'),
    [derived],
  );

  const active = useMemo(
    () => derived
      .filter((d) => d.overallStatus === 'promoting' || d.overallStatus === 'blocked' || d.overallStatus === 'pending')
      .slice(0, 5),
    [derived],
  );

  if (!loaded || error || strategies.length === 0) return null;

  return (
    <GridItem span={12}>
      <Card>
        <CardTitle>{t('Promotion Activity')}</CardTitle>
        <CardBody>
          <Grid hasGutter>
            <GridItem span={3}>
              <div className="gitops-dashboard__stat">
                <div className="gitops-dashboard__stat-value">{strategies.length}</div>
                <div className="gitops-dashboard__stat-label">{t('Pipelines')}</div>
              </div>
              <Link to="/k8s/all-namespaces/promoter.argoproj.io~v1alpha1~PromotionStrategy">
                <Button variant="link" isInline>{t('View All')}</Button>
              </Link>
            </GridItem>
            <GridItem span={3}>
              <div className="gitops-dashboard__stat">
                <div
                  className={`gitops-dashboard__stat-value${blocked.length > 0 ? ' gitops-dashboard__stat-value--danger' : ''}`}
                >
                  {blocked.length}
                </div>
                <div className="gitops-dashboard__stat-label">{t('Blocked')}</div>
              </div>
            </GridItem>
            <GridItem span={6}>
              {active.length === 0 ? (
                <div className="gitops-dashboard__empty-text">{t('No active promotions.')}</div>
              ) : (
                <Table aria-label={t('Active Promotions')} isCompact isStriped>
                  <Thead>
                    <Tr>
                      <Th>{t('Pipeline')}</Th>
                      <Th>{t('Gate')}</Th>
                      <Th>{t('Status')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {active.map((d) => {
                      const blockedGate = d.gates.find((g) => g.status === 'blocked' || g.status === 'running');
                      return (
                        <Tr key={d.strategy.metadata.uid}>
                          <Td>
                            <Link to={`/k8s/ns/${d.strategy.metadata.namespace}/promoter.argoproj.io~v1alpha1~PromotionStrategy/${d.strategy.metadata.name}`}>
                              {d.strategy.metadata.name}
                            </Link>
                          </Td>
                          <Td>
                            {blockedGate
                              ? `${blockedGate.sourceEnv} → ${blockedGate.targetEnv}`
                              : '-'}
                          </Td>
                          <Td>
                            <Label
                              isCompact
                              color={d.overallStatus === 'blocked' ? 'red' : d.overallStatus === 'promoting' ? 'blue' : 'gold'}
                            >
                              {d.overallStatus}
                            </Label>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </GridItem>
          </Grid>
        </CardBody>
      </Card>
    </GridItem>
  );
};
