import * as crypto from 'crypto';

/**
 * 火山引擎 API 签名工具（AWS Signature V4 风格）
 */

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = hmacSha256(key, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  const kSigning = hmacSha256(kService, 'request');
  return kSigning;
}

export interface VolcengineSignatureParams {
  accessKeyId: string;
  secretAccessKey: string;
  service: string;
  region: string;
  host: string;
  method: string;
  path: string;
  queryParams: Record<string, string>;
  requestBody?: string;
}

export interface VolcengineSignatureResult {
  requestUrl: string;
  authorization: string;
  xDate: string;
  host: string;
}

export function generateVolcengineSignature(
  params: VolcengineSignatureParams
): VolcengineSignatureResult {
  const {
    accessKeyId,
    secretAccessKey,
    service,
    region,
    host,
    method,
    path,
    queryParams,
    requestBody = '',
  } = params;

  // 生成时间戳
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // 构建规范查询字符串（按字母顺序排序）
  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  // 构建规范请求头
  const canonicalHeaders = `host:${host}\nx-date:${amzDate}\n`;
  const signedHeaders = 'host;x-date';

  // 如果有请求体，添加 content-type 头
  let finalCanonicalHeaders = canonicalHeaders;
  let finalSignedHeaders = signedHeaders;
  if (requestBody && method === 'POST') {
    finalCanonicalHeaders = `content-type:application/json\n${canonicalHeaders}`;
    finalSignedHeaders = 'content-type;host;x-date';
  }

  // 请求体哈希
  const payloadHash = sha256Hash(requestBody);

  // 构建规范请求
  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    finalCanonicalHeaders,
    finalSignedHeaders,
    payloadHash,
  ].join('\n');

  // 构建待签名字符串
  const algorithm = 'HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hash(canonicalRequest),
  ].join('\n');

  // 计算签名
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  // 构建 Authorization 头
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${finalSignedHeaders}, Signature=${signature}`;

  // 构建完整 URL
  const requestUrl = `https://${host}${path}${canonicalQueryString ? '?' + canonicalQueryString : ''}`;

  return {
    requestUrl,
    authorization,
    xDate: amzDate,
    host,
  };
}

