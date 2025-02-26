// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from '@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Name {
  baseName?: string;
  treatmentStandardsRoutes?: string;
  mixAndLocationTypes?: string;
  flowProperties?: string;
  other?: string;
}

interface Category {
  '@level': string;
  '#text': string;
}

interface FilteredContent {
  classificationInformation: {
    'common:elementaryFlowCategorization'?: {
      'common:category': Category[];
    };
  };
  name?: Name;
  synonyms?: string;
  generalComment?: string;
  CASNumber?: string;
  other?: Record<string, unknown>;
}

/**
 * 根据 key, 在 jsonContent[key] 中查找同时满足:
 * - `@xml:lang` === 'en'
 * - 有 '#text'
 * 如果找不到, 返回 null
 */
function filterEnContent(jsonContent: any, key: string): string | null {
  // 如果 jsonContent 为空, 直接返回 null
  if (!jsonContent) return null;

  const value = jsonContent[key];
  // 如果取不到该 key, 或取到的是 null/undefined, 返回 null
  if (!value) return null;

  if (Array.isArray(value)) {
    const enItem = value.find((item) => item?.['@xml:lang'] === 'en');
    return enItem ? (enItem['#text'] ?? null) : null;
  }

  // 如果不是数组, 则尝试直接取 '#text'
  return value['#text'] ?? null;
}

/**
 * 处理仅英文内容的函数
 * - 安全访问各层级属性
 * - 通过 optional chaining 避免 null/undefined 错误
 */
function processJsonRecordEn(jsonContent: any): FilteredContent | null {
  try {
    // 如果 jsonContent 本身是 null/undefined，直接返回 null
    if (!jsonContent) return null;

    // 安全获取 classificationInformation
    const classificationInformation =
      jsonContent?.flowDataSet?.flowInformation?.dataSetInformation?.classificationInformation;

    // 初始构造 FilteredContent
    const filtered: FilteredContent = {
      classificationInformation: classificationInformation ?? {},
    };

    // 安全获取 name
    const name = jsonContent?.flowDataSet?.flowInformation?.dataSetInformation?.name ?? null;

    // 需要处理的 key 列表
    const nameKeys = [
      'baseName',
      'treatmentStandardsRoutes',
      'mixAndLocationTypes',
      'flowProperties',
      'other',
    ];

    // 逐个 key 提取
    nameKeys.forEach((key) => {
      const value = filterEnContent(name, key);
      if (value) {
        if (!filtered.name) filtered.name = {};
        filtered.name[key as keyof Name] = value;
      }
    });

    // 安全获取 dataSetInformation
    const dataSetInformation = jsonContent?.flowDataSet?.flowInformation?.dataSetInformation ?? {};

    // synonyms
    const synonyms = filterEnContent(dataSetInformation, 'common:synonyms');
    if (synonyms) filtered.synonyms = synonyms;

    // generalComment
    const generalComment = filterEnContent(dataSetInformation, 'common:generalComment');
    if (generalComment) filtered.generalComment = generalComment;

    // CASNumber
    const casNumber = dataSetInformation?.CASNumber;
    if (casNumber) filtered.CASNumber = casNumber;

    // other
    const other = dataSetInformation?.['common:other'];
    if (other) filtered.other = other;

    return filtered;
  } catch (error) {
    console.error('Error processing JSON record (EN):', error);
    return null;
  }
}

/**
 * 将 FilteredContent 中的内容转成简练字符串
 */
function dictToConciseString(data: FilteredContent): string {
  // 如果 data 是 null，直接返回空字符串
  if (!data) return '';

  const parts: string[] = [];

  if (data.name?.baseName) {
    parts.push(`Name: ${data.name.baseName}.`);
  }

  if (data.CASNumber) {
    parts.push(`CAS Number: ${data.CASNumber}.`);
  }

  // 分类信息分类
  try {
    const categories =
      data?.classificationInformation?.['common:elementaryFlowCategorization']?.['common:category'];
    if (Array.isArray(categories)) {
      const sortedCategories = [...categories].sort(
        (a, b) => parseInt(a['@level']) - parseInt(b['@level']),
      );
      const classificationPath = sortedCategories.map((c) => c?.['#text'] ?? '').join(' > ');
      parts.push(`Classification: ${classificationPath}.`);
    }
  } catch (_error) {
    // Ignore classification parsing errors
  }

  if (data.synonyms) {
    parts.push(`Synonyms: ${data.synonyms}.`);
  }

  if (data.generalComment) {
    parts.push(`Comment: ${data.generalComment}`);
  }

  if (data.other) {
    const otherFormatted = Object.entries(data.other)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    parts.push(`Other Information: ${otherFormatted}.`);
  }

  return parts.join('\n');
}

/**
 * 遍历并将所有 string 累积成字符串
 * （防止某些字段是数组或对象）
 */
