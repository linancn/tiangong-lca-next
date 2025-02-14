import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Form } from 'antd';
import { useIntl } from 'umi';

interface UnitConvertProps {
    visible: boolean;
    onCancel: () => void;
    onOk: (value: number) => void;
    units: { name: string; meanValue: number }[];
    value?: number;
}

const UnitConvert: React.FC<UnitConvertProps> = ({ visible, onCancel, onOk, units, value }) => {
    const [form] = Form.useForm();
    const intl = useIntl();
    const [result, setResult] = useState<number>();

    useEffect(() => {
        if (visible) {
            form.setFieldsValue({
                value: value,
            });
        }
    }, [visible, value]);

    const handleUnitChange = () => {
        const values = form.getFieldsValue();
        if (values.value && values.unit) {
            const selectedUnit = units.find((u) => u.name === values.unit);
            if (selectedUnit) {
                setResult(values.value * selectedUnit.meanValue);
            }
        }
    };

    const handleReset = () => {
        form.resetFields();
        setResult(undefined);
    };

    const handleOk = async () => {
        await form.validateFields();
        if (result) {
            onOk(result);
        }
        handleClose()
    };

    const handleClose = () => {
        handleReset();
        onCancel();
    };

    return (
        <Modal
            title={intl.formatMessage({ id: 'pages.process.unitConvert.title' })}
            open={visible}
            onCancel={handleClose}
            onOk={handleOk}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label={intl.formatMessage({ id: 'pages.process.unitConvert.value' })}
                    name="value"
                    rules={[{ required: true }]}
                >
                    <Input type="number" onChange={handleUnitChange} />
                </Form.Item>

                <Form.Item
                    label={intl.formatMessage({ id: 'pages.process.unitConvert.unit' })}
                    name="unit"
                    rules={[{ required: true }]}
                >
                    <Select onChange={handleUnitChange}>
                        {units&&units?.length&&units.map((unit) => (
                            <Select.Option key={unit.name} value={unit.name}>
                                {unit.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={intl.formatMessage({ id: 'pages.process.unitConvert.result' })}>
                    <Input value={result} disabled />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default UnitConvert;
