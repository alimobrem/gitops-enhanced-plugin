import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { AnalysisTemplateGroupVersionKind } from '../../models';

export const AnalysisTemplateListPage: FC = () => (
  <GenericResourceListPage
    title="AnalysisTemplates"
    groupVersionKind={AnalysisTemplateGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
    ]}
  />
);
export default AnalysisTemplateListPage;
