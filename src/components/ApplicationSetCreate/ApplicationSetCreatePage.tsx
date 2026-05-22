import React from 'react';
import { useState, type FC } from 'react';
import { useHistory } from 'react-router-dom';
import { k8sCreate, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Wizard, WizardStep, Form, FormGroup, TextInput,
  Alert, Checkbox, FormSelect, FormSelectOption,
} from '@patternfly/react-core';
import { ApplicationSetModel } from '../../models';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import { InstanceProvider } from '../shared/InstanceProvider';

interface AppSetForm {
  name: string;
  project: string;
  generatorType: 'list' | 'git' | 'cluster';
  listElements: string;
  gitRepoURL: string;
  gitRevision: string;
  gitPath: string;
  templateName: string;
  sourceRepoURL: string;
  sourcePath: string;
  sourceRevision: string;
  destServer: string;
  destNamespace: string;
  autoSync: boolean;
  prune: boolean;
  selfHeal: boolean;
  createNamespace: boolean;
}

const initial: AppSetForm = {
  name: '', project: 'default',
  generatorType: 'list', listElements: 'env: dev\nnamespace: my-app-dev',
  gitRepoURL: '', gitRevision: 'HEAD', gitPath: '',
  templateName: '{{env}}-app',
  sourceRepoURL: '', sourcePath: '', sourceRevision: 'HEAD',
  destServer: 'https://kubernetes.default.svc', destNamespace: '{{namespace}}',
  autoSync: true, prune: true, selfHeal: true, createNamespace: true,
};

