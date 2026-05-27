import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormGroup, TextInput, Checkbox, Button, Tooltip,
  ToggleGroup, ToggleGroupItem,
  HelperText, HelperTextItem, FormHelperText,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import type { GitGenerator } from '../../../types';

interface GitGeneratorFormProps {
  generator: GitGenerator;
  onChange: (gen: GitGenerator) => void;
}

export const GitGeneratorForm: FC<GitGeneratorFormProps> = ({ generator, onChange }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const git = generator?.git;
  const hasDirs = !!git?.directories;
  const [mode, setMode] = useState<'directories' | 'files'>(hasDirs || !git?.files ? 'directories' : 'files');

  const repoURL = git?.repoURL ?? '';
  const revision = git?.revision ?? 'HEAD';
  const directories = git?.directories ?? [];
  const files = git?.files ?? [];
  const repoValid = repoURL.trim().length > 0;

  const update = (partial: Partial<GitGenerator['git']>) => {
    onChange({ git: { ...git, ...partial } });
  };

  const switchMode = (newMode: 'directories' | 'files') => {
    setMode(newMode);
    if (newMode === 'directories') {
      const { files: _f, ...rest } = git;
      onChange({ git: { ...rest, directories: directories.length > 0 ? directories : [{ path: '*' }] } });
    } else {
      const { directories: _d, ...rest } = git;
      onChange({ git: { ...rest, files: files.length > 0 ? files : [{ path: '' }] } });
    }
  };

  const addDirectory = () => update({ directories: [...directories, { path: '' }] });
  const removeDirectory = (idx: number) => update({ directories: directories.filter((_, i) => i !== idx) });
  const updateDirectory = (idx: number, path: string) => {
    const updated = directories.map((d, i) => i === idx ? { ...d, path } : d);
    update({ directories: updated });
  };
  const toggleExclude = (idx: number, exclude: boolean) => {
    const updated = directories.map((d, i) => i === idx ? { ...d, exclude } : d);
    update({ directories: updated });
  };

  const addFile = () => update({ files: [...files, { path: '' }] });
  const removeFile = (idx: number) => update({ files: files.filter((_, i) => i !== idx) });
  const updateFile = (idx: number, path: string) => {
    const updated = files.map((f, i) => i === idx ? { ...f, path } : f);
    update({ files: updated });
  };

  return (
    <>
      <FormGroup label={t('Repository URL')} isRequired fieldId="git-repo">
        <TextInput
          id="git-repo"
          isRequired
          validated={repoValid ? 'default' : 'error'}
          value={repoURL}
          onChange={(_e, v) => update({ repoURL: v })}
        />
        {!repoValid && (
          <FormHelperText>
            <HelperText><HelperTextItem variant="error">{t('Repository URL is required')}</HelperTextItem></HelperText>
          </FormHelperText>
        )}
      </FormGroup>
      <FormGroup label={t('Revision')} fieldId="git-revision">
        <TextInput id="git-revision" value={revision} onChange={(_e, v) => update({ revision: v })} />
      </FormGroup>
      <FormGroup label={t('Mode')} fieldId="git-mode">
        <ToggleGroup aria-label={t('Mode')}>
          <ToggleGroupItem
            text={t('Directories')}
            isSelected={mode === 'directories'}
            onChange={() => switchMode('directories')}
          />
          <ToggleGroupItem
            text={t('Files')}
            isSelected={mode === 'files'}
            onChange={() => switchMode('files')}
          />
        </ToggleGroup>
      </FormGroup>

      {mode === 'directories' && (
        <FormGroup label={t('Directories')} fieldId="git-dirs">
          {directories.map((dir, i) => (
            <div key={i} className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-mb-sm">
              <TextInput
                aria-label={`dir-path-${i}`}
                value={dir.path}
                onChange={(_e, v) => updateDirectory(i, v)}
                placeholder="path/*"
              />
              <Checkbox
                id={`dir-exclude-${i}`}
                label={t('Exclude')}
                isChecked={!!dir.exclude}
                onChange={(_e, v) => toggleExclude(i, v)}
                className="pf-v6-u-ml-sm"
              />
              <Tooltip content={t('Remove')}>
                <Button variant="plain" aria-label={t('Remove')} onClick={() => removeDirectory(i)} className="pf-v6-u-ml-sm">
                  <MinusCircleIcon />
                </Button>
              </Tooltip>
            </div>
          ))}
          <Button variant="link" icon={<PlusCircleIcon />} onClick={addDirectory}>{t('Add Directory')}</Button>
        </FormGroup>
      )}

      {mode === 'files' && (
        <FormGroup label={t('Files')} fieldId="git-files">
          {files.map((f, i) => (
            <div key={i} className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-mb-sm">
              <TextInput
                aria-label={`file-path-${i}`}
                value={f.path}
                onChange={(_e, v) => updateFile(i, v)}
                placeholder="config.json"
              />
              <Tooltip content={t('Remove')}>
                <Button variant="plain" aria-label={t('Remove')} onClick={() => removeFile(i)} className="pf-v6-u-ml-sm">
                  <MinusCircleIcon />
                </Button>
              </Tooltip>
            </div>
          ))}
          <Button variant="link" icon={<PlusCircleIcon />} onClick={addFile}>{t('Add File')}</Button>
        </FormGroup>
      )}
    </>
  );
};

export default GitGeneratorForm;
