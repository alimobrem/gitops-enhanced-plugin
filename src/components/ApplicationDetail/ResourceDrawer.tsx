import React from 'react';
import { useState, useEffect, type FC } from 'react';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Spinner,
  Bullseye,
  Alert,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import type { SyncStatusCode } from '../../types';
import * as yaml from 'js-yaml';

interface ManagedResource {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  status: SyncStatusCode;
  health?: { status: string };
}

interface ResourceDrawerProps {
  resource: ManagedResource;
  onClose: () => void;
}

interface K8sEvent {
  type?: string;
  reason?: string;
  message?: string;
  lastTimestamp?: string;
  metadata?: { name?: string };
}

function pluralize(kind: string): string {
  return kind.toLowerCase() + 's';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SummaryPanel: FC<{ resource: ManagedResource }> = ({ resource }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const gv = resource.group ? `${resource.group}/${resource.version}` : resource.version;

  return (
    <DescriptionList isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Kind')}</DescriptionListTerm>
        <DescriptionListDescription>{resource.kind}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
        <DescriptionListDescription>{resource.name}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
        <DescriptionListDescription>{resource.namespace ?? '-'}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Sync Status')}</DescriptionListTerm>
        <DescriptionListDescription>
          <SyncStatusIcon status={resource.status ?? 'Unknown'} />
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Health')}</DescriptionListTerm>
        <DescriptionListDescription>
          {resource.health ? <HealthStatusIcon status={resource.health.status as never} /> : '-'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Group/Version')}</DescriptionListTerm>
        <DescriptionListDescription>{gv}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const EventsPanel: FC<{ resource: ManagedResource }> = ({ resource }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resource.namespace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const url = `/api/kubernetes/api/v1/namespaces/${encodeURIComponent(resource.namespace)}/events?fieldSelector=involvedObject.name=${encodeURIComponent(resource.name)},involvedObject.kind=${encodeURIComponent(resource.kind)}`;
    consoleFetch(url)
      .then((resp) => resp.json())
      .then((data: { items?: K8sEvent[] }) => {
        setEvents(data?.items ?? []);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [resource.namespace, resource.name, resource.kind]);

  if (loading) return <Bullseye><Spinner /></Bullseye>;
  if (error) return <Alert variant="danger" isInline title={t('Error loading events')}>{error}</Alert>;
  if (events.length === 0) return <div>{t('No events found.')}</div>;

  return (
    <Table aria-label={t('Events')} isCompact>
      <Thead>
        <Tr>
          <Th>{t('Type')}</Th>
          <Th>{t('Reason')}</Th>
          <Th>{t('Message')}</Th>
          <Th>{t('Last Seen')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {events.map((ev, idx) => (
          <Tr key={ev.metadata?.name ?? idx}>
            <Td>{ev.type ?? '-'}</Td>
            <Td>{ev.reason ?? '-'}</Td>
            <Td>{ev.message ?? '-'}</Td>
            <Td>{ev.lastTimestamp ? timeAgo(ev.lastTimestamp) : '-'}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

const ManifestPanel: FC<{ resource: ManagedResource }> = ({ resource }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [manifest, setManifest] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const plural = pluralize(resource.kind);
    const ns = resource.namespace ? `/namespaces/${encodeURIComponent(resource.namespace)}` : '';
    const url = resource.group
      ? `/api/kubernetes/apis/${encodeURIComponent(resource.group)}/${encodeURIComponent(resource.version)}${ns}/${plural}/${encodeURIComponent(resource.name)}`
      : `/api/kubernetes/api/${encodeURIComponent(resource.version)}${ns}/${plural}/${encodeURIComponent(resource.name)}`;

    consoleFetch(url)
      .then((resp) => resp.json())
      .then((data: unknown) => {
        setManifest(yaml.dump(data, { lineWidth: 120 }));
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [resource.group, resource.version, resource.kind, resource.namespace, resource.name]);

  if (loading) return <Bullseye><Spinner /></Bullseye>;
  if (error) return <Alert variant="danger" isInline title={t('Error loading manifest')}>{error}</Alert>;

  return (
    <pre className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {manifest}
    </pre>
  );
};

export const ResourceDrawer: FC<ResourceDrawerProps> = ({ resource, onClose }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [activeTab, setActiveTab] = useState<string | number>(0);

  return (
    <DrawerPanelContent isResizable defaultSize="500px" minSize="300px">
      <DrawerHead>
        <Title headingLevel="h2" size="lg">
          {resource.kind}: {resource.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key)} isFilled>
          <Tab eventKey={0} title={<TabTitleText>{t('Summary')}</TabTitleText>}>
            <div className="pf-v6-u-mt-md">
              <SummaryPanel resource={resource} />
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>{t('Events')}</TabTitleText>}>
            <div className="pf-v6-u-mt-md">
              <EventsPanel resource={resource} />
            </div>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>{t('Live Manifest')}</TabTitleText>}>
            <div className="pf-v6-u-mt-md">
              <ManifestPanel resource={resource} />
            </div>
          </Tab>
        </Tabs>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default ResourceDrawer;
