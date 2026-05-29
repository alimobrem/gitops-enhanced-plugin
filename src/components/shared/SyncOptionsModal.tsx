import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal, ModalVariant, ModalHeader, ModalBody, ModalFooter,
  Button,
  Form, FormGroup,
  Switch,
  TextInput,
  DataList, DataListItem, DataListItemRow, DataListItemCells, DataListCell, DataListCheck,
  Alert,
  HelperText, HelperTextItem,
  Tooltip,
  ExpandableSection,
} from '@patternfly/react-core';
import type { ApplicationResource, SyncStatusCode } from '../../types';
import type { SyncOptions } from '../../hooks/useApplicationActions';
import { getApplicationSource } from '../../utils/application';
import { SyncStatusIcon } from './SyncStatusIcon';

interface ResourceEntry {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  status: SyncStatusCode;
}

interface SyncOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: ApplicationResource;
  onSync: (options: SyncOptions) => Promise<void>;
  preSelectedResources?: Array<{ group: string; kind: string; name: string; namespace?: string }>;
  syncBlocked?: { blocked: boolean; message: string };
}

const resourceKey = (r: { group?: string; kind: string; name: string; namespace?: string }) =>
  `${r.group ?? ''}/${r.kind}/${r.namespace ?? ''}/${r.name}`;

export const SyncOptionsModal: FC<SyncOptionsModalProps> = ({
  isOpen,
  onClose,
  app,
  onSync,
  preSelectedResources,
  syncBlocked,
}) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const defaultRevision = getApplicationSource(app)?.targetRevision ?? 'HEAD';

  const [revision, setRevision] = useState(defaultRevision);
  const [dryRun, setDryRun] = useState(false);
  const [prune, setPrune] = useState(false);
  const [force, setForce] = useState(false);
  const [applyOnly, setApplyOnly] = useState(false);
  const [selectedResources, setSelectedResources] = useState<Set<string>>(
    () => new Set((preSelectedResources ?? []).map(resourceKey)),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourcesExpanded, setResourcesExpanded] = useState(!!preSelectedResources?.length);

  const resources: ResourceEntry[] = app.status?.resources ?? [];

  const toggleResource = (r: ResourceEntry) => {
    const key = resourceKey(r);
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const selected = resources.filter((r) => selectedResources.has(resourceKey(r)));
      await onSync({
        revision,
        dryRun,
        prune,
        force,
        applyOnly,
        resources: selected.length > 0
          ? selected.map((r) => ({ group: r.group ?? '', kind: r.kind, name: r.name, namespace: r.namespace }))
          : undefined,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const isBlocked = syncBlocked?.blocked ?? false;

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={t('Sync Options')} />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={t('Sync failed')} className="pf-v6-u-mb-md">
            {error}
          </Alert>
        )}
        {isBlocked && (
          <Alert variant="warning" isInline title={syncBlocked!.message} className="pf-v6-u-mb-md" />
        )}
        <Form>
          <FormGroup label={t('Revision')} fieldId="sync-revision">
            <TextInput
              id="sync-revision"
              value={revision}
              onChange={(_e, val) => setRevision(val)}
              aria-label={t('Revision')}
            />
          </FormGroup>
          <FormGroup fieldId="sync-dry-run">
            <Switch
              id="sync-dry-run"
              label={t('Dry Run')}
              isChecked={dryRun}
              onChange={(_e, checked) => setDryRun(checked)}
            />
            <HelperText>
              <HelperTextItem>{t('Preview changes without applying')}</HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup fieldId="sync-prune">
            <Switch
              id="sync-prune"
              label={t('Prune')}
              isChecked={prune}
              onChange={(_e, checked) => setPrune(checked)}
            />
            <HelperText>
              <HelperTextItem>{t('Delete resources not in Git')}</HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup fieldId="sync-force">
            <Switch
              id="sync-force"
              label={t('Force')}
              isChecked={force}
              onChange={(_e, checked) => setForce(checked)}
            />
            <HelperText>
              <HelperTextItem>{t('Force replace instead of apply')}</HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup fieldId="sync-apply-only">
            <Switch
              id="sync-apply-only"
              label={t('Apply Only')}
              isChecked={applyOnly}
              onChange={(_e, checked) => setApplyOnly(checked)}
            />
            <HelperText>
              <HelperTextItem>{t('Skip hooks, only apply manifests')}</HelperTextItem>
            </HelperText>
          </FormGroup>
          {resources.length > 0 && (
            <ExpandableSection
              toggleText={`${t('Select resources to sync')} (${selectedResources.size}/${resources.length})`}
              isExpanded={resourcesExpanded}
              onToggle={(_e, expanded) => setResourcesExpanded(expanded)}
            >
              <DataList aria-label={t('Select resources to sync')} isCompact>
                {resources.map((r) => {
                  const key = resourceKey(r);
                  return (
                    <DataListItem key={key} aria-labelledby={`resource-${key}`}>
                      <DataListItemRow>
                        <DataListCheck
                          aria-labelledby={`resource-${key}`}
                          isChecked={selectedResources.has(key)}
                          onChange={() => toggleResource(r)}
                        />
                        <DataListItemCells
                          dataListCells={[
                            <DataListCell key="kind" width={2}>
                              <span id={`resource-${key}`}>{r.kind}/{r.name}</span>
                            </DataListCell>,
                            <DataListCell key="status" width={1}>
                              <SyncStatusIcon status={r.status ?? 'Unknown'} />
                            </DataListCell>,
                          ]}
                        />
                      </DataListItemRow>
                    </DataListItem>
                  );
                })}
              </DataList>
            </ExpandableSection>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        {isBlocked ? (
          <Tooltip content={syncBlocked!.message}>
            <Button variant="primary" isDisabled>{t('Sync')}</Button>
          </Tooltip>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {t('Sync')}
          </Button>
        )}
        <Button variant="link" onClick={onClose}>{t('Cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
};
