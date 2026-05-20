export const mockConsoleSdk = () => {
  jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
    useK8sWatchResource: (resource: { isList?: boolean }) => {
      if (resource.isList) return [[], true, null];
      return [{ metadata: { name: 'testuser' } }, true, null];
    },
    DocumentTitle: ({ children }: { children: string }) =>
      require('react').createElement('title', null, children),
    ListPageHeader: ({ title, children }: { title: string; children?: unknown }) =>
      require('react').createElement('div', null,
        require('react').createElement('h1', null, title),
        children,
      ),
    ResourceLink: ({ name }: { name: string }) =>
      require('react').createElement('a', null, name),
    k8sPatch: jest.fn().mockResolvedValue({}),
    k8sDelete: jest.fn().mockResolvedValue({}),
    k8sCreate: jest.fn().mockResolvedValue({}),
    consoleFetch: jest.fn(),
  }));
};

export const mockI18n = () => {
  jest.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (s: string, opts?: Record<string, string>) => {
        if (opts) return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), s);
        return s;
      },
    }),
  }));
};

export const mockRouter = () => {
  jest.mock('react-router', () => ({
    useParams: () => ({}),
    useNavigate: () => jest.fn(),
  }));
  jest.mock('react-router-dom', () => ({
    useParams: () => ({}),
    useNavigate: () => jest.fn(),
  }));
};

export const mockInstanceContext = () => {
  jest.mock('../../hooks/useArgoCDInstances', () => ({
    useCurrentInstance: () => ({
      instance: { name: 'test', namespace: 'openshift-gitops' },
      instances: [],
      setInstance: jest.fn(),
    }),
    useArgoCDInstances: () => [[], true],
    InstanceContext: {
      Provider: ({ children }: { children: unknown }) =>
        require('react').createElement(require('react').Fragment, null, children),
    },
  }));
  jest.mock('../shared/InstanceProvider', () => ({
    InstanceProvider: ({ children }: { children: unknown }) =>
      require('react').createElement(require('react').Fragment, null, children),
  }));
};

export const setupAllMocks = () => {
  mockConsoleSdk();
  mockI18n();
  mockRouter();
};
