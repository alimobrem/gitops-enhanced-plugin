import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from '../GenericResource/GenericResourceListPage';
import { ArgoCDGroupVersionKind } from '../../models';

export const ArgoCDListPage: FC = () => (
  <GenericResourceListPage
    title="ArgoCD Instances"
    groupVersionKind={ArgoCDGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
      { title: 'Phase', field: 'status.phase' },
    ]}
  />
);

export default ArgoCDListPage;
