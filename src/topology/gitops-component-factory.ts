import { ComponentFactory, GraphElement, ModelKind } from '@patternfly/react-topology';
import { GITOPS_APP_TYPE } from './gitops-topology-plugin';
import GitOpsNodeComponent from './GitOpsTopologyComponent';

export const gitopsComponentFactory: ComponentFactory = (
  kind: ModelKind,
  type: string,
): React.ComponentType<{ element: GraphElement }> | undefined => {
  if (kind === ModelKind.node && type === GITOPS_APP_TYPE) {
    return GitOpsNodeComponent as unknown as React.ComponentType<{ element: GraphElement }>;
  }
  return undefined;
};
