import React, { useMemo } from 'react';
import type { FC } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ApplicationGroupVersionKind } from '../../models';
import { parseNotificationAnnotations } from '../../utils/notifications';
import { useCurrentInstance, watchNamespace } from '../../hooks/useArgoCDInstances';
import { timeAgo } from '../../utils/time';
import type { NotificationEntry } from '../../utils/notifications';
import type { ApplicationResource } from '../../types';

export const NotificationHistoryPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const ns = watchNamespace(instance);

  const [apps, loaded, error] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
    namespace: ns,
  });

  const entries: NotificationEntry[] = useMemo(
    () =>
      (apps ?? [])
        .flatMap((app) => parseNotificationAnnotations(app))
        .sort(
          (a, b) =>
            new Date(b.lastNotified).getTime() -
            new Date(a.lastNotified).getTime(),
        ),
    [apps],
  );

  if (!loaded) return <Bullseye><Spinner /></Bullseye>;
  if (error) return <Bullseye>{String(error)}</Bullseye>;

  if (entries.length === 0) {
    return (
      <EmptyState className="pf-v6-u-mt-md">
        <EmptyStateBody>{t('No notifications recorded')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label={t('Notification History')} className="pf-v6-u-mt-md">
      <Thead>
        <Tr>
          <Th>{t('Application')}</Th>
          <Th>{t('Trigger')}</Th>
          <Th>{t('Template')}</Th>
          <Th>{t('Last Notified')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {entries.map((entry, i) => (
          <Tr key={`${entry.appName}-${entry.trigger}-${entry.template}-${i}`}>
            <Td>{entry.appName}</Td>
            <Td>{entry.trigger}</Td>
            <Td>{entry.template}</Td>
            <Td>{timeAgo(entry.lastNotified)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default NotificationHistoryPage;
