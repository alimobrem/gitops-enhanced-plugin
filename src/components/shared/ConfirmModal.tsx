import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  title: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

export const ConfirmModal: FC<PropsWithChildren<ConfirmModalProps>> = ({
  title,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmLabel,
  confirmVariant = 'primary',
  children,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  return (
    <Modal variant={ModalVariant.small} isOpen={isOpen} onClose={onCancel}>
      <ModalHeader title={title} />
      <ModalBody>{children}</ModalBody>
      <ModalFooter>
        <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading} isDisabled={isLoading}>
          {confirmLabel ?? t('Confirm')}
        </Button>
        <Button variant="link" onClick={onCancel}>{t('Cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
};
