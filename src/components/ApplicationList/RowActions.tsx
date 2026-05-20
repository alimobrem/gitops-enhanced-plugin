import React from 'react';
import { useState, type FC } from 'react';
import {
  Dropdown, DropdownList, DropdownItem, MenuToggle, Alert,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import { ConfirmModal } from '../shared/ConfirmModal';
import type { ApplicationResource } from '../../types';

export const RowActions: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');
  const { sync, refresh, deleteApp } = useApplicationActions(app);

  const safeRun = async (fn: () => Promise<void>) => {
    setIsOpen(false);
    setError('');
    try { await fn(); } catch (e) { setError((e as Error).message); }
  };

  return (
    <>
      {error && <Alert variant="danger" isInline isPlain title={error} className="pf-v6-u-mb-sm" />}
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        popperProps={{ position: 'right' }}
        toggle={(ref) => (
          <MenuToggle ref={ref} variant="plain" onClick={() => setIsOpen(!isOpen)} aria-label={t('Actions')}>
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="sync" onClick={() => safeRun(() => sync())}>{t('Sync')}</DropdownItem>
          <DropdownItem key="refresh" onClick={() => safeRun(() => refresh(false))}>{t('Refresh')}</DropdownItem>
          <DropdownItem key="delete" isDanger onClick={() => { setIsOpen(false); setShowDelete(true); }}>{t('Delete')}</DropdownItem>
        </DropdownList>
      </Dropdown>
      <ConfirmModal
        title={t('Delete')}
        isOpen={showDelete}
        onConfirm={() => safeRun(async () => { await deleteApp(); setShowDelete(false); })}
        onCancel={() => setShowDelete(false)}
        confirmLabel={t('Delete')}
        confirmVariant="danger"
      >
        {t('Are you sure you want to delete {{name}} ({{namespace}})?', { name: app.metadata.name, namespace: app.metadata.namespace })}
      </ConfirmModal>
    </>
  );
};
