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
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { PromotionStrategyModel } from '../../models';
import { InstanceProvider } from '../shared/InstanceProvider';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';

interface EnvironmentEntry {
  branch: string;
  autoMerge: boolean;
}

interface CheckEntry {
  key: string;
}

interface FormState {
  name: string;
  gitRepositoryRef: string;
  environments: EnvironmentEntry[];
  proposedChecks: CheckEntry[];
  activeChecks: CheckEntry[];
}

const initialState: FormState = {
  name: '',
  gitRepositoryRef: '',
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

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateEnv = (index: number, field: keyof EnvironmentEntry, value: string | boolean) =>
    setForm((prev) => ({
      ...prev,
      environments: prev.environments.map((e, i) =>
        i === index ? { ...e, [field]: value } : e,
      ),
    }));

  const addEnvironment = () =>
    updateField('environments', [...form.environments, { branch: '', autoMerge: true }]);

  const removeEnvironment = (index: number) =>
    updateField('environments', form.environments.filter((_, i) => i !== index));

  const addCheck = (type: 'proposedChecks' | 'activeChecks') =>
    updateField(type, [...form[type], { key: '' }]);

  const updateCheck = (type: 'proposedChecks' | 'activeChecks', index: number, key: string) =>
    updateField(
      type,
      form[type].map((c, i) => (i === index ? { key } : c)),
    );

  const removeCheck = (type: 'proposedChecks' | 'activeChecks', index: number) =>
    updateField(type, form[type].filter((_, i) => i !== index));

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const resource = {
        apiVersion: 'promoter.argoproj.io/v1alpha1',
        kind: 'PromotionStrategy',
        metadata: {
          name: form.name,
          namespace: instance.namespace,
        },
        spec: {
          gitRepositoryRef: { name: form.gitRepositoryRef },
          environments: form.environments
            .filter((e) => e.branch.trim())
            .map((e) => ({
              branch: e.branch.trim(),
              ...(e.autoMerge ? {} : { autoMerge: false }),
            })),
          ...(form.proposedChecks.length > 0
            ? { proposedCommitStatuses: form.proposedChecks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() })) }
            : {}),
          ...(form.activeChecks.length > 0
            ? { activeCommitStatuses: form.activeChecks.filter((c) => c.key.trim()).map((c) => ({ key: c.key.trim() })) }
            : {}),
        },
      };
      await k8sCreate({ model: PromotionStrategyModel, data: resource });
      history.push(`/k8s/ns/${instance.namespace}/promoter.argoproj.io~v1alpha1~PromotionStrategy/${form.name}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const isValid = form.name.trim() && form.gitRepositoryRef.trim() && form.environments.some((e) => e.branch.trim());

  return (
    <React.Fragment>
      <DocumentTitle>{t('Create Promotion Pipeline')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">{t('Create Promotion Pipeline')}</Title>

        {error && (
          <Alert variant="danger" isInline title={t('Error creating PromotionStrategy')} className="pf-v6-u-mb-md">
            {error}
          </Alert>
        )}

        <Wizard
          onSave={handleCreate}
          onClose={() => history.goBack()}
        >
          <WizardStep name={t('Repository')} id="repo">
            <Form>
              <FormGroup label={t('Name')} isRequired fieldId="ps-name">
                <TextInput
                  id="ps-name"
                  value={form.name}
                  onChange={(_e, val) => updateField('name', val)}
                  isRequired
                />
              </FormGroup>
              <FormGroup label={t('Git Repository Reference')} isRequired fieldId="ps-repo" helperText={t('Name of the GitRepository CR')}>
                <TextInput
                  id="ps-repo"
                  value={form.gitRepositoryRef}
                  onChange={(_e, val) => updateField('gitRepositoryRef', val)}
                  isRequired
                />
              </FormGroup>
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
                    <Checkbox
                      id={`auto-merge-${i}`}
                      label={t('Auto-merge')}
                      isChecked={env.autoMerge}
                      onChange={(_e, val) => updateEnv(i, 'autoMerge', val)}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="plain"
                      aria-label={t('Remove environment')}
                      onClick={() => removeEnvironment(i)}
                      isDisabled={form.environments.length <= 2}
                    >
                      <MinusCircleIcon />
                    </Button>
                  </FlexItem>
                </Flex>
              ))}
              <Button variant="link" icon={<PlusCircleIcon />} onClick={addEnvironment}>
                {t('Add Environment')}
              </Button>
            </Form>
          </WizardStep>

          <WizardStep name={t('Gates')} id="gates">
            <Form>
              <FormGroup label={t('Proposed checks (must pass before merge)')} fieldId="proposed-checks">
                {form.proposedChecks.map((c, i) => (
                  <Flex key={i} className="pf-v6-u-mb-xs" alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                      <TextInput
                        aria-label={t('Proposed check {{n}}', { n: i + 1 })}
                        value={c.key}
                        onChange={(_e, val) => updateCheck('proposedChecks', i, val)}
                        placeholder="security-scan"
                      />
                    </FlexItem>
                    <FlexItem>
                      <Button variant="plain" aria-label={t('Remove check')} onClick={() => removeCheck('proposedChecks', i)}>
                        <MinusCircleIcon />
                      </Button>
                    </FlexItem>
                  </Flex>
                ))}
                <Button variant="link" icon={<PlusCircleIcon />} onClick={() => addCheck('proposedChecks')}>
                  {t('Add check')}
                </Button>
              </FormGroup>
              <FormGroup label={t('Active checks (must pass after merge)')} fieldId="active-checks">
                {form.activeChecks.map((c, i) => (
                  <Flex key={i} className="pf-v6-u-mb-xs" alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                      <TextInput
                        aria-label={t('Active check {{n}}', { n: i + 1 })}
                        value={c.key}
                        onChange={(_e, val) => updateCheck('activeChecks', i, val)}
                        placeholder="integration-tests"
                      />
                    </FlexItem>
                    <FlexItem>
                      <Button variant="plain" aria-label={t('Remove check')} onClick={() => removeCheck('activeChecks', i)}>
                        <MinusCircleIcon />
                      </Button>
                    </FlexItem>
                  </Flex>
                ))}
                <Button variant="link" icon={<PlusCircleIcon />} onClick={() => addCheck('activeChecks')}>
                  {t('Add check')}
                </Button>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name={t('Review')} id="review" footer={{ isNextDisabled: !isValid || creating, nextButtonText: creating ? t('Creating...') : t('Create') }}>
            <Form>
              <FormGroup label={t('Name')} fieldId="review-name">
                <TextInput id="review-name" value={form.name} isDisabled />
              </FormGroup>
              <FormGroup label={t('Repository')} fieldId="review-repo">
                <TextInput id="review-repo" value={form.gitRepositoryRef} isDisabled />
              </FormGroup>
              <FormGroup label={t('Environment chain')} fieldId="review-envs">
                <TextInput
                  id="review-envs"
                  value={form.environments.map((e) => e.branch).filter(Boolean).join(' → ')}
                  isDisabled
                />
              </FormGroup>
              <FormGroup label={t('Proposed checks')} fieldId="review-proposed">
                <TextInput
                  id="review-proposed"
                  value={form.proposedChecks.map((c) => c.key).filter(Boolean).join(', ') || t('None')}
                  isDisabled
                />
              </FormGroup>
              <FormGroup label={t('Active checks')} fieldId="review-active">
                <TextInput
                  id="review-active"
                  value={form.activeChecks.map((c) => c.key).filter(Boolean).join(', ') || t('None')}
                  isDisabled
                />
              </FormGroup>
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
