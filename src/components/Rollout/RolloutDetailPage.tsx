import React from 'react';
import { useState, type FC } from 'react';
import { useParams } from 'react-router';
import { useK8sWatchResource, DocumentTitle, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Bullseye, Spinner, Alert, Tabs, Tab, TabTitleText,
  Card, CardTitle, CardBody, Label,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Flex, FlexItem, Dropdown, DropdownList, DropdownItem, MenuToggle, Button,
} from '@patternfly/react-core';
import { RolloutGroupVersionKind, RolloutModel } from '../../models';
import type { RolloutResource } from '../../types';
import { RolloutEditTab } from './RolloutEditTab';
import { ConfirmModal } from '../shared/ConfirmModal';


interface DetailPageProps {
  match?: { params: { name: string; ns: string } };
  name?: string;
  namespace?: string;
}

export const RolloutDetailPage: FC<DetailPageProps> = (props) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const routeParams = useParams<{ name: string; ns: string }>();
  const name = props.match?.params?.name ?? props.name ?? routeParams.name;
  const ns = props.match?.params?.ns ?? props.namespace ?? routeParams.ns;
  const [activeTab, setActiveTab] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  const [rollout, loaded, error] = useK8sWatchResource<RolloutResource>({
    groupVersionKind: RolloutGroupVersionKind,
    name,
    namespace: ns,
  });

  if (error) return <PageSection><Alert variant="danger" isInline title={t('Error')}>{(error as Error).message}</Alert></PageSection>;
  if (!loaded || !rollout) return <PageSection><Bullseye><Spinner /></Bullseye></PageSection>;

  const runAction = async (actionName: string, annotation: string, value: string) => {
    setActionsOpen(false); setActionError('');
    try {
      await k8sPatch({ model: RolloutModel, resource: rollout, data: [
        { op: 'add', path: `/metadata/annotations/${annotation.replace(/\//g, '~1')}`, value },
      ] });
    } catch (e) { setActionError(`${actionName}: ${(e as Error).message}`); }
  };

  const isPaused = rollout.status?.phase === 'Paused';
  const strategyType = rollout.spec.strategy?.canary ? 'Canary' : rollout.spec.strategy?.blueGreen ? 'Blue-Green' : 'Unknown';
  const container = rollout.spec.template?.spec?.containers?.[0];

  return (
    <React.Fragment>
      <DocumentTitle>{rollout.metadata.name}</DocumentTitle>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="pf-v6-u-mb-md">
          <FlexItem>
            <Title headingLevel="h1">{rollout.metadata.name}</Title>
            {rollout.status?.phase && <Label isCompact color={rollout.status.phase === 'Healthy' ? 'green' : rollout.status.phase === 'Paused' ? 'blue' : 'grey'}>{rollout.status.phase}</Label>}
          </FlexItem>
          <FlexItem>
            <Dropdown isOpen={actionsOpen} onSelect={() => setActionsOpen(false)} onOpenChange={setActionsOpen}
              toggle={(ref) => <MenuToggle ref={ref} onClick={() => setActionsOpen(!actionsOpen)} variant="primary">{t('Actions')}</MenuToggle>}
            >
              <DropdownList>
                {isPaused && <DropdownItem key="promote" onClick={() => runAction(t('Promote'), 'rollout.argoproj.io/promote', 'true')}>{t('Promote')}</DropdownItem>}
                <DropdownItem key="restart" onClick={() => runAction(t('Restart'), 'rollout.argoproj.io/restart', new Date().toISOString())}>{t('Restart')}</DropdownItem>
                <DropdownItem key="abort" isDanger onClick={() => setShowAbortConfirm(true)}>{t('Abort')}</DropdownItem>
                <DropdownItem key="edit-yaml" component="a" href={`/k8s/ns/${ns}/argoproj.io~v1alpha1~Rollout/${name}/yaml`}>{t('Edit YAML')}</DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
        {actionError && <Alert variant="danger" isInline title={actionError} actionClose={<Button variant="plain" aria-label={t('Close')} onClick={() => setActionError('')}>x</Button>} className="pf-v6-u-mb-md" />}
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>{t('Overview')}</TabTitleText>}>
            <Card className="pf-v6-u-mt-md">
              <CardBody>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Strategy')}</DescriptionListTerm>
                    <DescriptionListDescription><Label isCompact>{strategyType}</Label></DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Replicas')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.replicas ?? '-'}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Phase')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.status?.phase ?? t('Unknown')}</DescriptionListDescription>
                  </DescriptionListGroup>
                  {rollout.status?.currentStepIndex !== undefined && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>{t('Current Step')}</DescriptionListTerm>
                      <DescriptionListDescription>{rollout.status.currentStepIndex}</DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Revision History Limit')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.revisionHistoryLimit ?? 10}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Min Ready Seconds')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.minReadySeconds ?? 0}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Progress Deadline Seconds')}</DescriptionListTerm>
                    <DescriptionListDescription>{rollout.spec.progressDeadlineSeconds ?? 600}</DescriptionListDescription>
                  </DescriptionListGroup>
                  {container && (
                    <>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Image')}</DescriptionListTerm>
                        <DescriptionListDescription>{container.image}</DescriptionListDescription>
                      </DescriptionListGroup>
                      {container.ports?.[0] && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>{t('Container Port')}</DescriptionListTerm>
                          <DescriptionListDescription>{container.ports[0].containerPort}</DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                    </>
                  )}
                </DescriptionList>
              </CardBody>
            </Card>
            {rollout.spec.strategy?.canary && (
              <Card className="pf-v6-u-mt-md">
                <CardTitle>{t('Canary')}</CardTitle>
                <CardBody>
                  <DescriptionList isHorizontal>
                    {rollout.spec.strategy.canary.maxSurge !== undefined && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Max Surge')}</DescriptionListTerm>
                        <DescriptionListDescription>{String(rollout.spec.strategy.canary.maxSurge)}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {rollout.spec.strategy.canary.maxUnavailable !== undefined && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Max Unavailable')}</DescriptionListTerm>
                        <DescriptionListDescription>{String(rollout.spec.strategy.canary.maxUnavailable)}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {rollout.spec.strategy.canary.stableService && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Stable Service')}</DescriptionListTerm>
                        <DescriptionListDescription>{rollout.spec.strategy.canary.stableService}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {rollout.spec.strategy.canary.canaryService && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Canary Service')}</DescriptionListTerm>
                        <DescriptionListDescription>{rollout.spec.strategy.canary.canaryService}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                  </DescriptionList>
                  {rollout.spec.strategy.canary.steps && (
                    <div className="pf-v6-u-mt-md">
                      {rollout.spec.strategy.canary.steps.map((step, i) => {
                        const key = Object.keys(step)[0];
                        const val = step[key];
                        const isCurrent = rollout.status?.currentStepIndex === i;
                        return (
                          <Label key={i} isCompact color={isCurrent ? 'blue' : 'grey'} className="pf-v6-u-mr-sm">
                            {key}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </Label>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
            {rollout.spec.strategy?.blueGreen && (
              <Card className="pf-v6-u-mt-md">
                <CardTitle>{t('Blue-Green')}</CardTitle>
                <CardBody>
                  <DescriptionList isHorizontal>
                    <DescriptionListGroup>
                      <DescriptionListTerm>{t('Active Service')}</DescriptionListTerm>
                      <DescriptionListDescription>{rollout.spec.strategy.blueGreen.activeService ?? '-'}</DescriptionListDescription>
                    </DescriptionListGroup>
                    {rollout.spec.strategy.blueGreen.previewService && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Preview Service')}</DescriptionListTerm>
                        <DescriptionListDescription>{rollout.spec.strategy.blueGreen.previewService}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    <DescriptionListGroup>
                      <DescriptionListTerm>{t('Auto Promotion')}</DescriptionListTerm>
                      <DescriptionListDescription>{rollout.spec.strategy.blueGreen.autoPromotionEnabled !== false ? t('Enabled') : t('Disabled')}</DescriptionListDescription>
                    </DescriptionListGroup>
                    {rollout.spec.strategy.blueGreen.autoPromotionSeconds !== undefined && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Auto Promotion Seconds')}</DescriptionListTerm>
                        <DescriptionListDescription>{rollout.spec.strategy.blueGreen.autoPromotionSeconds}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {rollout.spec.strategy.blueGreen.scaleDownDelaySeconds !== undefined && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Scale Down Delay Seconds')}</DescriptionListTerm>
                        <DescriptionListDescription>{rollout.spec.strategy.blueGreen.scaleDownDelaySeconds}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {rollout.spec.strategy.blueGreen.previewReplicaCount !== undefined && rollout.spec.strategy.blueGreen.previewReplicaCount > 0 && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Preview Replica Count')}</DescriptionListTerm>
                        <DescriptionListDescription>{rollout.spec.strategy.blueGreen.previewReplicaCount}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                  </DescriptionList>
                </CardBody>
              </Card>
            )}
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>{t('Configuration')}</TabTitleText>}>
            <RolloutEditTab rollout={rollout} />
          </Tab>
        </Tabs>
      </PageSection>
      <ConfirmModal title={t('Confirm')} isOpen={showAbortConfirm} onConfirm={() => { setShowAbortConfirm(false); runAction(t('Abort'), 'rollout.argoproj.io/abort', 'true'); }} onCancel={() => setShowAbortConfirm(false)} confirmLabel={t('Abort')}>
        {t('Are you sure you want to abort the rollout {{name}}?', { name: rollout.metadata.name })}
      </ConfirmModal>
    </React.Fragment>
  );
};

export default RolloutDetailPage;
