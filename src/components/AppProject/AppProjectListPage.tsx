import React from 'react';
import type { FC } from 'react';
import {
  useK8sWatchResource,
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Alert,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Label,
  Button,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { AppProjectGroupVersionKind } from '../../models';
import type { AppProjectResource } from '../../types';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';


export const AppProjectListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const [projects, loaded, watchError] = useK8sWatchResource<AppProjectResource[]>({
    groupVersionKind: AppProjectGroupVersionKind,
    isList: true,
    namespace: watchNamespace(instance),
  });

  const items = projects ?? [];

  return (
    <React.Fragment>
      <DocumentTitle>{t('AppProjects')}</DocumentTitle>
      <ListPageHeader title={t('AppProjects')}>
        <Button variant="primary" component="a" href="/gitops/create-project">{t('Create AppProject')}</Button>
      </ListPageHeader>
      <PageSection>
        {watchError && <Alert variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">{(watchError as Error).message}</Alert>}
        {!loaded && !watchError && <Bullseye><Spinner /></Bullseye>}
        {loaded && items.length === 0 && (
          <EmptyState><EmptyStateBody>{t('No AppProjects found.')}</EmptyStateBody></EmptyState>
        )}
        {loaded && items.length > 0 && (
          <Table aria-label={t('AppProjects')}>
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Source Repos')}</Th>
                <Th>{t('Destinations')}</Th>
                <Th>{t('Roles')}</Th>
                <Th>{t('Sync Windows')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((proj) => (
                <Tr key={proj.metadata.uid}>
                  <Td>
                    <ResourceLink
                      groupVersionKind={AppProjectGroupVersionKind}
                      name={proj.metadata.name}
                      namespace={proj.metadata.namespace}
                    />
                  </Td>
                  <Td>
                    {proj.spec?.sourceRepos?.length
                      ? proj.spec?.sourceRepos.includes('*')
                        ? <Label isCompact>All</Label>
                        : `${proj.spec?.sourceRepos.length} repos`
                      : '-'}
                  </Td>
                  <Td>{proj.spec?.destinations?.length ?? 0} destinations</Td>
                  <Td>{proj.spec?.roles?.length ?? 0} roles</Td>
                  <Td>{proj.spec?.syncWindows?.length ?? 0} windows</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </React.Fragment>
  );
};

const AppProjectListPageWithProvider = () => (<InstanceProvider><AppProjectListPage /></InstanceProvider>);
export default AppProjectListPageWithProvider;
