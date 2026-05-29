import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiffViewer } from './DiffViewer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

describe('DiffViewer', () => {
  it('renders diff lines with correct classes', () => {
    const { container } = render(
      <DiffViewer
        desired={'apiVersion: v1\nkind: ConfigMap\ndata:\n  key: old'}
        live={'apiVersion: v1\nkind: ConfigMap\ndata:\n  key: new'}
        resourceName="my-cm"
        kind="ConfigMap"
      />,
    );
    const addLines = container.querySelectorAll('.gitops-diff-add');
    const removeLines = container.querySelectorAll('.gitops-diff-remove');
    expect(addLines.length).toBeGreaterThan(0);
    expect(removeLines.length).toBeGreaterThan(0);
  });

  it('shows no differences when inputs are identical', () => {
    const content = 'apiVersion: v1\nkind: ConfigMap';
    render(
      <DiffViewer
        desired={content}
        live={content}
        resourceName="my-cm"
        kind="ConfigMap"
      />,
    );
    expect(screen.getByText('No differences')).toBeInTheDocument();
  });

  it('renders context lines without add/remove class', () => {
    const { container } = render(
      <DiffViewer
        desired={'line1\nline2\nline3'}
        live={'line1\nchanged\nline3'}
        resourceName="res"
        kind="Deployment"
      />,
    );
    const contextLines = container.querySelectorAll('.gitops-diff-context');
    expect(contextLines.length).toBeGreaterThan(0);
  });
});
