-- ============================================
-- KeyPilot 数据库触发器
-- 创建所有必要的触发器
-- ============================================

-- ============================================
-- 1. 自动更新 updated_at 触发器
-- ============================================

DROP TRIGGER IF EXISTS trigger_llm_api_keys_updated_at ON llm_api_keys;
CREATE TRIGGER trigger_llm_api_keys_updated_at
  BEFORE UPDATE ON llm_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_llm_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_api_key_owners_updated_at ON llm_api_key_owners;
CREATE TRIGGER trigger_llm_api_key_owners_updated_at
  BEFORE UPDATE ON llm_api_key_owners
  FOR EACH ROW EXECUTE FUNCTION update_llm_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_platform_accounts_updated_at ON llm_platform_accounts;
CREATE TRIGGER trigger_llm_platform_accounts_updated_at
  BEFORE UPDATE ON llm_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION update_llm_updated_at();

-- ============================================
-- 2. 新用户注册触发器
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;
CREATE TRIGGER on_auth_user_created_team
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_team_for_new_user();

-- ============================================
-- 3. 自动设置 tenant_id 触发器
-- ============================================

DROP TRIGGER IF EXISTS trigger_set_tenant_id_api_keys ON llm_api_keys;
CREATE TRIGGER trigger_set_tenant_id_api_keys
  BEFORE INSERT ON llm_api_keys
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_accounts ON llm_platform_accounts;
CREATE TRIGGER trigger_set_tenant_id_accounts
  BEFORE INSERT ON llm_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

