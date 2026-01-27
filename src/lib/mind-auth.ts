import CryptoJS from 'crypto-js';

// 动态获取 redirect URI（支持 localhost 和局域网访问）
function getRedirectUri(): string {
  // 优先使用环境变量配置
  if (import.meta.env.VITE_OIDC_REDIRECT_URI) {
    return import.meta.env.VITE_OIDC_REDIRECT_URI;
  }
  if (import.meta.env.VITE_MIND_REDIRECT_URI) {
    return import.meta.env.VITE_MIND_REDIRECT_URI;
  }
  // 动态使用当前访问的域名
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }
  return 'http://localhost:5173/login';
}

// Mind OIDC 认证配置（优先读取 VITE_OIDC_* 环境变量）
export const MIND_CONFIG = {
  authServerUrl: import.meta.env.VITE_OIDC_AUTH_SERVER_URL || import.meta.env.VITE_MIND_AUTH_SERVER_URL || 'https://login.mindoffice.cn',
  clientId: import.meta.env.VITE_OIDC_CLIENT_ID || import.meta.env.VITE_MIND_CLIENT_ID || '7dd4adcd3ea4601f29a5',
  clientSecret: import.meta.env.VITE_OIDC_CLIENT_SECRET || import.meta.env.VITE_MIND_CLIENT_SECRET || '',
  get redirectUri() { return getRedirectUri(); },
  scope: 'openid profile email',
  tokenUrl: import.meta.env.VITE_OIDC_TOKEN_URL || import.meta.env.VITE_MIND_TOKEN_URL || 'https://login.mindoffice.cn/account/api/token',
  userInfoUrl: import.meta.env.VITE_OIDC_USER_INFO_URL || import.meta.env.VITE_MIND_USER_INFO_URL || 'https://login.mindoffice.cn/account/api/userInfo',
} as const;

// 开发环境打印配置
if (import.meta.env.DEV) {
  console.log('🔐 Mind OIDC 配置:', {
    authServerUrl: MIND_CONFIG.authServerUrl,
    clientId: MIND_CONFIG.clientId,
    redirectUri: MIND_CONFIG.redirectUri,
  });
}

// 用户信息接口
export interface MindUserInfo {
  uid: string;
  name?: string;
  email?: string;
  avatar?: string;
  nick_name?: string;
  icon?: string;
  real_name?: string;
  phone_number?: string;
  landline?: string;
  work_number?: string;
  work_position?: string;
  position?: string;
  user_center_id?: number;
  team_id?: number;
  code?: string;
  base_user_id?: string;
  team_user_id?: string;
  mind_status?: number;
  mind_last_login_at?: number;
}

// 用户信息API响应接口
export interface UserInfoResponse {
  code: number;
  data: {
    user_center_id?: number;
    team_id?: number;
    code?: string;
    base_user_id?: string;
    team_user_id?: string;
    icon?: string;
    name?: string;
    real_name?: string;
    nick_name?: string;
    phone_number?: string;
    landline?: string;
    email?: string;
    work_number?: string;
    work_position?: string;
    position?: string;
    status?: number;
    last_login_at?: number;
  };
  msg: string;
  trace_id: string;
}

// Token响应接口
export interface TokenResponse {
  code: number;
  data: {
    access_token: string;
    token_type: string;
    id_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    uid: string;
  };
  msg: string;
  trace_id: string;
}

// 本地存储键名
export const MIND_STORAGE_KEYS = {
  ACCESS_TOKEN: 'mind_access_token',
  REFRESH_TOKEN: 'mind_refresh_token',
  ID_TOKEN: 'mind_id_token',
  USER_INFO: 'mind_user_info',
  CODE_VERIFIER: 'mind_code_verifier',
  STATE: 'mind_auth_state',
  TOKEN_EXPIRES_AT: 'mind_token_expires_at',
  CODE_CHALLENGE: 'mind_code_challenge',
} as const;

/**
 * 生成随机字符串
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * SHA256 哈希计算并返回 Base64 URL 编码
 * 使用 crypto-js 替代 window.crypto.subtle，兼容非 HTTPS 环境
 */
