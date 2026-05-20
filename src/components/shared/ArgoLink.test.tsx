import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArgoLink } from './ArgoLink';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

describe('ArgoLink', () => {
  it('renders a link with the correct Argo CD URL', () => {
    render(
      <ArgoLink argoBaseURL="https://argocd.example.com" appName="my-app" />,
    );
    const link = screen.getByRole('link', { name: /open in argo cd/i });
    expect(link).toHaveAttribute(
      'href',
      'https://argocd.example.com/applications/my-app',
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders with resource path when provided', () => {
    render(
      <ArgoLink
        argoBaseURL="https://argocd.example.com"
        appName="my-app"
        resourcePath="?resource=Deployment/nginx"
      />,
    );
    const link = screen.getByRole('link', { name: /open in argo cd/i });
    expect(link).toHaveAttribute(
      'href',
      'https://argocd.example.com/applications/my-app?resource=Deployment/nginx',
    );
  });
});
