import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { ClusterAnalysisTemplateGroupVersionKind } from '../../models';

export const ClusterAnalysisTemplateListPage: FC = () => (
  <GenericResourceListPage
    title="ClusterAnalysisTemplates"
    groupVersionKind={ClusterAnalysisTemplateGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
    ]}
  />
);
export default ClusterAnalysisTemplateListPage;
