# GitOps Enhanced Plugin

OpenShift Console dynamic plugin for ArgoCD/GitOps management.

## Tech Stack

- React 17, TypeScript 5, PatternFly 6 (shared from console runtime)
- @openshift-console/dynamic-plugin-sdk 1.6
- Webpack 5, SWC, Jest 29
- Helm chart for deployment

## Build & Deploy

```bash
npm install          # install deps
npm test             # run tests (530+)
npm run build        # production webpack build
make ship            # build image on cluster, helm deploy, rollout restart
```

## Coding Rules

### PatternFly & Styling
- **No inline `style={{}}`** — use PF utility classes (`pf-v6-u-mb-md`) or CSS files prefixed with `gitops-`
- **No CSS frameworks** besides PatternFly — no Bootstrap, Tailwind, Foundation
- CSS files go next to their component: `ComponentName.css`

### Console SDK Patterns
- Every `useK8sWatchResource` call **must destructure and handle the error** parameter: `const [data, loaded, error] = ...`
- All exposed module names in `package.json` must match the component name (e.g., `GitOpsDashboardPage` not `GitOpsDashboardCard`)
- Detail pages accept `match.params` props (console pattern), not just `useParams()`
- Use `console.flag/model` for nav items so they only appear when the CRD exists

### Component Patterns
- **Never hardcode `openshift-gitops`** — use `useCurrentInstance()` from `hooks/useArgoCDInstances`
- **Never inline `app.spec.source ?? app.spec.sources?.[0]`** — use `getApplicationSource(app)` from `utils/application`
- All destructive actions (terminate, delete, rollback) require `ConfirmModal` from `shared/ConfirmModal`
- Dismissible alerts use `actionClose` prop with clear callback
- Derived values from watched resources must be wrapped in `useMemo`

### React
- All TSX files must `import React from 'react'` (classic JSX runtime for React 17)
- SWC config uses `"runtime": "classic"` — no automatic JSX transform
- Default exports required on all exposed module components
- Wrap exposed page components with `InstanceProvider` for multi-instance support

### Testing
- Every component gets a `.test.tsx` file next to it
- Mock `@openshift-console/dynamic-plugin-sdk` in every test
- Mock `react-i18next` with `useTranslation: () => ({ t: (s) => s })`
- Test loading, loaded, and error states for pages with `useK8sWatchResource`

### i18n
- All user-facing strings go through `t()` from `useTranslation('plugin__gitops-enhanced')`
- Add keys to `locales/en/plugin__gitops-enhanced.json`
- Check for missing keys in browser console (`Missing i18n key` warnings)

## Architecture

- `src/models/` — K8s CRD model definitions with GroupVersionKind
- `src/types/` — TypeScript interfaces for Application CR and Argo API responses
- `src/hooks/` — K8s watch hooks and action hooks
- `src/services/` — Argo CD API proxy service (consoleFetch)
- `src/components/` — React components organized by feature
- `src/utils/` — Shared utilities (status colors, URL builders, app helpers)
- `charts/` — Helm chart with ConsolePlugin CR and proxy config
- `e2e/` — End-to-end test scripts

## Promotion Pipeline (GitOps Promoter + Tekton)

### Overview

The plugin integrates GitOps Promoter (`promoter.argoproj.io/v1alpha1`) with Tekton Pipelines for automated environment promotion. A horizontal pipeline visualization shows commits flowing through dev → staging → prod with gate checks between each stage.

### CRDs Watched

| CRD | API Group | Purpose |
|-----|-----------|---------|
| PromotionStrategy | promoter.argoproj.io | Defines environment chain + gate checks |
| ChangeTransferPolicy | promoter.argoproj.io | Per-environment-hop PR management (auto-created) |
| CommitStatus | promoter.argoproj.io | Gate check results (created by Tekton or manually) |
| PullRequest | promoter.argoproj.io | SCM PR wrapper |

### Shared Utilities (use these, don't re-implement)

- `extractRepoPath(url)` — normalizes git URLs to `owner/repo` path (`utils/promotion.ts`)
- `safeHref(url)` — validates URLs against `https?://` scheme for XSS prevention (`utils/promotion.ts`)
- `statusLabelColor` — shared color mapping for pipeline stage status (`utils/promotion.ts`)
- `buildCommitLink(repoURL, sha)` — builds GitHub commit URL (`utils/promotion.ts`)
- `useMatchingStrategy(app, namespace)` — finds PromotionStrategy matching an Application's repo (`hooks/useMatchingStrategy.ts`)
- `useCommitStatusMutation(namespace, gitRepoRef)` — creates/patches CommitStatus CRs (`hooks/useCommitStatusMutation.ts`)

### Custom Hydrator (GitHub Actions)

The Argo CD source hydrator (commit-server) is not available in OpenShift GitOps yet. Instead, a GitHub Actions workflow (`argocd-example-apps/.github/workflows/hydrator.yaml`) acts as the custom hydrator:
- Watches `master` for non-`.github` pushes
- Runs `kustomize build` on the app directory
- Pushes rendered manifests + `hydrator.metadata` to `env/{dev,staging,prod}-next` branches
- The promoter opens PRs from `-next` → active branches

### Known Limitation: Promoter v0.27.1 Check-Run Visibility

The CTP controller queries GitHub's Checks API filtered by the GitHub App, but cannot find check runs created by its own App. This means `integration-tests` and `argocd-health` commit statuses created via CommitStatus CRs (which the CommitStatus controller writes as check runs) are invisible to the CTP controller. Tracked as an upstream issue. Workaround: remove required checks from the PromotionStrategy, or use a future promoter version.

### Tekton Pipeline Pattern

When OpenShift Pipelines is installed, the `promotion-integration-tests` Pipeline in `openshift-gitops` namespace:
1. Runs integration tests (`run-integration-tests` Task)
2. Reports results by creating a `CommitStatus` CR (`report-commit-status` Task)
3. On failure, the `finally` block creates a `CommitStatus` with `phase: failure`

The `promotion-pipeline` ServiceAccount has RBAC to create CommitStatus CRs.

### E2E Testing

```bash
./e2e/promotion-e2e.sh    # 13 checks: prerequisites, app health, push, hydrator, promoter, PRs, plugin
```