export const ApplicationSetCreatePage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const history = useHistory();
  const [form, setForm] = useState<AppSetForm>(initial);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const u = (field: keyof AppSetForm, value: string | boolean) => setForm((p) => ({ ...p, [field]: value }));

  const buildGenerator = () => {
    if (form.generatorType === 'list') {
      const elements = form.listElements.split('\n---\n').map((block) => {
        const obj: Record<string, string> = {};
        block.split('\n').forEach((line) => {
          const [k, ...v] = line.split(':');
          if (k.trim()) obj[k.trim()] = v.join(':').trim();
        });
        return obj;
      });
      return [{ list: { elements } }];
    }
    if (form.generatorType === 'git') {
      return [{ git: { repoURL: form.gitRepoURL, revision: form.gitRevision, directories: [{ path: form.gitPath || '*' }] } }];
    }
    return [{ clusters: {} }];
  };

  const handleCreate = async () => {
    setError(''); setCreating(true);
    try {
      const resource = {
        apiVersion: 'argoproj.io/v1alpha1', kind: 'ApplicationSet',
        metadata: { name: form.name, namespace: instance.namespace },
        spec: {
          generators: buildGenerator(),
          template: {
            metadata: { name: form.templateName },
            spec: {
              project: form.project,
              source: { repoURL: form.sourceRepoURL, path: form.sourcePath, targetRevision: form.sourceRevision },
              destination: { server: form.destServer, namespace: form.destNamespace },
              ...(form.autoSync ? {
                syncPolicy: {
                  automated: { prune: form.prune, selfHeal: form.selfHeal },
                  ...(form.createNamespace ? { syncOptions: ['CreateNamespace=true'] } : {}),
                },
              } : {}),
            },
          },
        },
      };
      await k8sCreate({ model: ApplicationSetModel, data: resource });
      history.push(`/k8s/ns/${instance.namespace}/argoproj.io~v1alpha1~ApplicationSet/${form.name}`);
    } catch (e) { setError((e as Error).message); } finally { setCreating(false); }
  };

  return (
    <>
      <DocumentTitle>{t('Create ApplicationSet')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">{t('Create ApplicationSet')}</Title>
        {error && <Alert variant="danger" isInline title={t('Error')} className="pf-v6-u-mb-md">{error}</Alert>}
        <Wizard onClose={() => history.goBack()}>
          <WizardStep name={t('Basics')} id="basics">
            <Form>
              <FormGroup label={t('Name')} isRequired fieldId="name">
                <TextInput id="name" isRequired value={form.name} onChange={(_e, v) => u('name', v)} />
              </FormGroup>
              <FormGroup label={t('Project')} fieldId="project">
                <TextInput id="project" value={form.project} onChange={(_e, v) => u('project', v)} />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Generator')} id="generator">
            <Form>
              <FormGroup label={t('Generator Type')} fieldId="genType">
                <FormSelect id="genType" value={form.generatorType} onChange={(_e, v) => u('generatorType', v)}>
                  <FormSelectOption value="list" label={t('List')} />
                  <FormSelectOption value="git" label={t('Git Directory')} />
                  <FormSelectOption value="cluster" label={t('Cluster')} />
                </FormSelect>
              </FormGroup>
              {form.generatorType === 'list' && (
                <FormGroup label={t('Elements (YAML, separate with ---)')} fieldId="elements">
                  <textarea id="elements" className="pf-v6-c-form-control" rows={6} value={form.listElements}
                    onChange={(e) => u('listElements', e.target.value)} />
                </FormGroup>
              )}
              {form.generatorType === 'git' && (
                <>
                  <FormGroup label={t('Repository URL')} isRequired fieldId="gitRepo">
                    <TextInput id="gitRepo" isRequired value={form.gitRepoURL} onChange={(_e, v) => u('gitRepoURL', v)} />
                  </FormGroup>
                  <FormGroup label={t('Path')} fieldId="gitPath">
                    <TextInput id="gitPath" value={form.gitPath} onChange={(_e, v) => u('gitPath', v)} placeholder="*" />
                  </FormGroup>
                </>
              )}
            </Form>
          </WizardStep>
          <WizardStep name={t('Template')} id="template">
            <Form>
              <FormGroup label={t('App Name Template')} fieldId="tplName">
                <TextInput id="tplName" value={form.templateName} onChange={(_e, v) => u('templateName', v)} />
              </FormGroup>
              <FormGroup label={t('Source Repository')} isRequired fieldId="srcRepo">
                <TextInput id="srcRepo" isRequired value={form.sourceRepoURL} onChange={(_e, v) => u('sourceRepoURL', v)} />
              </FormGroup>
              <FormGroup label={t('Source Path')} fieldId="srcPath">
                <TextInput id="srcPath" value={form.sourcePath} onChange={(_e, v) => u('sourcePath', v)} />
              </FormGroup>
              <FormGroup label={t('Destination Namespace')} fieldId="destNs">
                <TextInput id="destNs" value={form.destNamespace} onChange={(_e, v) => u('destNamespace', v)} />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Sync Policy')} id="sync">
            <Form>
              <FormGroup fieldId="auto"><Checkbox id="auto" label={t('Enable auto-sync')} isChecked={form.autoSync} onChange={(_e, v) => u('autoSync', v)} /></FormGroup>
              {form.autoSync && (
                <>
                  <FormGroup fieldId="prune"><Checkbox id="prune" label={t('Prune resources')} isChecked={form.prune} onChange={(_e, v) => u('prune', v)} /></FormGroup>
                  <FormGroup fieldId="heal"><Checkbox id="heal" label={t('Self-heal')} isChecked={form.selfHeal} onChange={(_e, v) => u('selfHeal', v)} /></FormGroup>
                  <FormGroup fieldId="createNs"><Checkbox id="createNs" label={t('Create namespace if it does not exist')} isChecked={form.createNamespace} onChange={(_e, v) => u('createNamespace', v)} /></FormGroup>
                </>
              )}
            </Form>
          </WizardStep>
          <WizardStep name={t('Review')} id="review" footer={{ nextButtonText: t('Create'), onNext: handleCreate, isNextDisabled: creating || !form.name || !form.sourceRepoURL }}>
            <Form>
              <FormGroup label={t('Name')}>{form.name}</FormGroup>
              <FormGroup label={t('Generator')}>{form.generatorType}</FormGroup>
              <FormGroup label={t('Template Name')}>{form.templateName}</FormGroup>
              <FormGroup label={t('Source')}>{form.sourceRepoURL} / {form.sourcePath}</FormGroup>
              <FormGroup label={t('Destination')}>{form.destServer} / {form.destNamespace}</FormGroup>
            </Form>
          </WizardStep>
        </Wizard>
      </PageSection>
    </>
  );
};

const Wrapped = () => (<InstanceProvider><ApplicationSetCreatePage /></InstanceProvider>);
export default Wrapped;
