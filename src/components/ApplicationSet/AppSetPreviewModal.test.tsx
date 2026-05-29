import React from 'react';
import { render, screen } from '@testing-library/react';

let mockApps: unknown[] = [];
let mockLoaded = true;

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (res: unknown) => {
    if (!res) return [[], false, null];
    return [mockApps, mockLoaded, null];
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

import { AppSetPreviewModal } from './AppSetPreviewModal';

describe('AppSetPreviewModal', () => {
  beforeEach(() => {
    mockApps = [];
    mockLoaded = true;
  });

  it('renders empty state when no child apps', () => {
    render(
      <AppSetPreviewModal
        isOpen
        onClose={jest.fn()}
        appSetName="my-appset"
        namespace="openshift-gitops"
      />,
    );
    expect(
      screen.getByText('No child applications generated'),
    ).toBeInTheDocument();
  });

  it('renders child applications in table', () => {
    mockApps = [
      {
        metadata: {
          name: 'app-dev',
          namespace: 'openshift-gitops',
          uid: '1',
          annotations: {
            'argocd.argoproj.io/application-set-name': 'my-appset',
          },
        },
        spec: {
          destination: { server: 'https://dev.local', namespace: 'dev' },
        },
      },
    ];
    render(
      <AppSetPreviewModal
        isOpen
        onClose={jest.fn()}
        appSetName="my-appset"
        namespace="openshift-gitops"
      />,
    );
    expect(screen.getByText('app-dev')).toBeInTheDocument();
    expect(screen.getByText('https://dev.local')).toBeInTheDocument();
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('does not fetch when closed', () => {
    render(
      <AppSetPreviewModal
        isOpen={false}
        onClose={jest.fn()}
        appSetName="my-appset"
        namespace="openshift-gitops"
      />,
    );
    expect(
      screen.queryByText('Generated Applications'),
    ).not.toBeInTheDocument();
  });
});
