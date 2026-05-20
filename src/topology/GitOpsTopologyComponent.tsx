import React from 'react';
import type { FC } from 'react';
import {
  DefaultNode,
  observer,
  Node,
  WithSelectionProps,
  WithDndDropProps,
  WithDragNodeProps,
} from '@patternfly/react-topology';

interface GitOpsNodeProps {
  element: Node;
}

const GitOpsNodeComponent: FC<
  GitOpsNodeProps & WithSelectionProps & Partial<WithDndDropProps & WithDragNodeProps>
> = ({ element, ...rest }) => {
  const data = element.getData();
  const syncStatus = data?.syncStatus ?? 'Unknown';
  const healthStatus = data?.healthStatus ?? 'Unknown';

  const badgeColor =
    syncStatus === 'Synced' && healthStatus === 'Healthy'
      ? '#3E8635'
      : syncStatus === 'OutOfSync'
        ? '#F0AB00'
        : healthStatus === 'Degraded'
          ? '#C9190B'
          : '#6A6E73';

  return (
    <DefaultNode
      element={element}
      badge="GitOps"
      badgeColor={badgeColor}
      badgeTextColor="#FFFFFF"
      {...rest}
    />
  );
};

export default observer(GitOpsNodeComponent);
