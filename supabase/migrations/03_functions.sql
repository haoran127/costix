-- ============================================
-- KeyPilot 数据库函数
-- 创建所有必要的函数
-- ============================================

-- ============================================
-- 1. 自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_llm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_llm_updated_at IS '自动更新 updated_at 字段的触发器函数';

-- ============================================
-- 2. 新用户自动创建 profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS '新用户注册时自动创建 profile';

-- ============================================
-- 3. 新用户自动创建团队
-- ============================================
CREATE OR REPLACE FUNCTION create_team_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- 创建个人团队
  INSERT INTO teams (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || ' 的团队', NEW.id)
  RETURNING id INTO new_team_id;
  
  -- 添加为团队 owner
  INSERT INTO team_members (team_id, user_id, email, name, role, status, joined_at)
  VALUES (
    new_team_id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'owner',
    'active',
    NOW()
  );
  
  -- 更新 profile 的当前团队
  UPDATE profiles SET current_team_id = new_team_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_team_for_new_user IS '新用户注册时自动创建个人团队';

-- ============================================
-- 4. 获取当前用户的 tenant_id
-- ============================================
CREATE OR REPLACE FUNCTION public.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.tenant_id IS '获取当前用户的 tenant_id，用于 RLS 策略';

-- ============================================
-- 5. 自动设置 tenant_id
-- ============================================
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_tenant_id IS '自动为新记录设置 tenant_id';

-- ============================================
-- 6. 邀请团队成员
-- ============================================
CREATE OR REPLACE FUNCTION invite_team_member(
  p_team_id UUID,
  p_email VARCHAR,
  p_name VARCHAR DEFAULT NULL,
  p_role VARCHAR DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
  v_existing_user UUID;
  v_member_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', '该邮箱已在团队中');
  END IF;
  
  SELECT id INTO v_existing_user FROM auth.users WHERE email = p_email;
  
  INSERT INTO team_members (team_id, user_id, email, name, role, status, invited_by)
  VALUES (
    p_team_id,
    v_existing_user,
    p_email,
    p_name,
    p_role,
    CASE WHEN v_existing_user IS NOT NULL THEN 'active' ELSE 'invited' END,
    auth.uid()
  )
  RETURNING id INTO v_member_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'status', CASE WHEN v_existing_user IS NOT NULL THEN 'active' ELSE 'invited' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION invite_team_member IS '邀请团队成员';

-- ============================================
-- 7. 获取当前用户的团队成员
-- ============================================
CREATE OR REPLACE FUNCTION get_my_team_members()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  name VARCHAR,
  role VARCHAR,
  status VARCHAR,
  user_id UUID,
  avatar_url TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ
) AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- 获取当前用户的团队
  SELECT current_team_id INTO v_team_id 
  FROM profiles 
  WHERE profiles.id = auth.uid();
  
  IF v_team_id IS NULL THEN
    -- 如果没有团队，尝试从 team_members 获取
    SELECT team_members.team_id INTO v_team_id 
    FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  -- 如果还是没有团队，返回空结果
  IF v_team_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    team_members.id,                    -- 明确指定表别名，避免列名冲突
    team_members.email,
    team_members.name,
    team_members.role,
    team_members.status,
    team_members.user_id,
    profiles.avatar_url,                -- 明确指定表别名
    team_members.invited_at,
    team_members.joined_at
  FROM team_members
  LEFT JOIN profiles ON profiles.id = team_members.user_id
  WHERE team_members.team_id = v_team_id
  ORDER BY 
    CASE team_members.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    team_members.joined_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_my_team_members IS '获取当前用户的团队成员列表';

-- ============================================
-- 8. 获取 Key 详情（包含最新用量和责任人）
-- ============================================
CREATE OR REPLACE FUNCTION get_llm_api_key_details(p_key_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'key', row_to_json(k.*),
    'latest_usage', row_to_json(u.*),
    'owners', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'user_id', o.user_id,
        'role', o.role,
        'is_primary', o.is_primary
      ))
      FROM llm_api_key_owners o
      WHERE o.api_key_id = p_key_id
    )
  )
  INTO v_result
  FROM llm_api_keys k
  LEFT JOIN llm_api_key_latest_usage u ON u.api_key_id = k.id
  WHERE k.id = p_key_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_llm_api_key_details IS '获取 API Key 完整详情，包含最新用量和所有责任人';

