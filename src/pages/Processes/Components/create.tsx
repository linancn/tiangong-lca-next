import { langOptions } from '@/services/general/data';
import { createProcess } from '@/services/processes/api';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

const { TextArea } = Input;

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="options.create" defaultMessage="Create" />}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="options.create" defaultMessage="Create" />}
        width="600px"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async (values) => {
            const result = await createProcess({ ...values });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              reload();
            } else {
              message.error(result.error.message);
            }
            return true;
          }}
        >
          <Space direction="vertical">
            <Card size="small" title={'Base Name'}>
              <Form.Item>
                <Form.List name={'baseName'}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <TextArea placeholder="text" rows={1} />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Short Name Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            <Card size="small" title={'General Comment'}>
              <Form.Item>
                <Form.List name={'common:generalComment'}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Name Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            <Card size="small" title={'Classification'}>
              <Space>
                <Form.Item name={['common:class', '@level_0']}>
                  <Input placeholder="Level 1" />
                </Form.Item>
                <Form.Item name={['common:class', '@level_1']}>
                  <Input placeholder="Level 2" />
                </Form.Item>
                <Form.Item name={['common:class', '@level_2']}>
                  <Input placeholder="Level 3" />
                </Form.Item>
              </Space>
            </Card>

            <Card size="small" title={'Quantitative Reference'}>
              <Space>
                <Form.Item>
                  <Typography>
                    <pre>
                      {JSON.stringify(
                        {
                          '@type': 'Reference flow(s)',
                          referenceToReferenceFlow: '7',
                          functionalUnitOrOther: {
                            '@xml:lang': 'en',
                            '#text': 'The functional unit is 1t of propylene product',
                          },
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </Typography>
                </Form.Item>
              </Space>
            </Card>

            <Card size="small" title={'Time'}>
              <Form.Item name={['time', 'common:referenceYear']}>
                <Input placeholder="Reference Year" />
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Time Representativeness Description
              </Divider>
              <Form.Item>
                <Form.List name={['time', 'common:timeRepresentativenessDescription']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Time Representativeness Description Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            <Card size="small" title={'Geography: Location Of Operation Supply Or Production'}>
              <Form.Item name={['locationOfOperationSupplyOrProduction', '@location']}>
                <Input placeholder="Location" />
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Description Of Restrictions
              </Divider>
              <Form.Item>
                <Form.List
                  name={['locationOfOperationSupplyOrProduction', 'descriptionOfRestrictions']}
                >
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Time Representativeness Description Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            <Card size="small" title={'Technology'}>
              <Divider orientationMargin="0" orientation="left" plain>
                Technology Description And Included Processes
              </Divider>

              <Form.Item>
                <Form.List name={['technology', 'technologyDescriptionAndIncludedProcesses']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Technology Description And Included Process Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>

              <Divider orientationMargin="0" orientation="left" plain>
                Technological Applicability
              </Divider>

              <Form.Item>
                <Form.List name={['technology', 'technologicalApplicability']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Technological Applicability Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Reference To Technology Flow Diagramm Or Picture
              </Divider>
              <Form.Item name={['technology', 'referenceToTechnologyFlowDiagrammOrPicture']}>
                <Typography>
                  <pre>
                    {JSON.stringify(
                      {
                        '@type': 'source data set',
                        '@refObjectId': 'cc3e05d3-ed66-c61e-cae6-3941d031f843',
                        '@uri': '../sources/cc3e05d3-ed66-c61e-cae6-3941d031f843.xml',
                        'common:shortDescription': {
                          '@xml:lang': 'en',
                          '#text': 'Dd8Pby0K5o4HZaxwFLTc61oWnFc.png',
                        },
                      },
                      null,
                      2,
                    )}
                  </pre>
                </Typography>
              </Form.Item>
            </Card>

            <Card size="small" title={'Mathematical Relations: Model Description'}>
              <Form.Item>
                <Form.List name={['mathematicalRelations', 'mathematicalRelations']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Mathematical Relation Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            <Card size="small" title={'LCI Method And Allocation'}>
              <Form.Item label="Type Of DataSet" name={['LCIMethodAndAllocation', 'typeOfDataSet']}>
                <Input />
              </Form.Item>
              <Form.Item
                label="LCI Method Principle"
                name={['LCIMethodAndAllocation', 'LCIMethodPrinciple']}
              >
                <Input />
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From LCI Method Principle
              </Divider>
              <Form.Item>
                <Form.List name={['LCIMethodAndAllocation', 'deviationsFromLCIMethodPrinciple']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Deviations From LCI Method Principle Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Form.Item
                label="LCI Method Approaches"
                name={['LCIMethodAndAllocation', 'LCIMethodApproaches']}
              >
                <Input />
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From LCI Method Approaches
              </Divider>
              <Form.Item>
                <Form.List name={['LCIMethodAndAllocation', 'deviationsFromLCIMethodApproaches']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Deviations From LCI Method Approach Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Modelling Constants
              </Divider>
              <Form.Item>
                <Form.List name={['LCIMethodAndAllocation', 'deviationsFromModellingConstants']}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Deviations From Modelling Constant Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            <Card size="small" title={'Data Sources Treatment And Representativeness'}>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Cut Off And Completeness Principles
              </Divider>
              <Form.Item>
                <Form.List
                  name={[
                    'dataSourcesTreatmentAndRepresentativeness',
                    'deviationsFromCutOffAndCompletenessPrinciples',
                  ]}
                >
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Deviations From Cut Off And Completeness Principle Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Data Selection And Combination Principles
              </Divider>
              <Form.Item>
                <Form.List
                  name={[
                    'dataSourcesTreatmentAndRepresentativeness',
                    'dataSelectionAndCombinationPrinciples',
                  ]}
                >
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Data Selection And Combination Principle Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Selection And Combination Principles
              </Divider>
              <Form.Item>
                <Form.List
                  name={[
                    'dataSourcesTreatmentAndRepresentativeness',
                    'deviationsFromSelectionAndCombinationPrinciples',
                  ]}
                >
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Deviations From Selection And Combination Principle Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Data Treatment And Extrapolations Principles
              </Divider>
              <Form.Item>
                <Form.List
                  name={[
                    'dataSourcesTreatmentAndRepresentativeness',
                    'dataTreatmentAndExtrapolationsPrinciples',
                  ]}
                >
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Data Treatment And Extrapolations Principle Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Treatment And Extrapolation Principles
              </Divider>
              <Form.Item>
                <Form.List
                  name={[
                    'dataSourcesTreatmentAndRepresentativeness',
                    'deviationsFromTreatmentAndExtrapolationPrinciples',
                  ]}
                >
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Deviations From Treatment And Extrapolation Principle Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Reference To DataSource
              </Divider>
              <Divider orientationMargin="0" orientation="left" plain>
                Use Advice For DataSet
              </Divider>
            </Card>
            <Form.Item label="Completeness" name={'completeness'}>
              <Input />
            </Form.Item>
            <Card size="small" title={'Validation: Review'}>
              <Form.Item label="Type" name={['validation', 'review', '@type']}>
                <Input />
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Review Details
              </Divider>
              <Divider orientationMargin="0" orientation="left" plain>
                Reference To Name Of Reviewer And Institution
              </Divider>
            </Card>
            <Card size="small" title={'Administrative Information'}>
              <Divider orientationMargin="0" orientation="left" plain>
                Data Generator
              </Divider>
              <Divider orientationMargin="0" orientation="left" plain>
                Data Entry By
              </Divider>
              <Divider orientationMargin="0" orientation="left" plain>
                Publication And Ownership
              </Divider>
            </Card>
            <Card size="small" title={'Exchanges'}></Card>
          </Space>
        </ProForm>
      </Drawer>
    </>
  );
};

export default ProcessCreate;
