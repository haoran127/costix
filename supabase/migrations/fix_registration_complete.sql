-- ============================================
-- 完整修复注册时的 RLS 策略问题
-- 确保触发器函数可以正常工作
-- ============================================

-- ============================================
-- 1. profiles 表：允许触发器函数插入和更新
-- ============================================
DROP POLICY IF EXISTS "Service can insert profiles" ON profiles;
CREATE POLICY "Service can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update profiles" ON profiles;
CREATE POLICY "Service can update profiles" ON profiles
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- 2. teams 表：允许触发器函数插入
-- ============================================
DROP POLICY IF EXISTS "Service can insert teams" ON teams;
CREATE POLICY "Service can insert teams" ON teams
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 3. team_members 表：允许触发器函数插入
-- ============================================
DROP POLICY IF EXISTS "Service can insert team members" ON team_members;
CREATE POLICY "Service can insert team members" ON team_members
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. 确保函数有正确的权限设置
-- ============================================

-- 重新创建 handle_new_user 函数，确保使用 SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;  -- 防止重复插入
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建 create_team_for_new_user 函数，添加错误处理
CREATE OR REPLACE FUNCTION create_team_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  user_name TEXT;
BEGIN
  -- 获取用户名
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- 创建个人团队
  INSERT INTO teams (name, owner_id)
  VALUES (user_name || ' 的团队', NEW.id)
  RETURNING id INTO new_team_id;
  
  -- 如果创建成功，添加为团队 owner
  IF new_team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, user_id, email, name, role, status, joined_at)
    VALUES (
      new_team_id,
      NEW.id,
      NEW.email,
      user_name,
      'owner',
      'active',
      NOW()
    )
    ON CONFLICT (team_id, email) DO NOTHING;  -- 防止重复插入
    
    -- 更新 profile 的当前团队
    UPDATE profiles 
    SET current_team_id = new_team_id 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误但不阻止用户注册
    RAISE WARNING '创建团队失败: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 注册功能完整修复完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已修复:';
  RAISE NOTICE '  - profiles 表的 INSERT 和 UPDATE 策略';
  RAISE NOTICE '  - teams 表的 INSERT 策略';
  RAISE NOTICE '  - team_members 表的 INSERT 策略';
  RAISE NOTICE '  - handle_new_user 函数（添加了 ON CONFLICT 处理）';
  RAISE NOTICE '  - create_team_for_new_user 函数（添加了错误处理）';
  RAISE NOTICE '';
  RAISE NOTICE '现在可以正常注册用户了！';
END $$;

