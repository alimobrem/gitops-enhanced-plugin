import React from 'react';
import { useState, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Form, FormGroup, TextInput, Checkbox, ActionGroup, Button, Alert,
  Card, CardTitle, CardBody, Grid, GridItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { ConfirmModal } from '../shared/ConfirmModal';
import { AppProjectModel } from '../../models';
import type { AppProjectResource } from '../../types';
import { safePatch } from '../../utils/patch';


export const AppProjectEditTab: FC<{ project: AppProjectResource }> = ({ project }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const init = {
    description: project.spec?.description ?? '',
    allRepos: project.spec?.sourceRepos?.includes('*') ?? false,
    repos: project.spec?.sourceRepos?.filter((r) => r !== '*') ?? [''],
    allDests: project.spec?.destinations?.some((d) => d.server === '*' && d.namespace === '*') ?? false,
    dests: project.spec?.destinations?.filter((d) => !(d.server === '*' && d.namespace === '*')) ?? [{ server: '', namespace: '' }],
  };

  const [description, setDescription] = useState(init.description);
  const [allRepos, setAllRepos] = useState(init.allRepos);
  const [repos, setRepos] = useState<string[]>([...init.repos]);
  const [allDests, setAllDests] = useState(init.allDests);
  const [dests, setDests] = useState([...init.dests]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isDirty = description !== init.description || allRepos !== init.allRepos ||
    JSON.stringify(repos) !== JSON.stringify(init.repos) || allDests !== init.allDests ||
    JSON.stringify(dests) !== JSON.stringify(init.dests);

  const clearFeedback = () => { setError(''); setSuccess(false); };
  const resetForm = () => {
    setDescription(init.description); setAllRepos(init.allRepos); setRepos([...init.repos]);
    setAllDests(init.allDests); setDests([...init.dests]); clearFeedback();
  };

  const handleSave = async () => {
    setShowConfirm(false); setSaving(true); clearFeedback();
    try {
      await k8sPatch({
        model: AppProjectModel,
        resource: project,
        data: [
          safePatch(project, '/spec/description', description),
          safePatch(project, '/spec/sourceRepos', allRepos ? ['*'] : repos.filter(Boolean)),
          safePatch(project, '/spec/destinations', allDests ? [{ server: '*', namespace: '*' }] : dests.filter((d) => d.server || d.namespace)),
        ],
      });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('AppProject updated')} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      <Grid hasGutter>
        <GridItem span={12}>
          <Card><CardTitle>{t('Basics')}</CardTitle><CardBody><Form>
            <FormGroup label={t('Description')} fieldId="desc">
              <TextInput id="desc" value={description} onChange={(_e, v) => { setDescription(v); clearFeedback(); }} />
            </FormGroup>
          </Form></CardBody></Card>
        </GridItem>
        <GridItem span={6}>
          <Card><CardTitle>{t('Source Repos')}</CardTitle><CardBody><Form>
            <FormGroup fieldId="allRepos">
              <Checkbox id="allRepos" label={t('Allow all repositories (*)')} isChecked={allRepos} onChange={(_e, v) => setAllRepos(v)} />
            </FormGroup>
            {!allRepos && repos.map((r, i) => (
              <FormGroup key={i} fieldId={`repo-${i}`}>
                <div className="pf-v6-u-display-flex pf-v6-u-align-items-center">
                  <TextInput value={r} onChange={(_e, v) => { const n = [...repos]; n[i] = v; setRepos(n); clearFeedback(); }} />
                  <Button variant="plain" aria-label={t('Remove repository')} onClick={() => setRepos(repos.filter((_, j) => j !== i))} isDisabled={repos.length <= 1}><MinusCircleIcon /></Button>
                </div>
              </FormGroup>
            ))}
            {!allRepos && <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setRepos([...repos, ''])}>{t('Add repository')}</Button>}
          </Form></CardBody></Card>
        </GridItem>
        <GridItem span={6}>
          <Card><CardTitle>{t('Destinations')}</CardTitle><CardBody><Form>
            <FormGroup fieldId="allDests">
              <Checkbox id="allDests" label={t('Allow all destinations (*/*)')} isChecked={allDests} onChange={(_e, v) => setAllDests(v)} />
            </FormGroup>
            {!allDests && dests.map((d, i) => (
              <FormGroup key={i} fieldId={`dest-${i}`}>
                <div className="pf-v6-u-display-flex pf-v6-u-align-items-center">
                  <TextInput value={d.server ?? ''} onChange={(_e, v) => { const n = [...dests]; n[i] = { ...n[i], server: v }; setDests(n); clearFeedback(); }} placeholder="server" />
                  <span className="pf-v6-u-mx-sm">/</span>
                  <TextInput value={d.namespace ?? ''} onChange={(_e, v) => { const n = [...dests]; n[i] = { ...n[i], namespace: v }; setDests(n); clearFeedback(); }} placeholder="namespace" />
                  <Button variant="plain" aria-label={t('Remove destination')} onClick={() => setDests(dests.filter((_, j) => j !== i))} isDisabled={dests.length <= 1}><MinusCircleIcon /></Button>
                </div>
              </FormGroup>
            ))}
            {!allDests && <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setDests([...dests, { server: '', namespace: '' }])}>{t('Add destination')}</Button>}
          </Form></CardBody></Card>
        </GridItem>
      </Grid>
      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving || !isDirty}>{t('Save')}</Button>
        <Button variant="link" onClick={resetForm} isDisabled={!isDirty}>{t('Cancel')}</Button>
      </ActionGroup>
      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: project.metadata.name })}
      </ConfirmModal>
    </>
  );
};
