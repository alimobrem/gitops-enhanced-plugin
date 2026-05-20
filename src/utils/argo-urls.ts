export function buildArgoAppURL(
  baseURL: string,
  appName: string,
  resourcePath?: string,
): string {
  const url = `${baseURL.replace(/\/$/, '')}/applications/${encodeURIComponent(appName)}`;
  return resourcePath ? `${url}${resourcePath}` : url;
}
