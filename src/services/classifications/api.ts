import type { Classification } from '../general/data';
import {
  categoryTypeOptions,
  genClass,
  genClassZH,
  getCachedOrFetchClassificationFileData,
  type ILCDCategoryNode,
} from './util';

type ILCDFlowCategorizationDocument = {
  CategorySystem?: {
    categories?: {
      category?: ILCDCategoryNode[] | ILCDCategoryNode | null;
    } | null;
  } | null;
};

type ILCDClassificationGroup = {
  '@dataType'?: string;
  category?: ILCDCategoryNode[] | ILCDCategoryNode | null;
};

type ILCDClassificationDocument = {
  CategorySystem?: {
    categories?: ILCDClassificationGroup[] | ILCDClassificationGroup | null;
  } | null;
};

const ILCD_FLOW_CATEGORIZATION_FILES = {
  en: 'ILCDFlowCategorization.min.json.gz',
  zh: 'ILCDFlowCategorization_zh.min.json.gz',
} as const;

const ILCD_CLASSIFICATION_FILES = {
  en: 'ILCDClassification.min.json.gz',
  zh: 'ILCDClassification_zh.min.json.gz',
} as const;

const CPC_CLASSIFICATION_FILES = {
  en: 'CPCClassification.min.json.gz',
  zh: 'CPCClassification_zh.min.json.gz',
} as const;

const ISIC_CLASSIFICATION_FILES = {
  en: 'ISICClassification.min.json.gz',
  zh: 'ISICClassification_zh.min.json.gz',
} as const;

function normalizeFlowCategorizationNodes(
  category?: ILCDCategoryNode[] | ILCDCategoryNode | null,
): ILCDCategoryNode[] {
  if (Array.isArray(category)) {
    return category;
  }
  if (category) {
    return [category];
  }
  return [];
}

function normalizeClassificationGroups(
  categories?: ILCDClassificationGroup[] | ILCDClassificationGroup | null,
): ILCDClassificationGroup[] {
  if (Array.isArray(categories)) {
    return categories;
  }
  if (categories) {
    return [categories];
  }
  return [];
}

