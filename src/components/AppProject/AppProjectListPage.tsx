import React from 'react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  useK8sWatchResource,
  DocumentTitle,
  ListPageHeader,
  ResourceLink,
  k8sDelete,
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
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { AppProjectModel, AppProjectGroupVersionKind } from '../../models';
import { ConfirmModal } from '../shared/ConfirmModal';
import type { AppProjectResource } from '../../types';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';

const AppProjectRowActions: FC<{ project: AppProjectResource }> = ({ project }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    try {
      await k8sDelete({ model: AppProjectModel, resource: project });
      setShowDelete(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      {error && <Alert variant="danger" isInline isPlain title={error} className="pf-v6-u-mb-sm" />}
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        popperProps={{ position: 'right' }}
        toggle={(ref) => (
          <MenuToggle ref={ref} variant="plain" onClick={() => setIsOpen(!isOpen)} aria-label={t('Actions')}>
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="delete" isDanger onClick={() => { setIsOpen(false); setShowDelete(true); }}>
            {t('Delete')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <ConfirmModal
        title={t('Delete')}
        isOpen={showDelete}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        confirmLabel={t('Delete')}
        confirmVariant="danger"
      >
        {t('Are you sure you want to delete {{name}} ({{namespace}})?', {
          name: project.metadata?.name,
          namespace: project.metadata?.namespace,
        })}
      </ConfirmModal>
    </>
  );
};

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
        <Link to="/gitops/create-project"><Button variant="primary">{t('Create AppProject')}</Button></Link>
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
                <Th aria-label={t('Actions')} />
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
                  <Td isActionCell>
                    <AppProjectRowActions project={proj} />
                  </Td>
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
