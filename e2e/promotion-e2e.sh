#!/bin/bash
set -euo pipefail

REPO="alimobrem/argocd-example-apps"
NS="openshift-gitops"
STRATEGY="guestbook-promotion"
PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }
info() { echo "  ℹ️  $1"; }

echo "=== GitOps Promoter E2E Test ==="
echo ""

# Step 1: Verify prerequisites
echo "--- Step 1: Prerequisites ---"
oc get promotionstrategy "$STRATEGY" -n "$NS" --no-headers >/dev/null 2>&1 && pass "PromotionStrategy exists" || fail "PromotionStrategy missing"
oc get gitrepository example-apps -n "$NS" --no-headers >/dev/null 2>&1 && pass "GitRepository exists" || fail "GitRepository missing"
oc get scmprovider github -n "$NS" --no-headers >/dev/null 2>&1 && pass "ScmProvider exists" || fail "ScmProvider missing"

for ENV in dev staging prod; do
  oc get application.argoproj.io "guestbook-${ENV}" -n "$NS" --no-headers >/dev/null 2>&1 && pass "Application guestbook-${ENV} exists" || fail "Application guestbook-${ENV} missing"
done

echo ""

# Step 2: Check application health
echo "--- Step 2: Application Health ---"
for ENV in dev staging prod; do
  HEALTH=$(oc get application.argoproj.io "guestbook-${ENV}" -n "$NS" -o jsonpath='{.status.health.status}')
  SYNC=$(oc get application.argoproj.io "guestbook-${ENV}" -n "$NS" -o jsonpath='{.status.sync.status}')
  if [ "$HEALTH" = "Healthy" ] && [ "$SYNC" = "Synced" ]; then
    pass "guestbook-${ENV}: ${SYNC}/${HEALTH}"
  else
    fail "guestbook-${ENV}: ${SYNC}/${HEALTH} (expected Synced/Healthy)"
  fi
done

echo ""

# Step 3: Push a change and trigger hydration
echo "--- Step 3: Push change to master ---"
TIMESTAMP=$(date +%s)
MARKER_CONTENT=$(echo "e2e-test-${TIMESTAMP}" | base64)

# Check if file exists first
EXISTING_SHA=$(gh api "repos/${REPO}/contents/e2e-marker.txt" --jq '.sha' 2>/dev/null || echo "")
if [ -n "$EXISTING_SHA" ]; then
  gh api "repos/${REPO}/contents/e2e-marker.txt" \
    -X PUT -f message="e2e: marker ${TIMESTAMP}" \
    -f content="${MARKER_CONTENT}" \
    -f sha="${EXISTING_SHA}" \
    -f branch=master --jq '.commit.sha' 2>&1
else
  gh api "repos/${REPO}/contents/e2e-marker.txt" \
    -X PUT -f message="e2e: marker ${TIMESTAMP}" \
    -f content="${MARKER_CONTENT}" \
    -f branch=master --jq '.commit.sha' 2>&1
fi
PUSH_SHA=$(gh api "repos/${REPO}/git/refs/heads/master" --jq '.object.sha')
info "Pushed commit: ${PUSH_SHA:0:7}"

echo ""

# Step 4: Wait for hydrator to push to -next branches
echo "--- Step 4: Wait for hydrator (up to 3 minutes) ---"
HYDRATOR_OK=false
for i in $(seq 1 18); do
  # Check if GitHub Actions hydrator workflow completed
  STATUS=$(gh run list --repo "$REPO" --workflow=hydrator.yaml --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "")
  if [ "$STATUS" = "success" ]; then
    HYDRATOR_OK=true
    break
  fi
  info "Waiting for hydrator... (${i}/18)"
  sleep 10
done

if $HYDRATOR_OK; then
  pass "Hydrator workflow completed"
else
  fail "Hydrator workflow did not complete in 3 minutes"
fi

echo ""

# Step 5: Wait for promoter to detect new commits
echo "--- Step 5: Wait for promoter to reconcile (up to 2 minutes) ---"
PROMOTER_OK=false
for i in $(seq 1 12); do
  PROPOSED_SHA=$(oc get promotionstrategy "$STRATEGY" -n "$NS" \
    -o jsonpath='{.status.environments[0].proposed.dry.sha}' 2>/dev/null || echo "")
  if [ -n "$PROPOSED_SHA" ] && [ "$PROPOSED_SHA" != "" ]; then
    info "Proposed SHA: ${PROPOSED_SHA:0:7}"
    PROMOTER_OK=true
    break
  fi
  info "Waiting for promoter... (${i}/12)"
  sleep 10
done

if $PROMOTER_OK; then
  pass "Promoter detected new commits"
else
  fail "Promoter did not detect new commits"
fi

echo ""

# Step 6: Check pipeline state
echo "--- Step 6: Pipeline State ---"
oc get promotionstrategy "$STRATEGY" -n "$NS" \
  -o jsonpath='{range .status.environments[*]}  {.branch}{"\t"}{.pullRequest.state}{"\t"}{range .proposed.commitStatuses[*]}{.key}={.phase} {end}{"\n"}{end}' 2>&1

READY=$(oc get promotionstrategy "$STRATEGY" -n "$NS" -o jsonpath='{.status.conditions[0].status}')
REASON=$(oc get promotionstrategy "$STRATEGY" -n "$NS" -o jsonpath='{.status.conditions[0].reason}')
if [ "$READY" = "True" ]; then
  pass "PromotionStrategy Ready: ${REASON}"
else
  fail "PromotionStrategy not ready: ${REASON}"
fi

echo ""

# Step 7: Check PRs on GitHub
echo "--- Step 7: GitHub PRs ---"
PR_COUNT=$(gh pr list --repo "$REPO" --state open --json number --jq '. | length' 2>/dev/null || echo "0")
info "Open PRs: ${PR_COUNT}"
gh pr list --repo "$REPO" --state open --limit 5 2>&1 | head -5

echo ""

# Step 8: Check console plugin
echo "--- Step 8: Console Plugin ---"
PLUGIN_POD=$(oc get pods -n gitops-enhanced-plugin --no-headers --field-selector=status.phase=Running -o name 2>/dev/null | head -1)
if [ -n "$PLUGIN_POD" ]; then
  pass "Console plugin running"
else
  fail "Console plugin not running"
fi

echo ""
echo "=== Results ==="
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "❌ E2E test FAILED"
  exit 1
else
  echo "✅ E2E test PASSED"
  exit 0
fi
