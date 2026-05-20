import React from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router';
import {
  useK8sWatchResource,
  DocumentTitle,
  HorizontalNav,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Title,
  Bullseye,
  Spinner,
  Flex,
  FlexItem,
  Alert,
} from '@patternfly/react-core';
import { ApplicationGroupVersionKind } from '../../models';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ActionsMenu } from './ActionsMenu';
import { OverviewTab } from './OverviewTab';
import { ResourcesTab } from './ResourcesTab';
import { LogsTab } from './LogsTab';
import { HistoryTab } from './HistoryTab';
import type { ApplicationResource } from '../../types';

export const ApplicationDetailPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { name, ns } = useParams<{ name: string; ns: string }>();

  const [app, loaded, error] = useK8sWatchResource<ApplicationResource>({
    groupVersionKind: ApplicationGroupVersionKind,
    name,
    namespace: ns,
  });

  if (error) {
    return (
      <PageSection>
        <Alert
          variant="danger"
          isInline
          title={t('Error loading application')}
        >
          {(error as Error).message}
        </Alert>
      </PageSection>
    );
  }

  if (!loaded || !app) {
    return (
      <PageSection>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  const pages = [
    { name: t('Overview'), component: () => <OverviewTab app={app} /> },
    { name: t('Resources'), component: () => <ResourcesTab app={app} /> },
    { name: t('Logs'), component: () => <LogsTab app={app} /> },
    { name: t('History'), component: () => <HistoryTab app={app} /> },
  ];

  return (
    <>
      <DocumentTitle>{app.metadata.name}</DocumentTitle>
      <PageSection>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Title headingLevel="h1">{app.metadata.name}</Title>
            <Flex spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <SyncStatusIcon
                  status={app.status?.sync?.status ?? 'Unknown'}
                />
              </FlexItem>
              <FlexItem>
                <HealthStatusIcon
                  status={app.status?.health?.status ?? 'Unknown'}
                />
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <ActionsMenu app={app} />
          </FlexItem>
        </Flex>
      </PageSection>
      <HorizontalNav pages={pages} />
    </>
  );
};

export default ApplicationDetailPage;
