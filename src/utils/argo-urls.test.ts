import { buildArgoAppURL, buildCommitUrl } from './argo-urls';

describe('buildArgoAppURL', () => {
  it('builds a basic application URL', () => {
    expect(buildArgoAppURL('https://argocd.example.com', 'my-app'))
      .toBe('https://argocd.example.com/applications/my-app');
  });

  it('strips trailing slash from base URL', () => {
    expect(buildArgoAppURL('https://argocd.example.com/', 'my-app'))
      .toBe('https://argocd.example.com/applications/my-app');
  });

  it('encodes special characters in app name', () => {
    expect(buildArgoAppURL('https://argocd.example.com', 'my app/test'))
      .toBe('https://argocd.example.com/applications/my%20app%2Ftest');
  });

  it('appends resource path when provided', () => {
    expect(buildArgoAppURL('https://argocd.example.com', 'my-app', '/resource-tree'))
      .toBe('https://argocd.example.com/applications/my-app/resource-tree');
  });
});

describe('buildCommitUrl', () => {
  const rev = 'abc1234def5678';

  it('returns null for missing repoURL', () => {
    expect(buildCommitUrl(undefined, rev)).toBeNull();
    expect(buildCommitUrl('', rev)).toBeNull();
  });

  it('returns null for missing revision', () => {
    expect(buildCommitUrl('https://github.com/org/repo', undefined)).toBeNull();
    expect(buildCommitUrl('https://github.com/org/repo', '')).toBeNull();
  });

  it('rejects javascript: URLs', () => {
    expect(buildCommitUrl('javascript:alert(1)//github.com', rev)).toBeNull();
  });

  it('rejects data: URLs', () => {
    expect(buildCommitUrl('data:text/html,<script>alert(1)</script>//github.com', rev)).toBeNull();
  });

  it('rejects ftp: URLs', () => {
    expect(buildCommitUrl('ftp://github.com/org/repo', rev)).toBeNull();
  });

  it('builds GitHub commit URL', () => {
    expect(buildCommitUrl('https://github.com/org/repo', rev))
      .toBe(`https://github.com/org/repo/commit/${rev}`);
  });

  it('builds GitHub commit URL stripping .git', () => {
    expect(buildCommitUrl('https://github.com/org/repo.git', rev))
      .toBe(`https://github.com/org/repo/commit/${rev}`);
  });

  it('builds GitLab commit URL', () => {
    expect(buildCommitUrl('https://gitlab.com/org/repo', rev))
      .toBe(`https://gitlab.com/org/repo/-/commit/${rev}`);
  });

  it('builds self-hosted GitLab commit URL', () => {
    expect(buildCommitUrl('https://gitlab.internal.corp/org/repo', rev))
      .toBe(`https://gitlab.internal.corp/org/repo/-/commit/${rev}`);
  });

  it('builds Bitbucket commit URL', () => {
    expect(buildCommitUrl('https://bitbucket.org/org/repo', rev))
      .toBe(`https://bitbucket.org/org/repo/commits/${rev}`);
  });

  it('returns null for unknown SCM providers', () => {
    expect(buildCommitUrl('https://gitea.example.com/org/repo', rev)).toBeNull();
  });

  it('handles http:// URLs', () => {
    expect(buildCommitUrl('http://github.com/org/repo', rev))
      .toBe(`http://github.com/org/repo/commit/${rev}`);
  });
});
