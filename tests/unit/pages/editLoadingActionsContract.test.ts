import fs from 'node:fs';
import path from 'node:path';

const editorCases = [
  'Contacts/Components/edit.tsx',
  'Sources/Components/edit.tsx',
  'Unitgroups/Components/edit.tsx',
  'Flowproperties/Components/edit.tsx',
  'Flows/Components/edit.tsx',
  'Processes/Components/edit.tsx',
];

describe('dataset edit loading actions contract', () => {
  it.each(editorCases)('disables every %s footer action until detail data is ready', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/pages', file), 'utf8');

    expect(source).toContain(
      "import LoadingDisabledActionGroup from '@/components/LoadingDisabledActionGroup';",
    );
    expect(source).toContain('<LoadingDisabledActionGroup loading={spinning || !initData}>');
    expect(source).toContain('setInitData(undefined);');
  });

  it('disables lifecycle model toolbar actions until model detail is ready', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx'),
      'utf8',
    );

    expect(source).toContain(
      'loading={spinning || (drawerVisible && Object.keys(infoData ?? {}).length === 0)}',
    );
  });
});
