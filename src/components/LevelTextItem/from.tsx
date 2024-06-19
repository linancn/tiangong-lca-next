import { Form, Input, Space } from 'antd';
import { FC } from 'react';

type Props = {
  name: any;
};

const LevelTextItemFrom: FC<Props> = ({ name }) => {
  return (
    <Space>
      <Form.Item name={[...name, '@level_0']}>
        <Input placeholder="Level 1" />
      </Form.Item>
      <Form.Item name={[...name, '@level_1']}>
        <Input placeholder="Level 2" />
      </Form.Item>
      <Form.Item name={[...name, '@level_2']}>
        <Input placeholder="Level 3" />
      </Form.Item>
    </Space>
  );
};

export default LevelTextItemFrom;
