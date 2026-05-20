# Editing GitOps Resources — Dual Pattern

## Goal

Add editing capability to all GitOps resource detail pages using two complementary patterns:
1. **Configuration tab** — form-based editing for common fields (quick edits for most users)
2. **"Edit YAML" action** — link to console's native YAML editor in Actions menu (full control for power users)

## Resources

### Application (already has Configuration tab)
- Keep existing Configuration tab (source, destination, sync policy)
- Add "Edit YAML" to Actions menu → navigates to `/k8s/ns/{ns}/argoproj.io~v1alpha1~Application/{name}/yaml`

### ApplicationSet (needs Configuration tab)
- **Fields:** generators config, template name, source repo/path/revision, destination, sync policy
- Add "Edit YAML" to Actions menu

### AppProject (needs Configuration tab)
- **Fields:** description, source repos (add/remove), destinations (add/remove), sync windows
- Add "Edit YAML" to Actions menu

### Rollout (needs Configuration tab)
- **Fields:** replicas, strategy (canary steps / blue-green services), image
- Add "Edit YAML" to Actions menu

## Implementation

### New files
- `src/components/ApplicationSet/ApplicationSetEditTab.tsx`
- `src/components/AppProject/AppProjectEditTab.tsx`
- `src/components/Rollout/RolloutEditTab.tsx` (once detail page exists)

### Modified files
- `ApplicationDetailPage.tsx` — add "Edit YAML" to ActionsMenu
- `ApplicationSetDetailPage.tsx` — add Configuration tab + Edit YAML action
- `AppProjectDetailPage.tsx` — add Configuration tab + Edit YAML action
- `ActionsMenu.tsx` — add "Edit YAML" action

### Edit YAML Action
Navigates to: `/k8s/ns/{namespace}/{group}~{version}~{kind}/{name}/yaml`
This is the console's built-in YAML editor page — Monaco with schema validation.

## Verification
- All detail pages have Configuration tab
- "Edit YAML" in Actions menu opens native console editor
- Form saves via k8sPatch
- Tests for each edit tab
