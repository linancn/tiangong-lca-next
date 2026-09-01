/**
 * Explicit lexical projections for the seven public TIDAS dataset families.
 *
 * The projector is intentionally not a JSON flattener. Every value below is
 * reached through a reviewed path, so reference identities, administrative
 * fields, amounts, and other high-fan-out metadata cannot leak into search_text
 * when an input document gains a new sibling field.
 */

export type SearchTextDatasetKind =
  'process' | 'flow' | 'lifecyclemodel' | 'contact' | 'flowproperty' | 'source' | 'unitgroup';

export type SearchTextProjector = (jsonOrdered: unknown, rowId: string) => string[];

import type { JsonRecord, LocalizedFragment, PathSegment } from './projection_primitives.ts';
import {
  asArray,
  isRecord,
  nestedItems,
  pick,
  readLocalizedFragments,
  readPath,
  readReferenceShortDescriptionFragments,
  readScalarValue,
  scalarText,
} from './projection_primitives.ts';

interface ProjectionFragment extends LocalizedFragment {
  fieldIndex: number;
  sourceIndex: number;
}

const keys = (...values: string[]): PathSegment => values;

function readAttributeOrText(value: unknown, attributeNames: PathSegment): string | null {
  for (const item of asArray(value)) {
    if (isRecord(item)) {
      const attribute = readScalarValue(pick(item, ...attributeNames));
      if (attribute) return attribute;
    }
    const direct = readScalarValue(item);
    if (direct) return direct;
  }
  return null;
}

