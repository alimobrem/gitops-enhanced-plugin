import React from 'react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardTitle, CardBody, Button, TextInput, FormGroup, Tooltip,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import type { AppSetGenerator } from '../../../types';
import { ListGeneratorForm } from './ListGeneratorForm';
import { GitGeneratorForm } from './GitGeneratorForm';
import { ClusterGeneratorForm } from './ClusterGeneratorForm';
import { YamlGeneratorEditor } from './YamlGeneratorEditor';

interface GeneratorEditorProps {
  generator: AppSetGenerator;
  index: number;
  onChange: (gen: AppSetGenerator) => void;
  onRemove: () => void;
  nested?: boolean;
}

function detectType(gen: AppSetGenerator): string {
  if (!gen || typeof gen !== 'object') return 'unknown';
  const keys = Object.keys(gen);
  if (keys.length === 0) return 'unknown';
  return keys[0];
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    list: 'List',
    git: 'Git',
    clusters: 'Cluster',
    matrix: 'Matrix',
    merge: 'Merge',
  };
  return labels[type] ?? type;
}

export const GeneratorEditor: FC<GeneratorEditorProps> = ({ generator, index, onChange, onRemove, nested }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const type = detectType(generator);

  const renderForm = () => {
    switch (type) {
      case 'list':
        return (
          <ListGeneratorForm
            generator={generator as { list: { elements: Array<Record<string, string>> } }}
            onChange={onChange}
          />
        );
      case 'git':
        return (
          <GitGeneratorForm
            generator={generator as { git: { repoURL: string } }}
            onChange={onChange}
          />
        );
      case 'clusters':
        return (
          <ClusterGeneratorForm
            generator={generator as { clusters: Record<string, unknown> }}
            onChange={onChange}
          />
        );
      case 'matrix': {
        if (nested) {
          return <YamlGeneratorEditor generator={generator as Record<string, unknown>} onChange={onChange} />;
        }
        const matrixGen = generator as { matrix: { generators: AppSetGenerator[] } };
        const childGens = matrixGen?.matrix?.generators ?? [];
        const updateChild = (idx: number, gen: AppSetGenerator) => {
          const updated = [...childGens];
          updated[idx] = gen;
          onChange({ matrix: { generators: updated } });
        };
        const removeChild = (idx: number) => {
          onChange({ matrix: { generators: childGens.filter((_, i) => i !== idx) } });
        };
        return (
          <>
            {childGens.map((child, i) => (
              <GeneratorEditor
                key={i}
                generator={child}
                index={i}
                onChange={(g) => updateChild(i, g)}
                onRemove={() => removeChild(i)}
                nested
              />
            ))}
          </>
        );
      }
      case 'merge': {
        if (nested) {
          return <YamlGeneratorEditor generator={generator as Record<string, unknown>} onChange={onChange} />;
        }
        const mergeGen = generator as { merge: { generators: AppSetGenerator[]; mergeKeys: string[] } };
        const mergeChildGens = mergeGen?.merge?.generators ?? [];
        const mergeKeys = mergeGen?.merge?.mergeKeys ?? [];
        const updateMergeChild = (idx: number, gen: AppSetGenerator) => {
          const updated = [...mergeChildGens];
          updated[idx] = gen;
          onChange({ merge: { ...mergeGen.merge, generators: updated } });
        };
        const removeMergeChild = (idx: number) => {
          onChange({ merge: { ...mergeGen.merge, generators: mergeChildGens.filter((_, i) => i !== idx) } });
        };
        const updateMergeKeys = (val: string) => {
          onChange({ merge: { ...mergeGen.merge, mergeKeys: val.split(',').map((s) => s.trim()).filter(Boolean) } });
        };
        return (
          <>
            <FormGroup label={t('Merge Keys')} fieldId={`merge-keys-${index}`}>
              <TextInput
                id={`merge-keys-${index}`}
                value={mergeKeys.join(', ')}
                onChange={(_e, v) => updateMergeKeys(v)}
                aria-label={t('Merge Keys')}
              />
            </FormGroup>
            {mergeChildGens.map((child, i) => (
              <GeneratorEditor
                key={i}
                generator={child}
                index={i}
                onChange={(g) => updateMergeChild(i, g)}
                onRemove={() => removeMergeChild(i)}
                nested
              />
            ))}
          </>
        );
      }
      default:
        return <YamlGeneratorEditor generator={generator as Record<string, unknown>} onChange={onChange} />;
    }
  };

  return (
    <Card isCompact className="pf-v6-u-mb-md">
      <CardTitle>
        <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between pf-v6-u-align-items-center">
          <span>{t('Generator')} {index + 1}: {typeLabel(type)}</span>
          <Tooltip content={t('Remove Generator')}>
            <Button variant="plain" aria-label={t('Remove Generator')} onClick={onRemove}>
              <MinusCircleIcon />
            </Button>
          </Tooltip>
        </div>
      </CardTitle>
      <CardBody>{renderForm()}</CardBody>
    </Card>
  );
};

export default GeneratorEditor;
