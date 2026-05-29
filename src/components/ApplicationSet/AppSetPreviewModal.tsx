import React from 'react';
import type { FC } from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Modal, ModalBody, ModalHeader, ModalFooter,
  Button, Bullseye, Spinner,
  EmptyState, EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ApplicationGroupVersionKind } from '../../models';
import type { ApplicationResource } from '../../types';

interface AppSetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSetName: string;
  namespace: string;
}

export const AppSetPreviewModal: FC<AppSetPreviewModalProps> = ({
  isOpen,
  onClose,
  appSetName,
  namespace,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [apps, loaded, error] = useK8sWatchResource<ApplicationResource[]>(
    isOpen
      ? {
          groupVersionKind: ApplicationGroupVersionKind,
          isList: true,
          namespace,
        }
      : null,
  );

  const childApps = (apps ?? []).filter((a) => {
    const owners = (
      (a.metadata as Record<string, unknown>).ownerReferences ?? []
    ) as Array<{ kind: string; name: string }>;
    if (
      owners.some(
        (o) => o.kind === 'ApplicationSet' && o.name === appSetName,
      )
    )
      return true;
    if (
      a.metadata?.annotations?.['argocd.argoproj.io/application-set-name'] ===
      appSetName
    )
      return true;
    return false;
  });

  const renderBody = () => {
    if (error) return <Bullseye>{String(error)}</Bullseye>;
    if (!loaded) return <Bullseye><Spinner /></Bullseye>;
    if (childApps.length === 0) {
      return (
        <EmptyState>
          <EmptyStateBody>
            {t('No child applications generated')}
          </EmptyStateBody>
        </EmptyState>
      );
    }

    return (
      <Table aria-label={t('Generated Applications')}>
        <Thead>
          <Tr>
            <Th>{t('Application')}</Th>
            <Th>{t('Destination Server')}</Th>
            <Th>{t('Destination Namespace')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {childApps.map((app) => (
            <Tr key={app.metadata.uid}>
              <Td>{app.metadata.name}</Td>
              <Td>
                {app.spec?.destination?.name ??
                  app.spec?.destination?.server ??
                  '-'}
              </Td>
              <Td>{app.spec?.destination?.namespace ?? '-'}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
    >
      <ModalHeader title={t('Generated Applications')} />
      <ModalBody>{renderBody()}</ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          {t('Close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AppSetPreviewModal;
