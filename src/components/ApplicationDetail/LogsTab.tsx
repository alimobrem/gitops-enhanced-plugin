import React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo, type FC } from 'react';
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

interface OwnerRef {
  kind: string;
  name: string;
}

interface PodResource {
  metadata: { name: string; namespace: string; ownerReferences?: OwnerRef[] };
  spec: { containers: Array<{ name: string }> };
}

interface ReplicaSetResource {
  metadata: { name: string; namespace: string; ownerReferences?: OwnerRef[] };
}

export const LogsTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const destNs = app.spec.destination.namespace ?? 'default';

  const [pods, , podsError] = useK8sWatchResource<PodResource[]>({
    groupVersionKind: { group: '', version: 'v1', kind: 'Pod' },
    namespace: destNs,
    isList: true,
  });

  const [replicaSets] = useK8sWatchResource<ReplicaSetResource[]>({
    groupVersionKind: { group: 'apps', version: 'v1', kind: 'ReplicaSet' },
    namespace: destNs,
    isList: true,
  });

  const [selectedPod, setSelectedPod] = useState<string>('');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [podSelectOpen, setPodSelectOpen] = useState(false);
  const [containerSelectOpen, setContainerSelectOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const appPods = useMemo(() => {
    const resources = app.status?.resources ?? [];
    const managedNames = new Set<string>();
    const workloadKinds = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'ReplicaSet']);

    for (const r of resources) {
      managedNames.add(r.name);
      if (r.kind === 'Pod') managedNames.add(r.name);
    }

    const managedWorkloads = new Set(
      resources.filter((r) => workloadKinds.has(r.kind)).map((r) => r.name),
    );

    const rsOwnedByManagedWorkload = new Set(
      (replicaSets ?? [])
        .filter((rs) => rs.metadata.ownerReferences?.some((ref) => managedWorkloads.has(ref.name)))
        .map((rs) => rs.metadata.name),
    );

    return (pods ?? []).filter((p) => {
      if (managedNames.has(p.metadata.name)) return true;

      const owners = p.metadata.ownerReferences ?? [];
      for (const owner of owners) {
        if (managedWorkloads.has(owner.name)) return true;
        if (rsOwnedByManagedWorkload.has(owner.name)) return true;
      }
      return false;
    });
  }, [app.status?.resources, pods, replicaSets]);

  const podNames = useMemo(() => appPods.map((p) => p.metadata.name).join(','), [appPods]);

  useEffect(() => {
    if (appPods.length > 0 && !selectedPod) {
      setSelectedPod(appPods[0].metadata.name);
      setSelectedContainer(appPods[0].spec.containers[0]?.name ?? '');
    }
  }, [podNames]);

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

  const streamLogs = useCallback(async () => {
    if (!selectedPod || !selectedContainer) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `/api/kubernetes/api/v1/namespaces/${destNs}/pods/${selectedPod}/log?container=${selectedContainer}&tailLines=500&follow=true`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok || !res.body) {
        setLogs(`Error: ${res.status} ${res.statusText}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setLogs(buffer);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setLogs((prev) => prev + `\n[Stream error: ${(e as Error).message}]`);
      }
    }
  }, [selectedPod, selectedContainer, destNs]);

  useEffect(() => {
    if (following) {
      streamLogs();
    } else {
      fetchLogs();
    }
    return () => abortRef.current?.abort();
  }, [fetchLogs, streamLogs, following]);

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
      <Flex spaceItems={{ default: 'spaceItemsMd' }} className="pf-v6-u-mb-md">
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
              isOpen={containerSelectOpen}
              onOpenChange={setContainerSelectOpen}
              onSelect={(_e, val) => { setSelectedContainer(val as string); setContainerSelectOpen(false); }}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} onClick={() => setContainerSelectOpen(!containerSelectOpen)}>{selectedContainer}</MenuToggle>
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
