import React from 'react';
import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import {
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  EmptyStateBody,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  PageSection,
  CodeBlock,
  CodeBlockCode,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import type { ApplicationResource } from '../../types';

interface PodResource {
  metadata: { name: string; namespace: string };
  spec: { containers: Array<{ name: string }> };
}

export const LogsTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const destNs = app.spec.destination.namespace ?? 'default';

  const [pods] = useK8sWatchResource<PodResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Pod' },
    namespace: destNs,
    isList: true,
  });

  const [selectedPod, setSelectedPod] = useState<string>('');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [podSelectOpen, setPodSelectOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const appPods = (pods ?? []).filter((p) =>
    app.status?.resources?.some(
      (r) => r.kind === 'Pod' && r.name === p.metadata.name,
    ) ||
    p.metadata.name.startsWith(app.metadata.name)
  );

  useEffect(() => {
    if (appPods.length > 0 && !selectedPod) {
      setSelectedPod(appPods[0].metadata.name);
      setSelectedContainer(appPods[0].spec.containers[0]?.name ?? '');
    }
  }, [appPods.length]);

  const fetchLogs = useCallback(async () => {
    if (!selectedPod || !selectedContainer) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `/api/kubernetes/api/v1/namespaces/${destNs}/pods/${selectedPod}/log?container=${selectedContainer}&tailLines=500`;
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        setLogs(await res.text());
      } else {
        setLogs(`Error fetching logs: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setLogs(`Error: ${(e as Error).message}`);
      }
    }
  }, [selectedPod, selectedContainer, destNs]);

  useEffect(() => {
    fetchLogs();
    if (following) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
    return () => abortRef.current?.abort();
  }, [fetchLogs, following]);

  if (appPods.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>{t('No pods found for this application.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  const currentPod = appPods.find((p) => p.metadata.name === selectedPod);
  const containers = currentPod?.spec.containers ?? [];

  return (
    <PageSection>
      <Flex spaceItems={{ default: 'spaceItemsMd' }} style={{ marginBottom: '1rem' }}>
        <FlexItem>
          <Select
            isOpen={podSelectOpen}
            onOpenChange={setPodSelectOpen}
            onSelect={(_e, val) => {
              setSelectedPod(val as string);
              const pod = appPods.find((p) => p.metadata.name === val);
              setSelectedContainer(pod?.spec.containers[0]?.name ?? '');
              setPodSelectOpen(false);
            }}
            toggle={(toggleRef) => (
              <MenuToggle ref={toggleRef} onClick={() => setPodSelectOpen(!podSelectOpen)}>
                {selectedPod || t('Select pod')}
              </MenuToggle>
            )}
            selected={selectedPod}
          >
            <SelectList>
              {appPods.map((p) => (
                <SelectOption key={p.metadata.name} value={p.metadata.name}>
                  {p.metadata.name}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </FlexItem>
        {containers.length > 1 && (
          <FlexItem>
            <Select
              isOpen={false}
              onSelect={(_e, val) => setSelectedContainer(val as string)}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef}>{selectedContainer}</MenuToggle>
              )}
              selected={selectedContainer}
            >
              <SelectList>
                {containers.map((c) => (
                  <SelectOption key={c.name} value={c.name}>
                    {c.name}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FlexItem>
        )}
        <FlexItem>
          <Button
            variant={following ? 'primary' : 'secondary'}
            onClick={() => setFollowing(!following)}
          >
            {following ? t('Stop Following') : t('Follow')}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button variant="secondary" onClick={fetchLogs}>
            {t('Refresh')}
          </Button>
        </FlexItem>
      </Flex>
      <CodeBlock>
        <CodeBlockCode>{logs || t('Loading logs...')}</CodeBlockCode>
      </CodeBlock>
    </PageSection>
  );
};

export default LogsTab;
