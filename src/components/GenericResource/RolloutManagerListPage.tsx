import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { RolloutManagerGroupVersionKind } from '../../models';

export const RolloutManagerListPage: FC = () => (
  <GenericResourceListPage
    title="RolloutManagers"
    groupVersionKind={RolloutManagerGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
    ]}
  />
);
export default RolloutManagerListPage;
