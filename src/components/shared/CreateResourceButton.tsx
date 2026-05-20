import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

interface CreateResourceButtonProps {
  namespace?: string;
  group: string;
  version: string;
  kind: string;
}

export const CreateResourceButton: FC<CreateResourceButtonProps> = ({
  namespace,
  group,
  version,
  kind,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const gvk = group ? `${group}~${version}~${kind}` : `${version}~${kind}`;
  const basePath = namespace
    ? `/k8s/ns/${namespace}/${gvk}/~new`
    : `/k8s/cluster/${gvk}/~new`;

  return (
    <Button
      variant="primary"
      component="a"
      href={basePath}
      icon={<PlusCircleIcon />}
    >
      {t('Create {{kind}}', { kind })}
    </Button>
  );
};

export default CreateResourceButton;
