import React from 'react';
import { useState, type FC } from 'react';
import { useHistory } from 'react-router-dom';
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
  Checkbox,
  Button,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Switch,
  FileUpload,
  List,
  ListItem,
  Label,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { PromotionStrategyModel, ScmProviderModel, GitRepositoryModel } from '../../models';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import { useScmProviders } from '../../hooks/useScmProviders';
import { useGitRepositories } from '../../hooks/useGitRepositories';
import {
  type ProviderType,
  PROVIDER_OPTIONS,
  SECRET_KEY,
  SecretModel,
  buildProviderSpec,
  buildRepoSpec,
} from '../../utils/provider-config';

interface EnvironmentEntry {
  branch: string;
  autoMerge: boolean;
}

interface CheckEntry {
  key: string;
}

interface FormState {
  useExistingProvider: boolean;
  existingProviderName: string;
  providerName: string;
  providerType: ProviderType;
  githubAppId: string;
  githubInstallationId: string;
  credential: string;
  providerDomain: string;
  azureOrg: string;

  useExistingRepo: boolean;
  existingRepoName: string;
  repoName: string;
  repoOwner: string;
  repoProjectName: string;
  gitlabNamespace: string;

  psName: string;
  environments: EnvironmentEntry[];
  proposedChecks: CheckEntry[];
  activeChecks: CheckEntry[];
}

const initialState: FormState = {
  useExistingProvider: false,
  existingProviderName: '',
  providerName: '',
  providerType: 'github',
  githubAppId: '',
  githubInstallationId: '',
  credential: '',
  providerDomain: '',
  azureOrg: '',

  useExistingRepo: false,
  existingRepoName: '',
  repoName: '',
  repoOwner: '',
  repoProjectName: '',
  gitlabNamespace: '',

  psName: '',
  environments: [
    { branch: 'env/dev', autoMerge: true },
    { branch: 'env/staging', autoMerge: true },
    { branch: 'env/prod', autoMerge: false },
  ],
  proposedChecks: [],
  activeChecks: [],
};

