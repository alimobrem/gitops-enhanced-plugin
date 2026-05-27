import React from 'react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button, TextInput, Tooltip,
} from '@patternfly/react-core';
import { TrashIcon, PlusCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import type { ListGenerator } from '../../../types';

interface ListGeneratorFormProps {
  generator: ListGenerator;
  onChange: (gen: ListGenerator) => void;
}

export const ListGeneratorForm: FC<ListGeneratorFormProps> = ({ generator, onChange }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const elements = generator?.list?.elements ?? [];
  const columns = elements.length > 0 ? Object.keys(elements[0]) : [];

  const updateElement = (rowIdx: number, key: string, value: string) => {
    const updated = elements.map((el, i) =>
      i === rowIdx ? { ...el, [key]: value } : el,
    );
    onChange({ list: { elements: updated } });
  };

  const addElement = () => {
    const empty: Record<string, string> = {};
    for (const col of columns) empty[col] = '';
    onChange({ list: { elements: [...elements, empty] } });
  };

  const removeElement = (rowIdx: number) => {
    onChange({ list: { elements: elements.filter((_, i) => i !== rowIdx) } });
  };

  const addColumn = () => {
    const newKey = `key${columns.length}`;
    const updated = elements.map((el) => ({ ...el, [newKey]: '' }));
    onChange({ list: { elements: updated.length > 0 ? updated : [{ [newKey]: '' }] } });
  };

  const removeColumn = (key: string) => {
    const updated = elements.map((el) => {
      const copy = { ...el };
      delete copy[key];
      return copy;
    });
    onChange({ list: { elements: updated } });
  };

  return (
    <div>
      {elements.length > 0 && (
        <table className="pf-v6-c-table pf-m-compact pf-v6-u-mb-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>
                  {col}
                  {columns.length > 1 && (
                    <Tooltip content={t('Remove column')}>
                      <Button variant="plain" aria-label={t('Remove column')} onClick={() => removeColumn(col)} className="pf-v6-u-ml-xs" isInline>
                        <TimesCircleIcon />
                      </Button>
                    </Tooltip>
                  )}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {elements.map((el, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col) => (
                  <td key={col}>
                    <TextInput
                      aria-label={`${col}-${rowIdx}`}
                      value={el[col] ?? ''}
                      onChange={(_e, v) => updateElement(rowIdx, col, v)}
                    />
                  </td>
                ))}
                <td>
                  <Tooltip content={t('Remove Element')}>
                    <Button variant="plain" aria-label={t('Remove Element')} onClick={() => removeElement(rowIdx)}>
                      <TrashIcon />
                    </Button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pf-v6-u-display-flex pf-v6-u-gap-sm">
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addElement} isDisabled={columns.length === 0}>
          {t('Add Element')}
        </Button>
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addColumn}>
          {t('Add Column')}
        </Button>
      </div>
    </div>
  );
};

export default ListGeneratorForm;
