import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { AnalysisRunGroupVersionKind } from '../../models';

export const AnalysisRunListPage: FC = () => (
  <GenericResourceListPage
    title="AnalysisRuns"
    groupVersionKind={AnalysisRunGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
      { title: 'Phase', field: 'status.phase' },
    ]}
  />
);
export default AnalysisRunListPage;
