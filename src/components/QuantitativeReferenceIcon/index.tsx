import {
    CheckCircleOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import { Tooltip, theme } from 'antd';

interface QuantitativeReferenceIconProps {
    value: boolean;
    tooltipTitle?: string;
}

const QuantitativeReferenceIcon = ({ value, tooltipTitle }: QuantitativeReferenceIconProps) => {
    const { token } = theme.useToken();
    return (
        <>
            {value ?
                <Tooltip title={tooltipTitle}>
                    <CheckCircleOutlined style={{ color: token.colorPrimary, fontSize: '16px' }} />
                </Tooltip> :
                <CloseCircleOutlined style={{ opacity: 0.55, fontSize: '16px' }} />}
        </>
    )
}


export default QuantitativeReferenceIcon;
