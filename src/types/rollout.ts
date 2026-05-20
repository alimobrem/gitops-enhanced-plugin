export interface RolloutResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    replicas?: number;
    strategy?: {
      canary?: { steps?: Array<Record<string, unknown>> };
      blueGreen?: { activeService?: string; previewService?: string; autoPromotionEnabled?: boolean };
    };
    template?: {
      spec?: {
        containers?: Array<{ name: string; image: string; ports?: Array<{ containerPort: number }> }>;
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
  };
}
