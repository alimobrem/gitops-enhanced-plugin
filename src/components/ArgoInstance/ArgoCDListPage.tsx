import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, EmptyState, EmptyStateBody,
  Card, CardTitle, CardBody,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Grid, GridItem, Label, Flex, FlexItem, Alert,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { ArgoCDGroupVersionKind, ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource } from '../../types';

interface ArgoCDResource {
  metadata: { name: string; namespace: string; uid: string };
  spec?: { server?: { route?: { enabled?: boolean } } };
  status?: {
    phase?: string;
    host?: string;
    applicationController?: string;
    redis?: string;
    repo?: string;
    server?: string;
    sso?: string;
  };
}

export const ArgoCDListPage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [instances, loaded, watchError] = useK8sWatchResource<ArgoCDResource[]>({
    groupVersionKind: ArgoCDGroupVersionKind,
    isList: true,
  });

  const [apps] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  if (!loaded) return <Bullseye><Spinner /></Bullseye>;

  if (watchError) {
    return <Alert variant="danger" isInline title={t('Error loading resources')}>{(watchError as Error).message}</Alert>;
  }

  const items = instances ?? [];

  if (items.length === 0) {
    return <EmptyState><EmptyStateBody>{t('No ArgoCD instances found.')}</EmptyStateBody></EmptyState>;
  }

  const appCountByNs = (ns: string) => (apps ?? []).filter((a) => a.metadata.namespace === ns).length;

  const componentStatus = (status?: string): 'green' | 'red' | 'grey' => {
    if (status === 'Running' || status === 'Available') return 'green';
    if (status === 'Failed' || status === 'Error') return 'red';
    return 'grey';
  };

  return (
    <Grid hasGutter>
      {items.map((inst) => {
        const argoUrl = inst.status?.host ? `https://${inst.status.host}` : null;
        const appCount = appCountByNs(inst.metadata.namespace);

        return (
          <GridItem span={12} key={inst.metadata.uid}>
            <Card>
              <CardTitle>
                <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {inst.status?.phase === 'Available'
                          ? <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
                          : <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />}
                      </FlexItem>
                      <FlexItem>{inst.metadata.name}</FlexItem>
                      <FlexItem><Label isCompact color={inst.status?.phase === 'Available' ? 'green' : 'red'}>{inst.status?.phase ?? t('Unknown')}</Label></FlexItem>
                    </Flex>
                  </FlexItem>
                  <FlexItem>
                    {argoUrl && (
                      <a href={argoUrl} target="_blank" rel="noopener noreferrer">
                        {t('Open in Argo CD')} <ExternalLinkAltIcon />
                      </a>
                    )}
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <DescriptionList isHorizontal isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <a href={`/k8s/cluster/namespaces/${inst.metadata.namespace}`}>{inst.metadata.namespace}</a>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Applications')}</DescriptionListTerm>
                    <DescriptionListDescription><Label isCompact color="blue">{appCount}</Label></DescriptionListDescription>
                  </DescriptionListGroup>
                  {argoUrl && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>{t('URL')}</DescriptionListTerm>
                      <DescriptionListDescription>
                        <a href={argoUrl} target="_blank" rel="noopener noreferrer">{inst.status?.host} <ExternalLinkAltIcon /></a>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Components')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem><Label isCompact color={componentStatus(inst.status?.server)}>server</Label></FlexItem>
                        <FlexItem><Label isCompact color={componentStatus(inst.status?.repo)}>repo</Label></FlexItem>
                        <FlexItem><Label isCompact color={componentStatus(inst.status?.redis)}>redis</Label></FlexItem>
                        <FlexItem><Label isCompact color={componentStatus(inst.status?.applicationController)}>controller</Label></FlexItem>
                        {inst.status?.sso && <FlexItem><Label isCompact color={componentStatus(inst.status.sso)}>sso</Label></FlexItem>}
                      </Flex>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export default ArgoCDListPage;
