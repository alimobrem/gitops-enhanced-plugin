import React from 'react';
import { useState, type FC } from 'react';
import { useParams } from 'react-router';
import { useK8sWatchResource, DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  PageSection, Title, Bullseye, Spinner, Alert, Tabs, Tab, TabTitleText,
  Card, CardTitle, CardBody, Label,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Flex, FlexItem, Dropdown, DropdownList, DropdownItem, MenuToggle,
} from '@patternfly/react-core';
import { RolloutGroupVersionKind } from '../../models';
import { RolloutEditTab } from './RolloutEditTab';

interface RolloutResource {
  metadata: { name: string; namespace: string; uid: string };
  spec: {
    replicas?: number;
    strategy?: {
      canary?: { steps?: Array<Record<string, unknown>> };
      blueGreen?: { activeService?: string; previewService?: string };
    };
    template?: { spec?: { containers?: Array<{ name: string; image: string; ports?: Array<{ containerPort: number }> }> } };
  };
  status?: { phase?: string; currentStepIndex?: number; replicas?: number; updatedReplicas?: number; readyReplicas?: number; availableReplicas?: number };
}

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

  const [rollout, loaded, error] = useK8sWatchResource<RolloutResource>({
    groupVersionKind: RolloutGroupVersionKind,
    name,
    namespace: ns,
  });

  if (error) return <PageSection><Alert variant="danger" isInline title={t('Error')}>{(error as Error).message}</Alert></PageSection>;
  if (!loaded || !rollout) return <PageSection><Bullseye><Spinner /></Bullseye></PageSection>;

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
                <DropdownItem key="edit-yaml" component="a" href={`/k8s/ns/${ns}/argoproj.io~v1alpha1~Rollout/${name}/yaml`}>{t('Edit YAML')}</DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
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
                  {container && (
                    <>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('Image')}</DescriptionListTerm>
                        <DescriptionListDescription>{container.image}</DescriptionListDescription>
                      </DescriptionListGroup>
                      {container.ports?.[0] && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>{t('Port')}</DescriptionListTerm>
                          <DescriptionListDescription>{container.ports[0].containerPort}</DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                    </>
                  )}
                </DescriptionList>
              </CardBody>
            </Card>
            {rollout.spec.strategy?.canary?.steps && (
              <Card className="pf-v6-u-mt-md">
                <CardTitle>{t('Canary Steps')}</CardTitle>
                <CardBody>
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
                </CardBody>
              </Card>
            )}
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>{t('Configuration')}</TabTitleText>}>
            <RolloutEditTab rollout={rollout} />
          </Tab>
        </Tabs>
      </PageSection>
    </React.Fragment>
  );
};

export default RolloutDetailPage;
