import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardTitle,
  CardBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource } from '../../types';

export const GitOpsDashboardCard: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [apps, loaded] = useK8sWatchResource<ApplicationResource[]>({
    groupVersionKind: ApplicationGroupVersionKind,
    isList: true,
  });

  if (!loaded) {
    return (
      <Card>
        <CardTitle>{t('GitOps Applications')}</CardTitle>
        <CardBody><Spinner size="md" /></CardBody>
      </Card>
    );
  }

  const total = apps?.length ?? 0;
  const synced = apps?.filter((a) => a.status?.sync?.status === 'Synced').length ?? 0;
  const outOfSync = apps?.filter((a) => a.status?.sync?.status === 'OutOfSync').length ?? 0;
  const healthy = apps?.filter((a) => a.status?.health?.status === 'Healthy').length ?? 0;
  const degraded = apps?.filter((a) => a.status?.health?.status === 'Degraded').length ?? 0;

  return (
    <Card>
      <CardTitle>{t('GitOps Applications')}</CardTitle>
      <CardBody>
        <DescriptionList isHorizontal isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Total')}</DescriptionListTerm>
            <DescriptionListDescription>{total}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" /></FlexItem>
                <FlexItem>{t('Synced')}</FlexItem>
              </Flex>
            </DescriptionListTerm>
            <DescriptionListDescription>{synced}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><ExclamationTriangleIcon color="var(--pf-t--global--color--status--warning--default)" /></FlexItem>
                <FlexItem>{t('OutOfSync')}</FlexItem>
              </Flex>
            </DescriptionListTerm>
            <DescriptionListDescription>{outOfSync}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" /></FlexItem>
                <FlexItem>{t('Healthy')}</FlexItem>
              </Flex>
            </DescriptionListTerm>
            <DescriptionListDescription>{healthy}</DescriptionListDescription>
          </DescriptionListGroup>
          {degraded > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>
                <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem><ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" /></FlexItem>
                  <FlexItem>{t('Degraded')}</FlexItem>
                </Flex>
              </DescriptionListTerm>
              <DescriptionListDescription>{degraded}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default GitOpsDashboardCard;
