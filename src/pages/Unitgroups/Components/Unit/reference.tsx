import { getReferenceUnit } from '@/services/unitgroups/api';
import { Tooltip } from 'antd';
import { useEffect, useState, type FC } from 'react';

type Props = {
  unitGroupId: string;
  lang: string;
};
const ReferenceUnit: FC<Props> = ({ unitGroupId, lang }) => {
  const [refUnit, setRefUnit] = useState<any>({});

  useEffect(() => {
    getReferenceUnit(unitGroupId, lang).then((res) => {
      setRefUnit(res.data);
    });
  }, []);

  return (
    <Tooltip placement="topLeft" title={refUnit.refUnitGeneralComment}>
      {refUnit.refUnitName}
    </Tooltip>
  );
};

export default ReferenceUnit;
