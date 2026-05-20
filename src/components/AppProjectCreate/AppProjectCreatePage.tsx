import React from 'react';
import { useState, type FC } from 'react';
import { useHistory } from 'react-router-dom';
import { k8sCreate, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Wizard, WizardStep, Form, FormGroup, TextInput,
  Alert, Button, Checkbox,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { AppProjectModel } from '../../models';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';
import { InstanceProvider } from '../shared/InstanceProvider';

export const AppProjectCreatePage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance } = useCurrentInstance();
  const history = useHistory();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allRepos, setAllRepos] = useState(true);
  const [repos, setRepos] = useState<string[]>(['']);
  const [allDests, setAllDests] = useState(true);
  const [dests, setDests] = useState<Array<{ server: string; namespace: string }>>([{ server: 'https://kubernetes.default.svc', namespace: '' }]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setError(''); setCreating(true);
    try {
      const resource = {
        apiVersion: 'argoproj.io/v1alpha1', kind: 'AppProject',
        metadata: { name, namespace: instance.namespace },
        spec: {
          description,
          sourceRepos: allRepos ? ['*'] : repos.filter(Boolean),
          destinations: allDests ? [{ server: '*', namespace: '*' }] : dests.filter((d) => d.server || d.namespace),
          clusterResourceWhitelist: [{ group: '*', kind: '*' }],
        },
      };
      await k8sCreate({ model: AppProjectModel, data: resource });
      history.push(`/k8s/ns/${instance.namespace}/argoproj.io~v1alpha1~AppProject/${name}`);
    } catch (e) { setError((e as Error).message); } finally { setCreating(false); }
  };

  return (
    <>
      <DocumentTitle>{t('Create AppProject')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">{t('Create AppProject')}</Title>
        {error && <Alert variant="danger" isInline title={t('Error')} className="pf-v6-u-mb-md">{error}</Alert>}
        <Wizard onClose={() => history.goBack()}>
          <WizardStep name={t('Basics')} id="basics">
            <Form>
              <FormGroup label={t('Name')} isRequired fieldId="name">
                <TextInput id="name" isRequired value={name} onChange={(_e, v) => setName(v)} />
              </FormGroup>
              <FormGroup label={t('Description')} fieldId="desc">
                <TextInput id="desc" value={description} onChange={(_e, v) => setDescription(v)} />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Source Repos')} id="repos">
            <Form>
              <FormGroup fieldId="allRepos">
                <Checkbox id="allRepos" label={t('Allow all repositories (*)')} isChecked={allRepos} onChange={(_e, v) => setAllRepos(v)} />
              </FormGroup>
              {!allRepos && repos.map((r, i) => (
                <FormGroup key={i} label={i === 0 ? t('Repository URL patterns') : undefined} fieldId={`repo-${i}`}>
                  <div className="pf-v6-u-display-flex pf-v6-u-align-items-center">
                    <TextInput id={`repo-${i}`} value={r} onChange={(_e, v) => { const n = [...repos]; n[i] = v; setRepos(n); }} placeholder="https://github.com/org/*" />
                    <Button variant="plain" onClick={() => setRepos(repos.filter((_, j) => j !== i))} isDisabled={repos.length <= 1}><MinusCircleIcon /></Button>
                  </div>
                </FormGroup>
              ))}
              {!allRepos && <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setRepos([...repos, ''])}>{t('Add repository')}</Button>}
            </Form>
          </WizardStep>
          <WizardStep name={t('Destinations')} id="dests">
            <Form>
              <FormGroup fieldId="allDests">
                <Checkbox id="allDests" label={t('Allow all destinations (*/*)')} isChecked={allDests} onChange={(_e, v) => setAllDests(v)} />
              </FormGroup>
              {!allDests && dests.map((d, i) => (
                <FormGroup key={i} label={i === 0 ? t('Server / Namespace pairs') : undefined} fieldId={`dest-${i}`}>
                  <div className="pf-v6-u-display-flex pf-v6-u-align-items-center">
                    <TextInput value={d.server} onChange={(_e, v) => { const n = [...dests]; n[i] = { ...n[i], server: v }; setDests(n); }} placeholder="https://kubernetes.default.svc" />
                    <span className="pf-v6-u-mx-sm">/</span>
                    <TextInput value={d.namespace} onChange={(_e, v) => { const n = [...dests]; n[i] = { ...n[i], namespace: v }; setDests(n); }} placeholder="my-namespace" />
                    <Button variant="plain" onClick={() => setDests(dests.filter((_, j) => j !== i))} isDisabled={dests.length <= 1}><MinusCircleIcon /></Button>
                  </div>
                </FormGroup>
              ))}
              {!allDests && <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setDests([...dests, { server: 'https://kubernetes.default.svc', namespace: '' }])}>{t('Add destination')}</Button>}
            </Form>
          </WizardStep>
          <WizardStep name={t('Review')} id="review" footer={{ nextButtonText: t('Create'), onNext: handleCreate, isNextDisabled: creating || !name }}>
            <Form>
              <FormGroup label={t('Name')}>{name}</FormGroup>
              <FormGroup label={t('Description')}>{description || '-'}</FormGroup>
              <FormGroup label={t('Source Repos')}>{allRepos ? t('All (*)') : repos.filter(Boolean).join(', ')}</FormGroup>
              <FormGroup label={t('Destinations')}>{allDests ? t('All (*/*)')  : dests.map((d) => `${d.server}/${d.namespace}`).join(', ')}</FormGroup>
            </Form>
          </WizardStep>
        </Wizard>
      </PageSection>
    </>
  );
};

const Wrapped = () => (<InstanceProvider><AppProjectCreatePage /></InstanceProvider>);
export default Wrapped;
