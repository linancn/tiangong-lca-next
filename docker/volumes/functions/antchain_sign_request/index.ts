// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { crypto } from 'https://deno.land/std@0.220.0/crypto/mod.ts';

// console.log('ANT_CHAIN_KEY', Deno.env.get('ANT_CHAIN_KEY'));
export const ANT_CHAIN_KEY = JSON.parse(atob(Deno.env.get('ANT_CHAIN_KEY') ?? ''));

export const defaultAntchainConfig = {
  baseUrl: ANT_CHAIN_KEY.baseUrl,
  authenticationType: ANT_CHAIN_KEY.authenticationType,
  authenticationVersion: ANT_CHAIN_KEY.authenticationVersion,
  tenantId: ANT_CHAIN_KEY.tenantId,
  isvAk: ANT_CHAIN_KEY.isvAk,
  isvSk: ANT_CHAIN_KEY.isvSk,
  signatureMethod: ANT_CHAIN_KEY.signatureMethod,
};

export async function signRequest(
  baseUrl: string,
  path: string,
  headers: Record<string, any>,
  params: Record<string, any> | null,
  body: unknown,
): Promise<string> {
  headers['x-authentication-version'] = defaultAntchainConfig.authenticationVersion;
  headers['x-authentication-type'] = defaultAntchainConfig.authenticationType;
  headers['x-tenant-id'] = defaultAntchainConfig.tenantId;
  headers['x-isv-ak'] = defaultAntchainConfig.isvAk;
  headers['x-signature-method'] = defaultAntchainConfig.signatureMethod;
  const isvSk = defaultAntchainConfig.isvSk;
  console.log('signRequest', baseUrl, path, headers, params, body);
  const encoder = new TextEncoder();

  // 1. 获取并编码URL路径
  const pathBytes = encoder.encode(path);

  // 2. 处理headers并编码
  const headerItems: string[] = [];
  Object.keys(headers)
    .sort()
    .forEach((key) => {
      headerItems.push(`${key}=${headers[key]}`);
    });
  const headersStr = headerItems.join('&');
  const headersBytes = encoder.encode(headersStr);

  // 3. 处理查询参数并编码
  const paramItems: string[] = [];
  if (params) {
    Object.keys(params)
      .sort()
      .forEach((key) => {
        paramItems.push(`${key}=${params[key]}`);
      });
  }
  const paramsStr = paramItems.join('&');
  const paramsBytes = encoder.encode(paramsStr);

  // 4. 创建一个组合字节数组，模拟Java的Buffer写入
  // 先计算总长度
  let totalLength = pathBytes.length + headersBytes.length + paramsBytes.length;
  let bodyBytes = new Uint8Array(0);

  // 5. 如果有请求体，直接转为字节
  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      // 如果body已经是字符串，直接编码
      bodyBytes = encoder.encode(body);
    } else if (body instanceof Uint8Array) {
      // 如果已经是字节数组，直接使用
      bodyBytes = body;
    } else {
      // 否则序列化为JSON字符串再编码
      try {
        const bodyStr = JSON.stringify(body);
        bodyBytes = encoder.encode(bodyStr);
      } catch (e) {
        console.error('无法将body转为JSON:', e);
      }
    }

    // 更新总长度
    totalLength += bodyBytes.length;
  }

  // 6. 创建完整的签名字节数组
  const signatureBytes = new Uint8Array(totalLength);

  // 7. 填充字节数组（模拟Java中的Buffer追加操作）
  let offset = 0;

  // 先写入路径
  signatureBytes.set(pathBytes, offset);
  offset += pathBytes.length;

  // 写入headers
  signatureBytes.set(headersBytes, offset);
  offset += headersBytes.length;

  // 写入参数
  signatureBytes.set(paramsBytes, offset);
  offset += paramsBytes.length;

  // 写入body（如果存在）
  if (bodyBytes.length > 0) {
    signatureBytes.set(bodyBytes, offset);
  }

  // 输出调试信息
  console.log('签名前的内容结构:');
  console.log(`Path(${pathBytes.length}字节): ${path}`);
  console.log(`Headers(${headersBytes.length}字节): ${headersStr}`);
  console.log(`Params(${paramsBytes.length}字节): ${paramsStr}`);
  console.log(`Body(${bodyBytes.length}字节)`);
  console.log(`总计: ${totalLength}字节`);

  // 8. 导入HMAC密钥并计算签名
  const keyBytes = encoder.encode(isvSk);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, signatureBytes);

  // 9. 将签名转换为Base64
  const signatureArray = new Uint8Array(signatureBuffer);
  const base64Signature = btoa(String.fromCharCode(...signatureArray));

  return base64Signature;
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const { baseUrl, path, headers, params, body } = await req.json();
    const signature = await signRequest(baseUrl, path, headers, params, body);
    console.log('signature:', signature);
    return new Response(JSON.stringify({ signature }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('签名请求失败:', error);
    return new Response(JSON.stringify({ error: '签名请求失败' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
