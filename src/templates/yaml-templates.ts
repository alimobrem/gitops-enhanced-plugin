export const applicationTemplate = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true`;

export const applicationSetTemplate = `apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-appset
  namespace: openshift-gitops
spec:
  generators:
    - list:
        elements:
          - cluster: in-cluster
            url: https://kubernetes.default.svc
            namespace: default
  template:
    metadata:
      name: '{{cluster}}-app'
    spec:
      project: default
      source:
        repoURL: https://github.com/argoproj/argocd-example-apps.git
        targetRevision: HEAD
        path: guestbook
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'`;

export const appProjectTemplate = `apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: my-project
  namespace: openshift-gitops
spec:
  description: My project
  sourceRepos:
    - '*'
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'`;

export const rolloutTemplate = `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-rollout
spec:
  replicas: 3
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: {duration: 30s}
        - setWeight: 50
        - pause: {duration: 30s}
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: nginx:latest
          ports:
            - containerPort: 80`;

export const analysisTemplateTemplate = `apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: my-analysis
spec:
  metrics:
    - name: success-rate
      interval: 30s
      successCondition: result[0] >= 0.95
      provider:
        prometheus:
          address: http://prometheus.istio-system:9090
          query: |
            sum(rate(http_requests_total{status=~"2.*"}[5m]))
            /
            sum(rate(http_requests_total[5m]))`;

export const experimentTemplate = `apiVersion: argoproj.io/v1alpha1
kind: Experiment
metadata:
  name: my-experiment
spec:
  duration: 5m
  templates:
    - name: baseline
      replicas: 1
      selector:
        matchLabels:
          app: baseline
      template:
        metadata:
          labels:
            app: baseline
        spec:
          containers:
            - name: app
              image: nginx:1.24
    - name: canary
      replicas: 1
      selector:
        matchLabels:
          app: canary
      template:
        metadata:
          labels:
            app: canary
        spec:
          containers:
            - name: app
              image: nginx:latest`;
