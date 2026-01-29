-- ============================================
-- 为已注册但没有团队的用户创建团队
-- 修复缺失的团队记录
-- ============================================

DO $$
DECLARE
  user_record RECORD;
  new_team_id UUID;
  user_name TEXT;
BEGIN
  -- 遍历所有已验证但没有团队的用户
  FOR user_record IN 
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data,
      p.id as profile_id,
      p.current_team_id
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.email_confirmed_at IS NOT NULL  -- 只处理已验证的用户
      AND (p.current_team_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM teams WHERE id = p.current_team_id OR owner_id = u.id
      ))
  LOOP
    -- 获取用户名
    user_name := COALESCE(
      user_record.raw_user_meta_data->>'name',
      user_record.raw_user_meta_data->>'full_name',
      split_part(user_record.email, '@', 1)
    );
    
    -- 创建个人团队
    INSERT INTO teams (name, owner_id)
    VALUES (user_name || ' 的团队', user_record.id)
    RETURNING id INTO new_team_id;
    
    -- 添加为团队 owner
    INSERT INTO team_members (team_id, user_id, email, name, role, status, joined_at)
    VALUES (
      new_team_id,
      user_record.id,
      user_record.email,
      user_name,
      'owner',
      'active',
      NOW()
    )
    ON CONFLICT (team_id, email) DO NOTHING;
    
    -- 更新 profile 的当前团队
    IF user_record.profile_id IS NOT NULL THEN
      UPDATE profiles 
      SET current_team_id = new_team_id 
      WHERE id = user_record.id;
    END IF;
    
    RAISE NOTICE '为用户 % (%) 创建了团队: %', user_record.email, user_record.id, new_team_id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ 修复完成！已为所有缺失团队的用户创建了团队。';
END $$;

