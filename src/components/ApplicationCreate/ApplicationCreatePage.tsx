import { useState, type FC } from 'react';
import { useNavigate } from 'react-router';
import { k8sCreate, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection,
  Title,
  Wizard,
  WizardStep,
  Form,
  FormGroup,
  TextInput,
  Alert,
  ActionGroup,
  Button,
  FormSelect,
  FormSelectOption,
  Checkbox,
} from '@patternfly/react-core';
import { ApplicationModel } from '../../models';

interface AppFormState {
  name: string;
  project: string;
  repoURL: string;
  path: string;
  targetRevision: string;
  destServer: string;
  destNamespace: string;
  autoSync: boolean;
  prune: boolean;
  selfHeal: boolean;
  createNamespace: boolean;
}

const initialState: AppFormState = {
  name: '',
  project: 'default',
  repoURL: '',
  path: '',
  targetRevision: 'HEAD',
  destServer: 'https://kubernetes.default.svc',
  destNamespace: '',
  autoSync: false,
  prune: false,
  selfHeal: false,
  createNamespace: false,
};

export const ApplicationCreatePage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const navigate = useNavigate();
  const [form, setForm] = useState<AppFormState>(initialState);
  const [error, setError] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const update = (field: keyof AppFormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const resource = {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'Application',
        metadata: {
          name: form.name,
          namespace: 'openshift-gitops',
        },
        spec: {
          project: form.project,
          source: {
            repoURL: form.repoURL,
            path: form.path,
            targetRevision: form.targetRevision,
          },
          destination: {
            server: form.destServer,
            namespace: form.destNamespace,
          },
          ...(form.autoSync
            ? {
                syncPolicy: {
                  automated: {
                    prune: form.prune,
                    selfHeal: form.selfHeal,
                  },
                  ...(form.createNamespace
                    ? { syncOptions: ['CreateNamespace=true'] }
                    : {}),
                },
              }
            : {}),
        },
      };
      await k8sCreate({ model: ApplicationModel, data: resource });
      navigate(
        `/k8s/ns/openshift-gitops/argoproj.io~v1alpha1~Application/${form.name}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DocumentTitle>{t('Create Application')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
          {t('Create Application')}
        </Title>
        {error && (
          <Alert
            variant="danger"
            isInline
            title={t('Error creating application')}
            style={{ marginBottom: '1rem' }}
          >
            {error}
          </Alert>
        )}
        <Wizard onClose={() => navigate(-1)}>
          <WizardStep name={t('Source')} id="source">
            <Form>
              <FormGroup label={t('Application Name')} isRequired fieldId="name">
                <TextInput
                  id="name"
                  isRequired
                  value={form.name}
                  onChange={(_e, val) => update('name', val)}
                />
              </FormGroup>
              <FormGroup label={t('Project')} fieldId="project">
                <TextInput
                  id="project"
                  value={form.project}
                  onChange={(_e, val) => update('project', val)}
                />
              </FormGroup>
              <FormGroup label={t('Repository URL')} isRequired fieldId="repoURL">
                <TextInput
                  id="repoURL"
                  isRequired
                  value={form.repoURL}
                  onChange={(_e, val) => update('repoURL', val)}
                  placeholder="https://github.com/org/repo.git"
                />
              </FormGroup>
              <FormGroup label={t('Path')} isRequired fieldId="path">
                <TextInput
                  id="path"
                  isRequired
                  value={form.path}
                  onChange={(_e, val) => update('path', val)}
                  placeholder="manifests/"
                />
              </FormGroup>
              <FormGroup label={t('Target Revision')} fieldId="targetRevision">
                <TextInput
                  id="targetRevision"
                  value={form.targetRevision}
                  onChange={(_e, val) => update('targetRevision', val)}
                />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Destination')} id="destination">
            <Form>
              <FormGroup label={t('Cluster')} fieldId="destServer">
                <FormSelect
                  id="destServer"
                  value={form.destServer}
                  onChange={(_e, val) => update('destServer', val)}
                >
                  <FormSelectOption
                    value="https://kubernetes.default.svc"
                    label={t('In-cluster (default)')}
                  />
                </FormSelect>
              </FormGroup>
              <FormGroup label={t('Namespace')} isRequired fieldId="destNamespace">
                <TextInput
                  id="destNamespace"
                  isRequired
                  value={form.destNamespace}
                  onChange={(_e, val) => update('destNamespace', val)}
                />
              </FormGroup>
              <FormGroup fieldId="createNamespace">
                <Checkbox
                  id="createNamespace"
                  label={t('Create namespace if it does not exist')}
                  isChecked={form.createNamespace}
                  onChange={(_e, val) => update('createNamespace', val)}
                />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Sync Policy')} id="sync-policy">
            <Form>
              <FormGroup fieldId="autoSync">
                <Checkbox
                  id="autoSync"
                  label={t('Enable auto-sync')}
                  isChecked={form.autoSync}
                  onChange={(_e, val) => update('autoSync', val)}
                />
              </FormGroup>
              {form.autoSync && (
                <>
                  <FormGroup fieldId="prune">
                    <Checkbox
                      id="prune"
                      label={t('Prune resources')}
                      isChecked={form.prune}
                      onChange={(_e, val) => update('prune', val)}
                    />
                  </FormGroup>
                  <FormGroup fieldId="selfHeal">
                    <Checkbox
                      id="selfHeal"
                      label={t('Self-heal')}
                      isChecked={form.selfHeal}
                      onChange={(_e, val) => update('selfHeal', val)}
                    />
                  </FormGroup>
                </>
              )}
            </Form>
          </WizardStep>
          <WizardStep
            name={t('Review')}
            id="review"
            footer={{
              nextButtonText: t('Create'),
              onNext: handleCreate,
              isNextDisabled: creating || !form.name || !form.repoURL || !form.path || !form.destNamespace,
            }}
          >
            <Form>
              <FormGroup label={t('Name')}>{form.name}</FormGroup>
              <FormGroup label={t('Project')}>{form.project}</FormGroup>
              <FormGroup label={t('Repository')}>{form.repoURL}</FormGroup>
              <FormGroup label={t('Path')}>{form.path}</FormGroup>
              <FormGroup label={t('Revision')}>{form.targetRevision}</FormGroup>
              <FormGroup label={t('Destination')}>{`${form.destServer} / ${form.destNamespace}`}</FormGroup>
              <FormGroup label={t('Auto-sync')}>{form.autoSync ? t('Enabled') : t('Disabled')}</FormGroup>
            </Form>
          </WizardStep>
        </Wizard>
      </PageSection>
    </>
  );
};

export default ApplicationCreatePage;
