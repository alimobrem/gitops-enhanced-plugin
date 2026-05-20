import React from 'react';
import type { FC } from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import type { ApplicationResource } from '../../types';

export const OverviewTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const source = app.spec.source ?? app.spec.sources?.[0];

  return (
    <Grid hasGutter>
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Status')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Sync')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <SyncStatusIcon
                    status={app.status?.sync?.status ?? 'Unknown'}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Health')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <HealthStatusIcon
                    status={app.status?.health?.status ?? 'Unknown'}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Revision')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.status?.sync?.revision?.substring(0, 7) ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Source')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Repository')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {source?.repoURL ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Path')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {source?.path ?? source?.chart ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  {t('Target Revision')}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {source?.targetRevision ?? 'HEAD'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem span={12}>
        <Card>
          <CardTitle>{t('Destination')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Cluster')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec.destination.name ??
                    app.spec.destination.server ??
                    '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec.destination.namespace ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Project')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec.project}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
};
