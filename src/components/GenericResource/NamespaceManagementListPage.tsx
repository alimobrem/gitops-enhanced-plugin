import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { NamespaceManagementGroupVersionKind } from '../../models';

export const NamespaceManagementListPage: FC = () => (
  <GenericResourceListPage
    title="NamespaceManagements"
    groupVersionKind={NamespaceManagementGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
    ]}
  />
);
export default NamespaceManagementListPage;
