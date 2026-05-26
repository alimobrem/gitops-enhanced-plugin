import React from 'react';
import { useState, useMemo, type FC } from 'react';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Alert, AlertActionCloseButton, ActionGroup, Button,
} from '@patternfly/react-core';
import yaml from 'js-yaml';
import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import './YamlTab.css';

interface YamlTabProps {
  resource: Record<string, unknown>;
  model: K8sModel;
}

export const YamlTab: FC<YamlTabProps> = ({ resource, model }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const meta = resource.metadata as Record<string, string>;

  const initialYaml = useMemo(() => yaml.dump(resource, { lineWidth: -1, noRefs: true }), [resource]);
  const [value, setValue] = useState(initialYaml);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isDirty = value !== initialYaml;

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const parsed = yaml.load(value);
      const nsPath = model.namespaced ? `/namespaces/${encodeURIComponent(meta.namespace)}` : '';
      const url = `/api/kubernetes/apis/${model.apiGroup}/${model.apiVersion}${nsPath}/${model.plural}/${encodeURIComponent(meta.name)}`;
      const response = await consoleFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).message ?? response.statusText);
      }
      setSuccess(true);
      const updated = await response.json();
      setValue(yaml.dump(updated, { lineWidth: -1, noRefs: true }));
    } catch (e) {
      setError((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <div className="pf-v6-u-mt-md">
      {error && <Alert variant="danger" isInline title={t('Error saving')} actionClose={<AlertActionCloseButton onClose={() => setError('')} />} className="pf-v6-u-mb-md">{error}</Alert>}
      {success && <Alert variant="success" isInline title={t('Resource updated')} actionClose={<AlertActionCloseButton onClose={() => setSuccess(false)} />} className="pf-v6-u-mb-md" />}
      <textarea
        className="gitops-yaml-editor"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
      />
      <ActionGroup className="pf-v6-u-mt-md">
        <Button variant="primary" onClick={handleSave} isDisabled={saving || !isDirty} isLoading={saving}>{t('Save')}</Button>
        <Button variant="link" onClick={() => { setValue(initialYaml); setError(''); setSuccess(false); }} isDisabled={!isDirty}>{t('Revert')}</Button>
      </ActionGroup>
    </div>
  );
};

export default YamlTab;
