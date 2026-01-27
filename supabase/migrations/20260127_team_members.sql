-- ============================================
-- 团队成员管理
-- 支持邀请成员、角色管理
-- ============================================

-- ============================================
-- 1. 团队表 (teams)
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,  -- URL 友好的标识
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 配置
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 团队成员表 (team_members)
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 成员信息（邀请时可能还没有 user_id）
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  
  -- 角色和状态
  role VARCHAR(20) DEFAULT 'member',  -- owner, admin, member, viewer
  status VARCHAR(20) DEFAULT 'invited',  -- invited, active, disabled
  
  -- 邀请信息
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：同一团队同一邮箱只能有一条记录
  UNIQUE(team_id, email)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

COMMENT ON TABLE teams IS '团队表';
COMMENT ON TABLE team_members IS '团队成员表，支持邀请和角色管理';


-- ============================================
-- 3. 更新 profiles 表，关联团队
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'current_team_id') THEN
    ALTER TABLE profiles ADD COLUMN current_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================
-- 4. 启用 RLS
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams RLS 策略
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Team owners can update" ON teams;
CREATE POLICY "Team owners can update" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

-- Team Members RLS 策略
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
CREATE POLICY "Team members can view members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage members" ON team_members;
CREATE POLICY "Admins can manage members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );


-- ============================================
-- 5. 触发器：新用户自动创建团队
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

-- 绑定触发器
DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;
CREATE TRIGGER on_auth_user_created_team
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_team_for_new_user();


-- ============================================
-- 6. 函数：邀请成员
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
  -- 检查是否已经是成员
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', '该邮箱已在团队中');
  END IF;
  
  -- 检查是否已有账号
  SELECT id INTO v_existing_user FROM auth.users WHERE email = p_email;
  
  -- 添加成员记录
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


-- ============================================
-- 7. 函数：获取当前用户的团队成员
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
  SELECT current_team_id INTO v_team_id FROM profiles WHERE id = auth.uid();
  
  IF v_team_id IS NULL THEN
    -- 如果没有团队，尝试从 team_members 获取
    SELECT tm.team_id INTO v_team_id 
    FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    tm.id,
    tm.email,
    tm.name,
    tm.role,
    tm.status,
    tm.user_id,
    p.avatar_url,
    tm.invited_at,
    tm.joined_at
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = v_team_id
  ORDER BY 
    CASE tm.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    tm.joined_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 团队成员管理表结构创建完成！';
  RAISE NOTICE '';
  RAISE NOTICE '新增表:';
  RAISE NOTICE '  - teams (团队表)';
  RAISE NOTICE '  - team_members (团队成员表)';
  RAISE NOTICE '';
  RAISE NOTICE '新增函数:';
  RAISE NOTICE '  - invite_team_member() - 邀请成员';
  RAISE NOTICE '  - get_my_team_members() - 获取团队成员';
  RAISE NOTICE '';
  RAISE NOTICE '自动触发器:';
  RAISE NOTICE '  - 新用户注册时自动创建个人团队';
END $$;

