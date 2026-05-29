import yaml from 'js-yaml';

export function toSortedYaml(jsonStr: string): string {
  try {
    return yaml.dump(JSON.parse(jsonStr), { sortKeys: true, lineWidth: 120, noRefs: true });
  } catch {
    return jsonStr;
  }
}
