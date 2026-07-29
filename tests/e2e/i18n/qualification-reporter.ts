import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import {
  formatCanonicalSemanticEvidence,
  SEMANTIC_EVIDENCE_REPOSITORY_PATH,
} from '../../../scripts/i18n/semantic-evidence-format';

export default class QualificationReporter implements Reporter {
  private assertionBrowsers = new Map<string, Set<string>>();
  private browsers = new Map<string, { executed: number; skipped: number }>();
  private canonicalBrowsers = new Map<string, { executed: number; skipped: number }>();
  private harnessBrowsers = new Map<string, { executed: number; skipped: number }>();
  private root = process.cwd();

  onBegin(config: FullConfig): void {
    this.root = config.rootDir.replace(/\/tests\/e2e\/i18n$/u, '');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const browser = test.parent.project()?.name ?? 'unknown';
    const increment = (collection: Map<string, { executed: number; skipped: number }>) => {
      const counts = collection.get(browser) ?? { executed: 0, skipped: 0 };
      if (result.status === 'skipped') counts.skipped += 1;
      else counts.executed += 1;
      collection.set(browser, counts);
    };
    increment(this.browsers);
    increment(
      test.location.file.endsWith('/harness-qualification.spec.ts')
        ? this.harnessBrowsers
        : this.canonicalBrowsers,
    );
    if (result.status !== 'passed') return;
    for (const annotation of result.annotations) {
      if (annotation.type !== 'i18n-evidence' || !annotation.description) continue;
      const parsed = JSON.parse(annotation.description) as { assertionId?: string };
      if (!parsed.assertionId) continue;
      const observed = this.assertionBrowsers.get(parsed.assertionId) ?? new Set<string>();
      observed.add(browser);
      this.assertionBrowsers.set(parsed.assertionId, observed);
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    if (process.env.E2E_QUALIFICATION !== 'true') return;
    const resultPath =
      process.env.E2E_QUALIFICATION_RESULT_PATH ??
      path.join(
        process.env.E2E_RUNTIME_DIR ?? path.join(this.root, '.local/e2e-runtime'),
        'semantic-harness-qualification.json',
      );
    const outputDirectory = path.dirname(resultPath);
    await mkdir(outputDirectory, { recursive: true });
    const evidence = JSON.parse(
      readFileSync(path.join(this.root, SEMANTIC_EVIDENCE_REPOSITORY_PATH), 'utf8'),
    );
    const roundTripPath = path.join(outputDirectory, 'qualification-evidence-roundtrip.json');
    await writeFile(
      roundTripPath,
      await formatCanonicalSemanticEvidence(evidence, this.root),
      'utf8',
    );
    await writeFile(
      resultPath,
      `${JSON.stringify(
        {
          assertionBrowsers: Object.fromEntries(
            [...this.assertionBrowsers.entries()]
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([assertionId, browsers]) => [assertionId, [...browsers].sort()]),
          ),
          assertionIds: [...this.assertionBrowsers.keys()].sort(),
          browsers: Object.fromEntries([...this.browsers.entries()].sort()),
          canonicalBrowsers: Object.fromEntries([...this.canonicalBrowsers.entries()].sort()),
          externalRequests: 0,
          harnessBrowsers: Object.fromEntries([...this.harnessBrowsers.entries()].sort()),
          productionWrites: 0,
          status: result.status,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
}
