import React from 'react';
import { useState, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Form, FormGroup, TextInput, ActionGroup, Button, Alert, NumberInput,
  Card, CardTitle, CardBody, Grid, GridItem,
  HelperText, HelperTextItem, FormHelperText,
} from '@patternfly/react-core';
import { ConfirmModal } from '../shared/ConfirmModal';
import { RolloutModel } from '../../models';
import type { RolloutResource } from '../../types';
import { safePatch } from '../../utils/patch';


export const RolloutEditTab: FC<{ rollout: RolloutResource }> = ({ rollout }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const container = rollout.spec.template?.spec?.containers?.[0];

  const init = { replicas: rollout.spec.replicas ?? 1, image: container?.image ?? '' };

  const [replicas, setReplicas] = useState(init.replicas);
  const [image, setImage] = useState(init.image);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const imageValid = image.trim().length > 0;
  const formValid = imageValid;
  const isDirty = replicas !== init.replicas || image !== init.image;

  const clearFeedback = () => { setError(''); setSuccess(false); };
  const resetForm = () => { setReplicas(init.replicas); setImage(init.image); clearFeedback(); };

  const handleSave = async () => {
    setShowConfirm(false); setSaving(true); clearFeedback();
    try {
      const res = rollout as unknown as Record<string, unknown>;
      await k8sPatch({
        model: RolloutModel,
        resource: rollout,
        data: [
          safePatch(res, '/spec/replicas', replicas),
          safePatch(res, '/spec/template/spec/containers/0/image', image),
        ],
      });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('Rollout updated')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      <Grid hasGutter>
        <GridItem span={6}>
          <Card><CardTitle>{t('Basics')}</CardTitle><CardBody><Form>
            <FormGroup label={t('Replicas')} fieldId="replicas">
              <NumberInput value={replicas} onMinus={() => { setReplicas(Math.max(1, replicas - 1)); clearFeedback(); }} onPlus={() => { setReplicas(replicas + 1); clearFeedback(); }} min={1} />
            </FormGroup>
          </Form></CardBody></Card>
        </GridItem>
        <GridItem span={6}>
          <Card><CardTitle>{t('Container')}</CardTitle><CardBody><Form>
            <FormGroup label={t('Image')} isRequired fieldId="image">
              <TextInput id="image" isRequired validated={imageValid ? 'default' : 'error'} value={image} onChange={(_e, v) => { setImage(v); clearFeedback(); }} />
              {!imageValid && <FormHelperText><HelperText><HelperTextItem variant="error">{t('Image is required')}</HelperTextItem></HelperText></FormHelperText>}
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
