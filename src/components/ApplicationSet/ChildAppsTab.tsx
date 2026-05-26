import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ApplicationGroupVersionKind } from '../../models';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import type { AppSetResource, ApplicationResource } from '../../types';

export const ChildAppsTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppSetResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [apps] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const childApps = (apps ?? []).filter((a) => {
    const meta = a.metadata as Record<string, unknown>;
    const owners = (meta.ownerReferences ?? []) as Array<{ kind: string; name: string }>;
    if (owners.some((o) => o.kind === 'ApplicationSet' && o.name === resource.metadata.name)) return true;
    if (a.metadata?.annotations?.['argocd.argoproj.io/application-set-name'] === resource.metadata.name) return true;
    return false;
  });

  if (childApps.length === 0) {
    return <EmptyState className="pf-v6-u-mt-md"><EmptyStateBody>{t('No child applications found.')}</EmptyStateBody></EmptyState>;
  }

  return (
    <Table aria-label={t('Child Applications')} className="pf-v6-u-mt-md">
      <Thead><Tr>
        <Th>{t('Name')}</Th>
        <Th>{t('Sync Status')}</Th>
        <Th>{t('Health')}</Th>
        <Th>{t('Destination')}</Th>
      </Tr></Thead>
      <Tbody>
        {childApps.map((app) => (
          <Tr key={app.metadata?.uid}>
            <Td><ResourceLink groupVersionKind={ApplicationGroupVersionKind} name={app.metadata?.name} namespace={app.metadata?.namespace} /></Td>
            <Td><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></Td>
            <Td><HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} /></Td>
            <Td>
              {app.spec?.destination?.namespace
                ? <a href={`/k8s/cluster/namespaces/${app.spec?.destination?.namespace}`}>{app.spec?.destination?.name ?? app.spec?.destination?.server ?? ''} / {app.spec?.destination?.namespace}</a>
                : `${app.spec?.destination?.name ?? app.spec?.destination?.server ?? ''}`}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default ChildAppsTab;
