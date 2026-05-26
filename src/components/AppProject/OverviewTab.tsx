import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, Label,
  Card, CardBody,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
} from '@patternfly/react-core';
import type { AppProjectResource } from '../../types';

export const OverviewTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppProjectResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const repos = resource?.spec?.sourceRepos ?? [];
  const dests = resource?.spec?.destinations ?? [];
  const roles = resource?.spec?.roles ?? [];
  const windows = resource?.spec?.syncWindows ?? [];

  return (
    <Card className="pf-v6-u-mt-md">
      <CardBody>
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Source Repos')}</DescriptionListTerm>
            <DescriptionListDescription>
              {repos.includes('*') ? <Label color="blue">{t('All repositories')}</Label> : `${repos.length} repositories`}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Destinations')}</DescriptionListTerm>
            <DescriptionListDescription>{dests.length} destinations</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Roles')}</DescriptionListTerm>
            <DescriptionListDescription>{roles.length} roles</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Sync Windows')}</DescriptionListTerm>
            <DescriptionListDescription>{windows.length} windows</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default OverviewTab;
