import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import LocationTextItemDescription from '@/components/LocationTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import {
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  completenessElementaryFlowsTypeOptions,
  completenessElementaryFlowsValueOptions,
  completenessProductModelOptions,
  copyrightOptions,
  licenseTypeOptions,
  processtypeOfDataSetOptions,
  uncertaintyDistributionTypeOptions,
  workflowAndPublicationStatusOptions,
} from '@/pages/Processes/Components/optiondata';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { getCommentApi, updateCommentApi } from '@/services/comments/api';
import { updateReviewApi } from '@/services/reviews/api';
import styles from '@/style/custom.less';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

import ComplianceItemForm from '../../../Compliance/form';
import ComplianceItemView from '../../../Compliance/view';

import ReveiwItemForm from '../../../ReviewForm/form';
import ReviewItemView from '../../../ReviewForm/view';

import { RefCheckContext, RefCheckType } from '@/contexts/refCheckContext';
import {
  ReffPath,
  checkReferences,
  getAllRefObj,
  getRefTableName,
  refDataType,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';
import { getRefData, updateStateCodeApi } from '@/services/general/api';
import {
  getLifeCycleModelDetail,
  updateLifeCycleModelJsonApi,
} from '@/services/lifeCycleModels/api';
import { getProcessDetail } from '@/services/processes/api';
import { getUserTeamId } from '@/services/roles/api';

type Props = {
  lang: string;
  data: any;
  type: 'edit' | 'view';
  reviewId: string;
  tabType: 'assigned' | 'review';
  actionRef?: any;
  approveReviewDisabled: boolean;
  modelId: string;
  modelVersion: string;
};

const getWorkflowAndPublicationStatusOptions = (value: string) => {
  const option = workflowAndPublicationStatusOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getCompletenessElementaryFlowsTypeOptions = (value: string) => {
  const option = completenessElementaryFlowsTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getCompletenessElementaryFlowsValueOptions = (value: string) => {
  const option = completenessElementaryFlowsValueOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getCompletenessProductModelOptions = (value: string) => {
  const option = completenessProductModelOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLicenseTypeOptions = (value: string) => {
  const option = licenseTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getComplianceLabel = (value: string) => {
  const option = uncertaintyDistributionTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getProcesstypeOfDataSetOptions = (value: string) => {
  const option = processtypeOfDataSetOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const getLCIMethodPrincipleOptions = (value: string) => {
  const option = LCIMethodPrincipleOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const getLCIMethodApproachOptions = (value: string) => {
  const option = LCIMethodApproachOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getCopyrightOptions = (value: string) => {
  const option = copyrightOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const ToolbarViewInfo: FC<Props> = ({
  lang,
  data,
  type,
  reviewId,
  tabType,
  actionRef,
  approveReviewDisabled,
  modelId,
  modelVersion,
}) => {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('lifeCycleModelInformation');
  const [spinning, setSpinning] = useState(false);
  const [refCheckData, setRefCheckData] = useState<RefCheckType[]>([]);
  const formRef = useRef<ProFormInstance>();
  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const updateLifeCycleModelJson = async (lifeCycleModel: any) => {
    const { data: commentData, error } = await getCommentApi(reviewId, tabType);
    if (!error && commentData && commentData.length) {
      const allReviews: any[] = [];
      commentData.forEach((item: any) => {
        if (item?.json?.modellingAndValidation?.validation?.review) {
          allReviews.push(...item?.json?.modellingAndValidation.validation.review);
        }
      });
      const allCompliance: any[] = [];
      commentData.forEach((item: any) => {
        if (item?.json?.modellingAndValidation?.complianceDeclarations?.compliance) {
          allCompliance.push(
            ...item?.json?.modellingAndValidation.complianceDeclarations.compliance,
          );
        }
      });

      const _review =
        lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation?.validation?.review;
      const _compliance =
        lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation?.complianceDeclarations
          ?.compliance;
      const json = {
        ...lifeCycleModel?.json,
      };
      json.lifeCycleModelDataSet.modellingAndValidation = {
        ...lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation,
        validation: {
          ...lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation?.validation,
          review: Array.isArray(_review)
            ? [..._review, ...allReviews]
            : _review
              ? [_review, ...allReviews]
              : [...allReviews],
        },
        complianceDeclarations: {
          ...lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation
            ?.complianceDeclarations,
          compliance: Array.isArray(_compliance)
            ? [..._compliance, ...allCompliance]
            : _compliance
              ? [_compliance, ...allCompliance]
              : [...allCompliance],
        },
      };
      const { data: newLifeCycleModel } = await updateLifeCycleModelJsonApi(
        modelId,
        modelVersion,
        json,
      );
      return newLifeCycleModel;
    }
  };

  const updateReviewDataToPublic = async (modelId: string, modelVersion: string) => {
    const result: any[] = [];
    const teamId = await getUserTeamId();
    const getReferences = async (refs: any[], checkedIds = new Set<string>()) => {
      for (const ref of refs) {
        if (checkedIds.has(ref['@refObjectId'])) continue;
        checkedIds.add(ref['@refObjectId']);

        const refResult = await getRefData(
          ref['@refObjectId'],
          ref['@version'],
          getRefTableName(ref['@type']),
          teamId,
        );

        if (refResult.success && refResult?.data) {
          const refData = refResult?.data;
          if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
            result.push(ref);
            const json = refData?.json;
            const subRefs = getAllRefObj(json);
            await getReferences(subRefs, checkedIds);
          }
          if (ref['@type'] === 'process data set') {
            const { data: sameModelWithProcress } = await getLifeCycleModelDetail(
              ref['@refObjectId'],
              ref['@version'],
            );
            if (sameModelWithProcress) {
              const modelRefs = getAllRefObj(sameModelWithProcress);
              await getReferences(modelRefs, checkedIds);
            }
          }
        }
      }
    };

    const { data: lifeCycleModel, success } = await getLifeCycleModelDetail(modelId, modelVersion);
    if (success) {
      const newLifeCycleModel = await updateLifeCycleModelJson(lifeCycleModel);
      if (lifeCycleModel?.stateCode !== 100 && lifeCycleModel?.stateCode !== 200) {
        result.push({
          '@refObjectId': modelId,
          '@version': modelVersion,
          '@type': 'lifeCycleModel data set',
        });
      }
      const { data: sameProcressWithModel } = await getProcessDetail(modelId, modelVersion);
      if (sameProcressWithModel) {
        if (sameProcressWithModel?.stateCode !== 100 && sameProcressWithModel?.stateCode !== 200) {
          result.push({
            '@refObjectId': sameProcressWithModel?.id,
            '@version': sameProcressWithModel?.version,
            '@type': 'process data set',
          });
        }
      }

      const modelRefs = getAllRefObj(newLifeCycleModel);
      if (modelRefs.length) {
        await getReferences(modelRefs);
        const procressRefs = modelRefs.filter((item) => item['@type'] === 'process data set');
        for (const procress of procressRefs) {
          const { data: sameModeWithProcress, success } = await getLifeCycleModelDetail(
            procress['@refObjectId'],
            procress['@version'],
          );
          if (
            success &&
            sameModeWithProcress?.stateCode !== 100 &&
            sameModeWithProcress?.stateCode !== 200
          ) {
            result.push({
              '@refObjectId': sameModeWithProcress?.id,
              '@version': sameModeWithProcress?.version,
              '@type': 'lifeCycleModel data set',
            });
          }
        }
      }
      const submodels = lifeCycleModel?.json_tg?.submodels;
      if (submodels) {
        submodels.forEach((item: any) => {
          result.push({
            '@refObjectId': item.id,
            '@version': modelVersion,
            '@type': 'process data set',
          });
        });
      }
    }
    for (const item of result) {
      await updateStateCodeApi(
        item['@refObjectId'],
        item['@version'],
        getRefTableName(item['@type']),
        100,
      );
    }
  };

  const approveReview = async () => {
    setSpinning(true);
    const { error } = await updateCommentApi(
      reviewId,
      {
        state_code: 2,
      },
      tabType,
    );

    const { error: error2 } = await updateReviewApi([reviewId], {
      state_code: 2,
    });
    await updateReviewDataToPublic(modelId, modelVersion);
    if (!error && !error2) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.ReviewProcessDetail.assigned.success',
          defaultMessage: 'Review approved successfully',
        }),
      );
      actionRef?.current?.reload();
    }
    setSpinning(false);
  };

  const tabList = [
    {
      key: 'lifeCycleModelInformation',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.view.lifeCycleModelInformation'
          defaultMessage='Life Cycle Model Information'
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.view.modellingAndValidation'
          defaultMessage='Modelling and Validation'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.view.administrativeInformation'
          defaultMessage='Administrative Information'
        />
      ),
    },
    {
      key: 'validation',
      tab: <FormattedMessage id='pages.process.validation' defaultMessage='Validation' />,
    },
    {
      key: 'complianceDeclarations',
      tab: (
        <FormattedMessage
          id='pages.process.complianceDeclarations'
          defaultMessage='Compliance declarations'
        />
      ),
    },
  ];

  const defaultTabContent: Record<string, React.ReactNode> = {
    lifeCycleModelInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id='pages.source.view.sourceInformation.id' defaultMessage='ID' />
            }
            labelStyle={{ width: '100px' }}
          >
            {data.lifeCycleModelInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage id='pages.lifeCycleModel.information.name' defaultMessage='Name' />
          }
        >
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.baseName'
              defaultMessage='Base name'
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.dataSetInformation?.name?.baseName ?? '-'}
          />
          <br />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.treatmentStandardsRoutes'
              defaultMessage='Treatment, standards, routes'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.dataSetInformation?.name?.treatmentStandardsRoutes ??
              '-'
            }
          />
          <br />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.mixAndLocationTypes'
              defaultMessage='Mix and Location Types'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.dataSetInformation?.name?.mixAndLocationTypes ?? '-'
            }
          />
          <br />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.functionalUnitFlowProperties'
              defaultMessage='Quantitative product or process properties'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties ?? '-'
            }
          />
        </Card>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.identifierOfSubDataSet'
                defaultMessage='Identifier of sub-data set'
              />
            }
            labelStyle={{ width: '140px' }}
          >
            {data.lifeCycleModelInformation?.dataSetInformation?.identifierOfSubDataSet ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.lifeCycleModel.information.synonyms'
            defaultMessage='Synonyms'
          />
        </Divider>
        <LangTextItemDescription
          data={data.lifeCycleModelInformation?.dataSetInformation?.['common:synonyms']}
        />
        <br />
        <LevelTextItemDescription
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class']?.['value']
          }
          lang={lang}
          categoryType={'LifeCycleModel'}
        />
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.lifeCycleModel.information.generalComment'
            defaultMessage='General Comment'
          />
        </Divider>
        <LangTextItemDescription
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.['common:generalComment'] ?? '-'
          }
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.referenceToExternalDocumentation'
              defaultMessage='Reference to External Documentation'
            />
          }
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation ??
            {}
          }
          lang={lang}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.technology.referenceToDiagram'
              defaultMessage='Reference to Diagram'
            />
          }
          data={data.lifeCycleModelInformation?.technology?.referenceToDiagram ?? {}}
          lang={lang}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.time'
              defaultMessage='Time representativeness'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.referenceYear'
                  defaultMessage='Reference year'
                />
              }
              labelStyle={{ width: '140px' }}
            >
              {data.lifeCycleModelInformation?.time?.['common:referenceYear'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.dataSetValidUntil'
                  defaultMessage='Data set valid until:'
                />
              }
              labelStyle={{ width: '140px' }}
            >
              {data.lifeCycleModelInformation?.time?.['common:dataSetValidUntil'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.timeRepresentativenessDescription'
              defaultMessage='Time representativeness description'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.time?.['common:timeRepresentativenessDescription']
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.locationOfOperationSupplyOrProduction'
              defaultMessage='Location'
            />
          }
        >
          <LocationTextItemDescription
            lang={lang}
            data={
              data.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] ?? '-'
            }
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.location'
                defaultMessage='Location'
              />
            }
            labelStyle={{ width: '100px' }}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.subLocationOfOperationSupplyOrProduction'
              defaultMessage='Sub-location(s)'
            />
          }
        >
          <LocationTextItemDescription
            lang={lang}
            data={
              data.lifeCycleModelInformation?.geography?.subLocationOfOperationSupplyOrProduction?.[
                '@subLocation'
              ] ?? '-'
            }
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.location'
                defaultMessage='Sub-location(s)'
              />
            }
            labelStyle={{ width: '100px' }}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.geography?.subLocationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.technology'
              defaultMessage='Technological representativeness'
            />
          }
        >
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.technologyDescriptionAndIncludedProcesses'
              defaultMessage='Technology description including background system'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.technology?.technologyDescriptionAndIncludedProcesses
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.technologicalApplicability'
              defaultMessage='Technical purpose of product or process'
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.technology?.technologicalApplicability}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.information.referenceToTechnologyPictogramme'
                defaultMessage='Flow diagramm(s) or picture(s)'
              />
            }
            data={
              data.lifeCycleModelInformation?.technology?.referenceToTechnologyPictogramme ?? {}
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.information.referenceToTechnologyFlowDiagrammOrPicture'
                defaultMessage='Flow diagramm(s) or picture(s)'
              />
            }
            data={
              data.lifeCycleModelInformation?.technology
                ?.referenceToTechnologyFlowDiagrammOrPicture ?? {}
            }
            lang={lang}
          />
        </Card>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.lifeCycleModel.information.modelDescription'
            defaultMessage='Model description'
          />
        </Divider>
        <LangTextItemDescription
          data={data.lifeCycleModelInformation?.mathematicalRelations?.modelDescription}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.variableParameter'
              defaultMessage='Variable / parameter'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.name'
                  defaultMessage='Name of variable'
                />
              }
              labelStyle={{ width: '120px' }}
            >
              {data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.[
                '@name'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.formula'
                  defaultMessage='Formula'
                />
              }
              labelStyle={{ width: '120px' }}
            >
              {data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.formula ??
                '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.meanValue'
                  defaultMessage='Mean value'
                />
              }
              labelStyle={{ width: '120px' }}
            >
              {data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.meanValue ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.minimumValue'
                  defaultMessage='Minimum value'
                />
              }
              labelStyle={{ width: '120px' }}
            >
              {data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.minimumValue ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.maximumValue'
                  defaultMessage='Maximum value'
                />
              }
              labelStyle={{ width: '120px' }}
            >
              {data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.maximumValue ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.uncertaintyDistributionType'
                  defaultMessage='Uncertainty distribution type'
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {getComplianceLabel(
                data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                  ?.uncertaintyDistributionType ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.relativeStandardDeviation95In'
                  defaultMessage='Relative StdDev in %'
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                ?.relativeStandardDeviation95In ?? '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientationMargin='0' orientation='left' plain>
            {
              <FormattedMessage
                id='pages.lifeCycleModel.information.variableParameter.comment'
                defaultMessage='Comment, units, defaults'
              />
            }
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.comment}
          />
        </Card>
      </>
    ),
    modellingAndValidation: (
      <>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet'
            defaultMessage='Use Advice For Data Set'
          />
        </Divider>
        <LangTextItemDescription
          data={data.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet ?? '-'}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.lCIMethodAndAllocation'
              defaultMessage='LCI method and allocation'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.typeOfDataSet'
                  defaultMessage='Type of data set'
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {getProcesstypeOfDataSetOptions(
                data.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.lCIMethodPrinciple'
                  defaultMessage='LCI method principle'
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {getLCIMethodPrincipleOptions(
                data.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromLCIMethodPrinciple'
              defaultMessage='Deviation from LCI method principle / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodPrinciple
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.lCIMethodApproaches'
                  defaultMessage='LCI method approaches'
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {getLCIMethodApproachOptions(
                data.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromLCIMethodApproaches'
              defaultMessage='Deviations from LCI method approaches / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromLCIMethodApproaches
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.modellingConstants'
              defaultMessage='Modelling constants'
            />
          </Divider>
          <LangTextItemDescription
            data={data.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromModellingConstants'
              defaultMessage='Deviation from modelling constants / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.LCIMethodAndAllocation?.deviationsFromModellingConstants
            }
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.referenceToLCAMethodDetails'
                defaultMessage='LCA methodology report'
              />
            }
            data={
              data.modellingAndValidation?.LCIMethodAndAllocation?.referenceToLCAMethodDetails ?? {}
            }
            lang={lang}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness'
              defaultMessage='Data sources, treatment, and representativeness'
            />
          }
        >
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
              defaultMessage='Data cut-off and completeness principles'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples'
              defaultMessage='Deviation from data cut-off and completeness principles / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataSelectionAndCombinationPrinciples'
              defaultMessage='Data selection and combination principles'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples'
              defaultMessage='Deviation from data selection and combination principles / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples'
              defaultMessage='Data treatment and extrapolations principles'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataTreatmentAndExtrapolationsPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples'
              defaultMessage='Deviation from data treatment and extrapolations principles / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromTreatmentAndExtrapolationPrinciples
            }
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.referenceToDataHandlingPrinciples'
                defaultMessage='Data handling report'
              />
            }
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples ?? {}
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.referenceToDataSource'
                defaultMessage='Data source(s) used for this data set'
              />
            }
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource ?? {}
            }
            lang={lang}
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.percentageSupplyOrProductionCovered'
                  defaultMessage='Percentage supply or production covered'
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.percentageSupplyOrProductionCovered ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.annualSupplyOrProductionVolume'
              defaultMessage='Annual supply or production volume'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.annualSupplyOrProductionVolume
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.samplingProcedure'
              defaultMessage='Sampling procedure'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.samplingProcedure
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataCollectionPeriod'
              defaultMessage='Data collection period'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataCollectionPeriod
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.uncertaintyAdjustments'
              defaultMessage='Uncertainty adjustments'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.uncertaintyAdjustments
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet'
              defaultMessage='Use advice for data set'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.useAdviceForDataSet
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.completeness'
              defaultMessage='Completeness'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessProductModel'
                  defaultMessage='Completeness product model'
                />
              }
              labelStyle={{ width: '140px' }}
            >
              {getCompletenessProductModelOptions(
                data.modellingAndValidation?.completeness?.completenessProductModel ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessElementaryFlows'
                defaultMessage='Completeness elementary flows, per topic'
              />
            }
          >
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessElementaryFlows.type'
                    defaultMessage='completeness type'
                  />
                }
                labelStyle={{ width: '140px' }}
              >
                {getCompletenessElementaryFlowsTypeOptions(
                  data.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                    '@type'
                  ] ?? '-',
                )}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessElementaryFlows.value'
                    defaultMessage='value'
                  />
                }
                labelStyle={{ width: '140px' }}
              >
                {getCompletenessElementaryFlowsValueOptions(
                  data.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                    '@value'
                  ] ?? '-',
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessOtherProblemField'
              defaultMessage='Completeness other problem field(s)'
            />
          </Divider>
          <LangTextItemDescription
            data={data.modellingAndValidation?.completeness?.completenessOtherProblemField}
          />
        </Card>
        {/* <ContactSelectDescription
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.referenceToCompleteReviewReport'
              defaultMessage='Data set report, background info'
            />
          }
          lang={lang}
          data={
            data.modellingAndValidation?.validation?.review?.[
              'common:referenceToNameOfReviewerAndInstitution'
            ]
          }
        />
        <br /> */}
        {/* <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.referenceToCompleteReviewReport'
              defaultMessage='Reference to Complete Review Report'
            />
          }
          data={
            data.modellingAndValidation?.validation?.review?.[
              'common:referenceToCompleteReviewReport'
            ] ?? {}
          }
          lang={lang}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.referenceToComplianceSystem'
              defaultMessage='Reference to Compliance System'
            />
          }
          data={
            data.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:referenceToComplianceSystem'
            ] ?? {}
          }
          lang={lang}
        />
        <br /> */}
        {/* <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.approvalOfOverallCompliance'
                defaultMessage='Approval of Overall Compliance'
              />
            }
            styles={{ label: { width: '240px' } }}
          >
            {getapprovalOfOverallComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:approvalOfOverallCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance'
                defaultMessage='Nomenclature Compliance'
              />
            }
            styles={{ label: { width: '200px' } }}
          >
            {getnomenclatureComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:nomenclatureCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance'
                defaultMessage='Methodological Compliance'
              />
            }
            styles={{ label: { width: '210px' } }}
          >
            {getmethodologicalComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:methodologicalCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.reviewCompliance'
                defaultMessage='Review Compliance'
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {getreviewComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:reviewCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.documentationCompliance'
                defaultMessage='Documentation Compliance'
              />
            }
            styles={{ label: { width: '210px' } }}
          >
            {getdocumentationComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:documentationCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.qualityCompliance'
                defaultMessage='Quality Compliance'
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {getqualityComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:qualityCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions> */}
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.commissionerAndGoal'
              defaultMessage='Commissioner and Goal'
            />
          }
        >
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToCommissioner'
                defaultMessage='Reference to Commissioner'
              />
            }
            lang={lang}
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:referenceToCommissioner'
              ]
            }
          />
          <br />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.project'
              defaultMessage='Project'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.['common:project']
            }
          />
          <br />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.intendedApplications'
              defaultMessage='Intended Applications'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.[
                'common:intendedApplications'
              ]
            }
          />
        </Card>
        <br />
        <ContactSelectDescription
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityGeneratingTheDataSet'
              defaultMessage='Reference to Person Or Entity Generating the DataSet'
            />
          }
          lang={lang}
          data={
            data.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]
          }
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.dataEntryBy'
              defaultMessage='Data entry by'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.timeStamp'
                  defaultMessage='Time stamp (last saved)'
                />
              }
              styles={{ label: { width: '200px' } }}
            >
              {data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            data={data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']}
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
              />
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            data={
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]
            }
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToConvertedOriginalDataSetFrom'
                defaultMessage='Converted original data set from:'
              />
            }
            lang={lang}
          />
          <br />
          <ContactSelectDescription
            data={
              data?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]
            }
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityEnteringTheData'
                defaultMessage='Data entry by:'
              />
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            data={
              data?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetUseApproval']
            }
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToDataSetUseApproval'
                defaultMessage='Official approval of data set by producer/operator:'
              />
            }
            lang={lang}
          />
          <br />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and Ownership'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.dateOfLastRevision'
                  defaultMessage='Date of last revision'
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {data.administrativeInformation?.publicationAndOwnership?.[
                'common:dateOfLastRevision'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.flow.view.administrativeInformation.dataSetVersion'
                  defaultMessage='Data set version'
                />
              }
              labelStyle={{ width: '180px' }}
            >
              <Space>
                {data.administrativeInformation?.publicationAndOwnership?.[
                  'common:dataSetVersion'
                ] ?? '-'}
              </Space>
            </Descriptions.Item>
          </Descriptions>
          {/* <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.dataSetVersion"
              defaultMessage="Data set version"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion']
            }
          /> */}
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.flow.view.administrativeInformation.permanentDataSetURI'
                  defaultMessage='Permanent data set URI'
                />
              }
              styles={{ label: { width: '220px' } }}
            >
              {data.administrativeInformation?.publicationAndOwnership?.[
                'common:permanentDataSetURI'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.workflowAndPublicationStatus'
                  defaultMessage='Workflow and publication status	'
                />
              }
              styles={{ label: { width: '240px' } }}
            >
              {getWorkflowAndPublicationStatusOptions(
                data.administrativeInformation?.publicationAndOwnership?.[
                  'common:workflowAndPublicationStatus'
                ] ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToUnchangedRepublication'
                defaultMessage='Unchanged re-publication of:'
              />
            }
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ] ?? {}
            }
            lang={lang}
          />
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToRegistrationAuthority'
                defaultMessage='Registration authority'
              />
            }
            lang={lang}
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.registrationNumber'
                  defaultMessage='Registration number'
                />
              }
              styles={{ label: { width: '140px' } }}
            >
              {data.administrativeInformation?.publicationAndOwnership?.[
                'common:registrationNumber'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
              />
            }
            lang={lang}
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.copyright'
                  defaultMessage='Copyright?'
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {getCopyrightOptions(
                data.administrativeInformation?.publicationAndOwnership?.['common:copyright'] ??
                  '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />

          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToEntitiesWithExclusiveAccess'
                defaultMessage='Reference to Entities with Exclusive Access'
              />
            }
            lang={lang}
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.licenseType'
                  defaultMessage='License type'
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {getLicenseTypeOptions(
                data.administrativeInformation?.publicationAndOwnership?.['common:licenseType'] ??
                  '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.accessRestrictions'
              defaultMessage='Access Restrictions'
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.['publicationAndOwnership']?.[
                'common:accessRestrictions'
              ]
            }
          />
        </Card>
      </>
    ),
  };
  const tabContent: { [key: string]: JSX.Element } =
    type === 'edit'
      ? {
          ...defaultTabContent,
          validation: (
            <ReveiwItemForm
              name={['modellingAndValidation', 'validation', 'review']}
              lang={lang}
              formRef={formRef}
              onData={() => {}}
            />
          ),
          complianceDeclarations: (
            <ComplianceItemForm
              name={['modellingAndValidation', 'complianceDeclarations', 'compliance']}
              lang={lang}
              formRef={formRef}
              onData={() => {}}
            />
          ),
        }
      : {
          ...defaultTabContent,
          validation: <ReviewItemView data={data?.modellingAndValidation?.validation?.review} />,
          complianceDeclarations: (
            <ComplianceItemView
              data={data?.modellingAndValidation?.complianceDeclarations?.compliance}
            />
          ),
        };
  const temporarySave = async () => {
    const fieldsValue = formRef.current?.getFieldsValue();
    const submitData = {
      modellingAndValidation: {
        complianceDeclarations: fieldsValue?.modellingAndValidation?.complianceDeclarations,
        validation: fieldsValue?.modellingAndValidation?.validation,
      },
    };

    setSpinning(true);
    const { error } = await updateCommentApi(reviewId, { json: submitData }, tabType);
    if (!error) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.temporarySaveSuccess',
          defaultMessage: 'Temporary save successfully',
        }),
      );
      setDrawerVisible(false);
      actionRef?.current?.reload();
    }
    setSpinning(false);
  };

  const updateCommentJsonRefsToUnderReview = async (data: any) => {
    const refObjs = getAllRefObj(data);
    const unReview: refDataType[] = []; //stateCode < 20
    const underReview: refDataType[] = []; //stateCode >= 20 && stateCode < 100
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const userTeamId = await getUserTeamId();
    const path = await checkReferences(
      refObjs,
      new Map<string, any>(),
      userTeamId,
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
      new ReffPath(
        {
          '@refObjectId': '',
          '@version': '',
          '@type': '',
        },
        true,
        false,
      ),
    );
    const problemNodes = path?.findProblemNodes() ?? [];
    const refCheckDataValue: RefCheckType[] = [];

    if (underReview.length > 0) {
      refCheckDataValue.push(
        ...underReview.map((item: any) => {
          return {
            id: item['@refObjectId'],
            version: item['@version'],
            ruleVerification: true,
            nonExistent: false,
            stateCode: item.state_code,
          };
        }),
      );
    } else if (problemNodes && problemNodes.length > 0) {
      let result = problemNodes.map((item: any) => {
        return {
          id: item['@refObjectId'],
          version: item['@version'],
          ruleVerification: item.ruleVerification,
          nonExistent: item.nonExistent,
        };
      });
      refCheckDataValue.push(...result);
    }

    if (refCheckDataValue.length) {
      setRefCheckData(refCheckDataValue);
      setSpinning(false);
      return false;
    } else {
      await updateUnReviewToUnderReview(unReview, reviewId);
      setRefCheckData([]);
      return true;
    }
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id='pages.button.model.info' defaultMessage='Base infomation' />}
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<InfoOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.flow.model.drawer.title.info'
            defaultMessage='Model base infomation'
          ></FormattedMessage>
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
        footer={
          tabType === 'assigned' ? (
            <Space className={styles.footer_right}>
              <Button disabled={approveReviewDisabled} type='primary' onClick={approveReview}>
                <FormattedMessage
                  id='pages.review.ReviewProcessDetail.assigned.save'
                  defaultMessage='Approve Review'
                />
              </Button>
            </Space>
          ) : tabType === 'review' ? (
            <Space size={'middle'} className={styles.footer_right}>
              <Button onClick={() => setDrawerVisible(false)}>
                <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
              </Button>
              <Button onClick={temporarySave}>
                <FormattedMessage id='pages.button.temporarySave' />
              </Button>
              <Button onClick={() => formRef.current?.submit()} type='primary'>
                <FormattedMessage id='pages.button.save' defaultMessage='Save' />
              </Button>
            </Space>
          ) : null
        }
      >
        <Spin spinning={spinning}>
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            <RefCheckContext.Provider value={{ refCheckData: refCheckData }}>
              <ProForm
                initialValues={data}
                formRef={formRef}
                submitter={{
                  render: () => {
                    return [];
                  },
                }}
                onFinish={async () => {
                  const fieldsValue = formRef.current?.getFieldsValue();
                  const submitData = {
                    modellingAndValidation: {
                      complianceDeclarations:
                        fieldsValue?.modellingAndValidation?.complianceDeclarations,
                      validation: fieldsValue?.modellingAndValidation?.validation,
                    },
                  };
                  setSpinning(true);
                  const isRefCheck = await updateCommentJsonRefsToUnderReview(submitData);
                  if (!isRefCheck) {
                    setSpinning(false);
                    return false;
                  }
                  const { error } = await updateCommentApi(
                    reviewId,
                    { json: submitData, state_code: 1 },
                    tabType,
                  );
                  if (!error) {
                    message.success(
                      intl.formatMessage({
                        id: 'pages.review.ReviewProcessDetail.edit.success',
                        defaultMessage: 'Review submitted successfully',
                      }),
                    );
                    setDrawerVisible(false);
                    actionRef?.current?.reload();
                  }
                  setSpinning(false);
                  return true;
                }}
              >
                {Object.keys(tabContent).map((key) => (
                  <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
                    {tabContent[key]}
                  </div>
                ))}
              </ProForm>
            </RefCheckContext.Provider>
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default ToolbarViewInfo;
