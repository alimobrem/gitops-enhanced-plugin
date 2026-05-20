import React from 'react';
import type { FC } from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { buildArgoAppURL } from '../../utils/argo-urls';

interface ArgoLinkProps {
  argoBaseURL: string;
  appName: string;
  resourcePath?: string;
}

export const ArgoLink: FC<ArgoLinkProps> = ({
  argoBaseURL,
  appName,
  resourcePath,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const url = buildArgoAppURL(argoBaseURL, appName, resourcePath);

  return (
    <Button
      variant="link"
      component="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      icon={<ExternalLinkAltIcon />}
    >
      {t('Open in Argo CD')}
    </Button>
  );
};
