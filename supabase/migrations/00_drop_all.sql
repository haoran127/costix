-- ============================================
-- KeyPilot 数据库清理脚本
-- 删除所有表、视图、函数、触发器等，用于完全重建数据库
-- ⚠️ 警告：此脚本会删除所有数据！请谨慎使用！
-- ============================================

-- ============================================
-- 1. 删除所有触发器
-- ============================================
DROP TRIGGER IF EXISTS trigger_llm_api_keys_updated_at ON llm_api_keys;
DROP TRIGGER IF EXISTS trigger_llm_api_key_owners_updated_at ON llm_api_key_owners;
DROP TRIGGER IF EXISTS trigger_llm_platform_accounts_updated_at ON llm_platform_accounts;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_api_keys ON llm_api_keys;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_accounts ON llm_platform_accounts;

-- ============================================
-- 2. 删除所有视图
-- ============================================
DROP VIEW IF EXISTS llm_api_key_latest_usage CASCADE;

-- ============================================
-- 3. 删除所有函数
-- ============================================
DROP FUNCTION IF EXISTS update_llm_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_team_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.tenant_id() CASCADE;
DROP FUNCTION IF EXISTS set_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS invite_team_member(UUID, VARCHAR, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_my_team_members() CASCADE;
DROP FUNCTION IF EXISTS get_llm_api_key_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_llm_api_keys(VARCHAR, VARCHAR, UUID, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_llm_platform_stats(VARCHAR) CASCADE;

-- 尝试删除 auth schema 中的函数（如果存在）
DROP FUNCTION IF EXISTS auth.tenant_id() CASCADE;

-- ============================================
-- 4. 删除所有表（按依赖顺序）
-- ============================================

-- 先删除有外键依赖的表
DROP TABLE IF EXISTS llm_api_key_usage CASCADE;
DROP TABLE IF EXISTS llm_api_key_owners CASCADE;
DROP TABLE IF EXISTS llm_api_key_logs CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS llm_api_keys CASCADE;
DROP TABLE IF EXISTS llm_platform_accounts CASCADE;
DROP TABLE IF EXISTS llm_sync_tasks CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- 5. 清理完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 数据库清理完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已删除:';
  RAISE NOTICE '  - 所有表';
  RAISE NOTICE '  - 所有视图';
  RAISE NOTICE '  - 所有函数';
  RAISE NOTICE '  - 所有触发器';
  RAISE NOTICE '';
  RAISE NOTICE '📋 接下来请按顺序执行:';
  RAISE NOTICE '  1. 01_tables.sql';
  RAISE NOTICE '  2. 02_indexes.sql';
  RAISE NOTICE '  3. 03_functions.sql';
  RAISE NOTICE '  4. 04_triggers.sql';
  RAISE NOTICE '  5. 05_rls_policies.sql';
  RAISE NOTICE '';
END $$;

