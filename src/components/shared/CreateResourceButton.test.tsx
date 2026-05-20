import React from 'react';
import { render, screen } from '@testing-library/react';
import { CreateResourceButton } from './CreateResourceButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string, opts?: Record<string, string>) => {
    if (opts) return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), s);
    return s;
  }}),
}));

describe('CreateResourceButton', () => {
  it('renders link to namespaced create page', () => {
    render(<CreateResourceButton group="argoproj.io" version="v1alpha1" kind="Application" namespace="openshift-gitops" />);
    const link = screen.getByRole('link', { name: /Create Application/i });
    expect(link).toHaveAttribute('href', '/k8s/ns/openshift-gitops/argoproj.io~v1alpha1~Application/~new');
  });

  it('renders link to cluster-scoped create page when no namespace', () => {
    render(<CreateResourceButton group="argoproj.io" version="v1alpha1" kind="ClusterAnalysisTemplate" />);
    const link = screen.getByRole('link', { name: /Create ClusterAnalysisTemplate/i });
    expect(link).toHaveAttribute('href', '/k8s/cluster/argoproj.io~v1alpha1~ClusterAnalysisTemplate/~new');
  });
});
