import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Button, Form } from 'antd';
import DataQualityIndicatorItemForm from '@/pages/Processes/Components/Review/DataQualityIndicator/form';

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) => (
    <>{defaultMessage ?? id}</>
  ),
}));

describe('Process review Form.List on Ant Design 6', () => {
  it('submits every nested data-quality field through registered Form.Item paths', async () => {
    const onFinish = jest.fn();
    const initialValues = {
      indicators: [
        {
          '@name': 'Technological representativeness',
          '@value': 'Very good',
        },
      ],
    };

    render(
      <Form initialValues={initialValues} onFinish={onFinish}>
        <DataQualityIndicatorItemForm name={['indicators']} />
        <Button htmlType='submit'>Submit registered list</Button>
      </Form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit registered list' }));

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(initialValues);
    });
  });
});
