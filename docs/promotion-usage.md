# Promotion Pipeline Usage Guide

This guide covers setting up and using the GitOps Promoter integration in the OpenShift Console. It automates environment promotion (dev → staging → prod) through Git pull requests, gated by commit status checks.

## Prerequisites

- OpenShift 4.16+ with the GitOps Enhanced Plugin installed
- [GitOps Promoter](https://github.com/argoproj-labs/gitops-promoter) v0.27+ installed on the cluster
- A Git repository you have push access to (GitHub, GitLab, Gitea, Forgejo, Bitbucket, or Azure DevOps)
- (Optional) OpenShift Pipelines (Tekton) for CI gate checks

## Quick Start

### 1. Install GitOps Promoter

```bash
kubectl apply -f https://github.com/argoproj-labs/gitops-promoter/releases/download/v0.27.1/install.yaml
```

If the `ControllerConfiguration` fails on first apply (race condition), run the command again.

### 2. Create a Promotion Pipeline via the Console

Navigate to **GitOps → Promotion Pipelines → Create Pipeline**. The wizard walks through 5 steps:

**Step 1 — SCM Provider:** Select your Git provider type and enter credentials.

| Provider | Auth Required | Fields |
|----------|--------------|--------|
| GitHub | GitHub App (not PAT) | App ID, Installation ID, Private Key (.pem) |
| GitLab | Access Token | Token (Developer role, `api` + `write_repository` scopes) |
| Gitea | Access Token | Token, Domain (required — self-hosted) |
| Forgejo | Access Token | Token, Domain (required — self-hosted) |
| Bitbucket Cloud | Repo Access Token | Token |
| Azure DevOps | PAT | Token, Organization |

If an SCM Provider already exists in the namespace, toggle "Use existing" to select it.

**Step 2 — Git Repository:** Enter the repository owner and name. If a GitRepository CR already exists, toggle "Use existing."

**Step 3 — Environments:** Define the promotion chain. Default: `env/dev → env/staging → env/prod`. Each environment maps to a Git branch. Toggle "Auto-merge" off for environments that require manual PR merge (e.g., prod).

**Step 4 — Gates (optional):** Add commit status check keys:
- **Proposed checks** — must pass before a PR merges (e.g., `integration-tests`, `security-scan`)
- **Active checks** — must pass after merge before promoting to the next environment (e.g., `argocd-health`)

**Step 5 — Review & Create:** Shows all resources that will be created (Secret, ScmProvider, GitRepository, PromotionStrategy). Click Create.

### 3. Set Up Environment Branches

Create the environment branches in your repository:

```bash
# From your repo's default branch
for BRANCH in env/dev env/staging env/prod env/dev-next env/staging-next env/prod-next; do
  git checkout -b "$BRANCH"
  git push origin "$BRANCH"
  git checkout main
done
```

The `-next` branches are staging areas where the hydrator pushes rendered manifests. The promoter opens PRs from `-next` → active branches.

### 4. Set Up a Hydrator

The hydrator renders your DRY manifests (Helm charts, Kustomize overlays) into plain YAML and pushes them to the `-next` branches with a `hydrator.metadata` file.

**Option A: Argo CD Source Hydrator** (if available — requires `argocd-commit-server`)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  sourceHydrator:
    drySource:
      repoURL: https://github.com/org/repo.git
      targetRevision: main
      path: my-app
    syncSource:
      targetBranch: env/dev
    hydrateTo: env/dev-next
```

**Option B: GitHub Actions Custom Hydrator** (works with any OpenShift GitOps version)

Create `.github/workflows/hydrator.yaml` in your repo — see [the example workflow](https://github.com/alimobrem/argocd-example-apps/blob/master/.github/workflows/hydrator.yaml). It watches `master` for pushes, runs `kustomize build`, and pushes rendered output + `hydrator.metadata` to each `-next` branch.

**Option C: Any CI system** — the contract is: push rendered manifests + a `hydrator.metadata` JSON file to the `-next` branch. See [Custom Hydrator docs](https://gitops-promoter.readthedocs.io/en/latest/advanced-usage/custom-hydrator/).

### 5. Create Per-Environment Applications (Optional)

If you want the `argocd-health` active check (promoter waits for the app to be healthy before promoting to the next environment):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
  namespace: openshift-gitops
  labels:
    promoter.argoproj.io/environment: dev
spec:
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: env/dev
    path: .
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Then create an `ArgoCDCommitStatus` to watch app health:

```yaml
apiVersion: promoter.argoproj.io/v1alpha1
kind: ArgoCDCommitStatus
metadata:
  name: myapp-health
  namespace: openshift-gitops
spec:
  applicationSelector:
    matchExpressions:
      - key: promoter.argoproj.io/environment
        operator: Exists
  promotionStrategyRef:
    name: myapp-promotion
```

## How Promotion Works

```
1. Push to main branch
2. Hydrator renders manifests → pushes to env/dev-next
3. Promoter detects new commit → opens PR: env/dev-next → env/dev
4. Gate checks run (Tekton pipeline, manual approve, etc.)
5. All checks pass → PR auto-merges (if autoMerge: true)
6. Argo CD syncs env/dev to cluster
7. ArgoCD health check passes → promoter-previous-environment passes for staging
8. Repeat for staging → prod
```

## Using the Console UI

### Pipeline Visualization

Navigate to **GitOps → Promotion Pipelines** and click a pipeline. The horizontal visualization shows:

- **Stage cards** — each environment with its active SHA, status (Healthy/Promoting/Blocked/Pending), PR number, and timestamp
- **Gate connectors** — between stages showing check status (passed/blocked/running)
- **"Stuck" warning** — appears when all checks have been pending for 30+ minutes
- **"Live" indicator** — pulsing icon confirming the K8s watch is active

Click a **stage card** to see:
- Active and proposed commit SHAs (linked to GitHub)
- Hydrator metadata (author, message, date)
- PR link with age
- Commit status table
- Promotion history
- Related Argo CD Applications

Click a **gate connector** to see:
- PR link
- Commit details (dry → hydrated SHA)
- Proposed checks table with Approve/Retry buttons
- Active checks table
- Success/error alerts after actions

### Approving a Gate Check

1. Click the gate connector between two environments
2. Find the pending check in the "Proposed checks" table
3. Click **Approve** → confirm in the modal
4. A success alert appears: *"integration-tests" approved — promotion will proceed once all checks pass*
5. The promoter reconciles within 30 seconds and advances the pipeline

### Application Integration

On any Application detail page, a **PromotionBanner** appears at the top of the Summary tab if a matching PromotionStrategy exists. It shows the current promotion status and links to the pipeline detail.

A **Promotion tab** is also available on the Application detail horizontal nav, showing the full pipeline visualization scoped to that app.

### Dashboard

The GitOps Dashboard includes a **Promotion Activity** section showing:
- Total pipeline count
- Blocked promotion count (highlighted in red)
- Active promotions table with pipeline name, gate, status, and links

## Setting Up CI Gates with Tekton

If OpenShift Pipelines is installed, create a Tekton Pipeline that runs tests and reports results:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: report-commit-status
  namespace: openshift-gitops
spec:
  params:
    - name: sha
    - name: phase
    - name: key
    - name: git-repo-ref
  steps:
    - name: create-status
      image: registry.redhat.io/openshift4/ose-cli:latest
      script: |
        cat <<EOF | oc create -f -
        apiVersion: promoter.argoproj.io/v1alpha1
        kind: CommitStatus
        metadata:
          generateName: $(params.key)-
          namespace: openshift-gitops
          labels:
            promoter.argoproj.io/commit-status: $(params.key)
        spec:
          gitRepositoryRef:
            name: $(params.git-repo-ref)
          sha: "$(params.sha)"
          name: $(params.key)
          description: "Tekton pipeline completed"
          phase: $(params.phase)
        EOF
```

**Critical:** The `promoter.argoproj.io/commit-status` label is **required**. Without it, the promoter controller cannot find the CommitStatus CR and the gate stays pending forever.

## E2E Testing

Run the end-to-end test to verify the full pipeline flow:

```bash
./e2e/promotion-e2e.sh
```

This pushes a test commit to master, waits for the hydrator, verifies the promoter detects new commits and opens PRs, checks pipeline state, and confirms the console plugin is running. 13 checks total.

## Troubleshooting

### "Stuck" warning on all stages

**Cause:** No CI system is reporting CommitStatus CRs for the required check keys.

**Fix:** Either:
- Set up Tekton or GitHub Actions to create CommitStatus CRs (with the `promoter.argoproj.io/commit-status` label)
- Manually approve checks via the gate detail panel
- Remove required checks from the PromotionStrategy

### argocd-health stays pending

**Cause:** The Application is not reaching `Healthy` status. Common reasons:
- Container image doesn't run on OpenShift (needs non-root, port 8080+)
- Missing resources or RBAC
- Image pull errors

**Fix:** Check the Application in the console → Resources tab → look for failing pods. Fix the underlying issue, or remove `argocd-health` from `activeCommitStatuses`.

### "Too many matching SHAs" error

**Cause:** Multiple CommitStatus CRs exist with the same `promoter.argoproj.io/commit-status` label and `spec.sha`. The promoter expects exactly one per key+SHA.

**Fix:** Delete the duplicate:
```bash
oc get commitstatus -n openshift-gitops -l promoter.argoproj.io/commit-status=<key> --no-headers
# Find the duplicate, delete one:
oc delete commitstatus <duplicate-name> -n openshift-gitops
```

### Promoter can't clone the repo

**Cause:** ScmProvider credentials are invalid or the GitHub App doesn't have the right permissions.

**Fix:** Verify the GitHub App has Checks, Contents, and Pull requests (Read & Write). Check the promoter controller logs:
```bash
oc logs -n promoter-system deployment/promoter-controller-manager --tail=20
```

### Promotion Pipelines nav item doesn't appear

**Cause:** The `PromotionStrategy` CRD is not installed, or the console hasn't detected it yet.

**Fix:** Install GitOps Promoter, then restart the console pods:
```bash
oc delete pods -n openshift-console -l app=console
```

### Source hydrator not available on OpenShift GitOps

The `argocd-commit-server` binary is not included in the Red Hat OpenShift GitOps operator image (as of v1.21.0). Use a custom hydrator (GitHub Actions, Tekton, or any CI) instead of the Argo CD native source hydrator.

## Architecture

```
master (DRY config)
  │
  ▼ Hydrator (GitHub Actions / Argo CD / custom)
env/dev-next (hydrated manifests + hydrator.metadata)
  │
  ▼ Promoter opens PR
env/dev (active) ──► Argo CD syncs to cluster
  │                    │
  │                    ▼ ArgoCDCommitStatus reports health
  │                    CommitStatus CR: argocd-health=success
  │
  ▼ promoter-previous-environment passes
env/staging-next → env/staging → Argo CD syncs
  │
  ▼
env/prod-next → env/prod (autoMerge: false → manual merge)
```

**Console plugin surfaces:**
- PromotionStrategy status via `useK8sWatchResource`
- CommitStatus CRs for gate check details
- ChangeTransferPolicy conditions for controller feedback
- Application health for related apps
