import React from 'react';
import { render, screen } from '@testing-library/react';
import { Drawer, DrawerContent } from '@patternfly/react-core';
import { ResourceDrawer } from './ResourceDrawer';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetch: jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ items: [] }),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

jest.mock('js-yaml', () => ({
  dump: (obj: unknown) => JSON.stringify(obj),
}));

jest.mock('../../hooks/useManagedResources', () => ({
  useManagedResources: () => ({ resources: [], loaded: true, error: null }),
}));

const mockResource = {
  group: 'apps',
  version: 'v1',
  kind: 'Deployment',
  namespace: 'default',
  name: 'my-deploy',
  status: 'Synced' as const,
  health: { status: 'Healthy' },
};

const renderInDrawer = (resource: typeof mockResource) => {
  return render(
    <Drawer isExpanded>
      <DrawerContent panelContent={<ResourceDrawer resource={resource} onClose={jest.fn()} />}>
        <div>main</div>
      </DrawerContent>
    </Drawer>,
  );
};

describe('ResourceDrawer', () => {
  it('renders summary tab with resource details', () => {
    renderInDrawer(mockResource);
    expect(screen.getAllByText('my-deploy', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText('apps/v1')).toBeInTheDocument();
  });

  it('renders tab titles', () => {
    renderInDrawer(mockResource);
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Live Manifest')).toBeInTheDocument();
    expect(screen.getByText('Diff')).toBeInTheDocument();
  });

  it('renders core resource without group', () => {
    const coreResource = { ...mockResource, group: undefined };
    renderInDrawer(coreResource);
    expect(screen.getByText('v1')).toBeInTheDocument();
  });
});
