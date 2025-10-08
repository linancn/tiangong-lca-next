#!/usr/bin/env node

/**
 * Test Coverage Report Script
 * 分析 src 目录下的文件测试覆盖情况
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
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

// 读取 lcov.info 文件并解析
function parseLcovFile(lcovPath) {
  if (!fs.existsSync(lcovPath)) {
    console.error(colorize('❌ 错误: 找不到覆盖率报告文件', 'red'));
    console.log(colorize('请先运行: npm run test:coverage', 'yellow'));
    process.exit(1);
  }

  const lcovContent = fs.readFileSync(lcovPath, 'utf-8');
  const files = {};
  let currentFile = null;

  lcovContent.split('\n').forEach((line) => {
    line = line.trim();

    if (line.startsWith('SF:')) {
      currentFile = line.substring(3);
      files[currentFile] = {
        lines: { found: 0, hit: 0 },
        functions: { found: 0, hit: 0 },
        branches: { found: 0, hit: 0 },
      };
    } else if (currentFile) {
      if (line.startsWith('LF:')) {
        files[currentFile].lines.found = parseInt(line.substring(3));
      } else if (line.startsWith('LH:')) {
        files[currentFile].lines.hit = parseInt(line.substring(3));
      } else if (line.startsWith('FNF:')) {
        files[currentFile].functions.found = parseInt(line.substring(4));
      } else if (line.startsWith('FNH:')) {
        files[currentFile].functions.hit = parseInt(line.substring(4));
      } else if (line.startsWith('BRF:')) {
        files[currentFile].branches.found = parseInt(line.substring(4));
      } else if (line.startsWith('BRH:')) {
        files[currentFile].branches.hit = parseInt(line.substring(4));
      } else if (line === 'end_of_record') {
        currentFile = null;
      }
    }
  });

  return files;
}

// 获取所有源文件
function getAllSourceFiles(srcDir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];

  function walk(dir) {
    const items = fs.readdirSync(dir);

    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    });
  }

  walk(srcDir);
  return files;
}

// 计算覆盖率百分比
function calculateCoverage(coverage) {
  if (coverage.found === 0) return 0;
  return (coverage.hit / coverage.found) * 100;
}

// 格式化百分比
function formatPercent(percent) {
  return percent.toFixed(2).padStart(6, ' ');
}

// 格式化数字
function formatNumber(num) {
  return num.toString().padStart(4, ' ');
}

// 生成报告
function generateReport() {
  const srcDir = path.join(process.cwd(), 'src');
  const lcovPath = path.join(process.cwd(), 'coverage', 'lcov.info');

  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(
    colorize('                        📊 测试覆盖率报告                          ', 'cyan'),
  );
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ) + '\n',
  );

  // 解析覆盖率数据
  const coverageData = parseLcovFile(lcovPath);

  // 获取所有源文件
  const allSourceFiles = getAllSourceFiles(srcDir);

  // 分类文件
  const categorizedFiles = {
    components: [],
    services: [],
    pages: [],
    others: [],
  };

  allSourceFiles.forEach((file) => {
    const relativePath = path.relative(srcDir, file);

    // Skip files matching jest's collectCoverageFrom exclusions
    if (
      relativePath.includes('.umi') ||
      relativePath.endsWith('typings.d.ts') ||
      relativePath === 'service-worker.js' ||
      relativePath.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/) ||
      // Skip simple re-export index files (matching jest config)
      relativePath === 'components/index.ts' ||
      relativePath === 'locales/en-US.ts' ||
      relativePath === 'locales/zh-CN.ts' ||
      // Skip type definition files
      relativePath.match(/^services\/.*\/data\.ts$/)
    ) {
      return;
    }

    // Look up coverage data using the relative path with src/ prefix
    const srcRelativePath = 'src/' + relativePath;
    const coverage = coverageData[srcRelativePath] || coverageData[file];
    const lineCoverage = coverage ? calculateCoverage(coverage.lines) : 0;

    const fileInfo = {
      path: relativePath,
      fullPath: file,
      coverage: coverage || null,
      lineCoverage,
      hasCoverage: !!coverage,
    };

    if (relativePath.startsWith('components/')) {
      categorizedFiles.components.push(fileInfo);
    } else if (relativePath.startsWith('services/')) {
      categorizedFiles.services.push(fileInfo);
    } else if (relativePath.startsWith('pages/')) {
      categorizedFiles.pages.push(fileInfo);
    } else {
      categorizedFiles.others.push(fileInfo);
    }
  });

  // 打印各分类的报告
  function printCategory(title, files) {
    if (files.length === 0) return;

    console.log(colorize(`\n━━━ ${title} (${files.length} 个文件) ━━━`, 'blue'));
    console.log();

    // 排序：无覆盖的在前，然后按覆盖率从低到高
    const sortedFiles = files.sort((a, b) => {
      if (!a.hasCoverage && !b.hasCoverage) return 0;
      if (!a.hasCoverage) return -1;
      if (!b.hasCoverage) return 1;
      return a.lineCoverage - b.lineCoverage;
    });

    const withoutCoverage = sortedFiles.filter((f) => !f.hasCoverage);
    const withCoverage = sortedFiles.filter((f) => f.hasCoverage);

    // 打印无覆盖的文件
    if (withoutCoverage.length > 0) {
      console.log(colorize('  ❌ 无测试覆盖:', 'red'));
      withoutCoverage.forEach((file) => {
        console.log(colorize(`     • ${file.path}`, 'gray'));
      });
      console.log();
    }

    // 打印有覆盖的文件
    if (withCoverage.length > 0) {
      console.log('  覆盖率详情:');
      console.log(
        colorize(
          '  ─────────────────────────────────────────────────────────────────────────',
          'gray',
        ),
      );
      console.log(colorize('   状态  行覆盖率   分支    函数     文件路径', 'gray'));
      console.log(
        colorize(
          '  ─────────────────────────────────────────────────────────────────────────',
          'gray',
        ),
      );

      withCoverage.forEach((file) => {
        const { coverage, lineCoverage } = file;
        const branchCoverage = calculateCoverage(coverage.branches);
        const functionCoverage = calculateCoverage(coverage.functions);

        const icon = getCoverageIcon(lineCoverage);
        const lineColor = getCoverageLevel(lineCoverage);
        const branchColor = getCoverageLevel(branchCoverage);
        const funcColor = getCoverageLevel(functionCoverage);

        const lineStr = colorize(`${formatPercent(lineCoverage)}%`, lineColor);
        const branchStr = colorize(`${formatPercent(branchCoverage)}%`, branchColor);
        const funcStr = colorize(`${formatPercent(functionCoverage)}%`, funcColor);

        console.log(
          `  ${icon}  ${lineStr}  ${branchStr}  ${funcStr}  ${colorize(file.path, 'gray')}`,
        );
      });
    }

    // 打印统计
    const totalFiles = files.length;
    const filesWithCoverage = withCoverage.length;
    const filesWithoutCoverage = withoutCoverage.length;
    const avgLineCoverage =
      filesWithCoverage > 0
        ? withCoverage.reduce((sum, f) => sum + f.lineCoverage, 0) / filesWithCoverage
        : 0;

    console.log(
      colorize(
        '\n  ─────────────────────────────────────────────────────────────────────────',
        'gray',
      ),
    );
    console.log(
      `  📈 统计: ${colorize(filesWithCoverage.toString(), 'green')} 个有覆盖, ` +
        `${colorize(filesWithoutCoverage.toString(), 'red')} 个无覆盖, ` +
        `平均覆盖率: ${colorize(formatPercent(avgLineCoverage) + '%', getCoverageLevel(avgLineCoverage))}`,
    );
  }

  // 打印各分类
  printCategory('📦 Components', categorizedFiles.components);
  printCategory('🔧 Services', categorizedFiles.services);
  printCategory('📄 Pages', categorizedFiles.pages);
  if (categorizedFiles.others.length > 0) {
    printCategory('📁 Others', categorizedFiles.others);
  }

  // 总体统计
  const allFiles = [
    ...categorizedFiles.components,
    ...categorizedFiles.services,
    ...categorizedFiles.pages,
    ...categorizedFiles.others,
  ];

  const totalFiles = allFiles.length;
  const totalWithCoverage = allFiles.filter((f) => f.hasCoverage).length;
  const totalWithoutCoverage = allFiles.filter((f) => !f.hasCoverage).length;
  const totalAvgCoverage =
    totalWithCoverage > 0
      ? allFiles.filter((f) => f.hasCoverage).reduce((sum, f) => sum + f.lineCoverage, 0) /
        totalWithCoverage
      : 0;

  console.log(
    '\n' +
      colorize(
        '═══════════════════════════════════════════════════════════════════════════════',
        'cyan',
      ),
  );
  console.log(
    colorize('                           📊 总体统计                             ', 'cyan'),
  );
  console.log(
    colorize(
      '═══════════════════════════════════════════════════════════════════════════════',
      'cyan',
    ),
  );
  console.log(`\n  总文件数: ${colorize(totalFiles.toString(), 'blue')}`);
  console.log(
    `  有测试覆盖: ${colorize(totalWithCoverage.toString(), 'green')} (${formatPercent((totalWithCoverage / totalFiles) * 100)}%)`,
  );
  console.log(
    `  无测试覆盖: ${colorize(totalWithoutCoverage.toString(), 'red')} (${formatPercent((totalWithoutCoverage / totalFiles) * 100)}%)`,
  );
  console.log(
    `  平均行覆盖率: ${colorize(formatPercent(totalAvgCoverage) + '%', getCoverageLevel(totalAvgCoverage))}`,
  );
  console.log();
}

// 运行报告
try {
  generateReport();
} catch (error) {
  console.error(colorize('\n❌ 错误:', 'red'), error.message);
  console.error(error.stack);
  process.exit(1);
}
