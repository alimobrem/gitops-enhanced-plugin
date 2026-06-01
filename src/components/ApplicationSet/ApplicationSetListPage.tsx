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

  const items = useMemo(() => appsets ?? [], [appsets]);

  const getGeneratorTypes = (generators?: Array<Record<string, unknown>>) => {
    if (!generators?.length) return '-';
    return generators.map((g) => Object.keys(g)[0]).join(', ');
  };

  const columns = [t('Name'), t('Namespace'), t('Generators'), t('Template'), t('Status'), ''];

  const rows = useMemo(() => items.map((as) => {
    const healthy = as.status?.conditions?.every((c) =>
      c.type === 'ErrorOccurred' ? c.status === 'False' : c.status === 'True',
    );
    return {
      id: as.metadata.uid,
      row: [
        <ResourceLink
          key="name"
          groupVersionKind={ApplicationSetGroupVersionKind}
          name={as.metadata.name}
          namespace={as.metadata.namespace}
        />,
        as.metadata.namespace,
        getGeneratorTypes(as.spec.generators),
        as.spec.template?.metadata?.name ?? '-',
        <Label key="status" isCompact color={healthy === false ? 'red' : healthy ? 'green' : 'grey'}>
          {healthy === false ? t('Error') : healthy ? t('Healthy') : t('Unknown')}
        </Label>,
        <AppSetRowActions key="actions" appset={as} />,
      ],
    };
  }), [items, t]);

  return (
    <React.Fragment>
      <DocumentTitle>{t('ApplicationSets')}</DocumentTitle>
      <ListPageHeader title={t('ApplicationSets')}>
        <Link to="/gitops/create-appset"><Button variant="primary">{t('Create ApplicationSet')}</Button></Link>
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
            aria-label={t('ApplicationSets')}
            columns={columns}
            rows={rows}
          />
        </DataView>
      </PageSection>
    </React.Fragment>
  );
};

const ApplicationSetListPageWithProvider = () => (<InstanceProvider><ApplicationSetListPage /></InstanceProvider>);
export default ApplicationSetListPageWithProvider;
