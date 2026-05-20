import React from 'react';
import { useState, type FC } from 'react';
import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Spinner,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource } from '../../types';

interface ActionsMenuProps {
  app: ApplicationResource;
}

export const ActionsMenu: FC<ActionsMenuProps> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const { sync, refresh, terminate } = useApplicationActions(app);

  const runAction = async (name: string, fn: () => Promise<void>) => {
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
  };

  const onTerminateConfirmed = async () => {
    setShowTerminateConfirm(false);
    await runAction(t('Terminate'), () => terminate());
  };

  return (
    <React.Fragment>
      {actionError && (
        <Alert
          variant="danger"
          isInline
          title={actionError}
          actionClose={<Button variant="plain" onClick={() => setActionError('')}>x</Button>}
          style={{ marginBottom: '0.5rem' }}
        />
      )}
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen(!isOpen)}
            variant="primary"
            isDisabled={!!actionInProgress}
          >
            {actionInProgress ? (
              <React.Fragment><Spinner size="sm" /> {actionInProgress}...</React.Fragment>
            ) : (
              t('Actions')
            )}
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem key="sync" onClick={() => runAction(t('Sync'), () => sync())}>
            {t('Sync')}
          </DropdownItem>
          <DropdownItem key="refresh" onClick={() => runAction(t('Refresh'), () => refresh(false))}>
            {t('Refresh')}
          </DropdownItem>
          <DropdownItem key="hard-refresh" onClick={() => runAction(t('Hard Refresh'), () => refresh(true))}>
            {t('Hard Refresh')}
          </DropdownItem>
          <DropdownItem
            key="terminate"
            isDanger
            onClick={() => { setIsOpen(false); setShowTerminateConfirm(true); }}
          >
            {t('Terminate')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>

      <Modal
        variant={ModalVariant.small}
        isOpen={showTerminateConfirm}
        onClose={() => setShowTerminateConfirm(false)}
      >
        <ModalHeader title={t('Confirm Terminate')} />
        <ModalBody>
          {t('Are you sure you want to terminate the current operation on {{name}}? This will abort any in-progress sync.', { name: app.metadata.name })}
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={onTerminateConfirmed}>{t('Terminate')}</Button>
          <Button variant="link" onClick={() => setShowTerminateConfirm(false)}>{t('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};
