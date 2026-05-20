import React from 'react';
import { useState, type FC } from 'react';
import { useParams } from 'react-router';
import { useK8sWatchResource, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Bullseye, Spinner, Alert, Tabs, Tab, TabTitleText,
  Card, CardTitle, CardBody, Label, EmptyState, EmptyStateBody,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Flex, FlexItem, Dropdown, DropdownList, DropdownItem, MenuToggle,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { AppProjectGroupVersionKind } from '../../models';
import type { AppProjectResource } from '../../types';
import { AppProjectEditTab } from './AppProjectEditTab';


interface DetailPageProps {
  match?: { params: { name: string; ns: string } };
  name?: string;
  namespace?: string;
}

export const AppProjectDetailPage: FC<DetailPageProps> = (props) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const routeParams = useParams<{ name: string; ns: string }>();
  const name = props.match?.params?.name ?? props.name ?? routeParams.name;
  const ns = props.match?.params?.ns ?? props.namespace ?? routeParams.ns;
  const [activeTab, setActiveTab] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);

  const [project, loaded, error] = useK8sWatchResource<AppProjectResource>({
    groupVersionKind: AppProjectGroupVersionKind,
    name,
    namespace: ns,
  });

  if (error) return <PageSection><Alert variant="danger" isInline title={t('Error')}>{(error as Error).message}</Alert></PageSection>;
  if (!loaded || !project) return <PageSection><Bullseye><Spinner /></Bullseye></PageSection>;

  const repos = project.spec.sourceRepos ?? [];
  const dests = project.spec.destinations ?? [];
  const roles = project.spec.roles ?? [];
  const windows = project.spec.syncWindows ?? [];

  return (
    <React.Fragment>
      <DocumentTitle>{project.metadata.name}</DocumentTitle>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="pf-v6-u-mb-md">
          <FlexItem><Title headingLevel="h1">{project.metadata.name}</Title></FlexItem>
          <FlexItem>
            <Dropdown isOpen={actionsOpen} onSelect={() => setActionsOpen(false)} onOpenChange={setActionsOpen}
              toggle={(ref) => <MenuToggle ref={ref} onClick={() => setActionsOpen(!actionsOpen)} variant="primary">{t('Actions')}</MenuToggle>}
            >
              <DropdownList>
                <DropdownItem key="edit-yaml" component="a" href={`/k8s/ns/${ns}/argoproj.io~v1alpha1~AppProject/${name}/yaml`}>{t('Edit YAML')}</DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>{t('Overview')}</TabTitleText>}>
            <Card className="pf-v6-u-mt-md">
              <CardBody>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Source Repos')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {repos.includes('*') ? <Label color="blue">{t('All repositories')}</Label> : `${repos.length} repositories`}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Destinations')}</DescriptionListTerm>
                    <DescriptionListDescription>{dests.length} destinations</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Roles')}</DescriptionListTerm>
                    <DescriptionListDescription>{roles.length} roles</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Sync Windows')}</DescriptionListTerm>
                    <DescriptionListDescription>{windows.length} windows</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </Tab>

          <Tab eventKey={1} title={<TabTitleText>{t('Source Repos')} ({repos.length})</TabTitleText>}>
            {repos.length === 0 ? (
              <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No source repositories configured.')}</EmptyStateBody></EmptyState>
            ) : (
              <Table aria-label={t('Source Repos')} className="pf-v6-u-mt-md">
                <Thead><Tr><Th>{t('Repository Pattern')}</Th></Tr></Thead>
                <Tbody>{repos.map((r, i) => <Tr key={i}><Td>{r}</Td></Tr>)}</Tbody>
              </Table>
            )}
          </Tab>

          <Tab eventKey={2} title={<TabTitleText>{t('Destinations')} ({dests.length})</TabTitleText>}>
            {dests.length === 0 ? (
              <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No destinations configured.')}</EmptyStateBody></EmptyState>
            ) : (
              <Table aria-label={t('Destinations')} className="pf-v6-u-mt-md">
                <Thead><Tr><Th>{t('Server')}</Th><Th>{t('Namespace')}</Th><Th>{t('Name')}</Th></Tr></Thead>
                <Tbody>{dests.map((d, i) => <Tr key={i}><Td>{d.server ?? '*'}</Td><Td>{d.namespace ?? '*'}</Td><Td>{d.name ?? '-'}</Td></Tr>)}</Tbody>
              </Table>
            )}
          </Tab>

          <Tab eventKey={3} title={<TabTitleText>{t('Roles')} ({roles.length})</TabTitleText>}>
            {roles.length === 0 ? (
              <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No roles configured.')}</EmptyStateBody></EmptyState>
            ) : (
              <Table aria-label={t('Roles')} className="pf-v6-u-mt-md">
                <Thead><Tr><Th>{t('Name')}</Th><Th>{t('Groups')}</Th><Th>{t('Policies')}</Th></Tr></Thead>
                <Tbody>{roles.map((r, i) => (
                  <Tr key={i}>
                    <Td>{r.name}</Td>
                    <Td>{r.groups?.join(', ') ?? '-'}</Td>
                    <Td>{r.policies?.length ?? 0} policies</Td>
                  </Tr>
                ))}</Tbody>
              </Table>
            )}
          </Tab>

          <Tab eventKey={4} title={<TabTitleText>{t('Sync Windows')} ({windows.length})</TabTitleText>}>
            {windows.length === 0 ? (
              <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No sync windows configured.')}</EmptyStateBody></EmptyState>
            ) : (
              <Table aria-label={t('Sync Windows')} className="pf-v6-u-mt-md">
                <Thead><Tr><Th>{t('Kind')}</Th><Th>{t('Schedule')}</Th><Th>{t('Duration')}</Th><Th>{t('Namespaces')}</Th></Tr></Thead>
                <Tbody>{windows.map((w, i) => (
                  <Tr key={i}>
                    <Td><Label isCompact color={w.kind === 'allow' ? 'green' : 'red'}>{w.kind}</Label></Td>
                    <Td>{w.schedule}</Td>
                    <Td>{w.duration ?? '-'}</Td>
                    <Td>{w.namespaces?.join(', ') ?? '*'}</Td>
                  </Tr>
                ))}</Tbody>
              </Table>
            )}
          </Tab>
          <Tab eventKey={5} title={<TabTitleText>{t('Configuration')}</TabTitleText>}>
            <AppProjectEditTab project={project} />
          </Tab>
        </Tabs>
      </PageSection>
    </React.Fragment>
  );
};

export default AppProjectDetailPage;
