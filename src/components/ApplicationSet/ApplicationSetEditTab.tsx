import React from 'react';
import { useState, useMemo, useEffect, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  Form, FormSection, FormGroup, TextInput, Checkbox, ActionGroup, Button, Alert,
  AlertActionCloseButton, Select, SelectOption, SelectList, MenuToggle,
  HelperText, HelperTextItem, FormHelperText,
} from '@patternfly/react-core';
import { ConfirmModal } from '../shared/ConfirmModal';
import { GeneratorEditor } from './generators/GeneratorEditor';
import { ApplicationSetModel } from '../../models';
import type { AppSetResource, AppSetGenerator } from '../../types';
import { safePatch, safeRemove, type PatchOp } from '../../utils/patch';

const GENERATOR_TYPES = ['list', 'git', 'clusters', 'matrix', 'merge'] as const;

function newGenerator(type: string): AppSetGenerator {
  switch (type) {
    case 'list': return { list: { elements: [{ cluster: '', url: '' }] } };
    case 'git': return { git: { repoURL: '', revision: 'HEAD', directories: [{ path: '*' }] } };
    case 'clusters': return { clusters: { selector: { matchLabels: {} } } };
    case 'matrix': return { matrix: { generators: [] } };
    case 'merge': return { merge: { generators: [], mergeKeys: [] } };
    default: return {};
  }
}

