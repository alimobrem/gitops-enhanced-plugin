export interface AppProjectResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    description?: string;
    sourceRepos?: string[];
    destinations?: Array<{ server?: string; namespace?: string; name?: string }>;
    roles?: Array<{ name: string; description?: string; policies?: string[]; groups?: string[] }>;
    syncWindows?: Array<{ kind: string; schedule: string; duration?: string; clusters?: string[]; namespaces?: string[]; applications?: string[] }>;
    clusterResourceWhitelist?: Array<{ group: string; kind: string }>;
    namespaceResourceBlacklist?: Array<{ group: string; kind: string }>;
  };
}
