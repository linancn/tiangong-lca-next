import LoadingDisabledActionGroup from '@/components/LoadingDisabledActionGroup';
import { render, screen } from '../../helpers/testUtils';

describe('LoadingDisabledActionGroup', () => {
  it('disables every nested action until loading finishes', () => {
    const { rerender } = render(
      <LoadingDisabledActionGroup loading style={{ width: 240 }}>
        <button type='button'>Data Check</button>
        <button type='button' disabled={false}>
          Save
        </button>
      </LoadingDisabledActionGroup>,
    );

    expect(screen.getByRole('button', { name: 'Data Check' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('group')).toHaveStyle({ width: '240px' });

    rerender(
      <LoadingDisabledActionGroup loading={false}>
        <button type='button'>Data Check</button>
        <button type='button' disabled={false}>
          Save
        </button>
      </LoadingDisabledActionGroup>,
    );

    expect(screen.getByRole('button', { name: 'Data Check' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
