import React from 'react';
import { useState, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Form, FormGroup, TextInput, Checkbox, ActionGroup, Button, Alert,
  Card, CardTitle, CardBody, Grid, GridItem,
} from '@patternfly/react-core';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ApplicationSetModel } from '../../models';

interface AppSetResource {
  metadata: { name: string; namespace: string };
  spec: {
    template?: {
      metadata?: { name?: string };
      spec?: {
        source?: { repoURL?: string; path?: string; targetRevision?: string };
        destination?: { server?: string; namespace?: string };
        syncPolicy?: { automated?: { prune?: boolean; selfHeal?: boolean }; syncOptions?: string[] };
      };
    };
  };
}

export const ApplicationSetEditTab: FC<{ appset: AppSetResource }> = ({ appset }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const tpl = appset.spec.template?.spec;
  const src = tpl?.source;

  const [templateName, setTemplateName] = useState(appset.spec.template?.metadata?.name ?? '');
  const [repoURL, setRepoURL] = useState(src?.repoURL ?? '');
  const [path, setPath] = useState(src?.path ?? '');
  const [targetRevision, setTargetRevision] = useState(src?.targetRevision ?? 'HEAD');
  const [destNamespace, setDestNamespace] = useState(tpl?.destination?.namespace ?? '');
  const [autoSync, setAutoSync] = useState(!!tpl?.syncPolicy?.automated);
  const [prune, setPrune] = useState(!!tpl?.syncPolicy?.automated?.prune);
  const [selfHeal, setSelfHeal] = useState(!!tpl?.syncPolicy?.automated?.selfHeal);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearFeedback = () => { setError(''); setSuccess(false); };

  const handleSave = async () => {
    setShowConfirm(false); setSaving(true); clearFeedback();
    try {
      await k8sPatch({
        model: ApplicationSetModel,
        resource: appset,
        data: [
          { op: 'replace', path: '/spec/template/metadata/name', value: templateName },
          { op: 'replace', path: '/spec/template/spec/source/repoURL', value: repoURL },
          { op: 'replace', path: '/spec/template/spec/source/path', value: path },
          { op: 'replace', path: '/spec/template/spec/source/targetRevision', value: targetRevision },
          { op: 'replace', path: '/spec/template/spec/destination/namespace', value: destNamespace },
          ...(autoSync ? [{
            op: tpl?.syncPolicy?.automated ? 'replace' as const : 'add' as const,
            path: '/spec/template/spec/syncPolicy/automated',
            value: { prune, selfHeal },
          }] : (tpl?.syncPolicy?.automated ? [{ op: 'remove' as const, path: '/spec/template/spec/syncPolicy/automated', value: null }] : [])),
        ],
      });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('ApplicationSet updated')} actionClose={<Button variant="plain" onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      <Grid hasGutter>
        <GridItem span={6}>
          <Card><CardTitle>{t('Template')}</CardTitle><CardBody>
            <Form>
              <FormGroup label={t('Template Name')} fieldId="tplName">
                <TextInput id="tplName" value={templateName} onChange={(_e, v) => { setTemplateName(v); clearFeedback(); }} />
              </FormGroup>
              <FormGroup label={t('Repository URL')} fieldId="repo">
                <TextInput id="repo" value={repoURL} onChange={(_e, v) => { setRepoURL(v); clearFeedback(); }} />
              </FormGroup>
              <FormGroup label={t('Path')} fieldId="path">
                <TextInput id="path" value={path} onChange={(_e, v) => { setPath(v); clearFeedback(); }} />
              </FormGroup>
              <FormGroup label={t('Target Revision')} fieldId="rev">
                <TextInput id="rev" value={targetRevision} onChange={(_e, v) => { setTargetRevision(v); clearFeedback(); }} />
              </FormGroup>
            </Form>
          </CardBody></Card>
        </GridItem>
        <GridItem span={6}>
          <Card><CardTitle>{t('Destination')}</CardTitle><CardBody>
            <Form>
              <FormGroup label={t('Namespace')} fieldId="ns">
                <TextInput id="ns" value={destNamespace} onChange={(_e, v) => { setDestNamespace(v); clearFeedback(); }} />
              </FormGroup>
            </Form>
          </CardBody></Card>
          <Card className="pf-v6-u-mt-md"><CardTitle>{t('Sync Policy')}</CardTitle><CardBody>
            <Form>
              <FormGroup fieldId="auto"><Checkbox id="auto" label={t('Enable auto-sync')} isChecked={autoSync} onChange={(_e, v) => setAutoSync(v)} /></FormGroup>
              {autoSync && (
                <>
                  <FormGroup fieldId="prune"><Checkbox id="prune" label={t('Prune resources')} isChecked={prune} onChange={(_e, v) => setPrune(v)} /></FormGroup>
                  <FormGroup fieldId="heal"><Checkbox id="heal" label={t('Self-heal')} isChecked={selfHeal} onChange={(_e, v) => setSelfHeal(v)} /></FormGroup>
                </>
              )}
            </Form>
          </CardBody></Card>
        </GridItem>
      </Grid>
      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving}>{t('Save')}</Button>
      </ActionGroup>
      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: appset.metadata.name })}
      </ConfirmModal>
    </>
  );
};
