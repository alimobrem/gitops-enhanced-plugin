import * as fs from 'fs';
import * as path from 'path';

function findTSXFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '__mocks__' && entry.name !== 'test-utils') {
      files.push(...findTSXFiles(full));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function extractKeys(content: string): string[] {
  const keys: string[] = [];
  const regex = /t\('([^']+)'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

describe('i18n completeness', () => {
  it('all t() keys in TSX files exist in the locale file', () => {
    const localeFile = path.resolve(__dirname, '../locales/en/plugin__gitops-enhanced.json');
    const locale = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
    const localeKeys = new Set(Object.keys(locale));

    const srcDir = path.resolve(__dirname);
    const tsxFiles = findTSXFiles(srcDir);
    const missing: Array<{ file: string; key: string }> = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const keys = extractKeys(content);
      for (const key of keys) {
        if (!localeKeys.has(key) && key.length > 1) {
          missing.push({ file: path.relative(srcDir, file), key });
        }
      }
    }

    if (missing.length > 0) {
      const report = missing.map((m) => `  ${m.file}: "${m.key}"`).join('\n');
      expect(missing).toEqual([]);
    }
  });
});
