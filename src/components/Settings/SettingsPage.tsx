import React from 'react';
import { useState, type FC } from 'react';
import { DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { PageSection, Title, Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import { ArgoCDListPage } from '../ArgoInstance/ArgoCDListPage';
import { RepositoryListPage } from './RepositoryListPage';
import { ClusterListPage } from './ClusterListPage';
import { GenericResourceListPage } from '../GenericResource/GenericResourceListPage';
import { InstanceProvider } from '../shared/InstanceProvider';
import { NotificationsConfigurationGroupVersionKind } from '../../models';

export const SettingsPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [activeTab, setActiveTab] = useState(0);

  return (
    <React.Fragment>
      <DocumentTitle>{t('GitOps Settings')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">{t('GitOps Settings')}</Title>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>{t('ArgoCD Instances')}</TabTitleText>}>
            <ArgoCDListPage />
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>{t('Repositories')}</TabTitleText>}>
            <RepositoryListPage />
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>{t('Clusters')}</TabTitleText>}>
            <ClusterListPage />
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>{t('Notifications')}</TabTitleText>}>
            <GenericResourceListPage
              title="Notifications Configurations"
              groupVersionKind={NotificationsConfigurationGroupVersionKind}
              columns={[{ title: 'Name', field: 'metadata.name' }, { title: 'Namespace', field: 'metadata.namespace' }]}
            />
          </Tab>
        </Tabs>
      </PageSection>
    </React.Fragment>
  );
};

const SettingsPageWithProvider = () => (<InstanceProvider><SettingsPage /></InstanceProvider>);
export default SettingsPageWithProvider;
