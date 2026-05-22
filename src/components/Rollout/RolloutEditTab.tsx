import React from 'react';
import { useState, useMemo, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Form, FormGroup, TextInput, ActionGroup, Button, Alert, NumberInput,
  Card, CardTitle, CardBody, Grid, GridItem, Checkbox,
  HelperText, HelperTextItem, FormHelperText, Select, SelectOption, SelectList, MenuToggle,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { ConfirmModal } from '../shared/ConfirmModal';
import { RolloutModel } from '../../models';
import type { RolloutResource } from '../../types';
import { safePatch, type PatchOp } from '../../utils/patch';

export const RolloutEditTab: FC<{ rollout: RolloutResource }> = ({ rollout }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const container = rollout.spec.template?.spec?.containers?.[0];
  const canary = rollout.spec.strategy?.canary;
  const blueGreen = rollout.spec.strategy?.blueGreen;
  const isCanary = !!canary;
  const isBlueGreen = !!blueGreen;

  const init = useMemo(() => ({
    replicas: rollout.spec.replicas ?? 1,
    revisionHistoryLimit: rollout.spec.revisionHistoryLimit ?? 10,
    minReadySeconds: rollout.spec.minReadySeconds ?? 0,
    progressDeadlineSeconds: rollout.spec.progressDeadlineSeconds ?? 600,
    image: container?.image ?? '',
    containerPort: container?.ports?.[0]?.containerPort ?? 80,
    maxSurge: String(canary?.maxSurge ?? '25%'),
    maxUnavailable: String(canary?.maxUnavailable ?? '25%'),
    stableService: canary?.stableService ?? '',
    canaryService: canary?.canaryService ?? '',
    steps: canary?.steps ? [...canary.steps] : [],
    activeService: blueGreen?.activeService ?? '',
    previewService: blueGreen?.previewService ?? '',
    autoPromotionEnabled: blueGreen?.autoPromotionEnabled ?? true,
    autoPromotionSeconds: blueGreen?.autoPromotionSeconds ?? 0,
    scaleDownDelaySeconds: blueGreen?.scaleDownDelaySeconds ?? 30,
    previewReplicaCount: blueGreen?.previewReplicaCount ?? 0,
  }), [rollout.metadata.uid]);

  const [replicas, setReplicas] = useState(init.replicas);
  const [revisionHistoryLimit, setRevisionHistoryLimit] = useState(init.revisionHistoryLimit);
  const [minReadySeconds, setMinReadySeconds] = useState(init.minReadySeconds);
  const [progressDeadlineSeconds, setProgressDeadlineSeconds] = useState(init.progressDeadlineSeconds);
  const [image, setImage] = useState(init.image);
  const [containerPort, setContainerPort] = useState(init.containerPort);

  const [maxSurge, setMaxSurge] = useState(init.maxSurge);
  const [maxUnavailable, setMaxUnavailable] = useState(init.maxUnavailable);
  const [stableService, setStableService] = useState(init.stableService);
  const [canaryService, setCanaryService] = useState(init.canaryService);
  const [steps, setSteps] = useState<Array<Record<string, unknown>>>(init.steps);

  const [activeService, setActiveService] = useState(init.activeService);
  const [previewService, setPreviewService] = useState(init.previewService);
  const [autoPromotionEnabled, setAutoPromotionEnabled] = useState(init.autoPromotionEnabled);
  const [autoPromotionSeconds, setAutoPromotionSeconds] = useState(init.autoPromotionSeconds);
  const [scaleDownDelaySeconds, setScaleDownDelaySeconds] = useState(init.scaleDownDelaySeconds);
  const [previewReplicaCount, setPreviewReplicaCount] = useState(init.previewReplicaCount);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stepTypeOpen, setStepTypeOpen] = useState(false);

  const imageValid = image.trim().length > 0;
  const formValid = imageValid;

  const stepsKey = useMemo(() => JSON.stringify(steps), [steps]);
  const initStepsKey = useMemo(() => JSON.stringify(init.steps), [init.steps]);

  const isDirty = useMemo(() =>
    replicas !== init.replicas
    || revisionHistoryLimit !== init.revisionHistoryLimit
    || minReadySeconds !== init.minReadySeconds
    || progressDeadlineSeconds !== init.progressDeadlineSeconds
    || image !== init.image
    || containerPort !== init.containerPort
    || (isCanary && (maxSurge !== init.maxSurge || maxUnavailable !== init.maxUnavailable
      || stableService !== init.stableService || canaryService !== init.canaryService
      || stepsKey !== initStepsKey))
    || (isBlueGreen && (activeService !== init.activeService || previewService !== init.previewService
      || autoPromotionEnabled !== init.autoPromotionEnabled || autoPromotionSeconds !== init.autoPromotionSeconds
      || scaleDownDelaySeconds !== init.scaleDownDelaySeconds || previewReplicaCount !== init.previewReplicaCount)),
  [replicas, revisionHistoryLimit, minReadySeconds, progressDeadlineSeconds, image, containerPort,
    maxSurge, maxUnavailable, stableService, canaryService, stepsKey, initStepsKey,
    activeService, previewService, autoPromotionEnabled, autoPromotionSeconds,
    scaleDownDelaySeconds, previewReplicaCount, init, isCanary, isBlueGreen]);

  const clearFeedback = () => { setError(''); setSuccess(false); };

  const resetForm = () => {
    setReplicas(init.replicas); setRevisionHistoryLimit(init.revisionHistoryLimit);
    setMinReadySeconds(init.minReadySeconds); setProgressDeadlineSeconds(init.progressDeadlineSeconds);
    setImage(init.image); setContainerPort(init.containerPort);
    setMaxSurge(init.maxSurge); setMaxUnavailable(init.maxUnavailable);
    setStableService(init.stableService); setCanaryService(init.canaryService);
    setSteps([...init.steps]);
    setActiveService(init.activeService); setPreviewService(init.previewService);
    setAutoPromotionEnabled(init.autoPromotionEnabled); setAutoPromotionSeconds(init.autoPromotionSeconds);
    setScaleDownDelaySeconds(init.scaleDownDelaySeconds); setPreviewReplicaCount(init.previewReplicaCount);
    clearFeedback();
  };

  const buildPatches = (): PatchOp[] => {
    const patches: PatchOp[] = [];
    const patchIf = (dirty: boolean, path: string, value: unknown) => {
      if (dirty) patches.push(safePatch(rollout, path, value));
    };

    patchIf(replicas !== init.replicas, '/spec/replicas', replicas);
    patchIf(revisionHistoryLimit !== init.revisionHistoryLimit, '/spec/revisionHistoryLimit', revisionHistoryLimit);
    patchIf(minReadySeconds !== init.minReadySeconds, '/spec/minReadySeconds', minReadySeconds);
    patchIf(progressDeadlineSeconds !== init.progressDeadlineSeconds, '/spec/progressDeadlineSeconds', progressDeadlineSeconds);
    patchIf(image !== init.image, '/spec/template/spec/containers/0/image', image);
    patchIf(containerPort !== init.containerPort, '/spec/template/spec/containers/0/ports/0/containerPort', containerPort);

    if (isCanary) {
      patchIf(maxSurge !== init.maxSurge, '/spec/strategy/canary/maxSurge', maxSurge);
      patchIf(maxUnavailable !== init.maxUnavailable, '/spec/strategy/canary/maxUnavailable', maxUnavailable);
      patchIf(stableService !== init.stableService, '/spec/strategy/canary/stableService', stableService);
      patchIf(canaryService !== init.canaryService, '/spec/strategy/canary/canaryService', canaryService);
      patchIf(stepsKey !== initStepsKey, '/spec/strategy/canary/steps', steps);
    }

    if (isBlueGreen) {
      patchIf(activeService !== init.activeService, '/spec/strategy/blueGreen/activeService', activeService);
      patchIf(previewService !== init.previewService, '/spec/strategy/blueGreen/previewService', previewService);
      patchIf(autoPromotionEnabled !== init.autoPromotionEnabled, '/spec/strategy/blueGreen/autoPromotionEnabled', autoPromotionEnabled);
      patchIf(autoPromotionSeconds !== init.autoPromotionSeconds, '/spec/strategy/blueGreen/autoPromotionSeconds', autoPromotionSeconds);
      patchIf(scaleDownDelaySeconds !== init.scaleDownDelaySeconds, '/spec/strategy/blueGreen/scaleDownDelaySeconds', scaleDownDelaySeconds);
      patchIf(previewReplicaCount !== init.previewReplicaCount, '/spec/strategy/blueGreen/previewReplicaCount', previewReplicaCount);
    }

    return patches;
  };

  const handleSave = async () => {
    setShowConfirm(false); setSaving(true); clearFeedback();
    try {
      await k8sPatch({ model: RolloutModel, resource: rollout, data: buildPatches() });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  const addStep = (type: string) => {
    setStepTypeOpen(false);
    clearFeedback();
    if (type === 'setWeight') setSteps([...steps, { setWeight: 20 }]);
    else setSteps([...steps, { pause: { duration: '30s' } }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
    clearFeedback();
  };

  const updateStep = (idx: number, value: unknown) => {
    const updated = [...steps];
    const key = Object.keys(updated[idx])[0];
    updated[idx] = { [key]: value };
    setSteps(updated);
    clearFeedback();
  };

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('Rollout updated')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      <Grid hasGutter className="pf-v6-u-mt-md">
        <GridItem span={6}>
          <Card><CardTitle>{t('Basics')}</CardTitle><CardBody><Form>
            <FormGroup label={t('Replicas')} fieldId="replicas">
              <NumberInput value={replicas} onMinus={() => { setReplicas(Math.max(1, replicas - 1)); clearFeedback(); }} onPlus={() => { setReplicas(replicas + 1); clearFeedback(); }} min={1} />
            </FormGroup>
            <FormGroup label={t('Revision History Limit')} fieldId="revisionHistoryLimit">
              <NumberInput value={revisionHistoryLimit} onMinus={() => { setRevisionHistoryLimit(Math.max(0, revisionHistoryLimit - 1)); clearFeedback(); }} onPlus={() => { setRevisionHistoryLimit(revisionHistoryLimit + 1); clearFeedback(); }} min={0} />
            </FormGroup>
            <FormGroup label={t('Min Ready Seconds')} fieldId="minReadySeconds">
              <NumberInput value={minReadySeconds} onMinus={() => { setMinReadySeconds(Math.max(0, minReadySeconds - 1)); clearFeedback(); }} onPlus={() => { setMinReadySeconds(minReadySeconds + 1); clearFeedback(); }} min={0} />
            </FormGroup>
            <FormGroup label={t('Progress Deadline Seconds')} fieldId="progressDeadlineSeconds">
              <NumberInput value={progressDeadlineSeconds} onMinus={() => { setProgressDeadlineSeconds(Math.max(0, progressDeadlineSeconds - 1)); clearFeedback(); }} onPlus={() => { setProgressDeadlineSeconds(progressDeadlineSeconds + 1); clearFeedback(); }} min={0} />
            </FormGroup>
          </Form></CardBody></Card>
        </GridItem>

        <GridItem span={6}>
          <Card><CardTitle>{t('Strategy')} — {isCanary ? t('Canary') : t('Blue-Green')}</CardTitle><CardBody><Form>
            {isCanary && (
              <>
                <FormGroup label={t('Max Surge')} fieldId="maxSurge">
                  <TextInput id="maxSurge" value={maxSurge} onChange={(_e, v) => { setMaxSurge(v); clearFeedback(); }} />
                  <FormHelperText><HelperText><HelperTextItem>e.g. &quot;25%&quot; or &quot;1&quot;</HelperTextItem></HelperText></FormHelperText>
                </FormGroup>
                <FormGroup label={t('Max Unavailable')} fieldId="maxUnavailable">
                  <TextInput id="maxUnavailable" value={maxUnavailable} onChange={(_e, v) => { setMaxUnavailable(v); clearFeedback(); }} />
                </FormGroup>
                <FormGroup label={t('Stable Service')} fieldId="stableService">
                  <TextInput id="stableService" value={stableService} onChange={(_e, v) => { setStableService(v); clearFeedback(); }} />
                </FormGroup>
                <FormGroup label={t('Canary Service')} fieldId="canaryService">
                  <TextInput id="canaryService" value={canaryService} onChange={(_e, v) => { setCanaryService(v); clearFeedback(); }} />
                </FormGroup>
                <FormGroup label={t('Canary Steps')} fieldId="steps">
                  {steps.map((step, i) => {
                    const key = Object.keys(step)[0];
                    return (
                      <div key={i} className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-mb-sm">
                        {key === 'setWeight' ? (
                          <NumberInput value={step.setWeight as number} onMinus={() => updateStep(i, Math.max(0, (step.setWeight as number) - 5))} onPlus={() => updateStep(i, Math.min(100, (step.setWeight as number) + 5))} min={0} max={100} />
                        ) : (
                          <TextInput value={typeof step.pause === 'object' ? ((step.pause as Record<string, string>).duration ?? '') : ''} onChange={(_e, v) => updateStep(i, { duration: v })} aria-label={`pause-${i}`} />
                        )}
                        <span className="pf-v6-u-ml-sm pf-v6-u-mr-md pf-v6-u-color-200">{key}</span>
                        <Button variant="plain" aria-label={t('Remove step')} onClick={() => removeStep(i)}><TrashIcon /></Button>
                      </div>
                    );
                  })}
                  <Select isOpen={stepTypeOpen} onSelect={(_e, val) => addStep(val as string)} onOpenChange={setStepTypeOpen}
                    toggle={(ref) => <MenuToggle ref={ref} onClick={() => setStepTypeOpen(!stepTypeOpen)} variant="secondary">{t('Add step')}</MenuToggle>}>
                    <SelectList>
                      <SelectOption value="setWeight">{t('Set Weight (%)')}</SelectOption>
                      <SelectOption value="pause">{t('Pause (seconds)')}</SelectOption>
                    </SelectList>
                  </Select>
                </FormGroup>
              </>
            )}
            {isBlueGreen && (
              <>
                <FormGroup label={t('Active Service')} fieldId="activeService">
                  <TextInput id="activeService" value={activeService} onChange={(_e, v) => { setActiveService(v); clearFeedback(); }} />
                </FormGroup>
                <FormGroup label={t('Preview Service')} fieldId="previewService">
                  <TextInput id="previewService" value={previewService} onChange={(_e, v) => { setPreviewService(v); clearFeedback(); }} />
                </FormGroup>
                <FormGroup label={t('Auto Promotion')} fieldId="autoPromotionEnabled">
                  <Checkbox id="autoPromotionEnabled" isChecked={autoPromotionEnabled} onChange={(_e, v) => { setAutoPromotionEnabled(v); clearFeedback(); }} label={t('Enabled')} />
                </FormGroup>
                <FormGroup label={t('Auto Promotion Seconds')} fieldId="autoPromotionSeconds">
                  <NumberInput value={autoPromotionSeconds} onMinus={() => { setAutoPromotionSeconds(Math.max(0, autoPromotionSeconds - 10)); clearFeedback(); }} onPlus={() => { setAutoPromotionSeconds(autoPromotionSeconds + 10); clearFeedback(); }} min={0} />
                </FormGroup>
                <FormGroup label={t('Scale Down Delay Seconds')} fieldId="scaleDownDelaySeconds">
                  <NumberInput value={scaleDownDelaySeconds} onMinus={() => { setScaleDownDelaySeconds(Math.max(0, scaleDownDelaySeconds - 10)); clearFeedback(); }} onPlus={() => { setScaleDownDelaySeconds(scaleDownDelaySeconds + 10); clearFeedback(); }} min={0} />
                </FormGroup>
                <FormGroup label={t('Preview Replica Count')} fieldId="previewReplicaCount">
                  <NumberInput value={previewReplicaCount} onMinus={() => { setPreviewReplicaCount(Math.max(0, previewReplicaCount - 1)); clearFeedback(); }} onPlus={() => { setPreviewReplicaCount(previewReplicaCount + 1); clearFeedback(); }} min={0} />
                </FormGroup>
              </>
            )}
          </Form></CardBody></Card>
        </GridItem>

        <GridItem span={12}>
          <Card><CardTitle>{t('Container')}</CardTitle><CardBody><Form isHorizontal>
            <FormGroup label={t('Image')} isRequired fieldId="image">
              <TextInput id="image" isRequired validated={imageValid ? 'default' : 'error'} value={image} onChange={(_e, v) => { setImage(v); clearFeedback(); }} />
              {!imageValid && <FormHelperText><HelperText><HelperTextItem variant="error">{t('Image is required')}</HelperTextItem></HelperText></FormHelperText>}
            </FormGroup>
            <FormGroup label={t('Container Port')} fieldId="containerPort">
              <NumberInput value={containerPort} onMinus={() => { setContainerPort(Math.max(1, containerPort - 1)); clearFeedback(); }} onPlus={() => { setContainerPort(containerPort + 1); clearFeedback(); }} min={1} max={65535} />
            </FormGroup>
          </Form></CardBody></Card>
        </GridItem>
      </Grid>
      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving || !formValid || !isDirty}>{t('Save')}</Button>
        <Button variant="link" onClick={resetForm} isDisabled={!isDirty}>{t('Cancel')}</Button>
      </ActionGroup>
      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: rollout.metadata.name })}
      </ConfirmModal>
    </>
  );
};
