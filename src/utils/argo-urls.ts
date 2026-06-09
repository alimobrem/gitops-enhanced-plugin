export function buildArgoAppURL(
  baseURL: string,
  appName: string,
  resourcePath?: string,
): string {
  const url = `${baseURL.replace(/\/$/, '')}/applications/${encodeURIComponent(appName)}`;
  return resourcePath ? `${url}${resourcePath}` : url;
}

export function buildCommitUrl(repoURL?: string, revision?: string): string | null {
  if (!repoURL || !revision) return null;
  if (!/^https?:\/\//i.test(repoURL)) return null;
  const cleaned = repoURL.replace(/\.git$/, '');
  if (cleaned.includes('github.com')) return `${cleaned}/commit/${revision}`;
  if (cleaned.includes('gitlab')) return `${cleaned}/-/commit/${revision}`;
  if (cleaned.includes('bitbucket.org')) return `${cleaned}/commits/${revision}`;
  return null;
}
