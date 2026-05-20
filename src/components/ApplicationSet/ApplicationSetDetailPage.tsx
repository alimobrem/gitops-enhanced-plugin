import React from 'react';
import { useState, type FC } from 'react';
import { useParams } from 'react-router';
import { useK8sWatchResource, DocumentTitle, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Bullseye, Spinner, Alert, Tabs, Tab, TabTitleText,
  Card, CardTitle, CardBody, DescriptionList, DescriptionListGroup,
  DescriptionListTerm, DescriptionListDescription, Label,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ApplicationSetGroupVersionKind, ApplicationGroupVersionKind } from '../../models';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import type { ApplicationResource } from '../../types';

interface AppSetResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    generators?: Array<Record<string, unknown>>;
    template?: { metadata?: { name?: string; labels?: Record<string, string> }; spec?: Record<string, unknown> };
  };
  status?: { conditions?: Array<{ type: string; status: string; message?: string; lastTransitionTime?: string }> };
}

export const ApplicationSetDetailPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { name, ns } = useParams<{ name: string; ns: string }>();
  const [activeTab, setActiveTab] = useState(0);

  const [appset, loaded, error] = useK8sWatchResource<AppSetResource>({
    groupVersionKind: ApplicationSetGroupVersionKind,
    name,
    namespace: ns,
  });

  const [apps] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  if (error) return <PageSection><Alert variant="danger" isInline title={t('Error')}>{(error as Error).message}</Alert></PageSection>;
  if (!loaded || !appset) return <PageSection><Bullseye><Spinner /></Bullseye></PageSection>;

  const childApps = (apps ?? []).filter((a) =>
    a.metadata.annotations?.['argocd.argoproj.io/application-set-name'] === appset.metadata.name ||
    a.metadata.name.startsWith(appset.metadata.name)
  );

  return (
    <React.Fragment>
      <DocumentTitle>{appset.metadata.name}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>{appset.metadata.name}</Title>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>{t('Overview')}</TabTitleText>}>
            <Card style={{ marginTop: '1rem' }}>
              <CardTitle>{t('Generators')}</CardTitle>
              <CardBody>
                {appset.spec.generators?.map((gen, i) => (
                  <Label key={i} isCompact style={{ marginRight: '0.5rem' }}>{Object.keys(gen)[0]}</Label>
                )) ?? t('None')}
              </CardBody>
            </Card>
            {appset.status?.conditions && appset.status.conditions.length > 0 && (
              <Card style={{ marginTop: '1rem' }}>
                <CardTitle>{t('Conditions')}</CardTitle>
                <CardBody>
                  <DescriptionList isHorizontal isCompact>
                    {appset.status.conditions.map((c, i) => (
                      <DescriptionListGroup key={i}>
                        <DescriptionListTerm>{c.type}</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Label isCompact color={c.status === 'True' ? 'green' : 'red'}>{c.status}</Label>
                          {c.message && <span style={{ marginLeft: '0.5rem' }}>{c.message}</span>}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </CardBody>
              </Card>
            )}
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>{t('Child Applications')} ({childApps.length})</TabTitleText>}>
            {childApps.length === 0 ? (
              <EmptyState style={{ marginTop: '1rem' }}><EmptyStateBody>{t('No child applications found.')}</EmptyStateBody></EmptyState>
            ) : (
              <Table aria-label={t('Child Applications')} style={{ marginTop: '1rem' }}>
                <Thead><Tr>
                  <Th>{t('Name')}</Th>
                  <Th>{t('Sync Status')}</Th>
                  <Th>{t('Health')}</Th>
                  <Th>{t('Destination')}</Th>
                </Tr></Thead>
                <Tbody>
                  {childApps.map((app) => (
                    <Tr key={app.metadata.uid}>
                      <Td><ResourceLink groupVersionKind={ApplicationGroupVersionKind} name={app.metadata.name} namespace={app.metadata.namespace} /></Td>
                      <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
                      <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
                      <Td>{`${app.spec.destination.name ?? app.spec.destination.server ?? ''} / ${app.spec.destination.namespace ?? ''}`}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Tab>
        </Tabs>
      </PageSection>
    </React.Fragment>
  );
};

export default ApplicationSetDetailPage;
