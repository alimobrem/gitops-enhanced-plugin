import React, { useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner, Label, Button,
  Card, CardTitle, CardBody,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
} from '@patternfly/react-core';
import { AppSetPreviewModal } from './AppSetPreviewModal';
import type { AppSetResource } from '../../types';

export const OverviewTab: FC<{ obj?: Record<string, unknown> }> = ({ obj }) => {
  const resource = obj as AppSetResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  return (
    <>
      <Button
        variant="secondary"
        className="pf-v6-u-mt-md pf-v6-u-mb-md"
        onClick={() => setPreviewOpen(true)}
      >
        {t('Preview Generated Apps')}
      </Button>
      <AppSetPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        appSetName={resource.metadata.name}
        namespace={resource.metadata.namespace}
      />
      <Card className="pf-v6-u-mt-md">
        <CardTitle>{t('Generators')}</CardTitle>
        <CardBody>
          {resource?.spec?.generators?.map((gen, i) => (
            <Label key={i} isCompact className="pf-v6-u-mr-sm">{Object.keys(gen)[0]}</Label>
          )) ?? t('None')}
        </CardBody>
      </Card>
      {resource?.status?.conditions && resource.status.conditions.length > 0 && (
        <Card className="pf-v6-u-mt-md">
          <CardTitle>{t('Conditions')}</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal isCompact>
              {resource.status.conditions.map((c, i) => (
                <DescriptionListGroup key={i}>
                  <DescriptionListTerm>{c.type}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label isCompact color={c.status === 'True' ? 'green' : 'red'}>{c.status}</Label>
                    {c.message && <span className="pf-v6-u-ml-sm">{c.message}</span>}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default OverviewTab;
