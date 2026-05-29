import { computeUnifiedDiff } from './diff';

describe('computeUnifiedDiff', () => {
  it('returns no changes for identical strings', () => {
    const yaml = 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test';
    const result = computeUnifiedDiff(yaml, yaml, 'test', 'ConfigMap');

    expect(result.hasChanges).toBe(false);
    expect(result.resourceName).toBe('test');
    expect(result.kind).toBe('ConfigMap');
    expect(result.lines).toHaveLength(4);
    result.lines.forEach((line) => {
      expect(line.type).toBe('context');
      expect(line.oldLineNum).toBeDefined();
      expect(line.newLineNum).toBeDefined();
    });
  });

  it('detects added lines', () => {
    const desired = 'line1\nline2';
    const live = 'line1\nline2\nline3';
    const result = computeUnifiedDiff(desired, live, 'r', 'Deployment');

    expect(result.hasChanges).toBe(true);
    const added = result.lines.filter((l) => l.type === 'add');
    expect(added).toHaveLength(1);
    expect(added[0].content).toBe('line3');
    expect(added[0].newLineNum).toBe(3);
  });

  it('detects removed lines', () => {
    const desired = 'line1\nline2\nline3';
    const live = 'line1\nline3';
    const result = computeUnifiedDiff(desired, live, 'r', 'Service');

    expect(result.hasChanges).toBe(true);
    const removed = result.lines.filter((l) => l.type === 'remove');
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toBe('line2');
    expect(removed[0].oldLineNum).toBe(2);
  });

  it('handles mixed changes', () => {
    const desired = 'apiVersion: v1\nreplicas: 1\nimage: nginx:1.19';
    const live = 'apiVersion: v1\nreplicas: 3\nimage: nginx:1.25';
    const result = computeUnifiedDiff(desired, live, 'web', 'Deployment');

    expect(result.hasChanges).toBe(true);
    const context = result.lines.filter((l) => l.type === 'context');
    expect(context.length).toBeGreaterThanOrEqual(1);
    expect(context[0].content).toBe('apiVersion: v1');

    const removed = result.lines.filter((l) => l.type === 'remove');
    const added = result.lines.filter((l) => l.type === 'add');
    expect(removed.length).toBeGreaterThanOrEqual(1);
    expect(added.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty strings', () => {
    const result = computeUnifiedDiff('', '', 'empty', 'ConfigMap');
    expect(result.hasChanges).toBe(false);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].type).toBe('context');
  });

  it('handles desired empty and live non-empty', () => {
    const result = computeUnifiedDiff('', 'line1\nline2', 'r', 'ConfigMap');
    expect(result.hasChanges).toBe(true);
    const added = result.lines.filter((l) => l.type === 'add');
    expect(added.length).toBeGreaterThanOrEqual(1);
  });

  it('handles desired non-empty and live empty', () => {
    const result = computeUnifiedDiff('line1\nline2', '', 'r', 'ConfigMap');
    expect(result.hasChanges).toBe(true);
    const removed = result.lines.filter((l) => l.type === 'remove');
    expect(removed.length).toBeGreaterThanOrEqual(1);
  });
});
