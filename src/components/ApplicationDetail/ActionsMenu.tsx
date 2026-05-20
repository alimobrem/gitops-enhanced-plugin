import React from 'react';
import { useState, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router';
import {
  Dropdown, DropdownList, DropdownItem, MenuToggle,
  Alert, Spinner, Button, Checkbox,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource } from '../../types';

export const ActionsMenu: FC<{ app: ApplicationResource }> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    name: string; message: string; variant: 'primary' | 'danger'; fn: () => Promise<void>;
  } | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(true);
  const { sync, refresh, terminate, deleteApp, retry } = useApplicationActions(app);

  const runAction = useCallback(async (name: string, fn: () => Promise<void>) => {
    setIsOpen(false);
    setActionInProgress(name);
    setActionError('');
    try {
      await fn();
    } catch (e) {
      setActionError(`${name}: ${(e as Error).message}`);
    } finally {
      setActionInProgress(null);
    }
  }, []);

  const confirmAndRun = useCallback((name: string, message: string, fn: () => Promise<void>, variant: 'primary' | 'danger' = 'danger') => {
    setIsOpen(false);
    setConfirmAction({ name, message, variant, fn });
  }, []);

  const onConfirmed = async () => {
    if (!confirmAction) return;
    setConfirmAction(null);
    await runAction(confirmAction.name, confirmAction.fn);
    if (confirmAction.name === t('Delete')) {
      navigate(`/k8s/ns/${app.metadata.namespace}/argoproj.io~v1alpha1~Application`);
    }
  };

  const hasFailed = app.status?.operationState?.phase === 'Failed' || app.status?.operationState?.phase === 'Error';

  return (
    <>
      {actionError && (
        <Alert variant="danger" isInline title={actionError}
          actionClose={<Button variant="plain" onClick={() => setActionError('')}>x</Button>}
          className="pf-v6-u-mb-sm"
        />
      )}
      <Dropdown isOpen={isOpen} onSelect={() => setIsOpen(false)} onOpenChange={setIsOpen}
        toggle={(ref) => (
          <MenuToggle ref={ref} onClick={() => setIsOpen(!isOpen)} variant="primary" isDisabled={!!actionInProgress}>
            {actionInProgress ? <><Spinner size="sm" /> {actionInProgress}...</> : t('Actions')}
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="sync" onClick={() => runAction(t('Sync'), () => sync())}>
            {t('Sync')}
          </DropdownItem>
          {hasFailed && (
            <DropdownItem key="retry" onClick={() => runAction(t('Retry'), () => retry())}>
              {t('Retry')}
            </DropdownItem>
          )}
          <DropdownItem key="refresh" onClick={() => runAction(t('Refresh'), () => refresh(false))}>
            {t('Refresh')}
          </DropdownItem>
          <DropdownItem key="hard-refresh" onClick={() => runAction(t('Hard Refresh'), () => refresh(true))}>
            {t('Hard Refresh')}
          </DropdownItem>
          <DropdownItem key="terminate" isDanger
            onClick={() => confirmAndRun(t('Terminate'), t('This will abort any in-progress sync on {{name}}.', { name: app.metadata.name }), () => terminate())}
          >
            {t('Terminate')}
          </DropdownItem>
          <DropdownItem key="delete" isDanger
            onClick={() => confirmAndRun(t('Delete'), '', () => deleteApp(cascadeDelete))}
          >
            {t('Delete')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>

      <ConfirmModal
        title={`${t('Confirm')} ${confirmAction?.name ?? ''}`}
        isOpen={!!confirmAction}
        onConfirm={onConfirmed}
        onCancel={() => setConfirmAction(null)}
        confirmLabel={confirmAction?.name}
        confirmVariant={confirmAction?.variant}
      >
        {confirmAction?.name === t('Delete') ? (
          <>
            {t('Are you sure you want to delete {{name}}?', { name: app.metadata.name })}
            <Checkbox
              id="cascade-delete"
              label={t('Delete managed resources (cascade)')}
              isChecked={cascadeDelete}
              onChange={(_e, v) => setCascadeDelete(v)}
              className="pf-v6-u-mt-md"
            />
          </>
        ) : (
          confirmAction?.message
        )}
      </ConfirmModal>
    </>
  );
};
