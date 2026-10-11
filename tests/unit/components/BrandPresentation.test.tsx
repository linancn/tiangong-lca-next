import { AtlasLoginIntroduction, AtlasWorkspace } from '@/components/BrandPresentation';
import { LOCALE_REGISTRY } from '@/services/general/localeRegistry';
import { fireEvent, render, screen } from '@testing-library/react';

let mockLocale = 'en-US';
let mockProfile: any;
jest.mock('../../../config/brandProfile', () => ({
  get brandProfile() {
    return mockProfile;
  },
}));
jest.mock('umi', () => ({
  useIntl: () => ({ locale: mockLocale }),
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const atlas = { ...require('../../../config/brands/atlas.json'), id: 'atlas' };
const handlers = { onGuide: jest.fn(), onData: jest.fn(), onStandard: jest.fn() };
const workspace = () => <AtlasWorkspace {...handlers} standardLabel='TIDAS' dataLabel='Sources' />;

beforeEach(() => {
  mockProfile = atlas;
  mockLocale = 'en-US';
  jest.clearAllMocks();
});

it.each(LOCALE_REGISTRY.map(({ canonicalLocale }) => canonicalLocale))(
  'renders independent localized identity and existing workflow destinations in %s',
  (locale) => {
    mockLocale = locale;
    const copy = atlas.presentation!.copy[locale];
    const view = render(
      <>
        <AtlasLoginIntroduction />
        {workspace()}
      </>,
    );
    expect(screen.getByRole('heading', { name: copy.workspaceTitle })).toBeVisible();
    expect(screen.getByRole('link', { name: new RegExp(copy.dataTitle) })).toHaveAttribute(
      'href',
      '/mydata/processes',
    );
    expect(screen.getByRole('link', { name: new RegExp(copy.modelTitle) })).toHaveAttribute(
      'href',
      '/mydata/models',
    );
    expect(view.container).not.toHaveTextContent(/TianGong|天工/);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.guideTitle) }));
    fireEvent.click(screen.getByRole('button', { name: copy.dataSourcesLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'TIDAS' }));
    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
  },
);

it('uses registry fallback for an unknown locale and renders nothing without a presentation', () => {
  mockLocale = 'unknown';
  const view = render(
    <>
      <AtlasLoginIntroduction />
      {workspace()}
    </>,
  );
  expect(
    screen.getByRole('heading', { name: atlas.presentation!.copy['zh-CN'].workspaceTitle }),
  ).toBeVisible();
  mockProfile = { ...atlas, presentation: undefined };
  view.rerender(
    <>
      <AtlasLoginIntroduction />
      {workspace()}
    </>,
  );
  expect(view.container).toBeEmptyDOMElement();
});

it('honors a deployment logo and the shared source label when custom copy is empty', () => {
  mockProfile = {
    ...atlas,
    presentation: {
      ...atlas.presentation,
      copy: {
        ...atlas.presentation.copy,
        'en-US': { ...atlas.presentation.copy['en-US'], dataSourcesLabel: '' },
      },
    },
  };
  const view = render(
    <>
      <AtlasLoginIntroduction logo='/custom-logo.svg' />
      {workspace()}
    </>,
  );
  expect(view.container.querySelector('img')).toHaveAttribute('src', '/custom-logo.svg');
  fireEvent.click(screen.getByRole('button', { name: 'Sources' }));
  expect(handlers.onData).toHaveBeenCalledTimes(1);
});
