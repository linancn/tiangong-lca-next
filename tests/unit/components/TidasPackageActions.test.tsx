import TidasPackageActions from '@/components/TidasPackageActions';
import { render, screen } from '@testing-library/react';

const mockImportPropsSpy = jest.fn();

jest.mock('@/components/ExportTidasPackage', () => ({
  __esModule: true,
  default: () => <div data-testid='export-widget'>export-widget</div>,
}));

jest.mock('@/components/ImportTidasPackage', () => ({
  __esModule: true,
  default: (props: any) => {
    mockImportPropsSpy(props);
    props.onImported?.();
    return <div data-testid='import-widget'>import-widget</div>;
  },
}));

describe('TidasPackageActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both export and import widgets', () => {
    render(<TidasPackageActions />);
    expect(screen.getByTestId('export-widget')).toBeInTheDocument();
    expect(screen.getByTestId('import-widget')).toBeInTheDocument();
    expect(mockImportPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ onImported: expect.any(Function) }),
    );
  });

  it('passes through the provided onImported callback', () => {
    const onImported = jest.fn();
    render(<TidasPackageActions onImported={onImported} />);
    expect(mockImportPropsSpy).toHaveBeenCalledWith(expect.objectContaining({ onImported }));
    expect(onImported).toHaveBeenCalledTimes(1);
  });
});
