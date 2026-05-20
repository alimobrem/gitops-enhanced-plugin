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
npm test             # run 49 tests
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
- `src/topology/` — Topology view data/component factories (WIP)
- `charts/` — Helm chart with ConsolePlugin CR and proxy config
