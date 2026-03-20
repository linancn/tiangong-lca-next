// @ts-nocheck
import ToolbarViewInfo from '@/pages/LifeCycleModels/Components/toolbar/viewInfo';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  InfoOutlined: () => <span>info</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data, lang, categoryType }: any) => (
    <div data-testid='level-text'>{`${lang}:${categoryType}:${JSON.stringify(data)}`}</div>
  ),
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='contact-description'>{`${lang}:${data?.['@refObjectId'] ?? 'none'}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='source-description'>{`${lang}:${data?.['@refObjectId'] ?? 'none'}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Processes/Components/Compliance/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='compliance-view'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/pages/Processes/Components/Review/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='review-view'>{JSON.stringify(data)}</div>,
}));

const mockGetClassificationValues = jest.fn();
jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getClassificationValues: (...args: any[]) => mockGetClassificationValues(...args),
}));

jest.mock('@/pages/LifeCycleModels/Components/optiondata', () => ({
  __esModule: true,
  copyrightOptions: [
    { value: 'true', label: 'Copyrighted' },
    { value: 'false', label: 'Public Domain' },
  ],
  licenseTypeOptions: [
    { value: 'open', label: 'Open License' },
    { value: 'restricted', label: 'Restricted License' },
  ],
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, children, onClose, getContainer }: any) => {
    const container = getContainer?.();
    return open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' data-testid='drawer-on-close' onClick={onClose}>
            close
          </button>
        </header>
        <div data-testid='drawer-container'>{container ? 'has-container' : 'other'}</div>
        <div>{children}</div>
      </section>
    ) : null;
  };

  const Card = ({ children, title, tabList, activeTabKey, onTabChange }: any) => (
    <section>
      <header>{toText(title)}</header>
      {tabList ? (
        <div>
          {tabList.map((tab: any) => (
            <button
              key={tab.key}
              type='button'
              data-active={String(activeTabKey === tab.key)}
              onClick={() => onTabChange?.(tab.key)}
            >
              {toText(tab.tab)}
            </button>
          ))}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Space,
    Tooltip,
  };
});

