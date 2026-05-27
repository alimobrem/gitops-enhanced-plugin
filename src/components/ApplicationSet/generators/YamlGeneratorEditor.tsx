import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button, Alert, AlertActionCloseButton,
} from '@patternfly/react-core';
import * as yaml from 'js-yaml';

interface YamlGeneratorEditorProps {
  generator: Record<string, unknown>;
  onChange: (gen: Record<string, unknown>) => void;
}

export const YamlGeneratorEditor: FC<YamlGeneratorEditorProps> = ({ generator, onChange }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState('');

  const yamlStr = yaml.dump(generator, { indent: 2, lineWidth: -1 });

  const startEdit = () => {
    setText(yamlStr);
    setParseError('');
    setEditing(true);
  };

  const saveEdit = () => {
    try {
      const parsed = yaml.load(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setParseError(t('Invalid YAML'));
        return;
      }
      onChange(parsed as Record<string, unknown>);
      setEditing(false);
      setParseError('');
    } catch {
      setParseError(t('Invalid YAML'));
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setParseError('');
  };

  if (editing) {
    return (
      <div>
        {parseError && (
          <Alert
            variant="danger"
            isInline
            title={parseError}
            actionClose={<AlertActionCloseButton onClose={() => setParseError('')} />}
            className="pf-v6-u-mb-sm"
          />
        )}
        <textarea
          className="pf-v6-c-form-control"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t('Edit YAML')}
        />
        <div className="pf-v6-u-mt-sm pf-v6-u-display-flex pf-v6-u-gap-sm">
          <Button variant="primary" onClick={saveEdit}>{t('Save')}</Button>
          <Button variant="link" onClick={cancelEdit}>{t('Cancel')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <pre className="pf-v6-u-font-size-sm">{yamlStr}</pre>
      <Button variant="link" onClick={startEdit}>{t('Edit YAML')}</Button>
    </div>
  );
};

export default YamlGeneratorEditor;
