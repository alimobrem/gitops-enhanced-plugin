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
import { commitStatusPhaseColor } from '../../utils/promotion';
import { timeAgo } from '../../utils/time';

const statusLabelColor: Record<PipelineStageStatus, 'green' | 'red' | 'blue' | 'gold'> = {
  healthy: 'green',
  promoting: 'blue',
  blocked: 'red',
  pending: 'gold',
};

interface EnvironmentDetailPanelProps {
  stage: DerivedPipelineStage;
}

export const EnvironmentDetailPanel: FC<EnvironmentDetailPanelProps> = ({ stage }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

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
                <DescriptionListDescription className="gitops-env-sha">
                  {stage.activeSha ? stage.activeSha.slice(0, 12) : t('None')}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {stage.activeHydratedSha && stage.activeHydratedSha !== stage.activeSha && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Active commit (hydrated)')}</DescriptionListTerm>
                  <DescriptionListDescription className="gitops-env-sha">
                    {stage.activeHydratedSha.slice(0, 12)}
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
                  <DescriptionListDescription className="gitops-env-sha">
                    {stage.proposedSha?.slice(0, 12)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {stage.proposedHydratedSha && stage.proposedHydratedSha !== stage.proposedSha && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Proposed commit (hydrated)')}</DescriptionListTerm>
                    <DescriptionListDescription className="gitops-env-sha">
                      {stage.proposedHydratedSha.slice(0, 12)}
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
              href={stage.pr.url}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
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
      </CardBody>
    </Card>
  );
};
