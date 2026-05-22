import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import type { ApplicationTree, ManagedResource } from '../types';

export function getProxyBase(alias = 'argocd'): string {
  return `/api/proxy/plugin/gitops-enhanced/${alias}`;
}

async function argoFetch<T>(path: string, alias?: string): Promise<T> {
  const response = await consoleFetch(`${getProxyBase(alias)}${path}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `Argo CD API error ${response.status}: ${(body as Record<string, string>).message ?? response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}

export async function fetchResourceTree(
  _namespace: string,
  appName: string,
  instanceAlias?: string,
): Promise<ApplicationTree> {
  return argoFetch<ApplicationTree>(
    `/api/v1/applications/${encodeURIComponent(appName)}/resource-tree`,
    instanceAlias,
  );
}

export async function fetchManagedResources(
  _namespace: string,
  appName: string,
  instanceAlias?: string,
): Promise<{ items: ManagedResource[] }> {
  return argoFetch<{ items: ManagedResource[] }>(
    `/api/v1/applications/${encodeURIComponent(appName)}/managed-resources`,
    instanceAlias,
  );
}

export async function syncApplication(
  appName: string,
  revision?: string,
  resources?: Array<{
    group: string;
    kind: string;
    name: string;
    namespace?: string;
  }>,
  instanceAlias?: string,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (revision) body.revision = revision;
  if (resources) body.resources = resources;

  const response = await consoleFetch(
    `${getProxyBase(instanceAlias)}/api/v1/applications/${encodeURIComponent(appName)}/sync`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Sync failed ${response.status}: ${(err as Record<string, string>).message ?? response.statusText}`,
    );
  }
}

export async function rollbackApplication(
  appName: string,
  id: number,
  instanceAlias?: string,
): Promise<void> {
  const response = await consoleFetch(
    `${getProxyBase(instanceAlias)}/api/v1/applications/${encodeURIComponent(appName)}/rollback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Rollback failed ${response.status}: ${(err as Record<string, string>).message ?? response.statusText}`,
    );
  }
}
