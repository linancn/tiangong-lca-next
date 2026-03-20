// @ts-nocheck
import { NodeComponentCard } from '@/pages/LifeCycleModels/Components/toolbar/config/node';
import { render, screen } from '../../../../../../helpers/testUtils';

jest.mock('antd', () => ({
  __esModule: true,
  Card: ({ children, title, style }: any) => (
    <section data-testid='node-card' data-width={style?.width}>
      <header>{title}</header>
      <div>{children}</div>
    </section>
  ),
}));

describe('LifeCycleModelNodeComponentCard', () => {
  it('renders card title, content, and width from node data', () => {
    const node = {
      getData: () => ({
        title: 'Node title',
        content: 'Node content',
        width: 320,
      }),
    };

    render(<NodeComponentCard node={node as any} />);

    expect(screen.getByTestId('node-card')).toHaveAttribute('data-width', '320');
    expect(screen.getByText('Node title')).toBeInTheDocument();
    expect(screen.getByText('Node content')).toBeInTheDocument();
  });
});
