import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from '../GenericResource/GenericResourceListPage';
import { RolloutGroupVersionKind } from '../../models';

export const RolloutListPage: FC = () => (
  <GenericResourceListPage
    title="Rollouts"
    groupVersionKind={RolloutGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
      { title: 'Replicas', field: 'spec.replicas' },
      { title: 'Status', field: 'status.phase' },
    ]}
    createHref="/gitops/create-rollout"
    createLabel="Create Rollout"
  />
);

export default RolloutListPage;
