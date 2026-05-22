declare module '@openshift-console/dynamic-plugin-sdk' {
  import type { FC, PropsWithChildren } from 'react';

  export const DocumentTitle: FC<PropsWithChildren>;
  export const ListPageHeader: FC<PropsWithChildren<{ title: string }>>;
  export const ResourceLink: FC<{
    groupVersionKind: { group: string; version: string; kind: string };
    name: string;
    namespace?: string;
  }>;
  export const HorizontalNav: FC<{
    pages: Array<{ name: string; component: FC }>;
  }>;

  export function useK8sWatchResource<T>(
    resource: WatchK8sResource,
  ): [T, boolean, unknown];

  export function k8sPatch(options: {
    model: K8sModel;
    resource: unknown;
    data: Array<{ op: string; path: string; value: unknown }>;
  }): Promise<unknown>;

  export function k8sCreate(options: {
    model: K8sModel;
    data: unknown;
  }): Promise<unknown>;

  export function k8sDelete(options: {
    model: K8sModel;
    resource: unknown;
  }): Promise<unknown>;

  export function consoleFetchText(
    url: string,
    options?: RequestInit,
  ): Promise<string>;

  export function consoleFetch(
    url: string,
    options?: RequestInit,
  ): Promise<Response>;

  export interface WatchK8sResource {
    groupVersionKind: { group: string; version: string; kind: string };
    isList?: boolean;
    name?: string;
    namespace?: string;
  }

  export interface K8sModel {
    apiGroup: string;
    apiVersion: string;
    kind: string;
    plural: string;
    abbr: string;
    namespaced: boolean;
    label: string;
    labelPlural: string;
  }

  export enum PrometheusEndpoint {
    LABEL = 'api/v1/label',
    QUERY = 'api/v1/query',
    QUERY_RANGE = 'api/v1/query_range',
    RULES = 'api/v1/rules',
    TARGETS = 'api/v1/targets',
  }

  export interface PrometheusData {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value?: [number, string];
      values?: Array<[number, string]>;
    }>;
  }

  export interface PrometheusResponse {
    status: string;
    data: PrometheusData;
  }

  export const usePrometheusPoll: (props: {
    endpoint: PrometheusEndpoint;
    query?: string;
    delay?: number;
    namespace?: string;
    timespan?: number;
  }) => [PrometheusResponse | undefined, boolean, unknown];
}
