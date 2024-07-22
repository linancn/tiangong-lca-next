import { Input } from "antd";
import { useState } from "react";

interface YearInputProps {
    initValue: string;
}
const YearInput: React.FC<YearInputProps> = ({ initValue }) => {
    const [value, setValue] = useState<string>(initValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (/^\d{0,4}$/.test(newValue)) {
            setValue(newValue);
        }
    };
    return (
        <Input
            value={value}
            onChange={handleChange}
            maxLength={4}
        />
    );
};

export default YearInput;