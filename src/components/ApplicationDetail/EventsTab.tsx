import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EmptyState, EmptyStateBody, Label,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Card, CardTitle, CardBody,
} from '@patternfly/react-core';
import type { ApplicationResource } from '../../types';

export const EventsTab: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const conditions = app.status?.conditions ?? [];
  const opState = app.status?.operationState;

  return (
    <>
      {opState && (
        <Card className="pf-v6-u-mb-md">
          <CardTitle>{t('Last Operation')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Phase')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label isCompact color={
                    opState.phase === 'Succeeded' ? 'green'
                      : opState.phase === 'Running' ? 'blue'
                        : opState.phase === 'Failed' || opState.phase === 'Error' ? 'red'
                          : 'grey'
                  }>
                    {opState.phase ?? t('Unknown')}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              {opState.message && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Message')}</DescriptionListTerm>
                  <DescriptionListDescription>{opState.message}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {opState.startedAt && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Started')}</DescriptionListTerm>
                  <DescriptionListDescription>{new Date(opState.startedAt).toLocaleString()}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {opState.finishedAt && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Finished')}</DescriptionListTerm>
                  <DescriptionListDescription>{new Date(opState.finishedAt).toLocaleString()}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {opState.syncResult?.revision && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Revision')}</DescriptionListTerm>
                  <DescriptionListDescription>{opState.syncResult.revision.substring(0, 7)}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardTitle>{t('Conditions')} ({conditions.length})</CardTitle>
        <CardBody>
          {conditions.length === 0 ? (
            <EmptyState><EmptyStateBody>{t('No conditions.')}</EmptyStateBody></EmptyState>
          ) : (
            <DescriptionList isHorizontal isCompact>
              {conditions.map((c, i) => (
                <DescriptionListGroup key={i}>
                  <DescriptionListTerm>
                    <Label isCompact color={c.type.includes('Error') ? 'red' : 'blue'}>{c.type}</Label>
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {c.message}
                    {c.lastTransitionTime && (
                      <span className="pf-v6-u-ml-sm pf-v6-u-color-200">
                        ({new Date(c.lastTransitionTime).toLocaleString()})
                      </span>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default EventsTab;
