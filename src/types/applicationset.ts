export interface AppSetResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    generators?: Array<Record<string, unknown>>;
    template?: {
      metadata?: { name?: string; labels?: Record<string, string> };
      spec?: {
        source?: { repoURL?: string; path?: string; targetRevision?: string };
        destination?: { server?: string; namespace?: string };
        syncPolicy?: { automated?: { prune?: boolean; selfHeal?: boolean }; syncOptions?: string[] };
      };
    };
  };
  status?: {
    conditions?: Array<{ type: string; status: string; message?: string; lastTransitionTime?: string }>;
  };
}
