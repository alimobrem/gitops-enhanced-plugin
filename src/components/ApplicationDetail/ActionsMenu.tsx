import { useState, type FC } from 'react';
import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { syncApplication } from '../../services/argocd-api';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import type { ApplicationResource } from '../../types';

interface ActionsMenuProps {
  app: ApplicationResource;
}

export const ActionsMenu: FC<ActionsMenuProps> = ({ app }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [isOpen, setIsOpen] = useState(false);
  const { refresh, terminate } = useApplicationActions(app);

  const onSync = async () => {
    setIsOpen(false);
    await syncApplication(app.metadata.name);
  };

  const onRefresh = async () => {
    setIsOpen(false);
    await refresh(false);
  };

  const onHardRefresh = async () => {
    setIsOpen(false);
    await refresh(true);
  };

  const onTerminate = async () => {
    setIsOpen(false);
    await terminate();
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={() => setIsOpen(false)}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          variant="primary"
        >
          {t('Actions')}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key="sync" onClick={onSync}>
          {t('Sync')}
        </DropdownItem>
        <DropdownItem key="refresh" onClick={onRefresh}>
          {t('Refresh')}
        </DropdownItem>
        <DropdownItem key="hard-refresh" onClick={onHardRefresh}>
          {t('Hard Refresh')}
        </DropdownItem>
        <DropdownItem key="terminate" onClick={onTerminate} isDanger>
          {t('Terminate')}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};
