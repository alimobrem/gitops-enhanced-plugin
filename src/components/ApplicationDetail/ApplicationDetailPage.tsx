import React from 'react';
import { useState, type FC } from 'react';
import { useParams } from 'react-router';
import {
  useK8sWatchResource,
  DocumentTitle,
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
  Tabs,
  Tab,
  TabTitleText,
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
  const [activeTab, setActiveTab] = useState(0);

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

  return (
    <React.Fragment>
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
      <PageSection>
        <Tabs
          activeKey={activeTab}
          onSelect={(_e, key) => setActiveTab(key as number)}
        >
          <Tab eventKey={0} title={<TabTitleText>{t('Overview')}</TabTitleText>}>
            <OverviewTab app={app} />
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>{t('Resources')}</TabTitleText>}>
            <ResourcesTab app={app} />
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>{t('Logs')}</TabTitleText>}>
            <LogsTab app={app} />
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>{t('History')}</TabTitleText>}>
            <HistoryTab app={app} />
          </Tab>
        </Tabs>
      </PageSection>
    </React.Fragment>
  );
};

export default ApplicationDetailPage;