function filterFlowCategorizationNodes(
  nodes: ILCDCategoryNode[],
  getValues: string[],
): ILCDCategoryNode[] {
  if (getValues.includes('all')) {
    return nodes;
  }

  const filters = new Set(getValues);
  const filterNode = (node: ILCDCategoryNode): ILCDCategoryNode | null => {
    const childNodes = Array.isArray(node.category) ? node.category : [];
    const filteredChildren = childNodes
      .map((child) => filterNode(child))
      .filter((child): child is ILCDCategoryNode => child !== null);
    const isMatched = filters.has(node['@id']) || filters.has(node['@name']);

    if (isMatched) {
      return node;
    }

    if (filteredChildren.length > 0) {
      return {
        ...node,
        category: filteredChildren,
      };
    }

    return null;
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((node): node is ILCDCategoryNode => node !== null);
}

function filterClassificationNodes(
  nodes: ILCDCategoryNode[],
  getValues: string[],
): ILCDCategoryNode[] {
  if (getValues.includes('all')) {
    return nodes;
  }

  const filters = new Set(getValues.filter(Boolean));
  if (filters.size === 0) {
    return [];
  }

  const filterNode = (node: ILCDCategoryNode): ILCDCategoryNode | null => {
    const childNodes = Array.isArray(node.category) ? node.category : [];
    const filteredChildren = childNodes
      .map((child) => filterNode(child))
      .filter((child): child is ILCDCategoryNode => child !== null);
    const isMatched = filters.has(node['@id']) || filters.has(node['@name']);

    if (isMatched) {
      return node;
    }

    if (filteredChildren.length > 0) {
      return {
        ...node,
        category: filteredChildren,
      };
    }

    return null;
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((node): node is ILCDCategoryNode => node !== null);
}

async function getFlowCategorizationNodes(lang: 'en' | 'zh'): Promise<ILCDCategoryNode[]> {
  const fileName = ILCD_FLOW_CATEGORIZATION_FILES[lang];
  const document =
    await getCachedOrFetchClassificationFileData<ILCDFlowCategorizationDocument>(fileName);

  if (!document) {
    throw new Error(`Failed to load ILCD flow categorization from ${fileName}`);
  }

  return normalizeFlowCategorizationNodes(document.CategorySystem?.categories?.category);
}

async function getClassificationNodesByType(
  fileName: string,
  categoryType: string,
): Promise<ILCDCategoryNode[]> {
  const document =
    await getCachedOrFetchClassificationFileData<ILCDClassificationDocument>(fileName);

  if (!document) {
    throw new Error(`Failed to load ILCD classification data from ${fileName}`);
  }

  const group = normalizeClassificationGroups(document.CategorySystem?.categories).find(
    (item) => item['@dataType'] === categoryType,
  );

  return normalizeFlowCategorizationNodes(group?.category);
}

function getSpecialClassificationSource(
  categoryType: string,
  lang: 'en' | 'zh',
): { fileName: string; dataType: string } | null {
  if (categoryType === 'Flow') {
    return {
      fileName: CPC_CLASSIFICATION_FILES[lang],
      dataType: 'Flow',
    };
  }

  if (categoryType === 'Process' || categoryType === 'LifeCycleModel') {
    return {
      fileName: ISIC_CLASSIFICATION_FILES[lang],
      dataType: 'Process',
    };
  }

  return null;
}

async function getILCDClassificationNodesByType(
  categoryType: string,
  lang: 'en' | 'zh',
): Promise<ILCDCategoryNode[]> {
  return getClassificationNodesByType(ILCD_CLASSIFICATION_FILES[lang], categoryType);
}

export async function getILCDClassification(
  categoryType: string,
  lang: string,
  getValues: string[],
): Promise<{ data: Classification[]; success: boolean }> {
  try {
    const specialSource = getSpecialClassificationSource(categoryType, 'en');
    const result = {
      data: filterClassificationNodes(
        specialSource
          ? await getClassificationNodesByType(specialSource.fileName, specialSource.dataType)
          : await getILCDClassificationNodesByType(categoryType, 'en'),
        getValues,
      ),
    };

    let newDatas: Classification[] = [];
    if (lang === 'zh') {
      const getIds = getValues.includes('all')
        ? ['all']
        : result.data.map((item: ILCDCategoryNode) => item['@id']);
      const specialSourceZH = getSpecialClassificationSource(categoryType, 'zh');
      const resultZH = {
        data: filterClassificationNodes(
          specialSourceZH
            ? await getClassificationNodesByType(specialSourceZH.fileName, specialSourceZH.dataType)
            : await getILCDClassificationNodesByType(
                categoryTypeOptions.find((item) => item.en === categoryType)?.zh ?? categoryType,
                'zh',
              ),
          getIds,
        ),
      };
      newDatas = genClassZH(result.data, resultZH.data);
    } else {
      newDatas = genClass(result.data);
    }

    return Promise.resolve({
      data: newDatas,
      success: true,
    });
  } catch (e) {
    console.error(e);
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
}

export async function getILCDFlowCategorization(
  lang: string,
  getValues: string[],
): Promise<{ data: Classification[]; success: boolean }> {
  try {
    const resultData = filterFlowCategorizationNodes(
      await getFlowCategorizationNodes('en'),
      getValues,
    );

    let newDatas: Classification[] = [];
    if (lang === 'zh') {
      const resultZH = await getFlowCategorizationNodes('zh');
      newDatas = genClassZH(resultData, resultZH);
    } else {
      newDatas = genClass(resultData);
    }

    return Promise.resolve({
      data: newDatas,
      success: true,
    });
  } catch (e) {
    console.error(e);
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
}

export async function getILCDFlowCategorizationAll(lang: string) {
  const result = await getILCDClassification('Flow', lang, ['all']);
  const resultElementaryFlow = await getILCDFlowCategorization(lang, ['all']);

  return Promise.resolve({
    data: {
      category: result.data,
      categoryElementaryFlow: resultElementaryFlow.data,
    },
    success: true,
  });
}
