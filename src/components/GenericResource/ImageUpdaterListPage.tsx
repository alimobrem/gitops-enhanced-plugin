import React from 'react';
import type { FC } from 'react';
import { GenericResourceListPage } from './GenericResourceListPage';
import { ImageUpdaterGroupVersionKind } from '../../models';

export const ImageUpdaterListPage: FC = () => (
  <GenericResourceListPage
    title="ImageUpdaters"
    groupVersionKind={ImageUpdaterGroupVersionKind}
    columns={[
      { title: 'Name', field: 'metadata.name' },
      { title: 'Namespace', field: 'metadata.namespace' },
    ]}
  />
);
export default ImageUpdaterListPage;
