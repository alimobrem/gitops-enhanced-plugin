import { parseNotificationAnnotations } from './notifications';
import type { ApplicationResource } from '../types/application';

function makeApp(annotations: Record<string, string> = {}): ApplicationResource {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name: 'test-app',
      namespace: 'openshift-gitops',
      uid: 'abc-123',
      annotations,
    },
    spec: {
      destination: { server: 'https://kubernetes.default.svc', namespace: 'default' },
      project: 'default',
    },
  };
}

describe('parseNotificationAnnotations', () => {
  it('parses valid notification annotations', () => {
    const app = makeApp({
      'notified.argoproj.io/on-deployed.slack': '2024-06-01T12:00:00Z',
      'notified.argoproj.io/on-health-degraded.email': '2024-06-02T08:30:00Z',
    });
    const entries = parseNotificationAnnotations(app);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(
      expect.objectContaining({ trigger: 'on-health-degraded', template: 'email' }),
    );
    expect(entries[1]).toEqual(
      expect.objectContaining({ trigger: 'on-deployed', template: 'slack' }),
    );
  });

  it('returns empty array when no notification annotations exist', () => {
    const app = makeApp({
      'argocd.argoproj.io/refresh': 'normal',
    });
    expect(parseNotificationAnnotations(app)).toEqual([]);
  });

  it('returns empty array when annotations are undefined', () => {
    const app = makeApp();
    delete app.metadata.annotations;
    expect(parseNotificationAnnotations(app)).toEqual([]);
  });

  it('sorts by most recent first', () => {
    const app = makeApp({
      'notified.argoproj.io/on-sync-succeeded.slack': '2024-01-01T00:00:00Z',
      'notified.argoproj.io/on-deployed.slack': '2024-06-15T00:00:00Z',
      'notified.argoproj.io/on-health-degraded.pagerduty': '2024-03-10T00:00:00Z',
    });
    const entries = parseNotificationAnnotations(app);
    expect(entries.map((e) => e.trigger)).toEqual([
      'on-deployed',
      'on-health-degraded',
      'on-sync-succeeded',
    ]);
  });

  it('parses JSON object values with timestamp field', () => {
    const app = makeApp({
      'notified.argoproj.io/on-deployed.slack': JSON.stringify({
        timestamp: '2024-06-01T12:00:00Z',
      }),
    });
    const entries = parseNotificationAnnotations(app);
    expect(entries[0].lastNotified).toBe('2024-06-01T12:00:00Z');
  });
});
