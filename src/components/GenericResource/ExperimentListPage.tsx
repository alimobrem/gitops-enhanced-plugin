import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { ExperimentGroupVersionKind } from '../../models';

export const ExperimentListPage: FC = () => (
  <GenericResourceListPage
    title="Experiments"
    groupVersionKind={ExperimentGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
      { title: 'Phase', field: 'status.phase' },
    ]}
  />
);
export default ExperimentListPage;
