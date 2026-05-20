import * as fs from 'fs';
import * as path from 'path';

describe('bundled dependency safety', () => {
  it('does not bundle PatternFly packages that conflict with console-shared modules', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const consoleSharededByConsole = [
      '@patternfly/react-topology',
      '@patternfly/react-log-viewer',
      '@patternfly/react-charts',
      '@patternfly/react-catalog-view-extension',
    ];

    const bundled = consoleSharededByConsole.filter((dep) => deps[dep]);

    if (bundled.length > 0) {
      throw new Error(
        `These packages are shared by the OCP console at runtime and must NOT be bundled in the plugin (causes dual-React-instance crashes):\n` +
        bundled.map((d) => `  - ${d}: ${deps[d]}`).join('\n') +
        `\n\nRemove them from package.json. Import from them and they'll resolve at runtime via module federation.`,
      );
    }
  });

  it('does not bundle React (provided by console)', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const prodDeps = pkg.dependencies ?? {};

    const reactInProd = ['react', 'react-dom'].filter((d) => prodDeps[d]);
    expect(reactInProd).toEqual([]);
  });
});
