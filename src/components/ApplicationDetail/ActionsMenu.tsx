import React from 'react';
import { useState, useCallback, type FC } from 'react';
import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Alert,
  Spinner,
  Button,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource } from '../../types';

export const ActionsMenu: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const { sync, refresh, terminate } = useApplicationActions(app);

  const runAction = useCallback(async (name: string, fn: () => Promise<void>) => {
    setIsOpen(false);
    setActionInProgress(name);
    setActionError('');
    try {
      await fn();
    } catch (e) {
      setActionError(`${name} failed: ${(e as Error).message}`);
    } finally {
      setActionInProgress(null);
    }
  }, []);

  const onSync = useCallback(() => runAction(t('Sync'), () => sync()), [runAction, sync, t]);
  const onRefresh = useCallback(() => runAction(t('Refresh'), () => refresh(false)), [runAction, refresh, t]);
  const onHardRefresh = useCallback(() => runAction(t('Hard Refresh'), () => refresh(true)), [runAction, refresh, t]);

  return (
    <>
      {actionError && (
        <Alert
          variant="danger"
          isInline
          title={actionError}
          actionClose={<Button variant="plain" onClick={() => setActionError('')}>x</Button>}
          className="pf-v6-u-mb-sm"
        />
      )}
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)} variant="primary" isDisabled={!!actionInProgress}>
            {actionInProgress ? <><Spinner size="sm" /> {actionInProgress}...</> : t('Actions')}
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="sync" onClick={onSync}>{t('Sync')}</DropdownItem>
          <DropdownItem key="refresh" onClick={onRefresh}>{t('Refresh')}</DropdownItem>
          <DropdownItem key="hard-refresh" onClick={onHardRefresh}>{t('Hard Refresh')}</DropdownItem>
          <DropdownItem key="terminate" isDanger onClick={() => { setIsOpen(false); setShowTerminateConfirm(true); }}>
            {t('Terminate')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>

      <ConfirmModal
        title={t('Confirm Terminate')}
        isOpen={showTerminateConfirm}
        onConfirm={async () => { setShowTerminateConfirm(false); await runAction(t('Terminate'), () => terminate()); }}
        onCancel={() => setShowTerminateConfirm(false)}
        confirmLabel={t('Terminate')}
        confirmVariant="danger"
      >
        {t('Are you sure you want to terminate the current operation on {{name}}? This will abort any in-progress sync.', { name: app.metadata.name })}
      </ConfirmModal>
    </>
  );
};
