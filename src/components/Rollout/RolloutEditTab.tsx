import React from 'react';
import { useState, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Form, FormGroup, TextInput, ActionGroup, Button, Alert, NumberInput,
  Card, CardTitle, CardBody, Grid, GridItem,
} from '@patternfly/react-core';
import { ConfirmModal } from '../shared/ConfirmModal';
import { RolloutModel } from '../../models';

interface RolloutResource {
  metadata: { name: string; namespace: string };
  spec: {
    replicas?: number;
    template?: { spec?: { containers?: Array<{ name: string; image: string }> } };
  };
}

export const RolloutEditTab: FC<{ rollout: RolloutResource }> = ({ rollout }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const container = rollout.spec.template?.spec?.containers?.[0];

  const [replicas, setReplicas] = useState(rollout.spec.replicas ?? 1);
  const [image, setImage] = useState(container?.image ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearFeedback = () => { setError(''); setSuccess(false); };

  const handleSave = async () => {
    setShowConfirm(false); setSaving(true); clearFeedback();
    try {
      await k8sPatch({
        model: RolloutModel,
        resource: rollout,
        data: [
          { op: 'replace', path: '/spec/replicas', value: replicas },
          { op: 'replace', path: '/spec/template/spec/containers/0/image', value: image },
        ],
      });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('Rollout updated')} actionClose={<Button variant="plain" onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      <Grid hasGutter>
        <GridItem span={6}>
          <Card><CardTitle>{t('Basics')}</CardTitle><CardBody>
            <Form>
              <FormGroup label={t('Replicas')} fieldId="replicas">
                <NumberInput value={replicas} onMinus={() => setReplicas(Math.max(1, replicas - 1))} onPlus={() => setReplicas(replicas + 1)} min={1} />
              </FormGroup>
            </Form>
          </CardBody></Card>
        </GridItem>
        <GridItem span={6}>
          <Card><CardTitle>{t('Container')}</CardTitle><CardBody>
            <Form>
              <FormGroup label={t('Image')} fieldId="image">
                <TextInput id="image" value={image} onChange={(_e, v) => { setImage(v); clearFeedback(); }} />
              </FormGroup>
            </Form>
          </CardBody></Card>
        </GridItem>
      </Grid>
      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving}>{t('Save')}</Button>
      </ActionGroup>
      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: rollout.metadata.name })}
      </ConfirmModal>
    </>
  );
};
