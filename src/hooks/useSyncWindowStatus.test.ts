import { renderHook } from '@testing-library/react-hooks';
import { useSyncWindowStatus } from './useSyncWindowStatus';
import type { ApplicationResource } from '../types';

const mockUseK8sWatchResource = jest.fn();
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: (...args: unknown[]) => mockUseK8sWatchResource(...args),
}));

jest.mock('../utils/sync-windows', () => ({
  isSyncBlocked: jest.fn(),
}));

import { isSyncBlocked } from '../utils/sync-windows';
const mockIsSyncBlocked = isSyncBlocked as jest.Mock;

const app: ApplicationResource = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: { name: 'my-app', namespace: 'openshift-gitops', uid: '1' },
  spec: { project: 'team-a', destination: { namespace: 'prod' } },
  status: { sync: { status: 'Synced' }, health: { status: 'Healthy' } },
};

describe('useSyncWindowStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns blocked: false when project has no sync windows', () => {
    mockUseK8sWatchResource.mockReturnValue([
      { metadata: { name: 'team-a' }, spec: {} },
      true,
      null,
    ]);
    mockIsSyncBlocked.mockReturnValue(false);

    const { result } = renderHook(() => useSyncWindowStatus(app));
    expect(result.current.blocked).toBe(false);
    expect(result.current.projectName).toBe('team-a');
  });

  it('returns blocked: true when deny window is active', () => {
    mockUseK8sWatchResource.mockReturnValue([
      {
        metadata: { name: 'team-a' },
        spec: { syncWindows: [{ kind: 'deny', schedule: '* * * * *', duration: '1h' }] },
      },
      true,
      null,
    ]);
    mockIsSyncBlocked.mockReturnValue(true);

    const { result } = renderHook(() => useSyncWindowStatus(app));
    expect(result.current.blocked).toBe(true);
    expect(result.current.projectName).toBe('team-a');
  });

  it('returns blocked: false when not loaded', () => {
    mockUseK8sWatchResource.mockReturnValue([null, false, null]);

    const { result } = renderHook(() => useSyncWindowStatus(app));
    expect(result.current.blocked).toBe(false);
  });

  it('returns blocked: false when app is null', () => {
    mockUseK8sWatchResource.mockReturnValue([null, true, null]);

    const { result } = renderHook(() => useSyncWindowStatus(null));
    expect(result.current.blocked).toBe(false);
    expect(result.current.projectName).toBe('default');
  });

  it('returns blocked: false on watch error', () => {
    mockUseK8sWatchResource.mockReturnValue([null, true, new Error('not found')]);

    const { result } = renderHook(() => useSyncWindowStatus(app));
    expect(result.current.blocked).toBe(false);
  });
});