export const PromotionCreatePage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const history = useHistory();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string[]>([]);

  const [existingProviders] = useScmProviders(instance.namespace);
  const [existingRepos] = useGitRepositories(instance.namespace);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateEnv = (index: number, field: keyof EnvironmentEntry, value: string | boolean) =>
    setForm((prev) => ({
      ...prev,
      environments: prev.environments.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }));

  const addEnvironment = () => update('environments', [...form.environments, { branch: '', autoMerge: true }]);
  const removeEnvironment = (index: number) => update('environments', form.environments.filter((_, i) => i !== index));

  const addCheck = (type: 'proposedChecks' | 'activeChecks') => update(type, [...form[type], { key: '' }]);
  const updateCheck = (type: 'proposedChecks' | 'activeChecks', index: number, key: string) =>
    update(type, form[type].map((c, i) => (i === index ? { key } : c)));
  const removeCheck = (type: 'proposedChecks' | 'activeChecks', index: number) =>
    update(type, form[type].filter((_, i) => i !== index));

  const resolvedProviderName = form.useExistingProvider ? form.existingProviderName : form.providerName;
  const resolvedRepoName = form.useExistingRepo ? form.existingRepoName : form.repoName;

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    setCreationProgress([]);
    const ns = instance.namespace;

    try {
      if (!form.useExistingProvider) {
        const secretName = `${form.providerName}-credentials`;
        setCreationProgress((prev) => [...prev, t('Creating Secret...')]);
        await k8sCreate({
          model: SecretModel,
          data: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: secretName, namespace: ns },
            type: 'Opaque',
            stringData: { [SECRET_KEY[form.providerType]]: form.credential },
          },
        });
        setCreationProgress((prev) => [...prev, t('Secret created')]);

        setCreationProgress((prev) => [...prev, t('Creating SCM Provider...')]);
        await k8sCreate({
          model: ScmProviderModel,
          data: {
            apiVersion: 'promoter.argoproj.io/v1alpha1',
            kind: 'ScmProvider',
            metadata: { name: form.providerName, namespace: ns },
            spec: { ...buildProviderSpec(form.providerType, form), secretRef: { name: secretName } },
          },
        });
        setCreationProgress((prev) => [...prev, t('SCM Provider created')]);
      }

      if (!form.useExistingRepo) {
        setCreationProgress((prev) => [...prev, t('Creating Git Repository...')]);
        await k8sCreate({
          model: GitRepositoryModel,
          data: {
            apiVersion: 'promoter.argoproj.io/v1alpha1',
            kind: 'GitRepository',
            metadata: { name: form.repoName, namespace: ns },
            spec: buildRepoSpec(form.providerType, resolvedProviderName, form),
          },
        });
        setCreationProgress((prev) => [...prev, t('Git Repository created')]);
      }

      setCreationProgress((prev) => [...prev, t('Creating Promotion Strategy...')]);
      await k8sCreate({
        model: PromotionStrategyModel,
        data: {
          apiVersion: 'promoter.argoproj.io/v1alpha1',
          kind: 'PromotionStrategy',
          metadata: { name: form.psName, namespace: ns },
          spec: {
            gitRepositoryRef: { name: resolvedRepoName },
            environments: form.environments.filter((e) => e.branch.trim()).map((e) => ({
              branch: e.branch.trim(),
              ...(e.autoMerge ? {} : { autoMerge: false }),
            })),
            ...(form.proposedChecks.filter((c) => c.key.trim()).length > 0
              ? { proposedCommitStatuses: form.proposedChecks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() })) }
              : {}),
            ...(form.activeChecks.filter((c) => c.key.trim()).length > 0
              ? { activeCommitStatuses: form.activeChecks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() })) }
              : {}),
          },
        },
      });
      setCreationProgress((prev) => [...prev, t('Promotion Strategy created')]);

      history.push(`/k8s/ns/${ns}/promoter.argoproj.io~v1alpha1~PromotionStrategy/${form.psName}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const isValid = form.psName.trim()
    && (form.useExistingProvider || form.providerName.trim())
    && (form.useExistingRepo || (form.repoName.trim() && form.repoOwner.trim()))
    && form.environments.filter((e) => e.branch.trim()).length >= 2;

  return (
    <React.Fragment>
      <DocumentTitle>{t('Create Promotion Pipeline')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">{t('Create Promotion Pipeline')}</Title>

        {error && (
          <Alert variant="danger" isInline title={t('Error')} className="pf-v6-u-mb-md">
            {error}
            {creationProgress.length > 0 && (
              <List className="pf-v6-u-mt-sm">
                {creationProgress.map((msg, i) => <ListItem key={i}>{msg}</ListItem>)}
              </List>
            )}
          </Alert>
        )}

        <Wizard onSave={handleCreate} onClose={() => history.goBack()}>
          <WizardStep name={t('SCM Provider')} id="provider">
            <Form>
              {existingProviders.length > 0 && (
                <FormGroup fieldId="use-existing-provider">
                  <Switch
                    id="use-existing-provider"
                    label={t('Use existing SCM Provider')}
                    isChecked={form.useExistingProvider}
                    onChange={(_e, val) => update('useExistingProvider', val)}
                  />
                </FormGroup>
              )}

              {form.useExistingProvider ? (
                <FormGroup label={t('SCM Provider')} isRequired fieldId="existing-provider">
                  <FormSelect
                    id="existing-provider"
                    value={form.existingProviderName}
                    onChange={(_e, val) => update('existingProviderName', val)}
                  >
                    <FormSelectOption value="" label={t('Select a provider...')} isDisabled />
                    {existingProviders.map((p) => (
                      <FormSelectOption
                        key={(p.metadata as Record<string, string>)?.name}
                        value={(p.metadata as Record<string, string>)?.name}
                        label={(p.metadata as Record<string, string>)?.name}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>
              ) : (
                <>
                  <FormGroup label={t('Provider Name')} isRequired fieldId="provider-name">
                    <TextInput id="provider-name" value={form.providerName} onChange={(_e, val) => update('providerName', val)} isRequired />
                  </FormGroup>
                  <FormGroup label={t('Provider Type')} isRequired fieldId="provider-type">
                    <FormSelect id="provider-type" value={form.providerType} onChange={(_e, val) => update('providerType', val as ProviderType)}>
                      {PROVIDER_OPTIONS.map((o) => <FormSelectOption key={o.value} value={o.value} label={o.label} />)}
                    </FormSelect>
                  </FormGroup>

                  {form.providerType === 'github' && (
                    <>
                      <Alert variant="info" isInline isPlain title={t('GitHub App required')} className="pf-v6-u-mb-sm">
                        <Button variant="link" component="a" href="https://github.com/settings/apps/new" target="_blank" rel="noopener noreferrer" icon={<ExternalLinkAltIcon />} iconPosition="end">
                          {t('Create a GitHub App')}
                        </Button>
                        {' '}{t('with Checks, Contents, and Pull requests (Read & Write) permissions.')}
                      </Alert>
                      <FormGroup label={t('App ID')} isRequired fieldId="github-app-id">
                        <TextInput id="github-app-id" value={form.githubAppId} onChange={(_e, val) => update('githubAppId', val)} isRequired />
                      </FormGroup>
                      <FormGroup label={t('Installation ID')} fieldId="github-installation-id" helperText={t('Found at github.com/settings/installations/<ID>. Optional if single org.')}>
                        <TextInput id="github-installation-id" value={form.githubInstallationId} onChange={(_e, val) => update('githubInstallationId', val)} />
                      </FormGroup>
                      <FormGroup label={t('Private Key (.pem)')} isRequired fieldId="github-pem">
                        <FileUpload
                          id="github-pem"
                          type="text"
                          value={form.credential}
                          onTextChange={(_e, val) => update('credential', val)}
                          onDataChange={(_e, val) => update('credential', val)}
                          onClearClick={() => update('credential', '')}
                          browseButtonText={t('Upload')}
                          filename={form.credential ? 'private-key.pem' : ''}
                        />
                      </FormGroup>
                    </>
                  )}

                  {form.providerType === 'gitlab' && (
                    <>
                      <FormGroup label={t('Access Token')} isRequired fieldId="gitlab-token" helperText={t('Developer role, api + write_repository scopes')}>
                        <TextInput id="gitlab-token" type="password" value={form.credential} onChange={(_e, val) => update('credential', val)} isRequired />
                      </FormGroup>
                      <FormGroup label={t('Domain')} fieldId="gitlab-domain" helperText={t('Leave blank for gitlab.com')}>
                        <TextInput id="gitlab-domain" value={form.providerDomain} onChange={(_e, val) => update('providerDomain', val)} placeholder="gitlab.mycompany.com" />
                      </FormGroup>
                    </>
                  )}

                  {(form.providerType === 'gitea' || form.providerType === 'forgejo') && (
                    <>
                      <FormGroup label={t('Access Token')} isRequired fieldId="token">
                        <TextInput id="token" type="password" value={form.credential} onChange={(_e, val) => update('credential', val)} isRequired />
                      </FormGroup>
                      <FormGroup label={t('Domain')} isRequired fieldId="domain">
                        <TextInput id="domain" value={form.providerDomain} onChange={(_e, val) => update('providerDomain', val)} isRequired placeholder={form.providerType === 'forgejo' ? 'codeberg.org' : 'gitea.mycompany.com'} />
                      </FormGroup>
                    </>
                  )}

                  {form.providerType === 'bitbucketCloud' && (
                    <FormGroup label={t('Repository Access Token')} isRequired fieldId="bb-token" helperText={t('Repositories + Pull Requests (Read/Write)')}>
                      <TextInput id="bb-token" type="password" value={form.credential} onChange={(_e, val) => update('credential', val)} isRequired />
                    </FormGroup>
                  )}

                  {form.providerType === 'azureDevOps' && (
                    <>
                      <FormGroup label={t('Personal Access Token')} isRequired fieldId="azure-token" helperText={t('Read & Write on scope Code')}>
                        <TextInput id="azure-token" type="password" value={form.credential} onChange={(_e, val) => update('credential', val)} isRequired />
                      </FormGroup>
                      <FormGroup label={t('Organization')} isRequired fieldId="azure-org">
                        <TextInput id="azure-org" value={form.azureOrg} onChange={(_e, val) => update('azureOrg', val)} isRequired />
                      </FormGroup>
                    </>
                  )}
                </>
              )}
            </Form>
          </WizardStep>

          <WizardStep name={t('Git Repository')} id="repo">
            <Form>
              {existingRepos.length > 0 && (
                <FormGroup fieldId="use-existing-repo">
                  <Switch
                    id="use-existing-repo"
                    label={t('Use existing Git Repository')}
                    isChecked={form.useExistingRepo}
                    onChange={(_e, val) => update('useExistingRepo', val)}
                  />
                </FormGroup>
              )}

              {form.useExistingRepo ? (
                <FormGroup label={t('Git Repository')} isRequired fieldId="existing-repo">
                  <FormSelect
                    id="existing-repo"
                    value={form.existingRepoName}
                    onChange={(_e, val) => update('existingRepoName', val)}
                  >
                    <FormSelectOption value="" label={t('Select a repository...')} isDisabled />
                    {existingRepos.map((r) => (
                      <FormSelectOption
                        key={(r.metadata as Record<string, string>)?.name}
                        value={(r.metadata as Record<string, string>)?.name}
                        label={(r.metadata as Record<string, string>)?.name}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>
              ) : (
                <>
                  <FormGroup label={form.providerType === 'azureDevOps' ? t('Project') : t('Owner')} isRequired fieldId="repo-owner">
                    <TextInput id="repo-owner" value={form.repoOwner} onChange={(_e, val) => update('repoOwner', val)} isRequired
                      placeholder={form.providerType === 'azureDevOps' ? 'MyProject' : 'my-org'}
                    />
                  </FormGroup>
                  <FormGroup label={t('Repository Name')} isRequired fieldId="repo-name">
                    <TextInput id="repo-name" value={form.repoName} onChange={(_e, val) => update('repoName', val)} isRequired />
                  </FormGroup>
                  {form.providerType === 'gitlab' && (
                    <FormGroup label={t('GitLab Namespace')} fieldId="gitlab-ns" helperText={t('User, group, or group/subgroup')}>
                      <TextInput id="gitlab-ns" value={form.gitlabNamespace} onChange={(_e, val) => update('gitlabNamespace', val)} />
                    </FormGroup>
                  )}
                </>
              )}
            </Form>
          </WizardStep>

          <WizardStep name={t('Environments')} id="envs">
            <Form>
              {form.environments.map((env, i) => (
                <Flex key={i} className="pf-v6-u-mb-sm" alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem grow={{ default: 'grow' }}>
                    <TextInput
                      aria-label={t('Branch {{n}}', { n: i + 1 })}
                      value={env.branch}
                      onChange={(_e, val) => updateEnv(i, 'branch', val)}
                      placeholder="env/dev"
                    />
                  </FlexItem>
                  <FlexItem>
                    <Checkbox id={`auto-merge-${i}`} label={t('Auto-merge')} isChecked={env.autoMerge} onChange={(_e, val) => updateEnv(i, 'autoMerge', val)} />
                  </FlexItem>
                  <FlexItem>
                    <Button variant="plain" aria-label={t('Remove environment')} onClick={() => removeEnvironment(i)} isDisabled={form.environments.length <= 2}>
                      <MinusCircleIcon />
                    </Button>
                  </FlexItem>
                </Flex>
              ))}
              <Button variant="link" icon={<PlusCircleIcon />} onClick={addEnvironment}>{t('Add Environment')}</Button>
            </Form>
          </WizardStep>

          <WizardStep name={t('Gates')} id="gates">
            <Form>
              <FormGroup label={t('Proposed checks (must pass before merge)')} fieldId="proposed-checks">
                {form.proposedChecks.map((c, i) => (
                  <Flex key={i} className="pf-v6-u-mb-xs" alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                      <TextInput aria-label={t('Proposed check {{n}}', { n: i + 1 })} value={c.key} onChange={(_e, val) => updateCheck('proposedChecks', i, val)} placeholder="integration-tests" />
                    </FlexItem>
                    <FlexItem><Button variant="plain" aria-label={t('Remove check')} onClick={() => removeCheck('proposedChecks', i)}><MinusCircleIcon /></Button></FlexItem>
                  </Flex>
                ))}
                <Button variant="link" icon={<PlusCircleIcon />} onClick={() => addCheck('proposedChecks')}>{t('Add check')}</Button>
              </FormGroup>
              <FormGroup label={t('Active checks (must pass after merge)')} fieldId="active-checks">
                {form.activeChecks.map((c, i) => (
                  <Flex key={i} className="pf-v6-u-mb-xs" alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                      <TextInput aria-label={t('Active check {{n}}', { n: i + 1 })} value={c.key} onChange={(_e, val) => updateCheck('activeChecks', i, val)} placeholder="argocd-health" />
                    </FlexItem>
                    <FlexItem><Button variant="plain" aria-label={t('Remove check')} onClick={() => removeCheck('activeChecks', i)}><MinusCircleIcon /></Button></FlexItem>
                  </Flex>
                ))}
                <Button variant="link" icon={<PlusCircleIcon />} onClick={() => addCheck('activeChecks')}>{t('Add check')}</Button>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name={t('Review')} id="review" footer={{ isNextDisabled: !isValid || creating, nextButtonText: creating ? t('Creating...') : t('Create') }}>
            <Form>
              <Title headingLevel="h3" className="pf-v6-u-mb-md">{t('Resources to create')}</Title>

              {!form.useExistingProvider && (
                <>
                  <FormGroup fieldId="review-secret">
                    <Label isCompact color="blue">{t('Secret')}</Label>{' '}
                    {form.providerName}-credentials
                  </FormGroup>
                  <FormGroup fieldId="review-provider">
                    <Label isCompact color="blue">{t('ScmProvider')}</Label>{' '}
                    {form.providerName} ({PROVIDER_OPTIONS.find((o) => o.value === form.providerType)?.label})
                  </FormGroup>
                </>
              )}
              {form.useExistingProvider && (
                <FormGroup fieldId="review-existing-provider">
                  <Label isCompact color="grey">{t('ScmProvider')}</Label>{' '}
                  {form.existingProviderName} ({t('existing')})
                </FormGroup>
              )}

              {!form.useExistingRepo && (
                <FormGroup fieldId="review-repo">
                  <Label isCompact color="blue">{t('GitRepository')}</Label>{' '}
                  {form.repoOwner}/{form.repoName}
                </FormGroup>
              )}
              {form.useExistingRepo && (
                <FormGroup fieldId="review-existing-repo">
                  <Label isCompact color="grey">{t('GitRepository')}</Label>{' '}
                  {form.existingRepoName} ({t('existing')})
                </FormGroup>
              )}

              <FormGroup fieldId="review-strategy">
                <Label isCompact color="blue">{t('PromotionStrategy')}</Label>{' '}
                {form.psName}
              </FormGroup>

              <FormGroup label={t('Pipeline Name')} fieldId="ps-name" isRequired>
                <TextInput id="ps-name" value={form.psName} onChange={(_e, val) => update('psName', val)} isRequired />
              </FormGroup>

              <FormGroup label={t('Environment chain')} fieldId="review-envs">
                <TextInput id="review-envs" value={form.environments.map((e) => e.branch).filter(Boolean).join(' → ')} isDisabled />
              </FormGroup>

              {creationProgress.length > 0 && (
                <List>
                  {creationProgress.map((msg, i) => <ListItem key={i}>{msg}</ListItem>)}
                </List>
              )}
            </Form>
          </WizardStep>
        </Wizard>
      </PageSection>
    </React.Fragment>
  );
};

const PromotionCreatePageWithProvider = () => (
  <InstanceProvider>
    <PromotionCreatePage />
  </InstanceProvider>
);
export default PromotionCreatePageWithProvider;
