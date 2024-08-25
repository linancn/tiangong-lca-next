import { getLangText } from '@/services/general/util';
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
    getReferenceUnit(unitGroupId).then((res) => {
      setRefUnit(res.data);
    });
  }, [unitGroupId]);

  return (
    <Tooltip placement="topLeft" title={getLangText(refUnit.refUnitGeneralComment, lang)}>
      {refUnit.refUnitName}
    </Tooltip>
  );
};

export default ReferenceUnit;
