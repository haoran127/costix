-- ============================================
-- 修复注册时的 RLS 策略问题
-- 允许触发器函数插入 profiles、teams 和 team_members
-- ============================================

-- profiles 表：允许触发器函数插入
DROP POLICY IF EXISTS "Service can insert profiles" ON profiles;
CREATE POLICY "Service can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- teams 表：允许触发器函数插入
DROP POLICY IF EXISTS "Service can insert teams" ON teams;
CREATE POLICY "Service can insert teams" ON teams
  FOR INSERT WITH CHECK (true);

-- team_members 表：允许触发器函数插入
DROP POLICY IF EXISTS "Service can insert team members" ON team_members;
CREATE POLICY "Service can insert team members" ON team_members
  FOR INSERT WITH CHECK (true);

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS 策略修复完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已添加 INSERT 策略，允许触发器函数：';
  RAISE NOTICE '  - 插入 profiles';
  RAISE NOTICE '  - 插入 teams';
  RAISE NOTICE '  - 插入 team_members';
  RAISE NOTICE '';
  RAISE NOTICE '现在可以正常注册用户了！';
END $$;

