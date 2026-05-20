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
import type { AppSetResource } from '../../types';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationSetEditTab } from './ApplicationSetEditTab';
import {
  Flex, FlexItem, Dropdown, DropdownList, DropdownItem, MenuToggle,
} from '@patternfly/react-core';
import type { ApplicationResource } from '../../types';


interface DetailPageProps {
  match?: { params: { name: string; ns: string } };
  name?: string;
  namespace?: string;
}

export const ApplicationSetDetailPage: FC<DetailPageProps> = (props) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const routeParams = useParams<{ name: string; ns: string }>();
  const name = props.match?.params?.name ?? props.name ?? routeParams.name;
  const ns = props.match?.params?.ns ?? props.namespace ?? routeParams.ns;
  const [activeTab, setActiveTab] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);

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

  const childApps = (apps ?? []).filter((a) => {
    const meta = a.metadata as Record<string, unknown>;
    const owners = (meta.ownerReferences ?? []) as Array<{ kind: string; name: string }>;
    if (owners.some((o) => o.kind === 'ApplicationSet' && o.name === appset.metadata.name)) return true;
    if (a.metadata.annotations?.['argocd.argoproj.io/application-set-name'] === appset.metadata.name) return true;
    return false;
  });

  return (
    <React.Fragment>
      <DocumentTitle>{appset.metadata.name}</DocumentTitle>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="pf-v6-u-mb-md">
          <FlexItem><Title headingLevel="h1">{appset.metadata.name}</Title></FlexItem>
          <FlexItem>
            <Dropdown isOpen={actionsOpen} onSelect={() => setActionsOpen(false)} onOpenChange={setActionsOpen}
              toggle={(ref) => <MenuToggle ref={ref} onClick={() => setActionsOpen(!actionsOpen)} variant="primary">{t('Actions')}</MenuToggle>}
            >
              <DropdownList>
                <DropdownItem key="edit-yaml" component="a" href={`/k8s/ns/${ns}/argoproj.io~v1alpha1~ApplicationSet/${name}/yaml`}>{t('Edit YAML')}</DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>{t('Overview')}</TabTitleText>}>
            <Card className="pf-v6-u-mt-md">
              <CardTitle>{t('Generators')}</CardTitle>
              <CardBody>
                {appset.spec.generators?.map((gen, i) => (
                  <Label key={i} isCompact className="pf-v6-u-mr-sm">{Object.keys(gen)[0]}</Label>
                )) ?? t('None')}
              </CardBody>
            </Card>
            {appset.status?.conditions && appset.status.conditions.length > 0 && (
              <Card className="pf-v6-u-mt-md">
                <CardTitle>{t('Conditions')}</CardTitle>
                <CardBody>
                  <DescriptionList isHorizontal isCompact>
                    {appset.status.conditions.map((c, i) => (
                      <DescriptionListGroup key={i}>
                        <DescriptionListTerm>{c.type}</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Label isCompact color={c.status === 'True' ? 'green' : 'red'}>{c.status}</Label>
                          {c.message && <span className="pf-v6-u-ml-sm">{c.message}</span>}
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
              <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No child applications found.')}</EmptyStateBody></EmptyState>
            ) : (
              <Table aria-label={t('Child Applications')} className="pf-v6-u-mt-md">
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
                      <Td>
                        {app.spec.destination.namespace
                          ? <a href={`/k8s/cluster/namespaces/${app.spec.destination.namespace}`}>{app.spec.destination.name ?? app.spec.destination.server ?? ''} / {app.spec.destination.namespace}</a>
                          : `${app.spec.destination.name ?? app.spec.destination.server ?? ''}`}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>{t('Configuration')}</TabTitleText>}>
            <ApplicationSetEditTab appset={appset} />
          </Tab>
        </Tabs>
      </PageSection>
    </React.Fragment>
  );
};

export default ApplicationSetDetailPage;
