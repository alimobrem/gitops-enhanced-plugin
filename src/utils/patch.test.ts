import { safePatch, safeRemove } from './patch';

describe('safePatch', () => {
  it('returns replace when path exists', () => {
    const res = { spec: { replicas: 3 } };
    expect(safePatch(res, '/spec/replicas', 5)).toEqual({ op: 'replace', path: '/spec/replicas', value: 5 });
  });

  it('returns add when path does not exist', () => {
    const res = { spec: {} };
    expect(safePatch(res, '/spec/syncPolicy/automated', { prune: true })).toEqual({ op: 'add', path: '/spec/syncPolicy/automated', value: { prune: true } });
  });

  it('handles array indices', () => {
    const res = { spec: { template: { spec: { containers: [{ image: 'nginx' }] } } } };
    expect(safePatch(res, '/spec/template/spec/containers/0/image', 'nginx:1.25')).toEqual({ op: 'replace', path: '/spec/template/spec/containers/0/image', value: 'nginx:1.25' });
  });

  it('returns add for out-of-bounds array index', () => {
    const res = { spec: { template: { spec: { containers: [] } } } };
    expect(safePatch(res, '/spec/template/spec/containers/0/image', 'nginx')).toEqual({ op: 'add', path: '/spec/template/spec/containers/0/image', value: 'nginx' });
  });
});

describe('safeRemove', () => {
  it('returns remove op when path exists', () => {
    const res = { spec: { syncPolicy: { automated: { prune: true } } } };
    expect(safeRemove(res, '/spec/syncPolicy/automated')).toEqual({ op: 'remove', path: '/spec/syncPolicy/automated', value: null });
  });

  it('returns null when path does not exist', () => {
    const res = { spec: {} };
    expect(safeRemove(res, '/spec/syncPolicy/automated')).toBeNull();
  });
});