export const ApplicationSetEditTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const appset = obj as AppSetResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');

  const tpl = appset?.spec?.template?.spec;
  const src = tpl?.source;

  const init = useMemo(() => ({
    generators: JSON.parse(JSON.stringify(appset?.spec?.generators ?? [])) as AppSetGenerator[],
    templateName: appset?.spec?.template?.metadata?.name ?? '',
    repoURL: src?.repoURL ?? '',
    path: src?.path ?? '',
    targetRevision: src?.targetRevision ?? 'HEAD',
    project: tpl?.project ?? '',
    destServer: tpl?.destination?.server ?? '',
    destNamespace: tpl?.destination?.namespace ?? '',
    autoSync: !!tpl?.syncPolicy?.automated,
    prune: !!tpl?.syncPolicy?.automated?.prune,
    selfHeal: !!tpl?.syncPolicy?.automated?.selfHeal,
    createNamespace: tpl?.syncPolicy?.syncOptions?.includes('CreateNamespace=true') ?? false,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [appset?.metadata?.uid]);

  const [generators, setGenerators] = useState<AppSetGenerator[]>(init.generators);
  const [templateName, setTemplateName] = useState(init.templateName);
  const [repoURL, setRepoURL] = useState(init.repoURL);
  const [path, setPath] = useState(init.path);
  const [targetRevision, setTargetRevision] = useState(init.targetRevision);
  const [project, setProject] = useState(init.project);
  const [destServer, setDestServer] = useState(init.destServer);
  const [destNamespace, setDestNamespace] = useState(init.destNamespace);
  const [autoSync, setAutoSync] = useState(init.autoSync);
  const [prune, setPrune] = useState(init.prune);
  const [selfHeal, setSelfHeal] = useState(init.selfHeal);
  const [createNamespace, setCreateNamespace] = useState(init.createNamespace);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addGenOpen, setAddGenOpen] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 8000);
    return () => clearTimeout(timer);
  }, [success]);

  if (!appset?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const repoURLValid = repoURL.trim().length > 0;
  const formValid = repoURLValid;

  const generatorsKey = JSON.stringify(generators);
  const initGeneratorsKey = JSON.stringify(init.generators);
  const isDirty = templateName !== init.templateName || repoURL !== init.repoURL || path !== init.path ||
    targetRevision !== init.targetRevision || project !== init.project ||
    destServer !== init.destServer || destNamespace !== init.destNamespace ||
    autoSync !== init.autoSync || prune !== init.prune || selfHeal !== init.selfHeal ||
    createNamespace !== init.createNamespace || generatorsKey !== initGeneratorsKey;

  const clearFeedback = () => { setError(''); setSuccess(false); };

  const resetForm = () => {
    setGenerators(JSON.parse(JSON.stringify(init.generators)));
    setTemplateName(init.templateName); setRepoURL(init.repoURL); setPath(init.path);
    setTargetRevision(init.targetRevision); setProject(init.project);
    setDestServer(init.destServer); setDestNamespace(init.destNamespace);
    setAutoSync(init.autoSync); setPrune(init.prune); setSelfHeal(init.selfHeal);
    setCreateNamespace(init.createNamespace);
    clearFeedback();
  };

  const updateGenerator = (idx: number, gen: AppSetGenerator) => {
    const updated = [...generators];
    updated[idx] = gen;
    setGenerators(updated);
    clearFeedback();
  };

  const removeGenerator = (idx: number) => {
    setGenerators(generators.filter((_, i) => i !== idx));
    clearFeedback();
  };

  const addGenerator = (type: string) => {
    setAddGenOpen(false);
    setGenerators([...generators, newGenerator(type)]);
    clearFeedback();
  };

  const buildSyncOptions = (): string[] => {
    const opts = (tpl?.syncPolicy?.syncOptions ?? []).filter((o) => o !== 'CreateNamespace=true');
    if (createNamespace) opts.push('CreateNamespace=true');
    return opts;
  };

  const handleSave = async () => {
    setSaving(true); clearFeedback();
    try {
      const patches: PatchOp[] = [
        safePatch(appset, '/spec/generators', generators),
        safePatch(appset, '/spec/template/metadata/name', templateName),
        safePatch(appset, '/spec/template/spec/source/repoURL', repoURL),
        safePatch(appset, '/spec/template/spec/source/path', path),
        safePatch(appset, '/spec/template/spec/source/targetRevision', targetRevision),
        safePatch(appset, '/spec/template/spec/destination/namespace', destNamespace),
      ];
      if (project) {
        patches.push(safePatch(appset, '/spec/template/spec/project', project));
      }
      if (destServer) {
        patches.push(safePatch(appset, '/spec/template/spec/destination/server', destServer));
      }
      if (autoSync) {
        patches.push(safePatch(appset, '/spec/template/spec/syncPolicy/automated', { prune, selfHeal }));
      } else {
        const removeOp = safeRemove(appset, '/spec/template/spec/syncPolicy/automated');
        if (removeOp) patches.push(removeOp);
      }
      patches.push(safePatch(appset, '/spec/template/spec/syncPolicy/syncOptions', buildSyncOptions()));
      await k8sPatch({ model: ApplicationSetModel, resource: appset, data: patches });
      setShowConfirm(false);
      setSuccess(true);
    } catch (e) {
      setShowConfirm(false);
      setError((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <div className="pf-v6-u-mt-md">
      {error && (
        <Alert variant="danger" isInline title={t('Error saving')} actionClose={<AlertActionCloseButton onClose={clearFeedback} />} className="pf-v6-u-mb-md">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" isInline title={t('ApplicationSet updated')} actionClose={<AlertActionCloseButton onClose={clearFeedback} />} className="pf-v6-u-mb-md" />
      )}
      <Form isWidthLimited>
        <FormSection title={t('Generators')} titleElement="h3">
          {generators.map((gen, i) => (
            <GeneratorEditor
              key={i}
              generator={gen}
              index={i}
              onChange={(g) => updateGenerator(i, g)}
              onRemove={() => removeGenerator(i)}
            />
          ))}
          <Select
            isOpen={addGenOpen}
            onSelect={(_e, val) => addGenerator(val as string)}
            onOpenChange={setAddGenOpen}
            aria-label={t('Add Generator')}
            toggle={(ref) => (
              <MenuToggle ref={ref} onClick={() => setAddGenOpen(!addGenOpen)} variant="secondary">
                {t('Add Generator')}
              </MenuToggle>
            )}
          >
            <SelectList>
              {GENERATOR_TYPES.map((gt) => (
                <SelectOption key={gt} value={gt}>{gt.charAt(0).toUpperCase() + gt.slice(1)}</SelectOption>
              ))}
            </SelectList>
          </Select>
        </FormSection>

        <FormSection title={t('Template')} titleElement="h3">
          <FormGroup label={t('Template Name')} fieldId="tplName">
            <TextInput id="tplName" value={templateName} onChange={(_e, v) => { setTemplateName(v); clearFeedback(); }} />
          </FormGroup>
          <FormGroup label={t('Repository URL')} isRequired fieldId="repo">
            <TextInput id="repo" isRequired validated={repoURLValid ? 'default' : 'error'} value={repoURL} onChange={(_e, v) => { setRepoURL(v); clearFeedback(); }} />
            {!repoURLValid && (
              <FormHelperText><HelperText><HelperTextItem variant="error">{t('Repository URL is required')}</HelperTextItem></HelperText></FormHelperText>
            )}
          </FormGroup>
          <FormGroup label={t('Path')} fieldId="path">
            <TextInput id="path" value={path} onChange={(_e, v) => { setPath(v); clearFeedback(); }} />
          </FormGroup>
          <FormGroup label={t('Target Revision')} fieldId="rev">
            <TextInput id="rev" value={targetRevision} onChange={(_e, v) => { setTargetRevision(v); clearFeedback(); }} />
          </FormGroup>
          <FormGroup label={t('Project')} fieldId="project">
            <TextInput id="project" value={project} onChange={(_e, v) => { setProject(v); clearFeedback(); }} />
          </FormGroup>
          <FormGroup label={t('Destination Server')} fieldId="destServer">
            <TextInput id="destServer" value={destServer} onChange={(_e, v) => { setDestServer(v); clearFeedback(); }} />
          </FormGroup>
          <FormGroup label={t('Destination Namespace')} fieldId="destNs">
            <TextInput id="destNs" value={destNamespace} onChange={(_e, v) => { setDestNamespace(v); clearFeedback(); }} />
          </FormGroup>
        </FormSection>

        <FormSection title={t('Sync Policy')} titleElement="h3">
          <FormGroup fieldId="auto">
            <Checkbox id="auto" label={t('Enable auto-sync')} isChecked={autoSync} onChange={(_e, v) => { setAutoSync(v); clearFeedback(); }} />
          </FormGroup>
          {autoSync && (
            <>
              <FormGroup fieldId="prune">
                <Checkbox id="prune" label={t('Prune resources')} isChecked={prune} onChange={(_e, v) => { setPrune(v); clearFeedback(); }} />
              </FormGroup>
              <FormGroup fieldId="heal">
                <Checkbox id="heal" label={t('Self-heal')} isChecked={selfHeal} onChange={(_e, v) => { setSelfHeal(v); clearFeedback(); }} />
              </FormGroup>
            </>
          )}
          <FormGroup fieldId="createNs">
            <Checkbox id="createNs" label={t('CreateNamespace')} isChecked={createNamespace} onChange={(_e, v) => { setCreateNamespace(v); clearFeedback(); }} />
          </FormGroup>
        </FormSection>

        <ActionGroup>
          <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving || !formValid || !isDirty} isLoading={saving}>{t('Save')}</Button>
          <Button variant="link" onClick={resetForm} isDisabled={!isDirty}>{t('Revert')}</Button>
        </ActionGroup>
      </Form>
      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: appset?.metadata?.name })}
      </ConfirmModal>
    </div>
  );
};

export default ApplicationSetEditTab;