function flattenJson(jsonContent: any): string {
  if (!jsonContent) return '';
  const result: string[] = [];

  function traverse(value: any) {
    if (!value) return; // 避免访问 null/undefined
    if (Array.isArray(value)) {
      value.forEach((item) => traverse(item));
    } else if (typeof value === 'object') {
      Object.values(value).forEach((val) => traverse(val));
    } else if (typeof value === 'string') {
      result.push(value.trim());
    }
  }

  traverse(jsonContent);
  return result.join('; ');
}

/**
 * 处理所有语言内容的函数
 */
function processJsonRecordAllLanguages(jsonContent: any): string | null {
  try {
    if (!jsonContent) return null;

    const filtered: FilteredContent = {
      classificationInformation: {},
    };

    // classificationInformation
    const classificationInformation =
      jsonContent?.flowDataSet?.flowInformation?.dataSetInformation?.classificationInformation;
    if (classificationInformation) {
      const categories =
        classificationInformation?.['common:elementaryFlowCategorization']?.['common:category'];
      if (Array.isArray(categories) && categories.length > 0) {
        // 收集各分类名称
        (filtered.classificationInformation as any).categories = categories
          .map((category: any) => (category?.['#text'] ? category['#text'].trim() : null))
          .filter((text: string | null) => text !== null);
      }
    }

    // name处理
    const name = jsonContent?.flowDataSet?.flowInformation?.dataSetInformation?.name;
    const nameKeys = [
      'baseName',
      'treatmentStandardsRoutes',
      'mixAndLocationTypes',
      'flowProperties',
      'other',
    ];

    if (name) {
      nameKeys.forEach((key) => {
        const value = name[key];
        if (value) {
          filtered.name = filtered.name || {};
          // 如果是数组，需要把 #text 全部拼接
          filtered.name[key as keyof Name] = Array.isArray(value)
            ? value
                .map((item: any) => (item?.['#text'] ? item['#text'].trim() : null))
                .filter((text: string | null) => text !== null)
                .join('; ')
            : value?.['#text']
              ? value['#text'].trim()
              : null;
        }
      });
    }

    const dataSetInformation = jsonContent?.flowDataSet?.flowInformation?.dataSetInformation;

    // synonyms
    const synonyms = dataSetInformation?.['common:synonyms'];
    if (synonyms) {
      filtered.synonyms = Array.isArray(synonyms)
        ? synonyms
            .map((item: any) => (item?.['#text'] ? item['#text'].trim() : null))
            .filter((text: string | null) => text !== null)
            .join('; ')
        : synonyms?.['#text']
          ? synonyms['#text'].trim()
          : null;
    }

    // generalComment
    const generalComment = dataSetInformation?.['common:generalComment'];
    if (generalComment) {
      filtered.generalComment = Array.isArray(generalComment)
        ? generalComment
            .map((item: any) => (item?.['#text'] ? item['#text'].trim() : null))
            .filter((text: string | null) => text !== null)
            .join('; ')
        : generalComment?.['#text']
          ? generalComment['#text'].trim()
          : null;
    }

    // CASNumber
    const casNumber = dataSetInformation?.CASNumber;
    if (casNumber) filtered.CASNumber = casNumber;

    // other
    const other = dataSetInformation?.['common:other'];
    if (other) filtered.other = other;

    // 清理空值字段
    Object.keys(filtered).forEach((key) => {
      const filteredKey = key as keyof FilteredContent;
      if (
        filtered[filteredKey] === undefined ||
        filtered[filteredKey] === null ||
        (typeof filtered[filteredKey] === 'object' &&
          Object.keys(filtered[filteredKey] ?? {}).length === 0)
      ) {
        delete filtered[filteredKey];
      }
    });

    return flattenJson(filtered);
  } catch (error) {
    console.error('Error processing JSON record (All Lang):', error);
    return null;
  }
}

const session = new Supabase.ai.Session('gte-small');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const xKey = req.headers.get('x_key');

  if (!authHeader && !xKey) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  let user;
  if (xKey === Deno.env.get('X_KEY')) {
    user = { role: 'authenticated' };
  } else {
    const token = authHeader?.replace('Bearer ', '') ?? '';

    const supabaseClient = createClient(
      Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('REMOTE_SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data } = await supabaseClient.auth.getUser(token);
    if (!data || !data.user) {
      return new Response('User Not Found', { status: 404 });
    }
    user = data.user;
  }

  if (user?.role !== 'authenticated') {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    let requestData = await req.json();
    if (typeof requestData === 'string') {
      requestData = JSON.parse(requestData);
    }

    // 并发调用两个处理函数
    const [filteredContentEn, extractedText] = await Promise.all([
      processJsonRecordEn(requestData),
      processJsonRecordAllLanguages(requestData),
    ]);

    // 如果英文数据处理失败，抛出异常
    if (!filteredContentEn) {
      throw new Error('Failed to process JSON data');
    }
    // 转成字符串
    const stringDataEn = dictToConciseString(filteredContentEn);

    // 计算 embedding
    const embedding = await session.run(stringDataEn, {
      mean_pool: true,
      normalize: true,
    });

    return new Response(
      JSON.stringify({
        embedding, // embedding 结果
        extracted_text: extractedText, // 提取到的多语言文本
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
