/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // ⚠️ service_role_key 不应在前端使用，已移除
  readonly VITE_AUTH_MODE?: 'supabase' | 'mind';
  readonly VITE_SKIP_AUTH?: string;
  readonly VITE_OIDC_AUTH_SERVER_URL: string;
  readonly VITE_OIDC_CLIENT_ID: string;
  readonly VITE_OIDC_CLIENT_SECRET: string;
  readonly VITE_OIDC_TOKEN_URL: string;
  readonly VITE_OIDC_USER_INFO_URL: string;
  readonly VITE_OIDC_REDIRECT_URI: string;
  readonly VITE_N8N_WEBHOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

