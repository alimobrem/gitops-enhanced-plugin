export interface ListGenerator { list: { elements: Array<Record<string, string>> } }
export interface GitGenerator { git: { repoURL: string; revision?: string; directories?: Array<{ path: string; exclude?: boolean }>; files?: Array<{ path: string }>; requeueAfterSeconds?: number } }
export interface ClusterGenerator { clusters: { selector?: { matchLabels?: Record<string, string> }; values?: Record<string, string> } }
export interface MatrixGenerator { matrix: { generators: AppSetGenerator[] } }
export interface MergeGenerator { merge: { generators: AppSetGenerator[]; mergeKeys: string[] } }
export type AppSetGenerator = ListGenerator | GitGenerator | ClusterGenerator | MatrixGenerator | MergeGenerator | Record<string, unknown>;

export interface AppSetResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    generators?: AppSetGenerator[];
    template?: {
      metadata?: { name?: string; labels?: Record<string, string> };
      spec?: {
        source?: { repoURL?: string; path?: string; targetRevision?: string };
        destination?: { server?: string; namespace?: string };
        project?: string;
        syncPolicy?: { automated?: { prune?: boolean; selfHeal?: boolean }; syncOptions?: string[] };
      };
    };
  };
  status?: {
    conditions?: Array<{ type: string; status: string; message?: string; lastTransitionTime?: string }>;
  };
}
