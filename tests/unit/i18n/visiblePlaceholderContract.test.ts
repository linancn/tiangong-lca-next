import deGeneralMessages from '@/locales/de-DE/pages_general';
import enGeneralMessages from '@/locales/en-US/pages_general';
import frGeneralMessages from '@/locales/fr-FR/pages_general';
import zhGeneralMessages from '@/locales/zh-CN/pages_general';
import fs from 'node:fs';
import path from 'node:path';

const MESSAGE_ID = 'pages.lang.text.placeholder';
const SELECT_FORM_PATHS = [
  'src/pages/Contacts/Components/select/form.tsx',
  'src/pages/Flowproperties/Components/select/form.tsx',
  'src/pages/Flows/Components/select/form.tsx',
  'src/pages/Sources/Components/select/form.tsx',
  'src/pages/Unitgroups/Components/select/form.tsx',
  'src/pages/Unitgroups/Components/select/formMini.tsx',
] as const;

describe('visible select-form placeholder contract', () => {
  it('provides reviewed English, Chinese, German, and French copy', () => {
    expect({
      'de-DE': deGeneralMessages[MESSAGE_ID],
      'en-US': enGeneralMessages[MESSAGE_ID],
      'fr-FR': frGeneralMessages[MESSAGE_ID],
      'zh-CN': zhGeneralMessages[MESSAGE_ID],
    }).toEqual({
      'de-DE': 'Text',
      'en-US': 'Text',
      'fr-FR': 'Texte',
      'zh-CN': '文本',
    });
  });

  it('routes all eight formerly literal placeholders through the catalog message', () => {
    const sources = SELECT_FORM_PATHS.map((relativePath) =>
      fs.readFileSync(path.resolve(__dirname, '../../..', relativePath), 'utf8'),
    );

    expect(
      sources.join('\n').match(new RegExp(MESSAGE_ID.split('.').join('[.]'), 'gu')),
    ).toHaveLength(8);
    for (const source of sources) {
      expect(source).not.toMatch(/placeholder\s*=\s*['"][^'"]+['"]/u);
    }
  });
});