function sha256Base64Url(plain: string): string {
  const hash = CryptoJS.SHA256(plain);
  // 转换为 Base64 URL 编码
  const base64 = CryptoJS.enc.Base64.stringify(hash);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 生成 PKCE 参数
 */
export function generatePKCE(): {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
} {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = sha256Base64Url(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

/**
 * 生成授权 URL 并跳转
 */
export function redirectToMindLogin(): void {
  const { codeVerifier, codeChallenge, codeChallengeMethod } = generatePKCE();
  const state = generateRandomString(32);
  
  // 存储到 localStorage
  localStorage.setItem(MIND_STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  localStorage.setItem(MIND_STORAGE_KEYS.STATE, state);
  localStorage.setItem(MIND_STORAGE_KEYS.CODE_CHALLENGE, codeChallenge);
  
  const params = new URLSearchParams({
    client_id: MIND_CONFIG.clientId,
    redirect_uri: MIND_CONFIG.redirectUri,
    response_type: 'code',
    scope: MIND_CONFIG.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  });
  
  const authUrl = `${MIND_CONFIG.authServerUrl}/?${params.toString()}`;
  
  window.location.href = authUrl;
}

/**
 * 用授权码换取 Token
 */
export async function exchangeCodeForToken(authCode: string, state: string): Promise<TokenResponse> {
  const storedState = localStorage.getItem(MIND_STORAGE_KEYS.STATE);
  if (state !== storedState) {
    console.warn('⚠️ State 不匹配，清除旧数据后重试...', { 
      received: state, 
      stored: storedState 
    });
    // 清除所有旧的认证数据
    clearMindAuthInfo();
    throw new Error('登录状态已过期，请重新扫码登录');
  }
  
  const codeVerifier = localStorage.getItem(MIND_STORAGE_KEYS.CODE_VERIFIER);
  const codeChallenge = localStorage.getItem(MIND_STORAGE_KEYS.CODE_CHALLENGE);
  
  if (!codeVerifier) {
    throw new Error('Code verifier 不存在，请重新登录');
  }
  
  const requestBody = {
    client_id: MIND_CONFIG.clientId,
    client_secret: MIND_CONFIG.clientSecret,
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: MIND_CONFIG.redirectUri,
    code_verifier: codeVerifier,
    code_challenge: codeChallenge,
  };
  
  console.log('🔄 用授权码换取Token...');
  
  const response = await fetch(MIND_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    throw new Error(`Token 获取失败: ${response.statusText}`);
  }
  
  const tokenResponse: TokenResponse = await response.json();
  
  if (tokenResponse.code !== 0) {
    throw new Error(`Token 获取错误: ${tokenResponse.msg}`);
  }
  
  console.log('✅ Token 获取成功');
  
  // 清理临时存储
  localStorage.removeItem(MIND_STORAGE_KEYS.CODE_VERIFIER);
  localStorage.removeItem(MIND_STORAGE_KEYS.STATE);
  localStorage.removeItem(MIND_STORAGE_KEYS.CODE_CHALLENGE);
  
  return tokenResponse;
}

/**
 * 获取用户详细信息
 */
export async function fetchMindUserInfo(userId: string, accessToken: string): Promise<UserInfoResponse> {
  console.log('🔍 获取用户详细信息...');
  
  const response = await fetch(MIND_CONFIG.userInfoUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId }),
  });
  
  if (!response.ok) {
    throw new Error(`获取用户信息失败: ${response.statusText}`);
  }
  
  const userInfoResponse: UserInfoResponse = await response.json();
  
  if (userInfoResponse.code !== 0) {
    throw new Error(`用户信息获取错误: ${userInfoResponse.msg}`);
  }
  
  console.log('✅ 用户信息获取成功:', userInfoResponse.data.nick_name);
  return userInfoResponse;
}

/**
 * 保存认证信息
 */
export async function saveMindAuthInfo(tokenResponse: TokenResponse): Promise<MindUserInfo> {
  const { data } = tokenResponse;
  const expiresAt = Date.now() + (data.expires_in * 1000);
  
  localStorage.setItem(MIND_STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(MIND_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  localStorage.setItem(MIND_STORAGE_KEYS.ID_TOKEN, data.id_token);
  localStorage.setItem(MIND_STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
  
  // 获取用户详细信息
  const userInfoResponse = await fetchMindUserInfo(data.uid, data.access_token);
  
  const apiData = userInfoResponse.data;
  const finalUid = apiData.team_user_id || apiData.base_user_id || data.uid;
  
  const userInfo: MindUserInfo = {
    uid: finalUid,
    user_center_id: apiData.user_center_id,
    team_id: apiData.team_id,
    code: apiData.code,
    base_user_id: apiData.base_user_id,
    team_user_id: apiData.team_user_id,
    icon: apiData.icon,
    avatar: apiData.icon,
    name: apiData.name,
    real_name: apiData.real_name,
    nick_name: apiData.nick_name,
    phone_number: apiData.phone_number,
    landline: apiData.landline,
    email: apiData.email,
    work_number: apiData.work_number,
    work_position: apiData.work_position,
    position: apiData.position,
    mind_status: apiData.status,
    mind_last_login_at: apiData.last_login_at,
  };
  
  localStorage.setItem(MIND_STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
  console.log('💾 认证信息已保存:', userInfo.nick_name);
  
  return userInfo;
}

/**
 * 检查是否已登录
 */
export function isMindAuthenticated(): boolean {
  const accessToken = localStorage.getItem(MIND_STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = localStorage.getItem(MIND_STORAGE_KEYS.TOKEN_EXPIRES_AT);
  
  if (!accessToken || !expiresAt) {
    return false;
  }
  
  const now = Date.now();
  const tokenExpiresAt = parseInt(expiresAt, 10);
  
  if (now >= tokenExpiresAt) {
    console.log('⏰ Token 已过期');
    clearMindAuthInfo();
    return false;
  }
  
  return true;
}

/**
 * 获取当前用户信息
 */
export function getMindCurrentUser(): MindUserInfo | null {
  const userInfoStr = localStorage.getItem(MIND_STORAGE_KEYS.USER_INFO);
  if (!userInfoStr) return null;
  
  try {
    return JSON.parse(userInfoStr) as MindUserInfo;
  } catch {
    return null;
  }
}

/**
 * 获取访问令牌（会检查是否过期）
 */
export function getMindAccessToken(): string | null {
  // 先检查是否过期
  if (!isMindAuthenticated()) {
    return null;
  }
  return localStorage.getItem(MIND_STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * 清除认证信息
 */
export function clearMindAuthInfo(): void {
  console.log('🗑️ Mind 认证信息已清除');
  Object.values(MIND_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * 刷新访问令牌
 */
export async function refreshMindAccessToken(): Promise<TokenResponse> {
  const refreshToken = localStorage.getItem(MIND_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    throw new Error('Refresh token 不存在');
  }
  
  const requestBody = {
    client_id: MIND_CONFIG.clientId,
    client_secret: MIND_CONFIG.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };
  
  console.log('🔄 刷新访问令牌...');
  
  const response = await fetch(MIND_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    throw new Error(`Token 刷新失败: ${response.statusText}`);
  }
  
  const tokenResponse: TokenResponse = await response.json();
  
  if (tokenResponse.code !== 0) {
    throw new Error(`Token 刷新错误: ${tokenResponse.msg}`);
  }
  
  console.log('✅ Token 刷新成功');
  await saveMindAuthInfo(tokenResponse);
  
  return tokenResponse;
}

/**
 * 处理回调
 */
export async function handleMindCallback(): Promise<MindUserInfo | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  if (!code || !state) {
    return null;
  }
  
  console.log('🔄 处理 Mind 回调...');
  
  try {
    const tokenResponse = await exchangeCodeForToken(code, state);
    const userInfo = await saveMindAuthInfo(tokenResponse);
    
    console.log('✅ Mind 登录成功:', userInfo.nick_name);
    return userInfo;
  } catch (error) {
    console.error('❌ Mind 回调处理失败:', error);
    throw error;
  }
}

/**
 * 获取认证信息（兼容接口）
 */
export interface AuthInfo {
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: {
    id: number | null;
    uid: string;
    name: string;
    email: string;
    avatar: string;
  } | null;
}

export function getAuthInfo(): AuthInfo | null {
  if (!isMindAuthenticated()) {
    return null;
  }
  
  const user = getMindCurrentUser();
  if (!user) {
    return null;
  }
  
  return {
    accessToken: localStorage.getItem(MIND_STORAGE_KEYS.ACCESS_TOKEN),
    refreshToken: localStorage.getItem(MIND_STORAGE_KEYS.REFRESH_TOKEN),
    userInfo: {
      id: user.user_center_id || null,
      uid: user.uid,
      name: user.nick_name || user.name || '',
      email: user.email || '',
      avatar: user.icon || user.avatar || '',
    }
  };
}

/**
 * 切换账号 - 清除本地认证并跳转到 Mind 登出页面
 */
export function switchAccount(): void {
  // 先清除本地所有认证信息
  clearMindAuthInfo();
  localStorage.removeItem('mind_user_role');
  
  // 清除所有以 mind_ 开头的键
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('mind_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // 尝试跳转到 Mind 登出页面
  const logoutUrl = `${MIND_CONFIG.authServerUrl}/logout?redirect_uri=${encodeURIComponent(MIND_CONFIG.redirectUri)}`;
  
  window.location.href = logoutUrl;
}

// Mind 团队成员类型
export interface MindTeamUser {
  user_center_id: number;
  base_user_id?: string;
  team_user_id?: string;
  nick_name: string;
  real_name?: string;
  avatar?: string;
  icon?: string;
  department?: string;
  position?: string;
  email?: string;
  phone_number?: string;
  work_number?: string;
  status: number;  // 1=在职, 0=离职
}

/**
 * 获取 Mind 团队成员列表
 * 需要配置后端代理 /api/mind/teamUsers -> Mind API
 */
export async function fetchMindTeamUsers(): Promise<MindTeamUser[]> {
  const accessToken = getMindAccessToken();
  if (!accessToken) {
    throw new Error('Mind 登录已过期，请重新登录');
  }

  try {
    // 尝试通过后端代理获取（需要配置 vite proxy 或后端 API）
    const response = await fetch('/api/mind/teamUsers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`获取团队成员失败: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.code === 0 && result.data) {
      console.log('✅ 获取 Mind 团队成员:', result.data.length, '人');
      return result.data;
    } else {
      throw new Error(result.msg || '获取团队成员失败');
    }
  } catch (error) {
    console.error('获取 Mind 团队成员失败:', error);
    throw error;
  }
}

