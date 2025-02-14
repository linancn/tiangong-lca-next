import { getReferenceUnitGroup } from '@/services/flowproperties/api';
import { getReferenceProperty } from '@/services/flows/api';
import { getLangText } from '@/services/general/util';
import { getReferenceUnit } from '@/services/unitgroups/api';
import { Spin, Tooltip } from 'antd';
import { useEffect, useState, type FC } from 'react';

type Props = {
  id: string;
  version: string;
  idType: string;
  lang: string;
};
const ReferenceUnit: FC<Props> = ({ id, version, idType, lang }) => {
  const [refUnit, setRefUnit] = useState<any>({});
  const [spinning, setSpinning] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      if (idType === 'flow') {
        setSpinning(true);
        getReferenceProperty(id, version).then((res1: any) => {
          getReferenceUnitGroup(res1?.data?.refFlowPropertytId, res1?.data?.version).then(
            (res2: any) => {
              getReferenceUnit(res2?.data?.refUnitGroupId, res2?.data?.version).then((res3) => {
                setRefUnit(res3?.data);
                setSpinning(false);
              });
            },
          );
        });
      } else if (idType === 'flowproperty') {
        setSpinning(true);
        getReferenceUnitGroup(id, version).then((res1: any) => {
          getReferenceUnit(res1?.data?.refUnitGroupId, res1?.data?.version).then((res2) => {
            setRefUnit(res2?.data);
            setSpinning(false);
          });
        });
      } else if (idType === 'unitgroup') {
        setSpinning(true);
        getReferenceUnit(id, version).then((res1) => {
          setRefUnit(res1?.data);
          setSpinning(false);
        });
      }
    }
  }, [id]);

  return (
    <Spin spinning={spinning}>
      {getLangText(refUnit?.name, lang)} (
      <Tooltip placement="topLeft" title={getLangText(refUnit?.refUnitGeneralComment, lang)}>
        {refUnit?.refUnitName}
      </Tooltip>
      )
    </Spin>
  );
};

export default ReferenceUnit;
