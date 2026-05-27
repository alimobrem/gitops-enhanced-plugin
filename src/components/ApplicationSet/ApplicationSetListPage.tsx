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
import { ApplicationSetModel, ApplicationSetGroupVersionKind } from '../../models';
import { ConfirmModal } from '../shared/ConfirmModal';
import type { AppSetResource } from '../../types';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';

const AppSetRowActions: FC<{ appset: AppSetResource }> = ({ appset }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    try {
      await k8sDelete({ model: ApplicationSetModel, resource: appset });
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
          name: appset.metadata?.name,
          namespace: appset.metadata?.namespace,
        })}
      </ConfirmModal>
    </>
  );
};

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
        <Link to="/gitops/create-appset"><Button variant="primary">{t('Create ApplicationSet')}</Button></Link>
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
                <Th aria-label={t('Actions')} />
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
                    <Td isActionCell>
                      <AppSetRowActions appset={as} />
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
