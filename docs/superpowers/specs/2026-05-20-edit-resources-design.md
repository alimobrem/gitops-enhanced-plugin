# Editing GitOps Resources — OCP-Aligned Pattern

## Goal

Replace the non-standard "Configuration" tab on Application detail pages with the standard OCP editing pattern: a YAML tab for full resource editing plus focused edit actions in the Actions dropdown menu. Apply this pattern consistently across all GitOps resources.

## Resources Affected

- Application (remove Configuration tab, add YAML tab + edit actions)
- ApplicationSet (add YAML tab + edit actions)
- AppProject (add YAML tab + edit actions)
- Rollout (add YAML tab + edit actions — future when detail page exists)

## Design

### YAML Tab

Every resource detail page gets a "YAML" tab that:
- Renders the full resource YAML using a `<pre>` with syntax highlighting (no Monaco — can't bundle it due to PF version conflicts)
- Has an "Edit" button that navigates to the console's built-in YAML editor at `/k8s/ns/{ns}/{gvk}/{name}/yaml`
- Read-only by default to prevent accidental changes

### Focused Edit Actions (Actions Dropdown)

Add resource-specific edit actions to the Actions dropdown on detail pages:

**Application:**
- Edit YAML → navigates to console YAML editor
- Edit labels → focused modal
- Edit annotations → focused modal

**ApplicationSet:**
- Edit YAML
- Edit labels
- Edit annotations

**AppProject:**
- Edit YAML
- Edit labels
- Edit annotations

### Row-Level Actions

List page kebab menus already have Sync/Refresh/Delete. No change needed — "Edit" can be accessed from the detail page.

### What Gets Removed

- `src/components/ApplicationDetail/EditTab.tsx` — the Configuration tab component
- `src/components/ApplicationDetail/EditTab.test.tsx` — its test
- The `Configuration` tab entry in `ApplicationDetailPage.tsx`
- The `Edit` i18n key (replaced by resource-specific keys)

### What Gets Added

- `src/components/shared/YamlTab.tsx` — reusable YAML display tab
- `src/components/shared/EditLabelsModal.tsx` — modal for editing labels
- `src/components/shared/EditAnnotationsModal.tsx` — modal for editing annotations
- YAML tab added to: ApplicationDetailPage, ApplicationSetDetailPage, AppProjectDetailPage
- Edit actions added to: ActionsMenu (Applications), and new action menus on other detail pages

## Verification

- All detail pages show YAML tab with full resource content
- "Edit YAML" action navigates to console's built-in editor
- Edit labels/annotations modals save via k8sPatch
- Configuration tab is removed
- All tests pass
- i18n completeness test passes
