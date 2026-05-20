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
import { ApplicationModel } from '../../models';
import { isMultiSource, getApplicationSource } from '../../utils/application';
import type { ApplicationResource } from '../../types';

export const EditTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const multiSource = isMultiSource(app);
  const source = getApplicationSource(app);

  const [repoURL, setRepoURL] = useState(source?.repoURL ?? '');
  const [path, setPath] = useState(source?.path ?? '');
  const [targetRevision, setTargetRevision] = useState(source?.targetRevision ?? 'HEAD');
  const [destServer, setDestServer] = useState(app.spec.destination.server ?? '');
  const [destNamespace, setDestNamespace] = useState(app.spec.destination.namespace ?? '');
  const [project, setProject] = useState(app.spec.project);
  const [autoSync, setAutoSync] = useState(!!app.spec.syncPolicy?.automated);
  const [prune, setPrune] = useState(!!app.spec.syncPolicy?.automated?.prune);
  const [selfHeal, setSelfHeal] = useState(!!app.spec.syncPolicy?.automated?.selfHeal);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const repoURLValid = repoURL.trim().length > 0;
  const pathValid = path.trim().length > 0;
  const namespaceValid = destNamespace.trim().length > 0;
  const formValid = repoURLValid && pathValid && namespaceValid;

  const clearFeedback = () => { setError(''); setSuccess(false); };

  const handleSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    clearFeedback();
    try {
      const sourcePath = multiSource ? '/spec/sources/0' : '/spec/source';
      const patches: Array<{ op: string; path: string; value: unknown }> = [
        { op: 'replace', path: `${sourcePath}/repoURL`, value: repoURL },
        { op: 'replace', path: `${sourcePath}/path`, value: path },
        { op: 'replace', path: `${sourcePath}/targetRevision`, value: targetRevision },
        { op: 'replace', path: '/spec/destination/server', value: destServer },
        { op: 'replace', path: '/spec/destination/namespace', value: destNamespace },
        { op: 'replace', path: '/spec/project', value: project },
      ];
      if (autoSync) {
        patches.push({
          op: app.spec.syncPolicy?.automated ? 'replace' : 'add',
          path: '/spec/syncPolicy/automated',
          value: { prune, selfHeal },
        });
      } else if (app.spec.syncPolicy?.automated) {
        patches.push({ op: 'remove', path: '/spec/syncPolicy/automated', value: null });
      }
      await k8sPatch({ model: ApplicationModel, resource: app, data: patches });
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const validationHelper = (valid: boolean, msg: string) =>
    !valid ? (
      <FormHelperText><HelperText><HelperTextItem variant="error">{msg}</HelperTextItem></HelperText></FormHelperText>
    ) : null;

  return (
    <>
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<Button variant="plain" onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('Application updated successfully')} actionClose={<Button variant="plain" onClick={clearFeedback}>x</Button>} className="pf-v6-u-mb-md" />}
      {multiSource && <Alert variant="info" isInline title={t('Multi-source application')} className="pf-v6-u-mb-md">{t('Only the first source is editable here. Use YAML for full control.')}</Alert>}

      <Grid hasGutter>
        <GridItem span={6}>
          <Card>
            <CardTitle>{t('Source')}</CardTitle>
            <CardBody>
              <Form>
                <FormGroup label={t('Repository URL')} isRequired fieldId="edit-repo">
                  <TextInput id="edit-repo" isRequired validated={repoURLValid ? 'default' : 'error'} value={repoURL} onChange={(_e, v) => { setRepoURL(v); clearFeedback(); }} />
                  {validationHelper(repoURLValid, t('Repository URL is required'))}
                </FormGroup>
                <FormGroup label={t('Path')} isRequired fieldId="edit-path">
                  <TextInput id="edit-path" isRequired validated={pathValid ? 'default' : 'error'} value={path} onChange={(_e, v) => { setPath(v); clearFeedback(); }} />
                  {validationHelper(pathValid, t('Path is required'))}
                </FormGroup>
                <FormGroup label={t('Target Revision')} fieldId="edit-revision">
                  <TextInput id="edit-revision" value={targetRevision} onChange={(_e, v) => { setTargetRevision(v); clearFeedback(); }} />
                </FormGroup>
              </Form>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={6}>
          <Card>
            <CardTitle>{t('Destination')}</CardTitle>
            <CardBody>
              <Form>
                <FormGroup label={t('Cluster')} fieldId="edit-server">
                  <TextInput id="edit-server" value={destServer} onChange={(_e, v) => { setDestServer(v); clearFeedback(); }} />
                </FormGroup>
                <FormGroup label={t('Namespace')} isRequired fieldId="edit-namespace">
                  <TextInput id="edit-namespace" isRequired validated={namespaceValid ? 'default' : 'error'} value={destNamespace} onChange={(_e, v) => { setDestNamespace(v); clearFeedback(); }} />
                  {validationHelper(namespaceValid, t('Namespace is required'))}
                </FormGroup>
                <FormGroup label={t('Project')} fieldId="edit-project">
                  <TextInput id="edit-project" value={project} onChange={(_e, v) => { setProject(v); clearFeedback(); }} />
                </FormGroup>
              </Form>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={12}>
          <Card>
            <CardTitle>{t('Sync Policy')}</CardTitle>
            <CardBody>
              <Form>
                <FormGroup fieldId="edit-autosync">
                  <Checkbox id="edit-autosync" label={t('Enable auto-sync')} isChecked={autoSync} onChange={(_e, v) => setAutoSync(v)} />
                </FormGroup>
                {autoSync && (
                  <>
                    <FormGroup fieldId="edit-prune"><Checkbox id="edit-prune" label={t('Prune resources')} isChecked={prune} onChange={(_e, v) => setPrune(v)} /></FormGroup>
                    <FormGroup fieldId="edit-selfheal"><Checkbox id="edit-selfheal" label={t('Self-heal')} isChecked={selfHeal} onChange={(_e, v) => setSelfHeal(v)} /></FormGroup>
                  </>
                )}
              </Form>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={() => setShowConfirm(true)} isDisabled={saving || !formValid}>{t('Save')}</Button>
      </ActionGroup>

      <ConfirmModal title={t('Confirm Save')} isOpen={showConfirm} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} isLoading={saving} confirmLabel={t('Save')}>
        {t('Save changes to {{name}}?', { name: app.metadata.name })}
      </ConfirmModal>
    </>
  );
};

export default EditTab;
