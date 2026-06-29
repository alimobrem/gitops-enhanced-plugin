# GitOps Promoter + Tekton: Unified Promotion UX in OpenShift Console

## Context

GitOps Promoter automates environment promotion via Git branch PRs, gated by CommitStatus checks. Tekton Pipelines run CI/CD tasks that produce those checks. Today these are disconnected — a developer must bounce between the SCM UI, Tekton PipelineRun logs, and K8s CRD inspection to understand where a change is and why it's stuck. This plan brings them together as a first-class "promotion pipeline" experience inside the existing gitops-enhanced-plugin.

---

## Use Cases

### UC-1: Commit Tracking
**As a developer**, I want to see exactly where my commit is in the promotion pipeline (which environment it has reached, which it hasn't) so I know whether my change is live in production or still working its way through gates.

### UC-2: Blocked Promotion Diagnosis
**As a developer**, when my promotion is stuck, I want to see which specific gate check failed, read the Tekton pipeline logs for that check, and either retry the check or fix my code — all from one screen, without jumping between the SCM UI, Tekton dashboard, and `kubectl`.

### UC-3: Manual Approval Gates
**As a platform engineer**, I want to configure manual approval gates (no CI — just a human sign-off) at specific environment boundaries (e.g., staging → prod), and I want developers to be able to approve from the console with a confirmation dialog.

### UC-4: Fleet Promotion Health
**As a platform engineer managing 50+ applications**, I want a dashboard view that shows how many promotion pipelines are healthy vs. blocked, and which specific pipelines need attention right now, so I can triage without clicking into each one.

### UC-5: Promotion Pipeline Setup
**As a platform engineer**, I want to define a promotion pipeline (environment chain + gate checks) through a guided wizard in the console, so I don't have to hand-write PromotionStrategy YAML.

### UC-6: Application-Scoped Promotion Awareness
**As a developer looking at my Application detail page**, I want to see my app's promotion status without navigating away — a banner on the overview tab telling me "your change is blocked at staging→prod because security-scan failed" with a link to the full pipeline view.

### UC-7: CI-Agnostic Gate Integration
**As a platform engineer**, I want the promotion UI to work with any CI system (Tekton, GitHub Actions, Jenkins, GitLab CI) that writes CommitStatus CRs, not just Tekton. The "View Logs" link should go wherever `CommitStatus.spec.url` points.

### UC-8: Graceful Absence
**As a cluster admin who hasn't installed GitOps Promoter**, I want the existing GitOps plugin to work exactly as before — no broken nav items, no empty pages, no console errors.

---

## Personas

### Developer (promotes their app)
- Pushes code and wants to track it through dev → staging → prod
- Needs to understand *why* a promotion is blocked (which gate, which check, what failed)
- May need to retry a failed CI check or manually approve a gate
- Wants to see Tekton pipeline logs when a gate fails
- Entry points: Application detail page (banner + tab), Promotion Pipelines list

### Platform Engineer (sets up and monitors promotion pipelines)
- Creates/manages PromotionStrategies (environment chains + gate configurations)
- Monitors overall promotion health across many applications
- Triages blocked promotions fleet-wide from the dashboard
- Configures which Tekton pipelines (or manual gates) run at each environment boundary
- Entry points: Dashboard, Promotion Pipelines list, Create Pipeline wizard

---

## UX Concept: The Promotion Pipeline

The central metaphor is a **horizontal pipeline** — a chain of environment stages with gates between them. A developer looks at this and immediately sees: where is my commit, what passed, what's blocking the next hop.

```
 ┌─────────┐       ┌─────────┐       ┌─────────┐
 │   DEV   │──[G]──│ STAGING │──[G]──│  PROD   │
 │ abc1234 │       │ abc1234 │       │ def5678 │
 │ Healthy │       │Promoting│       │ Healthy │
 └─────────┘       └─────────┘       └─────────┘
              ✓                 ✗ security-scan FAILED
           PASSED               ~ e2e-tests PENDING
```

This mirrors the existing `RolloutVisualization` canary step-timeline pattern (horizontal cards with arrows), extended for multi-environment promotion.

---

## Navigation

New nav item under the GitOps section, gated on `PromotionStrategy` CRD existence:

```
GitOps
  Dashboard
  ArgoCD Instances
  Applications
  ApplicationSets
  Promotion Pipelines   ← NEW
  Rollouts
  AppProjects
  Settings
```

---

## Workflows

### Workflow 1: Track a commit through promotion (UC-1, UC-6)

**Trigger**: Developer pushes commit `abc1234`.

**Path A — from the Application detail page:**
1. Developer opens **Applications > myapp > Overview**
2. The **PromotionBanner** appears after ConditionsBanner:
   ```
   [info] Promotion: dev → staging in progress | integration-tests running    [View Pipeline →]
   ```
3. Banner updates live via K8s watch as CommitStatus resources change phase
4. Once all environments reach Healthy: banner switches to `variant=success`: "All environments healthy"

**Path B — from the Promotion Pipelines list:**
1. Developer opens **GitOps > Promotion Pipelines**, searches by name
2. List shows: `myapp | dev → stg → prod | Promoting | Active: staging`
3. Click into detail → **Pipeline Visualization** renders the horizontal card chain:
   ```
    [DEV abc1234 Healthy] ──✓── [STAGING abc1234 Promoting] ──~── [PROD def5678 Healthy]
   ```
4. K8s watches update in real-time: gate goes green, PR auto-merges, commit advances
5. Eventually all three stages show `Healthy` with the same SHA

**Path C — from the Application Promotion tab:**
1. Developer clicks **Applications > myapp > Promotion** tab
2. Full pipeline visualization scoped to this app's PromotionStrategy
3. Same real-time updates as Path B

**What the developer sees at each zoom level:**
| Level | Surface | Information density |
|-------|---------|-------------------|
| Dashboard | Promotion Activity row | "2 blocked, 12 total" — fleet glance |
| List | PromotionListPage | Per-pipeline: name, env chain, status, active env |
| Banner | Application OverviewTab | One-line: "staging→prod blocked: security-scan failed" |
| Pipeline | Pipeline Visualization | Per-stage: SHA, status, gate checks, PR links |
| Gate | GateDetailPanel | Per-check: phase, PipelineRun link, retry/approve actions |
| Logs | Tekton PipelineRun page | Full CI output (delegated to OpenShift Pipelines plugin) |

---

### Workflow 2: Diagnose and fix a blocked promotion (UC-2, UC-4)

**Trigger**: A Tekton PipelineRun fails, writing `phase: failure` to a CommitStatus CR.

**Step 1 — Discovery (multiple entry points):**
- **Dashboard**: "2 Blocked Promotions" counter turns red → click "View All"
- **Application OverviewTab**: PromotionBanner turns `variant=danger`: "Promotion blocked: security-scan failed (staging → prod)"
- **Promotion list**: Status column shows red "blocked" label

**Step 2 — Navigate to the pipeline detail:**
- Click the pipeline name from list, or "View Pipeline" from banner

**Step 3 — Identify the blocked gate:**
- Pipeline visualization highlights the blocked gate with red border:
  ```
   [DEV Healthy] ──✓── [STAGING Promoting] ──✗── [PROD Healthy]
                                              security-scan
  ```

**Step 4 — Expand gate detail:**
- Click the gate connector → **GateDetailPanel** expands below the pipeline:

```
┌── Gate: staging → prod ──────────────────────────────────────────┐
│ PR #42: "Promote abc1234 to prod"           [Open in GitHub →]   │
│                                                                  │
│ Proposed Checks (must pass before merge):                        │
│ ┌──────────────────┬─────────┬──────────────────┬──────────────┐ │
│ │ Check            │ Status  │ Details          │ Actions      │ │
│ ├──────────────────┼─────────┼──────────────────┼──────────────┤ │
│ │ security-scan    │ FAILED  │ View Logs →      │ [Retry]      │ │
│ │ e2e-tests        │ PENDING │ View Logs →      │              │ │
│ │ smoke-tests      │ SUCCESS │ View Logs →      │              │ │
│ └──────────────────┴─────────┴──────────────────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────-┘
```

**Step 5 — Investigate:**
- Click **"View Logs"** → navigates to `/k8s/ns/{ns}/tekton.dev~v1~PipelineRun/{name}` (OpenShift Pipelines plugin's log viewer — no duplication)
- Developer reads the failure output, identifies the issue

**Step 6 — Resolve (two paths):**
- **Fix and re-push**: Developer fixes the code, pushes a new commit. GitOps Promoter detects the new SHA, Tekton runs again, CommitStatus updates.
- **Retry transient failure**: Click **"Retry"** → ConfirmModal: "Retry the security-scan check? This will reset the commit status to pending." → Patches `CommitStatus.spec.phase` to `pending` → Tekton integration controller re-triggers the PipelineRun.

**Step 7 — Verify resolution:**
- Pipeline visualization updates live: gate goes from red ✗ to spinner ~ to green ✓
- PR auto-merges (if `autoMerge: true`), commit advances to prod
- Dashboard blocked count decrements

---

### Workflow 3: Manual approval gate (UC-3)

**Trigger**: A promotion reaches an environment boundary with a manual approval gate (CommitStatus with `phase: pending` and no `spec.url`).

1. Developer sees gate detail shows: `prod-approval | PENDING | Manual check | [Approve]`
2. Click **"Approve"** → ConfirmModal: "Manually approve the prod-approval check? This will mark the commit status as successful."
3. Confirm → patches `CommitStatus.spec.phase` to `success`
4. ChangeTransferPolicy sees all proposed checks green → merges the PR
5. Commit lands in prod

**Why no URL = manual check**: CommitStatus resources with no `spec.url` have no CI system behind them. The UI shows "Manual check" instead of "View Logs", and offers "Approve" instead of "Retry". This covers the use case where a human must sign off (change management, compliance review, QA sign-off).

---

### Workflow 4: Set up a new promotion pipeline (UC-5)

**Persona**: Platform engineer configuring promotion for a new application.

1. Navigate to **GitOps > Promotion Pipelines > Create Pipeline**
2. **Wizard Step 1 — Repository**:
   - Enter pipeline name (e.g., `api-service-promotion`)
   - Enter GitRepository CR reference name (e.g., `api-service-repo`)

3. **Wizard Step 2 — Environments**:
   ```
   [+ Add Environment]
   1. env/dev       [Auto-merge: ON]   [↑] [↓] [×]
   2. env/staging    [Auto-merge: ON]   [↑] [↓] [×]
   3. env/prod       [Auto-merge: OFF]  [↑] [↓] [×]
   ```
   - Reorder with arrow buttons, remove with ×
   - Minimum 2 environments enforced
   - `Auto-merge: OFF` for prod = PR stays open until all checks pass AND a human merges

4. **Wizard Step 3 — Gates**:
   ```
   Proposed checks (before merge):     Active checks (after merge):
   [security-scan          ] [×]       [integration-tests     ] [×]
   [e2e-tests              ] [×]       [soak-timer            ] [×]
   [+ Add check]                       [+ Add check]
   ```
   - **Proposed checks** = must pass on the candidate commit before the PR merges (CI gates)
   - **Active checks** = must pass on the already-merged commit before the NEXT environment's promotion begins (deployment health, soak timers)
   - Check keys are just strings — the Tekton CommitStatus controller maps these to PipelineRuns outside the UI

5. **Wizard Step 4 — Review**:
   - Shows summary of name, repo, environment chain, checks
   - Create → `k8sCreate` the PromotionStrategy CR
   - Redirect to the detail page

**Post-creation**: The promoter controller auto-creates ChangeTransferPolicy resources for each environment hop. The pipeline visualization renders immediately.

---

### Workflow 5: Fleet triage from the dashboard (UC-4)

**Persona**: Platform engineer managing 50+ promotion pipelines.

1. Open **GitOps > Dashboard**
2. **Promotion Activity** section shows:
   - **12** total pipelines
   - **2** blocked (red number — immediate visual alarm)
   - **Active Promotions** table: `web | stg→prod | FAILED | 45m`, `api | dev→stg | PENDING | 12m`
3. Click pipeline name → jumps to pipeline detail
4. Click "View All" → jumps to list page (optionally pre-filtered to Status: Blocked)
5. Triage each blocked pipeline using Workflow 2

**Zero data**: If no PromotionStrategies exist, the Promotion Activity section does not render at all — the dashboard looks exactly as it did before this feature.

---

### Workflow 6: CI-agnostic gate resolution (UC-7)

The gate detail panel works identically regardless of which CI system produced the CommitStatus:

| CI System | CommitStatus.spec.url | "View Logs" behavior |
|-----------|----------------------|---------------------|
| Tekton Pipelines | `/k8s/ns/.../tekton.dev~v1~PipelineRun/...` | Navigates to OpenShift Pipelines log viewer |
| GitHub Actions | `https://github.com/org/repo/actions/runs/123` | Opens external link in new tab |
| Jenkins | `https://jenkins.example.com/job/.../456` | Opens external link in new tab |
| GitLab CI | `https://gitlab.com/org/repo/-/jobs/789` | Opens external link in new tab |
| Manual gate | *(no URL)* | Shows "Manual check" + "Approve" button |

The UI never imports Tekton types or watches PipelineRun resources directly. The `CommitStatus.spec.url` is the sole integration point — a simple string link.

---

## Application Detail Integration

Two touch-points on the existing Application detail page:

### PromotionBanner (OverviewTab)
Rendered after `ConditionsBanner`, matched by comparing `app.spec.source.repoURL` against PromotionStrategy's `spec.gitRepositoryRef`. Shows current stage, next stage, status, and a link to the pipeline detail.

```
variant=success: "All environments healthy"
variant=info:    "Promotion: staging → prod in progress"
variant=warning: "Promotion: staging → prod — checks pending"
variant=danger:  "Promotion blocked: security-scan failed"
```

If no PromotionStrategy matches this app — banner does not render (graceful).

### Promotion Tab (new horizontal nav tab)
Shows the full pipeline visualization scoped to this app's PromotionStrategy. EmptyState if none exists: "No promotion pipeline configured for this application."

---

## Dashboard Integration

New row in the GitOps dashboard, gated on PromotionStrategy CRD. If no PromotionStrategies exist, the section does not render.

```
┌── Promotion Activity ────────────────────────────────────────────────┐
│ ┌─ span=3 ──┐  ┌─ span=3 ──┐  ┌─ span=6 ─────────────────────────┐ │
│ │ Pipelines │  │  Blocked  │  │ Active Promotions                │ │
│ │    12     │  │    2      │  │ web  | stg→prod | FAILED  | 45m  │ │
│ │           │  │   (red)   │  │ api  | dev→stg  | PENDING | 12m  │ │
│ │[View All] │  │[View All] │  │              [View All →]        │ │
│ └───────────┘  └───────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Data derived entirely from PromotionStrategy `status.environments[]` — no Prometheus queries needed.

---

## Hydrator Metadata Integration

The Argo CD Source Hydrator (or a custom hydrator) renders DRY manifests into hydrated environment branches. Each hydrated commit carries a `hydrator.metadata` JSON file with commit provenance. GitOps Promoter exposes this through `CommitBranchState.dry` and `CommitBranchState.hydrated` SHA fields, plus optional `note` metadata.

### What the UI surfaces

**EnvironmentStageCard** — shows both SHAs when they differ:
```
┌─────────────┐
│   STAGING   │
│ dry: abc1234│  ← what the developer authored
│ hyd: def5678│  ← what was rendered & deployed
│  Promoting  │
└─────────────┘
```
When `dry === hydrated` (or hydrated is absent), show only one SHA.

**GateDetailPanel — Commit Details section**:
```
Commit: abc1234 (dry) → def5678 (hydrated)
Author: alice@example.com
Message: fix: update API handler
Pushed: 3 hours ago
```
Sourced from `HydratorMetadata` on the `CommitBranchState.note` field (`author`, `subject`, `date`).

### What the UI does NOT do

- Does not trigger or manage hydration — that's Argo CD's source hydrator or a custom CI job
- Does not interact with the commit server
- Does not watch hydrator-specific CRDs — all data comes from PromotionStrategy/CTP status

### Use Case

**UC-9: Hydration Traceability** — As a developer, when I see a promotion is blocked, I want to know which DRY commit produced the hydrated manifests being promoted, who authored it, and what the commit message was — so I can trace back to the source change without leaving the console.

---

## Graceful Degradation

| Condition | Behavior |
|-----------|----------|
| GitOps Promoter CRDs not installed | All promotion UI hidden (console.flag/model) |
| Tekton CRDs not installed | Gate detail works but "View Logs" disabled; "Retry" still patches CommitStatus |
| Both installed, no data | EmptyState on list page; dashboard section hidden; banner hidden |
| CommitStatus has no URL | Shown as "Manual check" with Approve button instead of Logs |

---

## Key Design Decisions

1. **Linear pipeline, not topology graph** — Promotion is linear (dev→stg→prod). Using PatternFly Topology (like ResourceTreeTab) would add complexity without benefit. The horizontal card chain from RolloutVisualization is the right pattern.

2. **Gate detail as inline panel, not modal** — When debugging a blocked promotion, the user needs to see the pipeline AND the gate details simultaneously. Inline panel below preserves context.

3. **Tekton join via CommitStatus.spec.url** — The UI reads CommitStatus CRs. If `spec.url` points to a PipelineRun, "View Logs" links to the Tekton plugin's viewer. If it points to GitHub Actions or Jenkins, the link still works. Zero Tekton-specific coupling in the UI.

4. **Retry = patch CommitStatus to pending** — The UI stays decoupled from Tekton internals. The integration controller (not the UI) decides how to re-trigger the pipeline.

5. **PromotionBanner on OverviewTab** — Highest-traffic location for developers. Compact, non-intrusive, actionable.

---

## File Organization

```
src/
  models/promoter.ts                    — K8s models for Promoter CRDs
  types/promoter.ts                     — TS interfaces
  hooks/
    usePromotionStrategies.ts           — Watch PromotionStrategy list
    useChangeTransferPolicies.ts        — Watch CTP resources
    useCommitStatuses.ts                — Watch CommitStatus resources
    usePromotionStatus.ts               — Derived pipeline status computation
  utils/promotion.ts                    — Status derivation, env label formatting
  components/
    Promotion/
      PromotionListPage.tsx             — DataView list (pattern: ApplicationListPage)
      PromotionDetailPage.tsx           — Pipeline detail with visualization
      PipelineVisualization.tsx          — Horizontal env chain (pattern: RolloutVisualization)
      EnvironmentStageCard.tsx           — Single stage card
      GateConnector.tsx                 — Gate indicator between stages
      GateDetailPanel.tsx               — Expanded gate with CommitStatus table
      CommitStatusRow.tsx               — Row with Tekton link/retry/approve
      PromotionBanner.tsx               — Banner for Application OverviewTab
    PromotionCreate/
      PromotionCreatePage.tsx           — 3-step wizard
    ApplicationDetail/
      PromotionTab.tsx                  — Pipeline viz scoped to one app
  actions/PromotionActions.ts           — Retry, approve actions
```

**Reuse**: RolloutVisualization patterns (card chain CSS), ApplicationListPage (DataView), ApplicationCreatePage (wizard), ConfirmModal (destructive actions), SyncStatusIcon/HealthStatusIcon patterns (status display).

---

## Verification

1. Install GitOps Promoter CRDs on a test cluster → confirm nav item appears
2. Remove CRDs → confirm all promotion UI disappears cleanly
3. Create a PromotionStrategy → verify list page, detail pipeline visualization
4. Push a commit through the chain → verify real-time status updates via K8s watches
5. Trigger a CommitStatus failure → verify gate shows BLOCKED, drill into Tekton logs
6. Test Retry and manual Approve flows
7. Verify dashboard row renders with active promotions, hides when empty
8. Run `npm test` — 99 suites, 530+ tests passing
9. Run `npm run build` — production build succeeds
10. Run `./e2e/promotion-e2e.sh` — 13 checks passing

---

## Implementation Status (as built)

### What's deployed and working

| Component | Status | Notes |
|-----------|--------|-------|
| Promotion Pipelines list page | Working | DataView with filters, pagination |
| Pipeline detail + visualization | Working | Horizontal card chain, click-to-expand gates and stages |
| Gate detail panel | Working | CommitStatus table, approve/retry with ConfirmModal, success/error alerts |
| Environment detail panel | Working | Active/proposed SHAs as links, hydrator metadata, promotion history, related apps |
| PromotionBanner on Application OverviewTab | Working | Matches by repo path, graceful degradation |
| Promotion tab on Application detail | Working | Uses shared `useMatchingStrategy` hook |
| Dashboard Promotion Activity section | Working | Pipeline count, blocked count, active promotions table |
| Create Pipeline wizard | Working | 3-step wizard: repo, envs, gates |
| Stuck detection | Working | 30-minute threshold, warning on stage card + gate detail |
| Toast notifications | Working | Auto-dismiss on gate state changes |
| Live indicator | Working | Pulsing sync icon in pipeline header |
| Commit links | Working | SHA links to GitHub commit pages |
| Timestamps on stage cards | Working | PR age for promoting, commit time for healthy |
| E2E test | 13/13 passing | Prerequisites, health, push, hydrator, promoter, PRs, plugin |

### Infrastructure on cluster

- GitOps Promoter v0.27.1 — controller running in `promoter-system`
- GitHub App (ID 4153635) — ScmProvider `github` + GitRepository `example-apps`
- Fork: `alimobrem/argocd-example-apps` with `env/{dev,staging,prod}` + `-next` branches
- 3 per-environment Applications: `guestbook-{dev,staging,prod}` — all Synced/Healthy
- `ArgoCDCommitStatus` CR watching app health
- GitHub Actions custom hydrator workflow (renders kustomize → pushes to `-next` branches)
- GitHub Actions promotion checks workflow (reports commit statuses on `-next` pushes)
- OpenShift Pipelines (Tekton) v1.22.3 — Pipeline + Tasks for integration tests
- Console plugin deployed (revision 100+)

### Known limitations

1. **CommitStatus label requirement (resolved)** — The CTP controller finds CommitStatus CRs via K8s label selector (`promoter.argoproj.io/commit-status: <key>`), not by querying GitHub. Initially misdiagnosed as an upstream bug — was actually a missing label on manually created CRs. Fixed in `useCommitStatusMutation` hook and Tekton `report-commit-status` Task.

2. **Argo CD source hydrator not in OpenShift GitOps** — The `argocd-commit-server` binary is not included in the Red Hat OpenShift GitOps operator image (as of v1.21.0). The `sourceHydrator` Application spec field is available in Argo CD 3.x but non-functional without the commit-server. Workaround: use a custom hydrator (GitHub Actions workflow).

3. **Approve flow now works end-to-end** — Fixed by adding the `promoter.argoproj.io/commit-status` label to CommitStatus CRs created by the UI. The CTP controller finds them immediately and advances the pipeline.

### Lessons learned

- **The promoter controller reads from GitHub, not from K8s CRs** — The CTP controller queries the SCM (GitHub Checks API) for commit status, not CommitStatus CRs directly. CommitStatus CRs are a write-through mechanism: CR → controller → GitHub → CTP reads from GitHub.
- **`hydrator.metadata` is required on every hydrated commit** — Without it, the CTP controller logs "hydrator.metadata file not found" and can't compute dry SHAs.
- **Every push to a `-next` branch changes the SHA** — Creating check runs for one SHA, then pushing again, orphans those check runs. Don't push to `-next` branches after creating CommitStatus CRs.
- **PF6 `EmptyStateIcon` was removed** — PatternFly 6 doesn't export `EmptyStateIcon`. Use `EmptyState` directly.
- **PF6 `isSmall` deprecated** — Use `size="sm"` instead.
- **`console.flag/model` drives nav visibility** — The console won't show the "Promotion Pipelines" nav item until the PromotionStrategy CRD exists on the cluster. Console pods may need restart after CRD installation.
- **Operator-managed configmaps can't be patched** — The `argocd-cmd-params-cm` is owned by the ArgoCD CR. Manual patches get overwritten. Use `spec.controller.env` or `spec.server.env` on the ArgoCD CR instead.
- **GitHub App required, not PAT** — The ScmProvider CRD requires a GitHub App (appID + installationID + private key). OAuth tokens and PATs are not supported.
