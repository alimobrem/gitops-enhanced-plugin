import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardTitle, CardBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Grid, GridItem,
  Label,
  Button,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { DerivedPipelineStage, PipelineStageStatus } from '../../utils/promotion';
import { commitStatusPhaseColor, buildCommitLink } from '../../utils/promotion';
import { useApplications } from '../../hooks/useApplications';
import { ApplicationGroupVersionKind } from '../../models';
import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { timeAgo } from '../../utils/time';

const statusLabelColor: Record<PipelineStageStatus, 'green' | 'red' | 'blue' | 'gold'> = {
  healthy: 'green',
  promoting: 'blue',
  blocked: 'red',
  pending: 'gold',
};

const CommitLink: FC<{ sha: string; repoURL?: string }> = ({ sha, repoURL }) => {
  const url = buildCommitLink(repoURL, sha);
  const display = sha.slice(0, 12);
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="gitops-env-sha">
        {display}
      </a>
    );
  }
  return <span className="gitops-env-sha">{display}</span>;
};

interface EnvironmentDetailPanelProps {
  stage: DerivedPipelineStage;
  namespace?: string;
}

export const EnvironmentDetailPanel: FC<EnvironmentDetailPanelProps> = ({ stage, namespace }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [apps] = useApplications(namespace);

  const relatedApps = apps.filter((app) =>
    stage.repoURL && app.spec?.source?.repoURL?.includes(stage.repoURL.replace(/^https?:\/\/git@/, '').replace(/\.git$/, '').split('/').slice(-2).join('/')),
  );

  const hasProposed = stage.proposedSha && stage.proposedSha !== stage.activeSha;
  const allChecks = [...stage.proposedChecks, ...stage.activeChecks];

  return (
    <Card className="gitops-gate-detail">
      <CardTitle>
        {t('Environment: {{name}}', { name: stage.label })}
      </CardTitle>
      <CardBody>
        <Grid hasGutter>
          <GridItem span={hasProposed ? 6 : 12}>
            <DescriptionList isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Branch')}</DescriptionListTerm>
                <DescriptionListDescription>{stage.branch}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label isCompact color={statusLabelColor[stage.status]}>{stage.status}</Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Active commit (dry)')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {stage.activeSha ? <CommitLink sha={stage.activeSha} repoURL={stage.repoURL} /> : t('None')}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {stage.activeHydratedSha && stage.activeHydratedSha !== stage.activeSha && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Active commit (hydrated)')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <CommitLink sha={stage.activeHydratedSha} repoURL={stage.repoURL} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {stage.activeNote?.author && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Author')}</DescriptionListTerm>
                  <DescriptionListDescription>{stage.activeNote.author}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {stage.activeNote?.subject && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Message')}</DescriptionListTerm>
                  <DescriptionListDescription>{stage.activeNote.subject}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
          </GridItem>

          {hasProposed && (
            <GridItem span={6}>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Proposed commit (dry)')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {stage.proposedSha && <CommitLink sha={stage.proposedSha} repoURL={stage.repoURL} />}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {stage.proposedHydratedSha && stage.proposedHydratedSha !== stage.proposedSha && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Proposed commit (hydrated)')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <CommitLink sha={stage.proposedHydratedSha} repoURL={stage.repoURL} />
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {stage.proposedNote?.author && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Author')}</DescriptionListTerm>
                    <DescriptionListDescription>{stage.proposedNote.author}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {stage.proposedNote?.subject && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Message')}</DescriptionListTerm>
                    <DescriptionListDescription>{stage.proposedNote.subject}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </GridItem>
          )}
        </Grid>

        {stage.pr && (
          <div className="pf-v6-u-mt-md">
            <Button
              variant="link"
              component="a"
              href={stage.pr.url && /^https?:\/\//i.test(stage.pr.url) ? stage.pr.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              isDisabled={!stage.pr.url || !/^https?:\/\//i.test(stage.pr.url)}
            >
              PR #{stage.pr.id ?? '?'}
            </Button>
            {stage.pr.createdAt && (
              <span className="pf-v6-u-ml-sm pf-v6-u-color-200">
                {t('opened {{time}}', { time: timeAgo(stage.pr.createdAt) })}
              </span>
            )}
          </div>
        )}

        {allChecks.length > 0 && (
          <div className="pf-v6-u-mt-md">
            <div className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">{t('Commit Statuses')}</div>
            <Table aria-label={t('Commit Statuses')} isCompact isStriped>
              <Thead>
                <Tr>
                  <Th>{t('Check')}</Th>
                  <Th>{t('Type')}</Th>
                  <Th>{t('Status')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {stage.proposedChecks.map((c) => (
                  <Tr key={`proposed-${c.key}`}>
                    <Td>{c.key}</Td>
                    <Td>{t('Proposed')}</Td>
                    <Td>
                      <Label isCompact color={commitStatusPhaseColor[c.phase] ?? 'grey'}>{c.phase}</Label>
                    </Td>
                  </Tr>
                ))}
                {stage.activeChecks.map((c) => (
                  <Tr key={`active-${c.key}`}>
                    <Td>{c.key}</Td>
                    <Td>{t('Active')}</Td>
                    <Td>
                      <Label isCompact color={commitStatusPhaseColor[c.phase] ?? 'grey'}>{c.phase}</Label>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
        {relatedApps.length > 0 && (
          <div className="pf-v6-u-mt-md">
            <div className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">{t('Related Applications')}</div>
            {relatedApps.map((app) => (
              <div key={app.metadata.uid} className="pf-v6-u-mb-xs">
                <ResourceLink
                  groupVersionKind={ApplicationGroupVersionKind}
                  name={app.metadata.name}
                  namespace={app.metadata.namespace}
                />
              </div>
            ))}
          </div>
        )}

        {stage.history.length > 0 && (
          <div className="pf-v6-u-mt-md">
            <div className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">{t('Promotion History')}</div>
            <Table aria-label={t('Promotion History')} isCompact isStriped>
              <Thead>
                <Tr>
                  <Th>{t('Commit')}</Th>
                  <Th>{t('Author')}</Th>
                  <Th>{t('Message')}</Th>
                  <Th>{t('When')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {stage.history.slice(0, 10).map((h, i) => (
                  <Tr key={i}>
                    <Td className="gitops-env-sha">
                      {h.activeSha ? <CommitLink sha={h.activeSha} repoURL={stage.repoURL} /> : '-'}
                    </Td>
                    <Td>{h.author ?? '-'}</Td>
                    <Td>{h.subject ?? '-'}</Td>
                    <Td>{h.commitTime ? timeAgo(h.commitTime) : '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
