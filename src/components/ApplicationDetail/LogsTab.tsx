import React from 'react';
import { useState, useEffect, useRef, useMemo, type FC } from 'react';
import {
  useK8sWatchResource,
  consoleFetchText,
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
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import './LogsTab.css';
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

  const [pods, , _podsError] = useK8sWatchResource<PodResource[]>({
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

  const doFetchLogs = async (pod: string, container: string, follow: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLogs('Loading logs...');

    try {
      const followParam = follow ? '&follow=true' : '';
      const url = `/api/kubernetes/api/v1/namespaces/${encodeURIComponent(destNs)}/pods/${encodeURIComponent(pod)}/log?container=${encodeURIComponent(container)}&tailLines=500${followParam}`;
      const text = await consoleFetchText(url);
      setLogs((text || '(no output from container)').replace(/\x1b\[[0-9;]*m/g, ''));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setLogs(`Error fetching logs: ${(e as Error).message}`);
      }
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (appPods.length > 0 && !selectedPod) {
      const pod = appPods[0].metadata.name;
      const container = appPods[0].spec.containers[0]?.name ?? '';
      setSelectedPod(pod);
      setSelectedContainer(container);
      doFetchLogs(pod, container, false);
    }
  }, [podNames]);

  useEffect(() => {
    if (!selectedPod || !selectedContainer) return;
    doFetchLogs(selectedPod, selectedContainer, following);
    return () => abortRef.current?.abort();
  }, [selectedPod, selectedContainer, following, destNs]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
          <Button variant="secondary" onClick={() => doFetchLogs(selectedPod, selectedContainer, false)}>
            {t('Refresh')}
          </Button>
        </FlexItem>
      </Flex>
      <pre className="gitops-log-viewer" ref={(el) => { if (el && following) el.scrollTop = el.scrollHeight; }}>
        {logs || t('Loading logs...')}
      </pre>
    </PageSection>
  );
};

export default LogsTab;
