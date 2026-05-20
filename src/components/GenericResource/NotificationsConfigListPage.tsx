import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { NotificationsConfigurationGroupVersionKind } from '../../models';

export const NotificationsConfigListPage: FC = () => (
  <GenericResourceListPage
    title="Notifications Configurations"
    groupVersionKind={NotificationsConfigurationGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
    ]}
  />
);
export default NotificationsConfigListPage;
