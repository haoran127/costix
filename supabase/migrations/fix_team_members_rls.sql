-- ============================================
-- 修复 team_members 表的 RLS 策略
-- 问题：原策略存在无限递归，导致 500 错误
-- ============================================

-- 删除有问题的策略
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Admins can manage members" ON team_members;
DROP POLICY IF EXISTS "Service can insert team members" ON team_members;

-- ============================================
-- 创建辅助函数来避免递归
-- 使用 SECURITY DEFINER 绕过 RLS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_team_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(team_id), '{}')
  FROM team_members
  WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION get_user_team_ids IS '获取用户所属的所有团队 ID（用于 RLS 策略，避免递归）';

-- 获取用户是否是团队管理员
CREATE OR REPLACE FUNCTION is_team_admin(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id 
    AND team_id = p_team_id
    AND role IN ('owner', 'admin')
  );
$$;

COMMENT ON FUNCTION is_team_admin IS '检查用户是否是指定团队的管理员';

-- ============================================
-- 重新创建 RLS 策略（避免递归）
-- ============================================

-- 1. 允许用户查看自己所在团队的成员
CREATE POLICY "Team members can view members" ON team_members
  FOR SELECT USING (
    team_id = ANY(get_user_team_ids(auth.uid()))
  );

-- 2. 允许团队管理员管理成员（增删改）
CREATE POLICY "Admins can manage members" ON team_members
  FOR ALL USING (
    is_team_admin(auth.uid(), team_id)
  );

-- 3. 允许服务角色插入（用于触发器）
CREATE POLICY "Service can insert team members" ON team_members
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 验证修复
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ team_members RLS 策略已修复！';
  RAISE NOTICE '';
  RAISE NOTICE '修复内容:';
  RAISE NOTICE '  - 创建了 get_user_team_ids() 函数避免递归';
  RAISE NOTICE '  - 创建了 is_team_admin() 函数避免递归';
  RAISE NOTICE '  - 重新创建了不会导致递归的 RLS 策略';
END $$;

