import React from 'react';
import { useMemo, type FC } from 'react';
import { computeUnifiedDiff } from '../../utils/diff';
import type { DiffLine } from '../../utils/diff';
import { useTranslation } from 'react-i18next';
import './DiffViewer.css';

interface DiffViewerProps {
  desired: string;
  live: string;
  resourceName: string;
  kind: string;
}

const lineClass = (type: DiffLine['type']): string => {
  switch (type) {
    case 'add':
      return 'gitops-diff-line gitops-diff-add';
    case 'remove':
      return 'gitops-diff-line gitops-diff-remove';
    default:
      return 'gitops-diff-line gitops-diff-context';
  }
};

const linePrefix = (type: DiffLine['type']): string => {
  switch (type) {
    case 'add':
      return '+';
    case 'remove':
      return '-';
    default:
      return ' ';
  }
};

export const DiffViewer: FC<DiffViewerProps> = ({ desired, live, resourceName, kind }) => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const diff = useMemo(
    () => computeUnifiedDiff(desired, live, resourceName, kind),
    [desired, live, resourceName, kind],
  );

  if (!diff.hasChanges) {
    return <div>{t('No differences')}</div>;
  }

  return (
    <div className="gitops-diff-container">
      <pre>
        {diff.lines.map((line, idx) => (
          <div key={idx} className={lineClass(line.type)}>
            <span className="gitops-diff-gutter">
              {line.oldLineNum ?? line.newLineNum ?? ''}
            </span>
            <span>{linePrefix(line.type)}{line.content}</span>
          </div>
        ))}
      </pre>
    </div>
  );
};

export default DiffViewer;
