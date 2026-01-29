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
  useXContentSha256?: boolean; // 火山方舟 API 需要 X-Content-Sha256 头
}

export interface VolcengineSignatureResult {
  requestUrl: string;
  authorization: string;
  xDate: string;
  host: string;
  xContentSha256?: string; // 火山方舟 API 需要
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

  // 请求体哈希
  const payloadHash = sha256Hash(requestBody);

  // 构建规范请求头
  let canonicalHeaders = `host:${host}\nx-date:${amzDate}\n`;
  let signedHeaders = 'host;x-date';

  // 火山方舟 API 需要 content-type 和 x-content-sha256 头
  if (params.useXContentSha256 || (requestBody && method === 'POST')) {
    canonicalHeaders = `content-type:application/json\nhost:${host}\nx-content-sha256:${payloadHash}\nx-date:${amzDate}\n`;
    signedHeaders = 'content-type;host;x-content-sha256;x-date';
  } else if (requestBody && method === 'POST') {
    canonicalHeaders = `content-type:application/json\n${canonicalHeaders}`;
    signedHeaders = 'content-type;host;x-date';
  }

  // 构建规范请求
  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
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
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // 构建完整 URL
  const requestUrl = `https://${host}${path}${canonicalQueryString ? '?' + canonicalQueryString : ''}`;

  const result: VolcengineSignatureResult = {
    requestUrl,
    authorization,
    xDate: amzDate,
    host,
  };

  // 火山方舟 API 需要返回 xContentSha256
  if (params.useXContentSha256 || (requestBody && method === 'POST' && signedHeaders.includes('x-content-sha256'))) {
    result.xContentSha256 = payloadHash;
  }

  return result;
}

