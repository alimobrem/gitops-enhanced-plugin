import React from 'react';
import { useState, useMemo, type FC } from 'react';
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
  Label,
  Button,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import {
  DataView,
  DataViewState,
  DataViewTable,
} from '@patternfly/react-data-view';
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

  const items = useMemo(() => projects ?? [], [projects]);

  const columns = [t('Name'), t('Source Repos'), t('Destinations'), t('Roles'), t('Sync Windows'), ''];

  const rows = useMemo(() => items.map((proj) => ({
    id: proj.metadata.uid,
    row: [
      <ResourceLink
        key="name"
        groupVersionKind={AppProjectGroupVersionKind}
        name={proj.metadata.name}
        namespace={proj.metadata.namespace}
      />,
      proj.spec?.sourceRepos?.length
        ? proj.spec?.sourceRepos.includes('*')
          ? <Label key="repos" isCompact>{t('All')}</Label>
          : t('{{count}} repos', { count: proj.spec?.sourceRepos.length })
        : '-',
      t('{{count}} destinations', { count: proj.spec?.destinations?.length ?? 0 }),
      t('{{count}} roles', { count: proj.spec?.roles?.length ?? 0 }),
      t('{{count}} windows', { count: proj.spec?.syncWindows?.length ?? 0 }),
      <AppProjectRowActions key="actions" project={proj} />,
    ],
  })), [items, t]);

  return (
    <React.Fragment>
      <DocumentTitle>{t('AppProjects')}</DocumentTitle>
      <ListPageHeader title={t('AppProjects')}>
        <Link to="/gitops/create-project"><Button variant="primary">{t('Create AppProject')}</Button></Link>
      </ListPageHeader>
      <PageSection>
        {watchError && <Alert variant="danger" isInline title={t('Error loading resources')} className="pf-v6-u-mb-md">{(watchError as Error).message}</Alert>}

        <DataView
          activeState={
            !loaded && !watchError ? DataViewState.loading
            : loaded && items.length === 0 ? DataViewState.empty
            : undefined
          }
        >
          <DataViewTable
            aria-label={t('AppProjects')}
            columns={columns}
            rows={rows}
          />
        </DataView>
      </PageSection>
    </React.Fragment>
  );
};

const AppProjectListPageWithProvider = () => (<InstanceProvider><AppProjectListPage /></InstanceProvider>);
export default AppProjectListPageWithProvider;
