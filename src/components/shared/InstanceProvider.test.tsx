import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: () => [[], true, null],
  DocumentTitle: ({ children }: { children: string }) => <title>{children}</title>,
  ResourceLink: ({ name }: { name: string }) => <a>{name}</a>,
  k8sPatch: jest.fn(),
  k8sCreate: jest.fn(),
  k8sDelete: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
jest.mock('react-router', () => ({ useParams: () => ({ name: 'test', ns: 'default' }) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({ push: jest.fn() }) }));

import { InstanceProvider } from './InstanceProvider';
import { InstanceContext } from '../../hooks/useArgoCDInstances';

const ContextConsumer: React.FC = () => {
  const ctx = useContext(InstanceContext);
  return <span data-testid="instance-name">{ctx.instance.name}</span>;
};

describe('InstanceProvider', () => {
  it('renders without crashing', () => {
    render(<InstanceProvider><span>child</span></InstanceProvider>);
  });

  it('renders children', () => {
    render(<InstanceProvider><span>child content</span></InstanceProvider>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('provides instance context value', () => {
    render(
      <InstanceProvider>
        <ContextConsumer />
      </InstanceProvider>,
    );
    expect(screen.getByTestId('instance-name')).toBeInTheDocument();
  });
});
