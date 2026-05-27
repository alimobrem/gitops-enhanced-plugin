export interface RolloutResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    replicas?: number;
    revisionHistoryLimit?: number;
    minReadySeconds?: number;
    progressDeadlineSeconds?: number;
    progressDeadlineAbort?: boolean;
    selector?: { matchLabels?: Record<string, string> };
    strategy?: {
      canary?: {
        maxSurge?: string | number;
        maxUnavailable?: string | number;
        stableService?: string;
        canaryService?: string;
        steps?: Array<Record<string, unknown>>;
        antiAffinity?: Record<string, unknown>;
      };
      blueGreen?: {
        activeService?: string;
        previewService?: string;
        autoPromotionEnabled?: boolean;
        autoPromotionSeconds?: number;
        scaleDownDelaySeconds?: number;
        previewReplicaCount?: number;
      };
    };
    template?: {
      metadata?: { labels?: Record<string, string> };
      spec?: {
        containers?: Array<{
          name: string;
          image: string;
          ports?: Array<{ containerPort: number; protocol?: string }>;
          resources?: {
            requests?: Record<string, string>;
            limits?: Record<string, string>;
          };
        }>;
      };
    };
  };
  status?: {
    phase?: string;
    currentStepIndex?: number;
    replicas?: number;
    updatedReplicas?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    currentPodHash?: string;
    stableRS?: string;
    canary?: Record<string, unknown>;
    blueGreen?: { activeSelector?: string; previewSelector?: string };
    conditions?: Array<{ type: string; status: string; message: string; reason?: string }>;
    selector?: string;
  };
}
