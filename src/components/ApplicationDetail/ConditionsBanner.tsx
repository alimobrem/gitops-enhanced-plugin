import React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import { conditionToAlertVariant } from '../../utils/application';

interface Condition {
  type: string;
  message: string;
  lastTransitionTime?: string;
}

interface ConditionsBannerProps {
  conditions?: Condition[];
}

export const ConditionsBanner: FC<ConditionsBannerProps> = ({ conditions }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  if (!conditions?.length) return null;

  if (conditions.length <= 2) {
    return (
      <>
        {conditions.map((c, i) => (
          <Alert
            key={i}
            variant={conditionToAlertVariant(c.type)}
            isInline
            isPlain
            title={t(c.type)}
            className="pf-v6-u-mb-md"
          >
            {c.message}
          </Alert>
        ))}
      </>
    );
  }

  return (
    <Alert
      variant="warning"
      isInline
      title={t('{{count}} conditions detected', { count: conditions.length })}
      className="pf-v6-u-mb-md"
    >
      <ExpandableSection toggleText={t('Show details')}>
        <List>
          {conditions.map((c, i) => (
            <ListItem key={i}>
              <strong>{c.type}:</strong> {c.message}
            </ListItem>
          ))}
        </List>
      </ExpandableSection>
    </Alert>
  );
};

export default ConditionsBanner;
