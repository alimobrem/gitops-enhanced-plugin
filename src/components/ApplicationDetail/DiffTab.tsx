import React from 'react';
import { useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye,
  Spinner,
  Alert,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Label,
  Flex,
  FlexItem,
  PageSection,
} from '@patternfly/react-core';
import { useManagedResources } from '../../hooks/useManagedResources';
import { DiffViewer } from '../shared/DiffViewer';
import type { ApplicationResource } from '../../types';
import { toSortedYaml } from '../../utils/yaml';

export const DiffTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');

  const appName = app?.metadata?.name ?? '';
  const appNamespace = app?.metadata?.namespace ?? '';

  const { resources, loaded, error } = useManagedResources(appName, appNamespace);

  const changedResources = useMemo(() => {
    if (!loaded) return [];
    return resources.filter(r => r.targetState && r.liveState).map(r => {
      const desiredYaml = toSortedYaml(r.targetState!);
      const liveYaml = toSortedYaml(r.liveState!);
      return { ...r, desiredYaml, liveYaml, hasChanges: desiredYaml !== liveYaml };
    }).filter(r => r.hasChanges);
  }, [resources, loaded]);

  if (!app?.metadata) {
    return <Bullseye><Spinner /></Bullseye>;
  }

  if (!loaded) {
    return <Bullseye><Spinner /></Bullseye>;
  }

  if (error) {
    return <Alert variant="danger" isInline title={t('Error loading resources')}>{error}</Alert>;
  }

  if (changedResources.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>{t('All resources are in sync')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <PageSection>
      <Flex className="pf-v6-u-mb-md">
        <FlexItem>
          <Label color="orange">
            {t('{{count}} resources with differences', { count: changedResources.length })}
          </Label>
        </FlexItem>
      </Flex>
      {changedResources.map((r) => (
          <ExpandableSection
            key={`${r.kind}/${r.namespace}/${r.name}`}
            toggleContent={
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><Label isCompact>{r.kind}</Label></FlexItem>
                <FlexItem>{r.name}</FlexItem>
              </Flex>
            }
            className="pf-v6-u-mb-sm"
          >
            <DiffViewer
              desired={r.desiredYaml}
              live={r.liveYaml}
              resourceName={r.name}
              kind={r.kind}
            />
          </ExpandableSection>
      ))}
    </PageSection>
  );
};

export default DiffTab;
