#!/usr/bin/env node

/**
 * Test Coverage Report Script
 * 默认输出全局摘要、分类概览、热点文件与未覆盖行；
 * 追加 --full 可打印全部文件明细。
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');
const SHOW_FULL = process.argv.includes('--full');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function getCoverageLevel(percent) {
  if (percent === 100) return 'green';
  if (percent >= 80) return 'cyan';
  if (percent >= 50) return 'yellow';
  return 'red';
}

function getCoverageIcon(percent) {
  if (percent === 100) return '✅';
  if (percent >= 80) return '🟢';
  if (percent >= 50) return '🟡';
  return '🔴';
}

function formatPercent(percent) {
  return percent.toFixed(2).padStart(6, ' ');
}

function normalizePath(filePath) {
  if (!filePath) return filePath;
  if (path.isAbsolute(filePath)) {
    return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  }
  return filePath.replace(/\\/g, '/');
}

function shouldSkipFile(relativePath) {
  return (
    relativePath.includes('.umi') ||
    relativePath.endsWith('typings.d.ts') ||
    relativePath === 'service-worker.js' ||
    relativePath.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/) ||
    relativePath === 'components/index.ts' ||
    relativePath === 'locales/en-US.ts' ||
    relativePath === 'locales/zh-CN.ts' ||
    relativePath.match(/^services\/.*\/data\.ts$/)
  );
}

function getCategory(relativePath) {
  if (relativePath.startsWith('components/')) return 'components';
  if (relativePath.startsWith('services/')) return 'services';
  if (relativePath.startsWith('pages/')) return 'pages';
  return 'others';
}

function calculatePercent(covered, total) {
  if (!total) return 0;
  return (covered / total) * 100;
}

function compressRanges(numbers) {
  if (!numbers.length) return '';
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = current;
  }

  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(',');
}

function summarizeCoverageShape(entry) {
  return {
    lines: {
      found: entry.lines.total,
      hit: entry.lines.covered,
      pct: entry.lines.pct || 0,
    },
    functions: {
      found: entry.functions.total,
      hit: entry.functions.covered,
      pct: entry.functions.pct || 0,
    },
    branches: {
      found: entry.branches.total,
      hit: entry.branches.covered,
      pct: entry.branches.pct || 0,
    },
    statements: {
      found: entry.statements.total,
      hit: entry.statements.covered,
      pct: entry.statements.pct || 0,
    },
  };
}

function parseCoverageArtifacts() {
  const summaryPath = path.join(COVERAGE_DIR, 'coverage-summary.json');
  const finalPath = path.join(COVERAGE_DIR, 'coverage-final.json');
  const lcovPath = path.join(COVERAGE_DIR, 'lcov.info');

  if (fs.existsSync(summaryPath) && fs.existsSync(finalPath)) {
    const summaryJson = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    const finalJson = JSON.parse(fs.readFileSync(finalPath, 'utf-8'));

    const files = {};
    for (const [filePath, entry] of Object.entries(summaryJson)) {
      if (filePath === 'total') continue;
      const normalized = normalizePath(filePath);
      files[normalized] = {
        coverage: summarizeCoverageShape(entry),
        uncoveredLines: [],
      };
    }

    for (const [filePath, entry] of Object.entries(finalJson)) {
      const normalized = normalizePath(filePath);
      if (!files[normalized]) continue;
      const uncoveredLines = Object.entries(entry.s || {})
        .filter(([, hits]) => hits === 0)
        .map(([statementId]) => entry.statementMap?.[statementId]?.start?.line)
        .filter((line) => Number.isFinite(line));
      files[normalized].uncoveredLines = uncoveredLines;
    }

    return {
      total: summarizeCoverageShape(summaryJson.total),
      files,
      source: 'json',
    };
  }

  if (!fs.existsSync(lcovPath)) {
    console.error(colorize('❌ Error: no coverage artifacts found in coverage/', 'red'));
    console.log(colorize('Run npm run test:coverage first.', 'yellow'));
    process.exit(1);
  }

  const lcovContent = fs.readFileSync(lcovPath, 'utf-8').split('\n');
  const files = {};
  const totals = {
    lines: { found: 0, hit: 0, pct: 0 },
    functions: { found: 0, hit: 0, pct: 0 },
    branches: { found: 0, hit: 0, pct: 0 },
    statements: { found: 0, hit: 0, pct: 0 },
  };
  let currentFile = null;

  for (const rawLine of lcovContent) {
    const line = rawLine.trim();
    if (line.startsWith('SF:')) {
      currentFile = normalizePath(line.slice(3));
      files[currentFile] = {
        coverage: {
          lines: { found: 0, hit: 0, pct: 0 },
          functions: { found: 0, hit: 0, pct: 0 },
          branches: { found: 0, hit: 0, pct: 0 },
          statements: { found: 0, hit: 0, pct: 0 },
        },
        uncoveredLines: [],
      };
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith('LF:')) files[currentFile].coverage.lines.found = Number(line.slice(3));
    else if (line.startsWith('LH:')) files[currentFile].coverage.lines.hit = Number(line.slice(3));
    else if (line.startsWith('FNF:'))
      files[currentFile].coverage.functions.found = Number(line.slice(4));
    else if (line.startsWith('FNH:'))
      files[currentFile].coverage.functions.hit = Number(line.slice(4));
    else if (line.startsWith('BRF:'))
      files[currentFile].coverage.branches.found = Number(line.slice(4));
    else if (line.startsWith('BRH:'))
      files[currentFile].coverage.branches.hit = Number(line.slice(4));
    else if (line.startsWith('DA:')) {
      const [lineNumber, hits] = line
        .slice(3)
        .split(',')
        .map((value) => Number(value));
      if (hits === 0) {
        files[currentFile].uncoveredLines.push(lineNumber);
      }
    } else if (line === 'end_of_record') {
      const fileCoverage = files[currentFile].coverage;
      fileCoverage.lines.pct = calculatePercent(fileCoverage.lines.hit, fileCoverage.lines.found);
      fileCoverage.functions.pct = calculatePercent(
        fileCoverage.functions.hit,
        fileCoverage.functions.found,
      );
      fileCoverage.branches.pct = calculatePercent(
        fileCoverage.branches.hit,
        fileCoverage.branches.found,
      );
      fileCoverage.statements = { ...fileCoverage.lines };

      totals.lines.found += fileCoverage.lines.found;
      totals.lines.hit += fileCoverage.lines.hit;
      totals.functions.found += fileCoverage.functions.found;
      totals.functions.hit += fileCoverage.functions.hit;
      totals.branches.found += fileCoverage.branches.found;
      totals.branches.hit += fileCoverage.branches.hit;
      currentFile = null;
    }
  }

  totals.lines.pct = calculatePercent(totals.lines.hit, totals.lines.found);
  totals.functions.pct = calculatePercent(totals.functions.hit, totals.functions.found);
  totals.branches.pct = calculatePercent(totals.branches.hit, totals.branches.found);
  totals.statements = { ...totals.lines };

  return {
    total: totals,
    files,
    source: 'lcov',
  };
}

function getAllSourceFiles(srcDir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && extensions.includes(path.extname(item.name))) {
        files.push(fullPath);
      }
    }
  }

  walk(srcDir);
  return files;
}

function truncate(text, maxLength = 120) {
  if (!text || text.length <= maxLength) return text || '-';
  return `${text.slice(0, maxLength - 3)}...`;
}

function printDivider() {
  console.log(
    colorize(
      '───────────────────────────────────────────────────────────────────────────────',
      'gray',
    ),
  );
}

function printGlobalSummary(total, source) {
  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(
    colorize('                         Coverage Summary                          ', 'cyan'),
  );
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ),
  );
  console.log();
  console.log(`  Artifact source: ${colorize(source, 'blue')}`);
  console.log(
    `  Statements: ${colorize(`${formatPercent(total.statements.pct)}%`, getCoverageLevel(total.statements.pct))} ` +
      `(${total.statements.hit}/${total.statements.found})`,
  );
  console.log(
    `  Branches:   ${colorize(`${formatPercent(total.branches.pct)}%`, getCoverageLevel(total.branches.pct))} ` +
      `(${total.branches.hit}/${total.branches.found})`,
  );
  console.log(
    `  Functions:  ${colorize(`${formatPercent(total.functions.pct)}%`, getCoverageLevel(total.functions.pct))} ` +
      `(${total.functions.hit}/${total.functions.found})`,
  );
  console.log(
    `  Lines:      ${colorize(`${formatPercent(total.lines.pct)}%`, getCoverageLevel(total.lines.pct))} ` +
      `(${total.lines.hit}/${total.lines.found})`,
  );
}

function printCategorySummary(categorizedFiles) {
  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(
    colorize('                         Category Summary                          ', 'cyan'),
  );
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ),
  );
  console.log();
  printDivider();
  console.log(
    colorize('  Category        Files   Avg Lines   Avg Branches   Avg Functions', 'gray'),
  );
  printDivider();

  for (const [name, files] of Object.entries(categorizedFiles)) {
    const avg = (key) =>
      files.length
        ? files.reduce((sum, file) => sum + file.coverage[key].pct, 0) / files.length
        : 0;
    const paddedName = name.padEnd(13, ' ');
    console.log(
      `  ${paddedName} ${String(files.length).padStart(5, ' ')}   ` +
        `${formatPercent(avg('lines'))}%      ${formatPercent(avg('branches'))}%         ${formatPercent(avg('functions'))}%`,
    );
  }
}

function printQueueSummary(allFiles, orderedQueue) {
  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(
    colorize('                         Closure Queue Summary                     ', 'cyan'),
  );
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ),
  );
  console.log();
  const completeFiles = allFiles.length - orderedQueue.length;
  const bucketCounts = {
    branchLt50: 0,
    branch50To70: 0,
    branch70To90: 0,
    branch90To100: 0,
    line100BranchLt100: 0,
  };

  orderedQueue.forEach((file) => {
    const branch = file.coverage.branches.pct;
    if (branch < 50) bucketCounts.branchLt50 += 1;
    else if (branch < 70) bucketCounts.branch50To70 += 1;
    else if (branch < 90) bucketCounts.branch70To90 += 1;
    else if (branch < 100) bucketCounts.branch90To100 += 1;

    if (file.coverage.lines.pct === 100 && branch < 100) {
      bucketCounts.line100BranchLt100 += 1;
    }
  });

  console.log(`  Source files tracked:      ${colorize(String(allFiles.length), 'blue')}`);
  console.log(`  Fully covered files:       ${colorize(String(completeFiles), 'green')}`);
  console.log(`  Files with remaining gaps: ${colorize(String(orderedQueue.length), 'yellow')}`);
  console.log(
    `  Branch buckets:            <50 ${bucketCounts.branchLt50} | 50-70 ${bucketCounts.branch50To70} | ` +
      `70-90 ${bucketCounts.branch70To90} | 90-<100 ${bucketCounts.branch90To100}`,
  );
  console.log(
    `  Line=100, branch<100:      ${colorize(String(bucketCounts.line100BranchLt100), 'yellow')}`,
  );
}

function hasCoverageGap(file) {
  return (
    file.coverage.lines.pct < 100 ||
    file.coverage.branches.pct < 100 ||
    file.coverage.functions.pct < 100 ||
    file.coverage.statements.pct < 100 ||
    file.uncoveredLines.length > 0
  );
}

function getOrderedClosureQueue(files) {
  return [...files]
    .filter((file) => hasCoverageGap(file))
    .sort(
      (a, b) =>
        a.coverage.branches.pct - b.coverage.branches.pct ||
        a.coverage.lines.pct - b.coverage.lines.pct ||
        a.coverage.statements.pct - b.coverage.statements.pct ||
        a.coverage.functions.pct - b.coverage.functions.pct ||
        a.path.localeCompare(b.path),
    );
}

function getPlanningClusterKey(filePath) {
  const parts = filePath.split('/');
  if (parts[1] === 'pages') return parts.slice(0, 4).join('/');
  if (parts[1] === 'services') return parts.slice(0, 3).join('/');
  if (parts[1] === 'components') return parts.slice(0, 3).join('/');
  return parts.slice(0, 2).join('/');
}

function getBatchCandidates(orderedQueue) {
  const clusters = new Map();

  orderedQueue.forEach((file) => {
    const key = getPlanningClusterKey(file.path);
    if (!clusters.has(key)) {
      clusters.set(key, {
        key,
        count: 0,
        minBranch: 100,
        avgBranchTotal: 0,
      });
    }

    const cluster = clusters.get(key);
    cluster.count += 1;
    cluster.minBranch = Math.min(cluster.minBranch, file.coverage.branches.pct);
    cluster.avgBranchTotal += file.coverage.branches.pct;
  });

  return [...clusters.values()]
    .map((cluster) => ({
      ...cluster,
      avgBranch: cluster.count ? cluster.avgBranchTotal / cluster.count : 0,
    }))
    .sort((a, b) => b.count - a.count || a.minBranch - b.minBranch || a.key.localeCompare(b.key))
    .slice(0, 12);
}

function printBatchCandidates(clusters) {
  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(
    colorize('                         Shared-Fixture Batches                    ', 'cyan'),
  );
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ),
  );
  console.log();

  if (!clusters.length) {
    console.log(colorize('  No batching candidates found.', 'gray'));
    return;
  }

  printDivider();
  console.log(colorize('  Cluster', 'gray'));
  printDivider();

  clusters.forEach((cluster) => {
    console.log(`  ${cluster.key}`);
    console.log(
      colorize(
        `    Files ${String(cluster.count).padStart(3, ' ')} | Min Branch ${formatPercent(cluster.minBranch)}% | Avg Branch ${formatPercent(cluster.avgBranch)}%`,
        'gray',
      ),
    );
  });
}

function printOrderedQueue(title, files, limit = files.length) {
  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(colorize(`                         ${title.padEnd(34, ' ')} `, 'cyan'));
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ),
  );
  console.log();

  if (!files.length) {
    console.log(colorize('  No files with remaining coverage gaps.', 'gray'));
    return;
  }

  printDivider();
  console.log(colorize('  File', 'gray'));
  printDivider();

  files.slice(0, limit).forEach((file) => {
    const uncovered = truncate(compressRanges(file.uncoveredLines), 58);
    console.log(`  ${file.path}`);
    console.log(
      colorize(
        `    Stmt ${formatPercent(file.coverage.statements.pct)}% | Line ${formatPercent(file.coverage.lines.pct)}% | Branch ${formatPercent(file.coverage.branches.pct)}% | Func ${formatPercent(file.coverage.functions.pct)}% | Uncovered ${uncovered}`,
        'gray',
      ),
    );
  });
}

function generateReport() {
  const srcDir = path.join(PROJECT_ROOT, 'src');
  const coverageData = parseCoverageArtifacts();
  const allSourceFiles = getAllSourceFiles(srcDir);

  const categorizedFiles = {
    components: [],
    services: [],
    pages: [],
    others: [],
  };

  for (const file of allSourceFiles) {
    const relativePath = normalizePath(path.relative(PROJECT_ROOT, file));
    const srcRelativePath = relativePath.replace(/^src\//, '');
    if (shouldSkipFile(srcRelativePath)) continue;

    const coverageEntry = coverageData.files[relativePath];
    if (!coverageEntry) continue;

    const fileInfo = {
      path: relativePath,
      coverage: coverageEntry.coverage,
      uncoveredLines: coverageEntry.uncoveredLines || [],
    };

    categorizedFiles[getCategory(srcRelativePath)].push(fileInfo);
  }

  const allFiles = Object.values(categorizedFiles).flat();
  const orderedQueue = getOrderedClosureQueue(allFiles);
  const batchCandidates = getBatchCandidates(orderedQueue);

  printGlobalSummary(coverageData.total, coverageData.source);
  printCategorySummary(categorizedFiles);
  printQueueSummary(allFiles, orderedQueue);
  printBatchCandidates(batchCandidates);
  printOrderedQueue(
    SHOW_FULL ? 'Ordered Closure Queue (Full)' : 'Ordered Closure Queue (Next 25)',
    orderedQueue,
    SHOW_FULL ? orderedQueue.length : 25,
  );

  if (!SHOW_FULL) {
    console.log(
      '\n' +
        colorize(
          'Tip: run node scripts/test-coverage-report.js --full for the full ordered incomplete-file queue.',
          'gray',
        ),
    );
  }
}

try {
  generateReport();
} catch (error) {
  console.error(colorize('\n❌ Error:', 'red'), error.message);
  console.error(error.stack);
  process.exit(1);
}
