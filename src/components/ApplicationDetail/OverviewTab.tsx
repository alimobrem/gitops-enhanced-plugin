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
  Label,
  Flex,
  FlexItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { SyncStatusIcon } from '../shared/SyncStatusIcon';
import { HealthStatusIcon } from '../shared/HealthStatusIcon';
import { ApplicationModel } from '../../models';
import { safePatch } from '../../utils/patch';
import { timeAgo } from '../../utils/time';
import { buildCommitUrl } from '../../utils/argo-urls';
import type { ApplicationResource } from '../../types';
import { getApplicationSource, getAllSources, isMultiSource } from '../../utils/application';
import { ConditionsBanner } from './ConditionsBanner';
import { useSyncWindowStatus } from '../../hooks/useSyncWindowStatus';
import {
  FLEX_SPACE_SM,
  FLEX_SPACE_XL,
  FLEX_SPACE_MD,
  FLEX_ALIGN_CENTER,
  FLEX_COLUMN,
} from '../../utils/pf-constants';

export const OverviewTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const app = obj as ApplicationResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const syncWindow = useSyncWindowStatus(app ?? null);
  const [patchError, setPatchError] = useState('');
  if (!app?.metadata) return <Bullseye><Spinner /></Bullseye>;
  const source = getApplicationSource(app);
  const allSources = getAllSources(app);

  const isAutoSync = !!app.spec?.syncPolicy?.automated;
  const isPrune = !!app.spec?.syncPolicy?.automated?.prune;
  const isSelfHeal = !!app.spec?.syncPolicy?.automated?.selfHeal;

  const syncRevision = app.status?.sync?.revision;
  const lastSyncRevision = app.status?.operationState?.syncResult?.revision;
  const lastSyncPhase = app.status?.operationState?.phase;
  const lastSyncMessage = app.status?.operationState?.message;
  const lastSyncFinished = app.status?.operationState?.finishedAt;
  const repoURL = source?.repoURL ?? '';
  const commitUrl = buildCommitUrl(repoURL, syncRevision ?? '');
  const lastCommitUrl = buildCommitUrl(repoURL, lastSyncRevision ?? '');

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
    <>
    <ConditionsBanner conditions={app?.status?.conditions} />
    {syncWindow.blocked && (
      <Alert variant="warning" isInline isPlain title={t('Sync blocked')} className="pf-v6-u-mb-md">
        {t('A deny sync window is currently active on project {{project}}', { project: syncWindow.projectName })}
      </Alert>
    )}
    <Grid hasGutter>
      {/* Sync Policy Banner */}
      <GridItem span={12}>
        <Alert variant={isAutoSync ? 'info' : 'warning'} isInline isPlain
          title={isAutoSync
            ? t('Auto sync is enabled') + (isPrune ? ` · ${t('Prune')}` : '') + (isSelfHeal ? ` · ${t('Self-heal')}` : '')
            : t('Manual sync — changes require manual sync to deploy')
          }
        />
      </GridItem>

      {/* Status + Last Sync */}
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Sync Status')}</CardTitle>
          <CardBody>
            <Flex direction={FLEX_COLUMN} spaceItems={FLEX_SPACE_MD}>
              <FlexItem>
                <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_SM}>
                  <FlexItem><SyncStatusIcon status={app.status?.sync?.status ?? 'Unknown'} /></FlexItem>
                  <FlexItem>
                    {syncRevision ? (
                      commitUrl ? (
                        <a href={commitUrl} target="_blank" rel="noopener noreferrer">
                          {source?.targetRevision ?? 'HEAD'} ({syncRevision.substring(0, 7)}) <ExternalLinkAltIcon />
                        </a>
                      ) : (
                        <span>{source?.targetRevision ?? 'HEAD'} ({syncRevision.substring(0, 7)})</span>
                      )
                    ) : '-'}
                  </FlexItem>
                </Flex>
              </FlexItem>

              {/* Last Sync Result */}
              {lastSyncPhase && (
                <FlexItem>
                  <Card isCompact isPlain>
                    <CardBody>
                      <DescriptionList isCompact isHorizontal>
                        <DescriptionListGroup>
                          <DescriptionListTerm>{t('Last Sync')}</DescriptionListTerm>
                          <DescriptionListDescription>
                            <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_SM}>
                              <FlexItem>
                                {lastSyncPhase === 'Succeeded' ? (
                                  <Label isCompact color="green" icon={<CheckCircleIcon />}>{t('Sync OK')}</Label>
                                ) : (
                                  <Label isCompact color="red" icon={<ExclamationCircleIcon />}>{lastSyncPhase}</Label>
                                )}
                              </FlexItem>
                              {lastSyncRevision && (
                                <FlexItem>
                                  {lastCommitUrl ? (
                                    <a href={lastCommitUrl} target="_blank" rel="noopener noreferrer">
                                      {lastSyncRevision.substring(0, 7)} <ExternalLinkAltIcon />
                                    </a>
                                  ) : lastSyncRevision.substring(0, 7)}
                                </FlexItem>
                              )}
                              {lastSyncFinished && (
                                <FlexItem>
                                  <Tooltip content={new Date(lastSyncFinished).toLocaleString()}>
                                    <span className="pf-v6-u-color-200">{timeAgo(lastSyncFinished)}</span>
                                  </Tooltip>
                                </FlexItem>
                              )}
                            </Flex>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        {lastSyncMessage && lastSyncMessage !== 'successfully synced (all tasks run)' && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>{t('Message')}</DescriptionListTerm>
                            <DescriptionListDescription>{lastSyncMessage}</DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </FlexItem>
              )}
            </Flex>
          </CardBody>
        </Card>
      </GridItem>

      {/* Health */}
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Health Status')}</CardTitle>
          <CardBody>
            <Flex direction={FLEX_COLUMN} spaceItems={FLEX_SPACE_MD}>
              <FlexItem>
                <HealthStatusIcon status={app.status?.health?.status ?? 'Unknown'} />
                {app.status?.health?.message && (
                  <span className="pf-v6-u-ml-sm pf-v6-u-color-200">{app.status.health.message}</span>
                )}
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </GridItem>

      {/* Source with commit info */}
      <GridItem span={6}>
        <Card>
          <CardTitle>
            {isMultiSource(app)
              ? t('Sources ({{count}})', { count: allSources.length })
              : t('Source')}
          </CardTitle>
          <CardBody>
            {allSources.map((src) => (
              <React.Fragment key={src.index}>
                {isMultiSource(app) && (
                  <Flex spaceItems={FLEX_SPACE_SM} className="pf-v6-u-mb-sm">
                    <FlexItem>
                      <Label isCompact>
                        {t('Source {{n}} of {{total}}', { n: src.index + 1, total: allSources.length })}
                      </Label>
                    </FlexItem>
                    {src.ref && (
                      <FlexItem>
                        <Label isCompact color="blue">{src.ref}</Label>
                      </FlexItem>
                    )}
                  </Flex>
                )}
                <DescriptionList isHorizontal isCompact className={isMultiSource(app) && src.index < allSources.length - 1 ? 'pf-v6-u-mb-lg' : undefined}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Repository')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {src.repoURL ? (
                        <a href={src.repoURL} target="_blank" rel="noopener noreferrer">
                          {src.repoURL.replace(/^https?:\/\//, '').replace(/\.git$/, '')} <ExternalLinkAltIcon />
                        </a>
                      ) : '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{src.chart ? t('Chart') : t('Path')}</DescriptionListTerm>
                    <DescriptionListDescription>{src.path ?? src.chart ?? '-'}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Target Revision')}</DescriptionListTerm>
                    <DescriptionListDescription>{src.targetRevision ?? 'HEAD'}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </React.Fragment>
            ))}
          </CardBody>
        </Card>
      </GridItem>

      {/* Destination */}
      <GridItem span={6}>
        <Card>
          <CardTitle>{t('Destination')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Cluster')}</DescriptionListTerm>
                <DescriptionListDescription>{app.spec?.destination?.name ?? app.spec?.destination?.server ?? '-'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {app.spec?.destination?.namespace ? (
                    <a href={`/k8s/cluster/namespaces/${app.spec.destination.namespace}`}>{app.spec.destination.namespace}</a>
                  ) : '-'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Project')}</DescriptionListTerm>
                <DescriptionListDescription>{app.spec?.project ?? '-'}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>

      {/* Sync Policy */}
      <GridItem span={12}>
        <Card>
          <CardTitle>{t('Sync Policy')}</CardTitle>
          <CardBody>
            {patchError && (
              <Alert variant="danger" isInline title={t('Error updating sync policy')}
                actionClose={<AlertActionCloseButton onClose={() => setPatchError('')} />}
                className="pf-v6-u-mb-md"
              >{patchError}</Alert>
            )}
            <Flex spaceItems={FLEX_SPACE_XL}>
              <FlexItem>
                <Switch id="auto-sync-toggle" label={t('Auto-sync')} isChecked={isAutoSync} onChange={toggleAutoSync} aria-label={t('Auto-sync')} />
              </FlexItem>
              <FlexItem>
                <Switch id="prune-toggle" label={t('Prune resources')} isChecked={isPrune} onChange={togglePrune} isDisabled={!isAutoSync} aria-label={t('Prune resources')} />
              </FlexItem>
              <FlexItem>
                <Switch id="self-heal-toggle" label={t('Self-heal')} isChecked={isSelfHeal} onChange={toggleSelfHeal} isDisabled={!isAutoSync} aria-label={t('Self-heal')} />
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
    </>
  );
};

export default OverviewTab;