function normalizeFragment(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function classificationFragments(container: unknown, itemNames: PathSegment): LocalizedFragment[] {
  const entries = nestedItems(container, itemNames)
    .map((item, sourceIndex) => {
      const rawLevel = isRecord(item) ? pick(item, '@level', 'level') : undefined;
      const parsedLevel = Number(rawLevel);
      return {
        item,
        sourceIndex,
        level: Number.isFinite(parsedLevel) ? parsedLevel : Number.POSITIVE_INFINITY,
      };
    })
    .sort((left, right) => left.level - right.level || left.sourceIndex - right.sourceIndex);

  return entries.flatMap(({ item }) =>
    readLocalizedFragments(
      readPath(item, keys('#text', 'text', '_text', 'value', 'common:name', 'name')) ?? item,
    ),
  );
}

function findDataset(value: unknown, rootNames: PathSegment): JsonRecord | null {
  if (!isRecord(value)) return null;
  for (const rootName of rootNames) {
    const root = value[rootName];
    if (isRecord(root)) return root;
  }
  const directDatasetMarkers = [
    {
      roots: ['processDataSet', 'process_data_set', 'processdataset'],
      markers: ['processInformation', 'process_information'],
    },
    {
      roots: ['flowDataSet', 'flow_data_set', 'flowdataset', 'flow_dataset'],
      markers: ['flowInformation', 'flow_information'],
    },
    {
      roots: [
        'lifeCycleModelDataSet',
        'life_cycle_model_data_set',
        'lifecycleModelDataSet',
        'lifecycle_model_data_set',
      ],
      markers: ['lifeCycleModelInformation', 'life_cycle_model_information'],
    },
    {
      roots: ['flowPropertyDataSet', 'flow_property_data_set', 'flowpropertyDataSet'],
      markers: ['flowPropertiesInformation', 'flow_properties_information'],
    },
    {
      roots: ['contactDataSet', 'contact_data_set'],
      markers: ['contactInformation', 'contact_information'],
    },
    {
      roots: ['sourceDataSet', 'source_data_set'],
      markers: ['sourceInformation', 'source_information'],
    },
    {
      roots: ['unitGroupDataSet', 'unit_group_data_set'],
      markers: ['unitGroupInformation', 'unit_group_information'],
    },
  ].find(({ roots }) => rootNames.some((rootName) => roots.includes(rootName)));
  if (directDatasetMarkers?.markers.some((name) => isRecord(value[name]))) return value;
  for (const child of Object.values(value)) {
    const found = findDataset(child, rootNames);
    if (found) return found;
  }
  return null;
}

function requireDataset(value: unknown, rootNames: PathSegment, label: string): JsonRecord {
  const dataset = findDataset(value, rootNames);
  if (!dataset) throw new Error(`Invalid ${label} JSON: missing data set`);
  return dataset;
}

function dataSetInformation(dataset: JsonRecord, informationNames: PathSegment): JsonRecord {
  const information = readPath(dataset, informationNames);
  const dataInfo = readPath(information, keys('dataSetInformation', 'data_set_information'));
  return isRecord(dataInfo) ? dataInfo : {};
}

class ProjectionBuilder {
  private readonly fragments: ProjectionFragment[] = [];
  private nextSourceIndex = 0;

  addLocalized(fieldIndex: number, value: unknown): void {
    for (const fragment of readLocalizedFragments(value)) {
      this.addFragment(fieldIndex, fragment);
    }
  }

  addFragment(fieldIndex: number, fragment: LocalizedFragment): void {
    this.fragments.push({
      fieldIndex,
      language: fragment.language,
      text: fragment.text,
      sourceIndex: this.nextSourceIndex++,
    });
  }

  addScalar(fieldIndex: number, value: unknown): void {
    const text = readScalarValue(value);
    if (!text) return;
    this.fragments.push({
      fieldIndex,
      language: '',
      text,
      sourceIndex: this.nextSourceIndex++,
    });
  }

  addAttribute(fieldIndex: number, value: unknown, attributeNames: PathSegment): void {
    const text = readAttributeOrText(value, attributeNames);
    if (!text) return;
    this.fragments.push({
      fieldIndex,
      language: '',
      text,
      sourceIndex: this.nextSourceIndex++,
    });
  }

  addClassifications(fieldIndex: number, value: unknown, itemNames: PathSegment): void {
    for (const fragment of classificationFragments(value, itemNames)) {
      this.fragments.push({
        fieldIndex,
        language: fragment.language,
        text: fragment.text,
        sourceIndex: this.nextSourceIndex++,
      });
    }
  }

  finish(): string[] {
    const seen = new Set<string>();
    return this.fragments
      .slice()
      .sort(
        (left, right) =>
          left.fieldIndex - right.fieldIndex ||
          (left.language === '' ? 1 : 0) - (right.language === '' ? 1 : 0) ||
          (left.language < right.language ? -1 : left.language > right.language ? 1 : 0) ||
          left.sourceIndex - right.sourceIndex,
      )
      .map((fragment) => normalizeFragment(fragment.text))
      .filter((text) => {
        if (!text || seen.has(text)) return false;
        seen.add(text);
        return true;
      });
  }
}

function addReferenceDescriptions(
  builder: ProjectionBuilder,
  fieldIndex: number,
  references: unknown,
): void {
  for (const reference of asArray(references)) {
    for (const fragment of readReferenceShortDescriptionFragments(reference)) {
      builder.addFragment(fieldIndex, fragment);
    }
  }
}

function addOwnUuid(builder: ProjectionBuilder, fieldIndex: number, rowId: string): void {
  const identity = scalarText(rowId);
  if (!identity) throw new Error('Missing trusted dataset row identity');
  builder.addScalar(fieldIndex, identity);
}

function processReferenceFlowDescriptions(
  dataset: JsonRecord,
  quantitativeReference: unknown,
): unknown[] {
  const referenceId = readScalarValue(
    readPath(
      quantitativeReference,
      keys('referenceToReferenceFlow', 'reference_to_reference_flow'),
    ),
  );
  if (!referenceId) return [];

  const exchangeContainer = readPath(dataset, keys('exchanges', 'exchange'));
  const exchanges = nestedItems(exchangeContainer, keys('exchange', 'exchanges'));
  return exchanges.flatMap((exchange) => {
    if (!isRecord(exchange)) return [];
    const internalId = readScalarValue(
      pick(
        exchange,
        'internalId',
        'internal_id',
        '@internalId',
        '@internal_id',
        'dataSetInternalID',
        'data_set_internal_id',
        '@dataSetInternalID',
        '@data_set_internal_id',
      ),
    );
    if (internalId !== referenceId) return [];
    return asArray(
      readPath(exchange, keys('referenceToFlowDataSet', 'reference_to_flow_data_set')),
    );
  });
}

export function projectProcessSearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(
    jsonOrdered,
    keys('processDataSet', 'process_data_set', 'processdataset'),
    'process',
  );
  const information = readPath(dataset, keys('processInformation', 'process_information'));
  const dataInfo = dataSetInformation(dataset, keys('processInformation', 'process_information'));
  const name = readPath(dataInfo, keys('name'));
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(field++, readPath(name, keys('baseName', 'base_name', 'basename')));
  builder.addLocalized(
    field++,
    readPath(name, keys('treatmentStandardsRoutes', 'treatment_standards_routes')),
  );
  builder.addLocalized(
    field++,
    readPath(name, keys('mixAndLocationTypes', 'mix_and_location_types')),
  );
  builder.addLocalized(
    field++,
    readPath(name, keys('functionalUnitFlowProperties', 'functional_unit_flow_properties')),
  );
  builder.addScalar(
    field++,
    readPath(dataInfo, keys('identifierOfSubDataSet', 'identifier_of_sub_data_set')),
  );
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('common:synonyms', 'common_synonyms', 'synonyms')),
  );
  builder.addClassifications(
    field++,
    readPath(
      dataInfo,
      keys('classificationInformation', 'classification_information'),
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataInfo,
      keys('common:generalComment', 'common_general_comment', 'generalComment', 'general_comment'),
    ),
  );

  const quantitativeReference = readPath(
    information,
    keys('quantitativeReference', 'quantitative_reference'),
  );
  builder.addLocalized(
    field++,
    readPath(quantitativeReference, keys('functionalUnitOrOther', 'functional_unit_or_other')),
  );
  const time = readPath(information, keys('time'));
  builder.addLocalized(
    field++,
    readPath(
      time,
      keys(
        'common:timeRepresentativenessDescription',
        'time_representativeness_description',
        'timeRepresentativenessDescription',
      ),
    ),
  );

  const geography = readPath(information, keys('geography'));
  const location = readPath(
    geography,
    keys('locationOfOperationSupplyOrProduction', 'location_of_operation_supply_or_production'),
  );
  builder.addAttribute(field++, location, keys('@location', 'location', '@code', 'code'));
  builder.addLocalized(
    field++,
    readPath(location, keys('descriptionOfRestrictions', 'description_of_restrictions')),
  );

  const subLocations = nestedItems(
    readPath(
      geography,
      keys(
        'subLocationOfOperationSupplyOrProduction',
        'sub_location_of_operation_supply_or_production',
      ),
    ),
    keys('subLocation', 'sub_location'),
  );
  for (const subLocation of subLocations) {
    builder.addAttribute(
      field,
      subLocation,
      keys('@subLocation', 'subLocation', '@sub_location', 'sub_location'),
    );
  }
  field++;
  for (const subLocation of subLocations) {
    builder.addLocalized(
      field,
      readPath(subLocation, keys('descriptionOfRestrictions', 'description_of_restrictions')),
    );
  }
  field++;

  const technology = readPath(information, keys('technology'));
  builder.addLocalized(
    field++,
    readPath(
      technology,
      keys(
        'technologyDescriptionAndIncludedProcesses',
        'technology_description_and_included_processes',
      ),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(technology, keys('technologicalApplicability', 'technological_applicability')),
  );

  const modelling = readPath(dataset, keys('modellingAndValidation', 'modelling_and_validation'));
  const allocation = readPath(
    modelling,
    keys('LCIMethodAndAllocation', 'lci_method_and_allocation'),
  );
  builder.addScalar(
    field++,
    readPath(allocation, keys('LCIMethodPrinciple', 'lci_method_principle')),
  );
  builder.addLocalized(
    field++,
    readPath(
      allocation,
      keys('deviationsFromLCIMethodPrinciple', 'deviations_from_lci_method_principle'),
    ),
  );
  builder.addScalar(
    field++,
    readPath(allocation, keys('LCIMethodApproaches', 'lci_method_approaches')),
  );
  builder.addLocalized(
    field++,
    readPath(
      allocation,
      keys('deviationsFromLCIMethodApproaches', 'deviations_from_lci_method_approaches'),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(allocation, keys('modellingConstants', 'modelling_constants')),
  );
  builder.addLocalized(
    field++,
    readPath(
      allocation,
      keys('deviationsFromModellingConstants', 'deviations_from_modelling_constants'),
    ),
  );

  const dataSources = readPath(
    modelling,
    keys(
      'dataSourcesTreatmentAndRepresentativeness',
      'data_sources_treatment_and_representativeness',
    ),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataSources,
      keys('dataCutOffAndCompletenessPrinciples', 'data_cut_off_and_completeness_principles'),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataSources,
      keys(
        'deviationsFromCutOffAndCompletenessPrinciples',
        'deviations_from_cut_off_and_completeness_principles',
      ),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataSources,
      keys('dataSelectionAndCombinationPrinciples', 'data_selection_and_combination_principles'),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataSources,
      keys(
        'deviationsFromSelectionAndCombinationPrinciples',
        'deviations_from_selection_and_combination_principles',
      ),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataSources,
      keys(
        'dataTreatmentAndExtrapolationsPrinciples',
        'data_treatment_and_extrapolations_principles',
      ),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataSources,
      keys(
        'deviationsFromTreatmentAndExtrapolationPrinciples',
        'deviations_from_treatment_and_extrapolation_principles',
      ),
    ),
  );
  builder.addLocalized(
    field++,
    readPath(dataSources, keys('samplingProcedure', 'sampling_procedure')),
  );
  builder.addLocalized(
    field++,
    readPath(dataSources, keys('dataCollectionPeriod', 'data_collection_period')),
  );
  builder.addLocalized(
    field++,
    readPath(dataSources, keys('uncertaintyAdjustments', 'uncertainty_adjustments')),
  );
  builder.addLocalized(
    field++,
    readPath(dataSources, keys('useAdviceForDataSet', 'use_advice_for_data_set')),
  );

  const referenceDescriptions = processReferenceFlowDescriptions(dataset, quantitativeReference);
  for (const reference of referenceDescriptions) {
    for (const fragment of readReferenceShortDescriptionFragments(reference)) {
      builder.addFragment(field, fragment);
    }
  }
  field++;
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export function projectFlowSearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(
    jsonOrdered,
    keys('flowDataSet', 'flow_data_set', 'flowdataset', 'flow_dataset'),
    'flow',
  );
  const information = readPath(dataset, keys('flowInformation', 'flow_information'));
  const dataInfo = dataSetInformation(dataset, keys('flowInformation', 'flow_information'));
  const name = readPath(dataInfo, keys('name'));
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(field++, readPath(name, keys('baseName', 'base_name', 'basename')));
  builder.addLocalized(
    field++,
    readPath(name, keys('treatmentStandardsRoutes', 'treatment_standards_routes')),
  );
  builder.addLocalized(
    field++,
    readPath(name, keys('mixAndLocationTypes', 'mix_and_location_types')),
  );
  builder.addLocalized(field++, readPath(name, keys('flowProperties', 'flow_properties')));
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('common:synonyms', 'common_synonyms', 'synonyms')),
  );

  const classificationInfo = readPath(
    dataInfo,
    keys('classificationInformation', 'classification_information'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys(
        'common:elementaryFlowCategorization',
        'elementaryFlowCategorization',
        'common_elementary_flow_categorization',
      ),
    ),
    keys('common:category', 'category', 'common_category'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addScalar(field++, readPath(dataInfo, keys('CASNumber', 'casNumber', 'cas_number')));
  const other = readPath(dataInfo, keys('common:other', 'common_other', 'other'));
  builder.addScalar(
    field++,
    readPath(other, keys('ecn:ECNumber', 'ECNumber', 'ecn_ec_number', 'ec_number')),
  );
  builder.addScalar(field++, readPath(dataInfo, keys('sumFormula', 'sum_formula')));
  builder.addLocalized(
    field++,
    readPath(
      dataInfo,
      keys('common:generalComment', 'common_general_comment', 'generalComment', 'general_comment'),
    ),
  );

  const geography = readPath(information, keys('geography'));
  builder.addAttribute(
    field++,
    readPath(geography, keys('locationOfSupply', 'location_of_supply', 'location')),
    keys('@location', 'location', '@code', 'code'),
  );
  const technology = readPath(information, keys('technology'));
  builder.addLocalized(
    field++,
    readPath(technology, keys('technologicalApplicability', 'technological_applicability')),
  );

  const properties = readPath(dataset, keys('flowProperties', 'flow_properties'));
  const propertyItems = nestedItems(properties, keys('flowProperty', 'flow_property'));
  for (const item of propertyItems) {
    addReferenceDescriptions(
      builder,
      field,
      readPath(item, keys('referenceToFlowPropertyDataSet', 'reference_to_flow_property_data_set')),
    );
  }
  field++;
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export function projectLifecycleModelSearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(
    jsonOrdered,
    keys(
      'lifeCycleModelDataSet',
      'life_cycle_model_data_set',
      'lifecycleModelDataSet',
      'lifecycle_model_data_set',
    ),
    'lifecyclemodel',
  );
  const information = readPath(
    dataset,
    keys('lifeCycleModelInformation', 'life_cycle_model_information'),
  );
  const dataInfo = dataSetInformation(
    dataset,
    keys('lifeCycleModelInformation', 'life_cycle_model_information'),
  );
  const name = readPath(dataInfo, keys('name'));
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(field++, readPath(name, keys('baseName', 'base_name', 'basename')));
  builder.addLocalized(
    field++,
    readPath(name, keys('treatmentStandardsRoutes', 'treatment_standards_routes')),
  );
  builder.addLocalized(
    field++,
    readPath(name, keys('mixAndLocationTypes', 'mix_and_location_types')),
  );
  builder.addLocalized(
    field++,
    readPath(name, keys('functionalUnitFlowProperties', 'functional_unit_flow_properties')),
  );
  const classificationInfo = readPath(
    dataInfo,
    keys('classificationInformation', 'classification_information'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataInfo,
      keys('common:generalComment', 'common_general_comment', 'generalComment', 'general_comment'),
    ),
  );
  addReferenceDescriptions(
    builder,
    field++,
    readPath(dataInfo, keys('referenceToResultingProcess', 'reference_to_resulting_process')),
  );
  addReferenceDescriptions(
    builder,
    field++,
    readPath(
      dataInfo,
      keys('referenceToExternalDocumentation', 'reference_to_external_documentation'),
    ),
  );

  const technology = readPath(information, keys('technology'));
  const groupDeclarations = readPath(technology, keys('groupDeclarations', 'group_declarations'));
  const groups = nestedItems(groupDeclarations, keys('group'));
  for (const group of groups) {
    builder.addLocalized(field, readPath(group, keys('groupName', 'group_name')));
  }
  field++;

  const processes = readPath(technology, keys('processes'));
  const processInstances = nestedItems(processes, keys('processInstance', 'process_instance'));
  for (const processInstance of processInstances) {
    addReferenceDescriptions(
      builder,
      field,
      readPath(processInstance, keys('referenceToProcess', 'reference_to_process')),
    );
  }
  field++;

  const modelling = readPath(dataset, keys('modellingAndValidation', 'modelling_and_validation'));
  const dataSources = readPath(
    modelling,
    keys('dataSourcesTreatmentEtc', 'data_sources_treatment_etc'),
  );
  builder.addLocalized(
    field++,
    readPath(dataSources, keys('useAdviceForDataSet', 'use_advice_for_data_set')),
  );
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export function projectContactSearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(
    jsonOrdered,
    keys('contactDataSet', 'contact_data_set'),
    'contact',
  );
  const dataInfo = dataSetInformation(dataset, keys('contactInformation', 'contact_information'));
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(field++, readPath(dataInfo, keys('common:name', 'common_name', 'name')));
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('common:shortName', 'common_short_name', 'shortName', 'short_name')),
  );
  const classificationInfo = readPath(
    dataInfo,
    keys('classificationInformation', 'classification_information'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addLocalized(field++, readPath(dataInfo, keys('contactAddress', 'contact_address')));
  builder.addScalar(field++, readPath(dataInfo, keys('email')));
  builder.addScalar(field++, readPath(dataInfo, keys('telephone')));
  builder.addScalar(field++, readPath(dataInfo, keys('telefax')));
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('centralContactPoint', 'central_contact_point')),
  );
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('contactDescriptionOrComment', 'contact_description_or_comment')),
  );
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export function projectFlowPropertySearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(
    jsonOrdered,
    keys('flowPropertyDataSet', 'flow_property_data_set', 'flowpropertyDataSet'),
    'flowproperty',
  );
  const information = readPath(
    dataset,
    keys('flowPropertiesInformation', 'flow_properties_information'),
  );
  const dataInfo = dataSetInformation(
    dataset,
    keys('flowPropertiesInformation', 'flow_properties_information'),
  );
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(field++, readPath(dataInfo, keys('common:name', 'common_name', 'name')));
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('common:synonyms', 'common_synonyms', 'synonyms')),
  );
  const classificationInfo = readPath(
    dataInfo,
    keys('classificationInformation', 'classification_information'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataInfo,
      keys('common:generalComment', 'common_general_comment', 'generalComment', 'general_comment'),
    ),
  );
  const quantitativeReference = readPath(
    information,
    keys('quantitativeReference', 'quantitative_reference'),
  );
  addReferenceDescriptions(
    builder,
    field++,
    readPath(
      quantitativeReference,
      keys('referenceToReferenceUnitGroup', 'reference_to_reference_unit_group'),
    ),
  );
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export function projectSourceSearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(jsonOrdered, keys('sourceDataSet', 'source_data_set'), 'source');
  const dataInfo = dataSetInformation(dataset, keys('sourceInformation', 'source_information'));
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('common:shortName', 'common_short_name', 'shortName', 'short_name')),
  );
  const classificationInfo = readPath(
    dataInfo,
    keys('classificationInformation', 'classification_information'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addScalar(field++, readPath(dataInfo, keys('sourceCitation', 'source_citation')));
  builder.addScalar(field++, readPath(dataInfo, keys('publicationType', 'publication_type')));
  builder.addLocalized(
    field++,
    readPath(dataInfo, keys('sourceDescriptionOrComment', 'source_description_or_comment')),
  );
  addReferenceDescriptions(
    builder,
    field++,
    readPath(dataInfo, keys('referenceToContact', 'reference_to_contact')),
  );
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export function projectUnitGroupSearchText(jsonOrdered: unknown, rowId: string): string[] {
  const dataset = requireDataset(
    jsonOrdered,
    keys('unitGroupDataSet', 'unit_group_data_set'),
    'unitgroup',
  );
  const dataInfo = dataSetInformation(
    dataset,
    keys('unitGroupInformation', 'unit_group_information'),
  );
  const builder = new ProjectionBuilder();
  let field = 0;

  builder.addLocalized(field++, readPath(dataInfo, keys('common:name', 'common_name', 'name')));
  const classificationInfo = readPath(
    dataInfo,
    keys('classificationInformation', 'classification_information'),
  );
  builder.addClassifications(
    field++,
    readPath(
      classificationInfo,
      keys('common:classification', 'classification', 'common_classification'),
    ),
    keys('common:class', 'class', 'common_class'),
  );
  builder.addLocalized(
    field++,
    readPath(
      dataInfo,
      keys('common:generalComment', 'common_general_comment', 'generalComment', 'general_comment'),
    ),
  );

  const units = nestedItems(readPath(dataset, keys('units')), keys('unit'));
  for (const unit of units) {
    builder.addLocalized(field, readPath(unit, keys('name')));
  }
  field++;
  for (const unit of units) {
    builder.addLocalized(field, readPath(unit, keys('generalComment', 'general_comment')));
  }
  field++;
  addOwnUuid(builder, field, rowId);

  return builder.finish();
}

export const SEARCH_TEXT_PROJECTORS: Readonly<Record<SearchTextDatasetKind, SearchTextProjector>> =
  {
    process: projectProcessSearchText,
    flow: projectFlowSearchText,
    lifecyclemodel: projectLifecycleModelSearchText,
    contact: projectContactSearchText,
    flowproperty: projectFlowPropertySearchText,
    source: projectSourceSearchText,
    unitgroup: projectUnitGroupSearchText,
  };

export function projectSearchText(
  kind: SearchTextDatasetKind,
  rowId: string,
  jsonOrdered: unknown,
): string[] {
  return SEARCH_TEXT_PROJECTORS[kind](jsonOrdered, rowId);
}
