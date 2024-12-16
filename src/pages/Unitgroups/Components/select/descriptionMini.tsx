import LangTextItemDescription from '@/components/LangTextItem/description';
import { getReferenceUnitGroup } from '@/services/flowproperties/api';
import { getReferenceProperty } from '@/services/flows/api';
import { getReferenceUnit } from '@/services/unitgroups/api';
import { Card, Descriptions, Divider, Spin } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  id: string | undefined;
  version: string | undefined;
  idType: string;
};

const UnitGroupDescriptionMini: FC<Props> = ({ id, version, idType }) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  const [refUnitGroup, setRefUnitGroup] = useState<any>({});
  const [refUnit, setRefUnit] = useState<any>({});

  useEffect(() => {
    if (id) {
      if (idType === 'flow') {
        setSpinning(true);
        getReferenceProperty(id, version ?? '').then((res1: any) => {
          getReferenceUnitGroup(res1?.data?.refFlowPropertytId, res1?.data?.re).then(
            (res2: any) => {
              setRefUnitGroup(res2?.data);
              getReferenceUnit(res2?.data?.refUnitGroupId, res2?.data?.version).then((res3) => {
                setRefUnit(res3?.data);
                setSpinning(false);
              });
            },
          );
        });
      } else if (idType === 'flowproperty') {
        setSpinning(true);
        getReferenceUnitGroup(id, version ?? '').then((res1: any) => {
          setRefUnitGroup(res1.data);
          getReferenceUnit(res1?.data?.refUnitGroupId, res1?.data?.version).then((res2) => {
            setRefUnit(res2?.data);
            setSpinning(false);
          });
        });
      }
    }
  }, [id]);

  return (
    <Spin spinning={spinning}>
      <Card
        size="small"
        title={
          <FormattedMessage
            id="pages.flowproperty.referenceToReferenceUnitGroup"
            defaultMessage="Reference unit"
          />
        }
      >
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.FlowProperties.view.flowPropertiesInformation.shortDescription"
            defaultMessage="Short description" //有问题
          />
        </Divider>
        <LangTextItemDescription data={refUnitGroup.refUnitGroupShortDescription} />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.unitgroup.unit.quantitativeReference"
              defaultMessage="Quantitative reference"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage id="pages.unitgroup.unitName" defaultMessage="Name of unit" />
              }
              labelStyle={{ width: '100px' }}
            >
              {refUnit.refUnitName ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.unitgroup.generalComment"
              defaultMessage="General comment"
            />
          </Divider>
          <LangTextItemDescription data={refUnit.refUnitGeneralComment} />
        </Card>
      </Card>
    </Spin>
  );
};

export default UnitGroupDescriptionMini;
