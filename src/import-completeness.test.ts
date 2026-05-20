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

describe('import completeness', () => {
  it('every file using InstanceProvider in JSX imports it', () => {
    const srcDir = path.resolve(__dirname);
    const tsxFiles = findTSXFiles(srcDir);
    const missing: string[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('<InstanceProvider') && !content.includes("import { InstanceProvider") && !file.includes('InstanceProvider.tsx')) {
        missing.push(path.relative(srcDir, file));
      }
    }

    expect(missing).toEqual([]);
  });
});
