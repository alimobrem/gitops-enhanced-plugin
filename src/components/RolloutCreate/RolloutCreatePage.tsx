import React from 'react';
import { useState, type FC } from 'react';
import { useHistory } from 'react-router-dom';
import { k8sCreate, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Wizard, WizardStep, Form, FormGroup, TextInput,
  Alert, Button, FormSelect, FormSelectOption, NumberInput,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { RolloutModel } from '../../models';

interface CanaryStep {
  type: 'setWeight' | 'pause';
  value: number;
}

export const RolloutCreatePage: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const history = useHistory();
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [replicas, setReplicas] = useState(3);
  const [strategy, setStrategy] = useState<'canary' | 'blueGreen'>('canary');
  const [steps, setSteps] = useState<CanaryStep[]>([
    { type: 'setWeight', value: 20 },
    { type: 'pause', value: 30 },
    { type: 'setWeight', value: 50 },
    { type: 'pause', value: 30 },
  ]);
  const [bgActiveService, setBgActiveService] = useState('');
  const [bgPreviewService, setBgPreviewService] = useState('');
  const [image, setImage] = useState('nginx:latest');
  const [port, setPort] = useState(80);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const buildStrategy = () => {
    if (strategy === 'canary') {
      return {
        canary: {
          steps: steps.map((s) =>
            s.type === 'setWeight' ? { setWeight: s.value } : { pause: { duration: `${s.value}s` } },
          ),
        },
      };
    }
    return { blueGreen: { activeService: bgActiveService, previewService: bgPreviewService, autoPromotionEnabled: true } };
  };

  const handleCreate = async () => {
    setError(''); setCreating(true);
    try {
      const resource = {
        apiVersion: 'argoproj.io/v1alpha1', kind: 'Rollout',
        metadata: { name, namespace },
        spec: {
          replicas,
          revisionHistoryLimit: 3,
          selector: { matchLabels: { app: name } },
          strategy: buildStrategy(),
          template: {
            metadata: { labels: { app: name } },
            spec: {
              containers: [{ name: 'app', image, ports: [{ containerPort: port }] }],
            },
          },
        },
      };
      await k8sCreate({ model: RolloutModel, data: resource });
      history.push(`/k8s/ns/${namespace}/argoproj.io~v1alpha1~Rollout/${name}`);
    } catch (e) { setError((e as Error).message); } finally { setCreating(false); }
  };

  return (
    <>
      <DocumentTitle>{t('Create Rollout')}</DocumentTitle>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-md">{t('Create Rollout')}</Title>
        {error && <Alert variant="danger" isInline title={t('Error')} className="pf-v6-u-mb-md">{error}</Alert>}
        <Wizard onClose={() => history.goBack()}>
          <WizardStep name={t('Basics')} id="basics">
            <Form>
              <FormGroup label={t('Name')} isRequired fieldId="name">
                <TextInput id="name" isRequired value={name} onChange={(_e, v) => setName(v)} />
              </FormGroup>
              <FormGroup label={t('Namespace')} isRequired fieldId="ns">
                <TextInput id="ns" isRequired value={namespace} onChange={(_e, v) => setNamespace(v)} />
              </FormGroup>
              <FormGroup label={t('Replicas')} fieldId="replicas">
                <NumberInput value={replicas} onMinus={() => setReplicas(Math.max(1, replicas - 1))} onPlus={() => setReplicas(replicas + 1)} min={1} />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Strategy')} id="strategy">
            <Form>
              <FormGroup label={t('Strategy Type')} fieldId="stratType">
                <FormSelect id="stratType" value={strategy} onChange={(_e, v) => setStrategy(v as 'canary' | 'blueGreen')}>
                  <FormSelectOption value="canary" label={t('Canary')} />
                  <FormSelectOption value="blueGreen" label={t('Blue-Green')} />
                </FormSelect>
              </FormGroup>
              {strategy === 'canary' && (
                <>
                  {steps.map((s, i) => (
                    <FormGroup key={i} label={i === 0 ? t('Canary Steps') : undefined} fieldId={`step-${i}`}>
                      <div className="pf-v6-u-display-flex pf-v6-u-align-items-center">
                        <FormSelect value={s.type} onChange={(_e, v) => { const n = [...steps]; n[i] = { ...n[i], type: v as 'setWeight' | 'pause' }; setSteps(n); }}>
                          <FormSelectOption value="setWeight" label={t('Set Weight (%)')} />
                          <FormSelectOption value="pause" label={t('Pause (seconds)')} />
                        </FormSelect>
                        <NumberInput value={s.value} className="pf-v6-u-ml-sm"
                          onMinus={() => { const n = [...steps]; n[i] = { ...n[i], value: Math.max(0, n[i].value - (s.type === 'setWeight' ? 10 : 10)) }; setSteps(n); }}
                          onPlus={() => { const n = [...steps]; n[i] = { ...n[i], value: n[i].value + (s.type === 'setWeight' ? 10 : 10) }; setSteps(n); }}
                          min={0} max={s.type === 'setWeight' ? 100 : 3600} />
                        <Button variant="plain" onClick={() => setSteps(steps.filter((_, j) => j !== i))} isDisabled={steps.length <= 1}><MinusCircleIcon /></Button>
                      </div>
                    </FormGroup>
                  ))}
                  <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setSteps([...steps, { type: 'setWeight', value: 50 }])}>{t('Add step')}</Button>
                </>
              )}
              {strategy === 'blueGreen' && (
                <>
                  <FormGroup label={t('Active Service')} fieldId="activeSvc">
                    <TextInput id="activeSvc" value={bgActiveService} onChange={(_e, v) => setBgActiveService(v)} placeholder="my-app-active" />
                  </FormGroup>
                  <FormGroup label={t('Preview Service')} fieldId="previewSvc">
                    <TextInput id="previewSvc" value={bgPreviewService} onChange={(_e, v) => setBgPreviewService(v)} placeholder="my-app-preview" />
                  </FormGroup>
                </>
              )}
            </Form>
          </WizardStep>
          <WizardStep name={t('Container')} id="container">
            <Form>
              <FormGroup label={t('Image')} isRequired fieldId="image">
                <TextInput id="image" isRequired value={image} onChange={(_e, v) => setImage(v)} />
              </FormGroup>
              <FormGroup label={t('Port')} fieldId="port">
                <NumberInput value={port} onMinus={() => setPort(Math.max(1, port - 1))} onPlus={() => setPort(port + 1)} min={1} max={65535} />
              </FormGroup>
            </Form>
          </WizardStep>
          <WizardStep name={t('Review')} id="review" footer={{ nextButtonText: t('Create'), onNext: handleCreate, isNextDisabled: creating || !name || !image }}>
            <Form>
              <FormGroup label={t('Name')}>{name}</FormGroup>
              <FormGroup label={t('Namespace')}>{namespace}</FormGroup>
              <FormGroup label={t('Replicas')}>{replicas}</FormGroup>
              <FormGroup label={t('Strategy')}>{strategy}</FormGroup>
              <FormGroup label={t('Image')}>{image}</FormGroup>
              <FormGroup label={t('Port')}>{port}</FormGroup>
            </Form>
          </WizardStep>
        </Wizard>
      </PageSection>
    </>
  );
};

export default RolloutCreatePage;
