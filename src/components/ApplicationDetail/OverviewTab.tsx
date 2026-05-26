import React from 'react';
import { useState, type FC } from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import {
  Bullseye,
  Spinner,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Switch,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationModel } from '../../models';
import { safePatch } from '../../utils/patch';
import type { ApplicationResource } from '../../types';
import { getApplicationSource } from '../../utils/application';

export const OverviewTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [patchError, setPatchError] = useState('');
  if (!app?.metadata) return <Bullseye><Spinner /></Bullseye>;
  const source = getApplicationSource(app);

  const isAutoSync = !!app.spec?.syncPolicy?.automated;
  const isPrune = !!app.spec?.syncPolicy?.automated?.prune;
  const isSelfHeal = !!app.spec?.syncPolicy?.automated?.selfHeal;

  const toggleAutoSync = async () => {
    setPatchError('');
    try {
      if (isAutoSync) {
        await k8sPatch({
          model: ApplicationModel,
          resource: app,
          data: [{ op: 'remove', path: '/spec/syncPolicy/automated', value: null }],
        });
      } else {
        await k8sPatch({
          model: ApplicationModel,
          resource: app,
          data: [safePatch(app, '/spec/syncPolicy/automated', {})],
        });
      }
    } catch (e) {
      setPatchError((e as Error).message);
    }
  };

  const togglePrune = async () => {
    setPatchError('');
    try {
      await k8sPatch({
        model: ApplicationModel,
        resource: app,
        data: [safePatch(app, '/spec/syncPolicy/automated/prune', !isPrune)],
      });
    } catch (e) {
      setPatchError((e as Error).message);
    }
  };

  const toggleSelfHeal = async () => {
    setPatchError('');
    try {
      await k8sPatch({
        model: ApplicationModel,
        resource: app,
        data: [safePatch(app, '/spec/syncPolicy/automated/selfHeal', !isSelfHeal)],
      });
    } catch (e) {
      setPatchError((e as Error).message);
    }
  };

  return (
    <Grid hasGutter>
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Status')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Sync')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <SyncStatusIcon
                    status={app.status?.sync?.status ?? 'Unknown'}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Health')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <HealthStatusIcon
                    status={app.status?.health?.status ?? 'Unknown'}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Revision')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.status?.sync?.revision?.substring(0, 7) ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Last Sync Revision')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.status?.operationState?.syncResult?.revision ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Sync Message')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.status?.operationState?.message ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Operation Phase')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.status?.operationState?.phase ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Source')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Repository')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {source?.repoURL ? <a href={source.repoURL} target="_blank" rel="noopener noreferrer">{source.repoURL}</a> : '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Path')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {source?.path ?? source?.chart ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  {t('Target Revision')}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {source?.targetRevision ?? 'HEAD'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Destination')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Cluster')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec?.destination.name ??
                    app.spec?.destination.server ??
                    '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec?.destination.namespace ?? '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Project')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec?.project}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Sync Policy')}</CardTitle>
          <CardBody>
            {patchError && (
              <Alert variant="danger" isInline title={t('Error updating sync policy')}
                actionClose={<AlertActionCloseButton onClose={() => setPatchError('')} />}
                className="pf-v6-u-mb-md"
              >{patchError}</Alert>
            )}
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Auto-sync')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Switch
                    id="auto-sync-toggle"
                    isChecked={isAutoSync}
                    onChange={toggleAutoSync}
                    aria-label={t('Auto-sync')}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Prune resources')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Switch
                    id="prune-toggle"
                    isChecked={isPrune}
                    onChange={togglePrune}
                    isDisabled={!isAutoSync}
                    aria-label={t('Prune resources')}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Self-heal')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Switch
                    id="self-heal-toggle"
                    isChecked={isSelfHeal}
                    onChange={toggleSelfHeal}
                    isDisabled={!isAutoSync}
                    aria-label={t('Self-heal')}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
};

export default OverviewTab;