-- ============================================
-- 9. 获取 Key 列表（带分页和筛选）
-- ============================================
CREATE OR REPLACE FUNCTION get_llm_api_keys(
  p_platform VARCHAR DEFAULT NULL,
  p_status VARCHAR DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_items JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- 统计总数
  SELECT COUNT(*) INTO v_total
  FROM llm_api_keys k
  LEFT JOIN llm_api_key_owners o ON o.api_key_id = k.id AND o.is_primary = true
  WHERE (p_platform IS NULL OR k.platform = p_platform)
    AND (p_status IS NULL OR k.status = p_status)
    AND (p_owner_id IS NULL OR o.user_id = p_owner_id)
    AND (p_search IS NULL OR k.name ILIKE '%' || p_search || '%' OR k.business ILIKE '%' || p_search || '%');
  
  -- 获取列表
  SELECT jsonb_agg(item ORDER BY created_at DESC)
  INTO v_items
  FROM (
    SELECT jsonb_build_object(
      'id', k.id,
      'name', k.name,
      'platform', k.platform,
      'api_key_prefix', k.api_key_prefix,
      'api_key_suffix', k.api_key_suffix,
      'status', k.status,
      'business', k.business,
      'expires_at', k.expires_at,
      'last_used_at', k.last_used_at,
      'last_synced_at', k.last_synced_at,
      'created_at', k.created_at,
      'latest_usage', (
        SELECT jsonb_build_object(
          'balance', u.balance,
          'total_usage', u.total_usage,
          'monthly_usage', u.monthly_usage,
          'token_usage_monthly', u.token_usage_monthly,
          'rate_limit_rpm', u.rate_limit_rpm,
          'rate_limit_tpm', u.rate_limit_tpm,
          'synced_at', u.synced_at
        )
        FROM llm_api_key_usage u
        WHERE u.api_key_id = k.id
        ORDER BY u.synced_at DESC
        LIMIT 1
      )
    ) as item,
    k.created_at
    FROM llm_api_keys k
    LEFT JOIN llm_api_key_owners o ON o.api_key_id = k.id AND o.is_primary = true
    WHERE (p_platform IS NULL OR k.platform = p_platform)
      AND (p_status IS NULL OR k.status = p_status)
      AND (p_owner_id IS NULL OR o.user_id = p_owner_id)
      AND (p_search IS NULL OR k.name ILIKE '%' || p_search || '%' OR k.business ILIKE '%' || p_search || '%')
    ORDER BY k.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) sub;
  
  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::DECIMAL / p_page_size)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_llm_api_keys IS '获取 API Key 列表，支持平台、状态、责任人筛选和搜索';

-- ============================================
-- 10. 获取平台统计
-- ============================================
CREATE OR REPLACE FUNCTION get_llm_platform_stats(p_platform VARCHAR DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(stats)
    FROM (
      SELECT jsonb_build_object(
        'platform', k.platform,
        'total_keys', COUNT(*),
        'active_keys', COUNT(*) FILTER (WHERE k.status = 'active'),
        'total_balance', COALESCE(SUM(u.balance), 0),
        'total_monthly_usage', COALESCE(SUM(u.monthly_usage), 0),
        'total_monthly_tokens', COALESCE(SUM(u.token_usage_monthly), 0)
      ) as stats
      FROM llm_api_keys k
      LEFT JOIN llm_api_key_latest_usage u ON u.api_key_id = k.id
      WHERE (p_platform IS NULL OR k.platform = p_platform)
      GROUP BY k.platform
      ORDER BY k.platform
    ) sub
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_llm_platform_stats IS '获取各平台的统计数据';