describe('ToolbarViewInfo', () => {
  const data = {
    id: 'model-1',
    version: '1.0.0',
    lifeCycleModelInformation: {
      dataSetInformation: {
        'common:UUID': 'uuid-1',
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Model name' }],
          treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'Route info' }],
          mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'Mix type' }],
          functionalUnitFlowProperties: [{ '@xml:lang': 'en', '#text': 'Functional flow' }],
        },
        classificationInformation: {
          'common:classification': {
            'common:class': [{ value: 'classification-1' }],
          },
        },
        'common:generalComment': [{ '@xml:lang': 'en', '#text': 'General comment' }],
        referenceToExternalDocumentation: {
          '@refObjectId': 'source-doc',
        },
      },
      technology: {
        referenceToDiagram: {
          '@refObjectId': 'source-diagram',
        },
      },
    },
    modellingAndValidation: {
      dataSourcesTreatmentEtc: {
        useAdviceForDataSet: [{ '@xml:lang': 'en', '#text': 'Use advice' }],
      },
      validation: {
        review: [{ id: 'review-1' }],
      },
      complianceDeclarations: {
        compliance: [{ id: 'compliance-1' }],
      },
    },
    administrativeInformation: {
      'common:commissionerAndGoal': {
        'common:referenceToCommissioner': {
          '@refObjectId': 'contact-commissioner',
        },
        'common:project': [{ '@xml:lang': 'en', '#text': 'Project A' }],
        'common:intendedApplications': [{ '@xml:lang': 'en', '#text': 'Application A' }],
      },
      dataGenerator: {
        'common:referenceToPersonOrEntityGeneratingTheDataSet': {
          '@refObjectId': 'contact-generator',
        },
      },
      dataEntryBy: {
        'common:timeStamp': '2026-03-12 10:00',
        'common:referenceToDataSetFormat': {
          '@refObjectId': 'source-format',
        },
        'common:referenceToPersonOrEntityEnteringTheData': {
          '@refObjectId': 'contact-entry',
        },
      },
      publicationAndOwnership: {
        'common:dataSetVersion': '1.0.0',
        'common:permanentDataSetURI': 'https://example.com/model',
        'common:referenceToOwnershipOfDataSet': {
          '@refObjectId': 'contact-owner',
        },
        'common:copyright': 'true',
        'common:referenceToEntitiesWithExclusiveAccess': {
          '@refObjectId': 'contact-exclusive',
        },
        'common:licenseType': 'open',
      },
    },
  };

  const sparseData = {
    lifeCycleModelInformation: {
      dataSetInformation: {
        classificationInformation: {},
      },
      technology: {},
    },
    modellingAndValidation: {
      dataSourcesTreatmentEtc: {},
    },
    administrativeInformation: {
      publicationAndOwnership: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClassificationValues.mockImplementation(() => ['class-a', 'class-b']);
  });

  it('opens the drawer and renders life cycle model information by default', async () => {
    render(<ToolbarViewInfo lang='en' data={data as any} />);

    await userEvent.click(screen.getByRole('button', { name: /info/i }));

    expect(mockGetClassificationValues).toHaveBeenCalledWith([{ value: 'classification-1' }]);
    expect(screen.getByText('uuid-1')).toBeInTheDocument();
    expect(screen.getByTestId('level-text')).toHaveTextContent(
      'en:LifeCycleModel:["class-a","class-b"]',
    );
    expect(screen.getAllByTestId('source-description')[0]).toHaveTextContent(
      'source-doc:Reference to External Documentation',
    );
    expect(screen.getAllByTestId('source-description')[1]).toHaveTextContent(
      'source-diagram:Reference to Diagram',
    );
  });

  it('switches tabs and renders administrative, validation, and compliance content', async () => {
    render(<ToolbarViewInfo lang='en' data={data as any} />);

    await userEvent.click(screen.getByRole('button', { name: /info/i }));

    await userEvent.click(screen.getByRole('button', { name: /administrative information/i }));
    expect(screen.getByText('Open License')).toBeInTheDocument();
    expect(screen.getByText('Copyrighted')).toBeInTheDocument();
    expect(screen.getAllByTestId('contact-description')[0]).toHaveTextContent(
      'en:contact-commissioner:Reference to Commissioner',
    );

    await userEvent.click(screen.getByRole('button', { name: /^Validation$/i }));
    expect(screen.getByTestId('review-view')).toHaveTextContent('review-1');

    await userEvent.click(screen.getByRole('button', { name: /compliance declarations/i }));
    expect(screen.getByTestId('compliance-view')).toHaveTextContent('compliance-1');
  });

  it('uses empty classification fallback, renders modelling content, and closes the drawer', async () => {
    mockGetClassificationValues.mockImplementation(() => undefined);

    render(<ToolbarViewInfo lang='en' data={data as any} />);

    await userEvent.click(screen.getByRole('button', { name: /info/i }));

    expect(screen.getByTestId('level-text')).toHaveTextContent('en:LifeCycleModel:[]');

    await userEvent.click(screen.getByRole('button', { name: /modelling and validation/i }));
    expect(screen.getByText('Use Advice For Data Set')).toBeInTheDocument();
    expect(screen.getByTestId('lang-text')).toHaveTextContent('Use advice');
    expect(screen.getByTestId('drawer-container')).toHaveTextContent('has-container');

    await userEvent.click(screen.getAllByRole('button', { name: 'close' })[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports drawer onClose after reopening', async () => {
    render(<ToolbarViewInfo lang='en' data={data as any} />);

    await userEvent.click(screen.getByRole('button', { name: /info/i }));
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByTestId('drawer-on-close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders sparse data fallbacks across all tabs', async () => {
    render(<ToolbarViewInfo lang='en' data={sparseData as any} />);

    await userEvent.click(screen.getByRole('button', { name: /info/i }));

    const lifeCycleLangText = screen.getAllByTestId('lang-text');
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(
      lifeCycleLangText.filter((item) => item.textContent?.includes('-')).length,
    ).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByTestId('source-description')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textContent: expect.stringContaining('en:none:') }),
        expect.objectContaining({ textContent: expect.stringContaining('en:none:') }),
      ]),
    );

    await userEvent.click(screen.getByRole('button', { name: /modelling and validation/i }));
    expect(screen.getAllByTestId('lang-text').at(-1)).toHaveTextContent('-');

    await userEvent.click(screen.getByRole('button', { name: /administrative information/i }));
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Copyright?')).toBeInTheDocument();
    expect(screen.getByText('License type')).toBeInTheDocument();
    expect(screen.getAllByTestId('contact-description')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textContent: expect.stringContaining('en:none:') }),
      ]),
    );

    await userEvent.click(screen.getByRole('button', { name: /^Validation$/i }));
    expect(screen.getByTestId('review-view')).toHaveTextContent('[]');

    await userEvent.click(screen.getByRole('button', { name: /compliance declarations/i }));
    expect(screen.getByTestId('compliance-view')).toHaveTextContent('[]');
  });
});
