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
import { ApplicationSetGroupVersionKind } from '../../models';
import type { AppSetResource } from '../../types';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';


export const ApplicationSetListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const [appsets, loaded, watchError] = useK8sWatchResource<AppSetResource[]>({
    groupVersionKind: ApplicationSetGroupVersionKind,
    isList: true,
    namespace: watchNamespace(instance),
  });

  const items = appsets ?? [];

  const getGeneratorTypes = (generators?: Array<Record<string, unknown>>) => {
    if (!generators?.length) return '-';
    return generators.map((g) => Object.keys(g)[0]).join(', ');
  };

  return (
    <React.Fragment>
      <DocumentTitle>{t('ApplicationSets')}</DocumentTitle>
      <ListPageHeader title={t('ApplicationSets')}>
        <Button variant="primary" component="a" href="/gitops/create-appset">{t('Create ApplicationSet')}</Button>
      </ListPageHeader>
      <PageSection>
        {watchError && <Alert variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">{(watchError as Error).message}</Alert>}
        {!loaded && !watchError && <Bullseye><Spinner /></Bullseye>}
        {loaded && items.length === 0 && (
          <EmptyState><EmptyStateBody>{t('No ApplicationSets found.')}</EmptyStateBody></EmptyState>
        )}
        {loaded && items.length > 0 && (
          <Table aria-label={t('ApplicationSets')}>
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Namespace')}</Th>
                <Th>{t('Generators')}</Th>
                <Th>{t('Template')}</Th>
                <Th>{t('Status')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((as) => {
                const healthy = as.status?.conditions?.every((c) => c.status === 'True');
                return (
                  <Tr key={as.metadata.uid}>
                    <Td>
                      <ResourceLink
                        groupVersionKind={ApplicationSetGroupVersionKind}
                        name={as.metadata.name}
                        namespace={as.metadata.namespace}
                      />
                    </Td>
                    <Td>{as.metadata.namespace}</Td>
                    <Td>{getGeneratorTypes(as.spec.generators)}</Td>
                    <Td>{as.spec.template?.metadata?.name ?? '-'}</Td>
                    <Td>
                      <Label isCompact color={healthy === false ? 'red' : healthy ? 'green' : 'grey'}>
                        {healthy === false ? t('Error') : healthy ? t('Healthy') : t('Unknown')}
                      </Label>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </React.Fragment>
  );
};

const ApplicationSetListPageWithProvider = () => (<InstanceProvider><ApplicationSetListPage /></InstanceProvider>);
export default ApplicationSetListPageWithProvider;
