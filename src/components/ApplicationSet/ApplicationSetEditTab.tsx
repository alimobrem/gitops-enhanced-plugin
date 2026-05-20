import React from 'react';
import { useState, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Form, FormGroup, TextInput, Checkbox, ActionGroup, Button, Alert,
  Card, CardTitle, CardBody, Grid, GridItem,
  HelperText, HelperTextItem, FormHelperText,
} from '@patternfly/react-core';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ApplicationSetModel } from '../../models';
import type { AppSetResource } from '../../types';
import { safePatch, safeRemove } from '../../utils/patch';


export const ApplicationSetEditTab: FC<{ appset: AppSetResource }> = ({ appset }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const tpl = appset.spec.template?.spec;
  const src = tpl?.source;

  const init = {
    templateName: appset.spec.template?.metadata?.name ?? '',
    repoURL: src?.repoURL ?? '', path: src?.path ?? '',
    targetRevision: src?.targetRevision ?? 'HEAD',
    destNamespace: tpl?.destination?.namespace ?? '',
    autoSync: !!tpl?.syncPolicy?.automated,
    prune: !!tpl?.syncPolicy?.automated?.prune,
    selfHeal: !!tpl?.syncPolicy?.automated?.selfHeal,
  };

  const [templateName, setTemplateName] = useState(init.templateName);
  const [repoURL, setRepoURL] = useState(init.repoURL);
  const [path, setPath] = useState(init.path);
  const [targetRevision, setTargetRevision] = useState(init.targetRevision);
  const [destNamespace, setDestNamespace] = useState(init.destNamespace);
  const [autoSync, setAutoSync] = useState(init.autoSync);
  const [prune, setPrune] = useState(init.prune);
  const [selfHeal, setSelfHeal] = useState(init.selfHeal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const repoURLValid = repoURL.trim().length > 0;
  const formValid = repoURLValid;
  const isDirty = templateName !== init.templateName || repoURL !== init.repoURL || path !== init.path ||
    targetRevision !== init.targetRevision || destNamespace !== init.destNamespace ||
    autoSync !== init.autoSync || prune !== init.prune || selfHeal !== init.selfHeal;

  const clearFeedback = () => { setError(''); setSuccess(false); };
  const resetForm = () => {
    setTemplateName(init.templateName); setRepoURL(init.repoURL); setPath(init.path);
    setTargetRevision(init.targetRevision); setDestNamespace(init.destNamespace);
    setAutoSync(init.autoSync); setPrune(init.prune); setSelfHeal(init.selfHeal); clearFeedback();
  };

  const handleSave = async () => {
    setShowConfirm(false); setSaving(true); clearFeedback();
    try {
      const patches = [
        safePatch(appset, '/spec/template/metadata/name', templateName),
        safePatch(appset, '/spec/template/spec/source/repoURL', repoURL),
        safePatch(appset, '/spec/template/spec/source/path', path),
        safePatch(appset, '/spec/template/spec/source/targetRevision', targetRevision),
        safePatch(appset, '/spec/template/spec/destination/namespace', destNamespace),
      ];
      if (autoSync) {
        patches.push(safePatch(appset, '/spec/template/spec/syncPolicy/automated', { prune, selfHeal }));
      } else {
        const removeOp = safeRemove(appset, '/spec/template/spec/syncPolicy/automated');
        if (removeOp) patches.push(removeOp);
      }
      await k8sPatch({ model: ApplicationSetModel, resource: appset, data: patches });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  const vh = (valid: boolean, msg: string) => !valid ? <FormHelperText><HelperText><HelperTextItem variant="error">{msg}</HelperTextItem></HelperText></FormHelperText> : null;

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('ApplicationSet updated')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      <Grid hasGutter>
        <GridItem span={6}>
          <Card><CardTitle>{t('Template')}</CardTitle><CardBody><Form>
            <FormGroup label={t('Template Name')} fieldId="tplName"><TextInput id="tplName" value={templateName} onChange={(_e, v) => { setTemplateName(v); clearFeedback(); }} /></FormGroup>
            <FormGroup label={t('Repository URL')} isRequired fieldId="repo">
              <TextInput id="repo" isRequired validated={repoURLValid ? 'default' : 'error'} value={repoURL} onChange={(_e, v) => { setRepoURL(v); clearFeedback(); }} />
              {vh(repoURLValid, t('Repository URL is required'))}
            </FormGroup>
            <FormGroup label={t('Path')} fieldId="path"><TextInput id="path" value={path} onChange={(_e, v) => { setPath(v); clearFeedback(); }} /></FormGroup>
            <FormGroup label={t('Target Revision')} fieldId="rev"><TextInput id="rev" value={targetRevision} onChange={(_e, v) => { setTargetRevision(v); clearFeedback(); }} /></FormGroup>
          </Form></CardBody></Card>
        </GridItem>
        <GridItem span={6}>
          <Card><CardTitle>{t('Destination')}</CardTitle><CardBody><Form>
            <FormGroup label={t('Namespace')} fieldId="ns"><TextInput id="ns" value={destNamespace} onChange={(_e, v) => { setDestNamespace(v); clearFeedback(); }} /></FormGroup>
          </Form></CardBody></Card>
          <Card className="pf-v6-u-mt-md"><CardTitle>{t('Sync Policy')}</CardTitle><CardBody><Form>
            <FormGroup fieldId="auto"><Checkbox id="auto" label={t('Enable auto-sync')} isChecked={autoSync} onChange={(_e, v) => setAutoSync(v)} /></FormGroup>
            {autoSync && (<>
              <FormGroup fieldId="prune"><Checkbox id="prune" label={t('Prune resources')} isChecked={prune} onChange={(_e, v) => setPrune(v)} /></FormGroup>
              <FormGroup fieldId="heal"><Checkbox id="heal" label={t('Self-heal')} isChecked={selfHeal} onChange={(_e, v) => setSelfHeal(v)} /></FormGroup>
            </>)}
          </Form></CardBody></Card>
        </GridItem>
      </Grid>
      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving || !formValid || !isDirty}>{t('Save')}</Button>
        <Button variant="link" onClick={resetForm} isDisabled={!isDirty}>{t('Cancel')}</Button>
      </ActionGroup>
      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: appset.metadata.name })}
      </ConfirmModal>
    </>
  );
};
