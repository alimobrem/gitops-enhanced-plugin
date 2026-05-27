import React from 'react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormGroup, TextInput, Button, Tooltip,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import type { ClusterGenerator } from '../../../types';

interface ClusterGeneratorFormProps {
  generator: ClusterGenerator;
  onChange: (gen: ClusterGenerator) => void;
}

export const ClusterGeneratorForm: FC<ClusterGeneratorFormProps> = ({ generator, onChange }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const matchLabels = generator?.clusters?.selector?.matchLabels ?? {};
  const values = generator?.clusters?.values ?? {};

  const labelEntries = Object.entries(matchLabels);
  const valueEntries = Object.entries(values);

  const updateMatchLabels = (newLabels: Record<string, string>) => {
    onChange({
      clusters: {
        ...generator?.clusters,
        selector: { ...generator?.clusters?.selector, matchLabels: newLabels },
      },
    });
  };

  const updateValues = (newValues: Record<string, string>) => {
    onChange({
      clusters: { ...generator?.clusters, values: newValues },
    });
  };

  const setLabel = (oldKey: string, newKey: string, value: string) => {
    const updated = { ...matchLabels };
    if (oldKey !== newKey) delete updated[oldKey];
    updated[newKey] = value;
    updateMatchLabels(updated);
  };

  const removeLabel = (key: string) => {
    const updated = { ...matchLabels };
    delete updated[key];
    updateMatchLabels(updated);
  };

  const addLabel = () => {
    updateMatchLabels({ ...matchLabels, '': '' });
  };

  const setValue = (oldKey: string, newKey: string, value: string) => {
    const updated = { ...values };
    if (oldKey !== newKey) delete updated[oldKey];
    updated[newKey] = value;
    updateValues(updated);
  };

  const removeValue = (key: string) => {
    const updated = { ...values };
    delete updated[key];
    updateValues(updated);
  };

  const addValue = () => {
    updateValues({ ...values, '': '' });
  };

  const renderKeyValuePairs = (
    entries: Array<[string, string]>,
    onSet: (oldKey: string, newKey: string, value: string) => void,
    onRemove: (key: string) => void,
    prefix: string,
  ) =>
    entries.map(([key, value], i) => (
      <div key={`${prefix}-${i}`} className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-mb-sm pf-v6-u-gap-sm">
        <TextInput
          aria-label={`${prefix}-key-${i}`}
          value={key}
          onChange={(_e, v) => onSet(key, v, value)}
          placeholder="key"
        />
        <TextInput
          aria-label={`${prefix}-value-${i}`}
          value={value}
          onChange={(_e, v) => onSet(key, key, v)}
          placeholder="value"
        />
        <Tooltip content={t('Remove Label')}>
          <Button variant="plain" aria-label={t('Remove Label')} onClick={() => onRemove(key)}>
            <MinusCircleIcon />
          </Button>
        </Tooltip>
      </div>
    ));

  return (
    <>
      <FormGroup label={t('Match Labels')} fieldId="cluster-labels">
        {renderKeyValuePairs(labelEntries, setLabel, removeLabel, 'label')}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addLabel}>{t('Add Label')}</Button>
      </FormGroup>
      <FormGroup label={t('Values')} fieldId="cluster-values">
        {renderKeyValuePairs(valueEntries, setValue, removeValue, 'value')}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addValue}>{t('Add Value')}</Button>
      </FormGroup>
    </>
  );
};

export default ClusterGeneratorForm;
