export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface DiffResult {
  resourceName: string;
  kind: string;
  lines: DiffLine[];
  hasChanges: boolean;
}

function lcs(a: string[], b: string[]): boolean[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const inLcs: boolean[][] = [
    new Array(m).fill(false),
    new Array(n).fill(false),
  ];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      inLcs[0][i - 1] = true;
      inLcs[1][j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return inLcs;
}

export function computeUnifiedDiff(
  desired: string,
  live: string,
  resourceName: string,
  kind: string,
): DiffResult {
  const oldLines = desired.split('\n');
  const newLines = live.split('\n');
  const [oldInLcs, newInLcs] = lcs(oldLines, newLines);

  const lines: DiffLine[] = [];
  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && oldInLcs[oi] && ni < newLines.length && newInLcs[ni]) {
      lines.push({
        type: 'context',
        content: oldLines[oi],
        oldLineNum: oi + 1,
        newLineNum: ni + 1,
      });
      oi++;
      ni++;
    } else {
      while (oi < oldLines.length && !oldInLcs[oi]) {
        lines.push({
          type: 'remove',
          content: oldLines[oi],
          oldLineNum: oi + 1,
        });
        oi++;
      }
      while (ni < newLines.length && !newInLcs[ni]) {
        lines.push({
          type: 'add',
          content: newLines[ni],
          newLineNum: ni + 1,
        });
        ni++;
      }
    }
  }

  return {
    resourceName,
    kind,
    lines,
    hasChanges: lines.some((l) => l.type !== 'context'),
  };
}
